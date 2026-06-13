const db = require("../../config/db");
const winston = require("../../config/winston");
const { retryTransaction } = require("../../utils/dbRetry");
const imageHelper = require("../../helpers/imageHelper");
const s3Helper = require("../../helpers/s3Helper");
const { aws } = require("../../config/config");

const itemModel = {
    /**
     * Map/Update items in company_itemmaster
     * Uses UPSERT (INSERT...ON DUPLICATE KEY UPDATE) for optimal performance
     * Production-ready: Handles concurrent requests safely with atomic operations
     *
     * @param {Object} payload - { companyid, items: [{itemid, sellingprice, ...}] }
     * @returns {Object} Result with success/failure counts
     */
    async itemMapping(payload) {
        try {
            const { companyid, items = [] } = payload;

            if (!companyid) {
                return {
                    success: false,
                    message: "companyid is required"
                };
            }

            if (!Array.isArray(items) || items.length === 0) {
                return {
                    success: false,
                    message: "items array is required and cannot be empty"
                };
            }

            const results = {
                success: true,
                totalItems: items.length,
                insertedCount: 0,
                updatedCount: 0,
                failedCount: 0,
                details: []
            };

            // Process each item with UPSERT (single atomic query per item)
            for (const item of items) {
                try {
                    const result = await retryTransaction(
                        async (connection) => {
                            const currDate = new Date().toISOString().slice(0, 19).replace("T", " ");

                            // UPSERT: Insert new or update existing (atomic, no race conditions)
                            // Uses unique key (companyid, itemid, isdeleted) to determine insert vs update
                            const upsertQuery = `
                                INSERT INTO company_itemmaster (
                                    companyid, itemid, uniquekey,
                                    sellingprice, purchaseprice, wholesaleprice, netcost,
                                    safetyquantity, ignoretax, ignorediscount,
                                    itemcode, defaulttaxprofileid, isactive,
                                    enablestock, appearancesid, pricetype,
                                    issync, lastsyncdate,
                                    createdby, createddate, modifiedby, modifieddate,
                                    ipaddress, isdeleted
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                ON DUPLICATE KEY UPDATE
                                    sellingprice = VALUES(sellingprice),
                                    purchaseprice = VALUES(purchaseprice),
                                    wholesaleprice = VALUES(wholesaleprice),
                                    netcost = VALUES(netcost),
                                    safetyquantity = VALUES(safetyquantity),
                                    ignoretax = VALUES(ignoretax),
                                    ignorediscount = VALUES(ignorediscount),
                                    itemcode = VALUES(itemcode),
                                    defaulttaxprofileid = VALUES(defaulttaxprofileid),
                                    isactive = VALUES(isactive),
                                    enablestock = VALUES(enablestock),
                                    appearancesid = VALUES(appearancesid),
                                    pricetype = VALUES(pricetype),
                                    lastsyncdate = VALUES(lastsyncdate),
                                    modifiedby = VALUES(modifiedby),
                                    modifieddate = VALUES(modifieddate),
                                    ipaddress = VALUES(ipaddress)
                            `;

                            const [upsertResult] = await connection.execute(upsertQuery, [
                                companyid,
                                item.itemid,
                                item.uniquekey ?? null,
                                item.sellingprice ?? 0,
                                item.purchaseprice ?? 0,
                                item.wholesaleprice ?? 0,
                                item.netcost ?? 0,
                                item.safetyquantity ?? null,
                                item.ignoretax ?? 0,
                                item.ignorediscount ?? 0,
                                item.itemcode ?? null,
                                item.defaulttaxprofileid ?? null,
                                item.isactive ?? 1,
                                item.enablestock ?? 1,
                                item.appearancesid ?? null,
                                item.pricetype ?? null,
                                1, // issync = 1
                                currDate,
                                item.createdby ?? 1,
                                currDate,
                                item.modifiedby ?? item.createdby ?? 1,
                                currDate,
                                item.ipaddress ?? null,
                                0 // isdeleted = 0
                            ]);

                            // Determine if it was insert or update
                            // affectedRows = 1 means INSERT, 2 means UPDATE
                            const mode = upsertResult.affectedRows === 1 ? "insert" : "update";

                            winston.info(`Company item ${mode}ed successfully`, {
                                source: "item.model.js",
                                function: "itemMapping",
                                companyid,
                                itemid: item.itemid,
                                mode
                            });

                            return {
                                success: true,
                                itemid: item.itemid,
                                mode
                            };
                        },
                        {
                            maxRetries: 3,
                            operationName: `Item mapping (itemid: ${item.itemid})`,
                        }
                    );

                    // Count based on mode
                    if (result.mode === "insert") {
                        results.insertedCount++;
                    } else {
                        results.updatedCount++;
                    }
                    results.details.push(result);
                } catch (error) {
                    winston.error(`Error processing item mapping: ${error.message}`, {
                        source: "item.model.js",
                        function: "itemMapping",
                        companyid,
                        itemid: item.itemid,
                        error: error.message,
                        stack: error.stack
                    });

                    results.failedCount++;
                    results.details.push({
                        success: false,
                        itemid: item.itemid,
                        error: error.message
                    });
                }
            }

            // Overall success if at least one item succeeded
            const successCount = results.insertedCount + results.updatedCount;
            results.success = successCount > 0;
            results.message = `Processed ${results.totalItems} items: ${results.insertedCount} inserted, ${results.updatedCount} updated, ${results.failedCount} failed`;

            return results;
        } catch (error) {
            winston.error(`Error in itemMapping: ${error.message}`, {
                source: "item.model.js",
                function: "itemMapping",
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                message: "Failed to process item mapping",
                error: error.message
            };
        }
    },

    /**
     * Save item (insert or update) from POS sync
     * Uses two-table approach:
     * 1. itemmaster - Global item catalog
     * 2. company_itemmaster - Company-specific overrides
     *
     * @param {Object} item - Item object from POS
     * @returns {Object} Result object with success status and data
     */
    async saveItem(item) {
        try {
            // Map POS field names to server field names
            // POS uses 'product*' naming, we use 'item*' naming
            const normalizedItem = {
                // ID fields
                itemid: item.itemid || item.productid || null,
                uniquekey: item.uniquekey || null,
                companyid: item.companyid || null,

                // Name fields
                itemname: item.itemname || item.productname || null,
                itemdisplayname: item.itemdisplayname || item.displayname || null,
                genericname: item.genericname || null,

                // Code/Barcode fields
                itemcode: item.itemcode || item.productcode || null,
                itembarcode: item.itembarcode || item.barcode || null,

                // Category fields
                mastercategoryid: item.mastercategoryid || null,
                categoryid: item.categoryid || item.productcategoryid || null,
                subcategoryid: item.subcategoryid || item.subcategory || null,
                brandid: item.brandid || null,

                // Type and appearance
                itemtypeid: item.itemtypeid || null,
                appearanceid: item.appearanceid || null,

                // Packing/Quantity fields
                packingqty: item.packingqty || null,
                packageuom: item.packageuom || null,
                safetyquantity: item.safetyquantity || item.reorderlevel || null,

                // Tax and pricing type
                defaulttaxprofileid: item.defaulttaxprofileid || item.taxprofileid || null,
                sellingitemas: item.sellingitemas || item.sellingproductas || 1,
                hsnseccode: item.hsnseccode || item.hsncode || null,
                pricetype: item.pricetype || 1,

                // Price fields (company-specific - will go to company_itemmaster)
                sellingprice: item.sellingprice || item.mrpprice || 0,
                purchaseprice: item.purchaseprice || 0,
                netcost: item.netcost || 0,
                wholesaleprice: item.wholesaleprice || 0,

                // Description fields
                ingredients: item.ingredients || null,
                description: item.description || item.itemdesc || null,

                // Unit fields
                baseunit: item.baseunit || item.uomid || item.unit || null,

                // Boolean flags
                ismanufacturer: item.ismanufacturer || 0,
                batchquantity: item.batchquantity || 1,
                ispackingitem: item.ispackingitem || 0,
                isnegativesale: item.isnegativesale || 0,
                ignoretax: item.ignoretax || 0,
                ignorediscount: item.ignorediscount || 0,

                // Image field
                imgpath: item.imgpath || null,
                base64Image: item.base64Image || item.productimage || null,

                // Audit fields
                ipaddress: item.ipaddress || null,
                createdby: item.createdby || null,
                modifiedby: item.modifiedby || null,
                isdeleted: item.isdeleted || 0
            };

            // Process base64 image if provided
            let imgPath = normalizedItem.imgpath || null;

            if (normalizedItem.base64Image && typeof normalizedItem.base64Image === 'string') {
                try {
                    // Validate base64 image first
                    const validation = imageHelper.validateBase64Image(normalizedItem.base64Image);

                    if (!validation.valid) {
                        winston.warn(`Invalid item image for ${normalizedItem.itemname}: ${validation.error}`, {
                            source: "item.model.js",
                            function: "saveItem"
                        });
                        // Continue without image, don't fail the entire sync
                        imgPath = null;
                    } else {
                        // Process and save image
                        imgPath = await imageHelper.processBase64Image(
                            normalizedItem.base64Image,
                            'items/images',
                            'item'
                        );
                        winston.info(`Item image processed: ${imgPath}`, {
                            source: "item.model.js",
                            function: "saveItem"
                        });
                    }
                } catch (imgError) {
                    winston.error(`Error processing item image for ${normalizedItem.itemname}: ${imgError.message}`, {
                        source: "item.model.js",
                        function: "saveItem",
                        error: imgError.message,
                        code: imgError.code,
                        errno: imgError.errno,
                        stack: imgError.stack
                    });
                    // Continue without image, don't fail sync
                    imgPath = null;
                }

                // Clear base64 from memory immediately
                delete normalizedItem.base64Image;
            }

            return await retryTransaction(
                async (connection) => {
                    const currDate = new Date().toISOString().slice(0, 19).replace("T", " ");

                    // Step 1: Insert new item into itemmaster (no duplicate checking)
                    // Always create a new entry regardless of existing items
                    // Now includes price-related data in itemmaster
                    const insertGlobalQuery = `
                        INSERT INTO itemmaster (
                            itemname, itemdisplayname, genericname, itembarcode, itemcode,
                            mastercategoryid, categoryid, subcategoryid, brandid, itemtypeid,
                            appearanceid, packingqty, packageuom, defaulttaxprofileid,
                            sellingitemas, hsnseccode, pricetype,
                            ingredients, description, baseunit,
                            ismanufacturer, batchquantity, ispackingitem, isnegativesale,
                            sellingprice, purchaseprice, wholesaleprice, netcost, safetyquantity,
                            imgpath, companyid, uniquekey, isglobal,
                            isapproved, approvalremark,
                            ipaddress, createdby, createddate, modifiedby, modifieddate, isdeleted
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    const [result] = await connection.execute(insertGlobalQuery, [
                        normalizedItem.itemname || null,
                        normalizedItem.itemdisplayname || null,
                        normalizedItem.genericname || null,
                        normalizedItem.itembarcode || null,
                        normalizedItem.itemcode || null,
                        normalizedItem.mastercategoryid || null,
                        normalizedItem.categoryid || null,
                        normalizedItem.subcategoryid || null,
                        normalizedItem.brandid || null,
                        normalizedItem.itemtypeid || null,
                        normalizedItem.appearanceid || null,
                        normalizedItem.packingqty || null,
                        normalizedItem.packageuom || null,
                        normalizedItem.defaulttaxprofileid || null,
                        normalizedItem.sellingitemas || 1,
                        normalizedItem.hsnseccode || null,
                        normalizedItem.pricetype || 1,
                        normalizedItem.ingredients || null,
                        normalizedItem.description || null,
                        normalizedItem.baseunit || null,
                        normalizedItem.ismanufacturer || 0,
                        normalizedItem.batchquantity || 1,
                        normalizedItem.ispackingitem || 0,
                        normalizedItem.isnegativesale || 0,
                        normalizedItem.sellingprice || 0,
                        normalizedItem.purchaseprice || 0,
                        normalizedItem.wholesaleprice || 0,
                        normalizedItem.netcost || 0,
                        normalizedItem.safetyquantity || null,
                        imgPath,
                        normalizedItem.companyid, // Track which company created this
                        normalizedItem.uniquekey || null,
                        0, // isglobal = 0 (company-specific item)
                        0, // isapproved = 0 (needs approval for synced items)
                        null, // approvalremark = null initially
                        normalizedItem.ipaddress || null,
                        normalizedItem.createdby || 1,
                        currDate,
                        normalizedItem.modifiedby || normalizedItem.createdby || 1,
                        currDate,
                        normalizedItem.isdeleted || 0
                    ]);

                    const newItemId = result.insertId;

                    winston.info("New item inserted into itemmaster (pending approval)", {
                        source: "item.model.js",
                        function: "saveItem",
                        itemid: newItemId,
                        itemname: normalizedItem.itemname,
                        companyid: normalizedItem.companyid
                    });

                    // NOTE: company_itemmaster mapping is NOT created here
                    // It will be created after approval/rejection by support team
                    // This ensures items are only visible after review

                    return {
                        success: true,
                        issynced: 1,
                        message: "Item synced successfully, pending approval",
                        data: {
                            serverItemId: newItemId,  // Server's new itemid
                            localItemId: normalizedItem.itemid,  // POS's local itemid (if provided)
                            uniquekey: normalizedItem.uniquekey,  // Unique identifier for this item
                            companyid: normalizedItem.companyid,
                            isapproved: 0  // Pending approval
                        }
                    };
                },
                {
                    maxRetries: 3,
                    operationName: `Item insert (${normalizedItem.uniquekey || normalizedItem.itemname})`,
                }
            );
        } catch (error) {
            winston.error(`Error saving item from POS sync: ${error.message}`, {
                source: "item.model.js",
                function: "saveItem",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                itemname: item.itemname || item.productname
            });

            return {
                success: false,
                issynced: 0,
                message: "Failed to save item",
                error: error.message,
                data: {
                    localItemId: item.itemid || item.productid || null,
                    uniquekey: item.uniquekey || null,
                    companyid: item.companyid || null
                }
            };
        }
    },

    /**
     * Check approval status for multiple items (webhook for POS)
     * Used by POS cron to check if items have been approved/rejected
     *
     * @param {Array} uniquekeys - Array of uniquekeys to check
     * @returns {Object} Result with status for each item
     */
    async checkApprovalStatus(uniquekeys) {
        try {
            if (!uniquekeys || !Array.isArray(uniquekeys) || uniquekeys.length === 0) {
                return {
                    success: false,
                    message: "uniquekeys array is required and cannot be empty"
                };
            }

            // Query items by uniquekey array
            const placeholders = uniquekeys.map(() => '?').join(',');
            const sql = `
                SELECT
                    im.itemid,
                    im.itemname,
                    im.itemdisplayname,
                    im.genericname,
                    im.itemcode,
                    im.itembarcode,
                    im.mastercategoryid,
                    im.categoryid,
                    im.subcategoryid,
                    im.brandid,
                    im.defaulttaxprofileid,
                    im.sellingitemas,
                    im.hsnseccode,
                    im.pricetype,
                    im.sellingprice,
                    im.purchaseprice,
                    im.wholesaleprice,
                    im.netcost,
                    im.safetyquantity,
                    im.ingredients,
                    im.description,
                    im.baseunit,
                    im.imgpath,
                    im.companyid,
                    im.uniquekey,
                    im.isglobal,
                    im.isapproved,
                    im.approvalremark,
                    im.rejectionreason,
                    im.isdeleted,
                    im.createddate,
                    im.modifieddate
                FROM itemmaster im
                WHERE im.uniquekey IN (${placeholders})
            `;

            const items = await db.getResults(sql, uniquekeys);

            // Process each uniquekey
            const results = uniquekeys.map(uniquekey => {
                const item = items.find(i => i.uniquekey === uniquekey);

                // Status 1: Item not found
                if (!item) {
                    return {
                        uniquekey,
                        status: 'not_found',
                        message: 'Item does not exist in the system',
                        data: null
                    };
                }

                // Status 2: Approved (global item)
                if (item.isapproved === 1 && item.isglobal === 1 && item.isdeleted === 0) {
                    return {
                        uniquekey,
                        status: 'approved',
                        message: 'Item has been approved and is now global',
                        data: {
                            itemid: item.itemid,
                            itemname: item.itemname,
                            itemdisplayname: item.itemdisplayname,
                            approvalremark: item.approvalremark,
                            modifieddate: item.modifieddate
                        }
                    };
                }

                // Status 3: Rejected as Duplicate (deleted item)
                if (item.isdeleted === 1 && item.rejectionreason === 'Duplicate Item') {
                    return {
                        uniquekey,
                        status: 'rejected_duplicate',
                        message: 'Item was rejected as duplicate and has been removed',
                        rejectionreason: item.rejectionreason,
                        rejectionremark: item.approvalremark || '',
                        data: {
                            originalItem: {
                                itemid: item.itemid,
                                itemname: item.itemname,
                                itemdisplayname: item.itemdisplayname,
                                itemcode: item.itemcode,
                                itembarcode: item.itembarcode,
                                categoryid: item.categoryid,
                                brandid: item.brandid
                            }
                        }
                    };
                }

                // Status 4: Company-Specific (rejected with other reason, kept for company)
                if (item.isapproved === 0 && item.isglobal === 0 && item.rejectionreason && item.isdeleted === 0) {
                    return {
                        uniquekey,
                        status: 'company_specific',
                        message: 'Item has been kept as company-specific only',
                        rejectionreason: item.rejectionreason,
                        rejectionremark: item.approvalremark || '',
                        data: {
                            itemid: item.itemid,
                            itemname: item.itemname,
                            companyid: item.companyid,
                            modifieddate: item.modifieddate
                        }
                    };
                }

                // Status 5: Pending (no decision yet)
                if (item.isapproved === 0 && !item.rejectionreason && item.isdeleted === 0) {
                    return {
                        uniquekey,
                        status: 'pending',
                        message: 'Item is still awaiting approval',
                        data: {
                            itemid: item.itemid,
                            itemname: item.itemname,
                            createddate: item.createddate
                        }
                    };
                }

                // Fallback for unexpected states
                return {
                    uniquekey,
                    status: 'unknown',
                    message: 'Item status could not be determined',
                    data: {
                        itemid: item.itemid,
                        isapproved: item.isapproved,
                        isglobal: item.isglobal,
                        isdeleted: item.isdeleted,
                        rejectionreason: item.rejectionreason
                    }
                };
            });

            winston.info("Approval status checked for items", {
                source: "item.model.js",
                function: "checkApprovalStatus",
                totalItems: uniquekeys.length,
                results: results.map(r => ({ uniquekey: r.uniquekey, status: r.status }))
            });

            return {
                success: true,
                message: `Checked status for ${uniquekeys.length} item(s)`,
                data: results
            };
        } catch (error) {
            winston.error(`Error checking approval status: ${error.message}`, {
                source: "item.model.js",
                function: "checkApprovalStatus",
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                message: "Failed to check approval status",
                error: error.message
            };
        }
    }
};

module.exports = itemModel;
