const db = require("../../config/db");
const winston = require("../../config/winston");
const { retryTransaction } = require("../../utils/dbRetry");

const purchaseReturnModel = {
    async savePurchaseReturn(returnData) {
        // Use retry logic for deadlock handling
        try {
            return await retryTransaction(
                async (connection) => {
                    // Check if purchase return already exists with NOWAIT
                    let existingReturn;
                    try {
                        [existingReturn] = await connection.execute(
                            "SELECT uniquekey FROM purchaseorderreturnmaster WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE NOWAIT",
                            [returnData.uniquekey]
                        );
                    } catch (err) {
                        // If NOWAIT fails, fall back to regular FOR UPDATE
                        if (err.errno === 3572) { // ER_LOCK_NOWAIT
                            [existingReturn] = await connection.execute(
                                "SELECT uniquekey FROM purchaseorderreturnmaster WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE",
                                [returnData.uniquekey]
                            );
                        } else {
                            throw err;
                        }
                    }

                    if (existingReturn.length > 0) {
                        // Update existing purchase return
                        const updateResult = await this.updatePurchaseReturn(connection, returnData);
                        return {
                            success: true,
                            msg: "Purchase return updated successfully",
                            issynced: updateResult,
                        };
                    } else {
                        // Insert new purchase return
                        await this.insertPurchaseReturn(connection, returnData);
                        return { success: true, msg: "Purchase return saved successfully", issynced: 1 };
                    }
                },
                {
                    maxRetries: 3,
                    operationName: `Purchase return save (${returnData.uniquekey})`,
                }
            );
        } catch (error) {
            winston.error(`Error saving purchase return: ${error.message}`, {
                source: "purchaseReturn.model.js",
                function: "savePurchaseReturn",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                uniquekey: returnData.uniquekey
            });
            return { success: false, msg: "Failed to save purchase return", error: error.message };
        }
    },

    async insertPurchaseReturn(connection, returnData) {
        const convertDateToMySQL = (dateStr) => {
            if (!dateStr || dateStr.toString().trim() === "") return null;

            const str = dateStr.toString().trim();

            // Check if already in YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

            // Handle ISO 8601 datetime format (YYYY-MM-DDTHH:mm:ss.sssZ)
            if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
                return str.split("T")[0]; // Extract just the date part
            }

            // Convert DD/MM/YYYY to YYYY-MM-DD (with forward slash)
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
                const [day, month, year] = str.split("/");
                return `${year}-${month}-${day}`;
            }

            // Convert DD-MM-YYYY to YYYY-MM-DD (with hyphen)
            if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
                const [day, month, year] = str.split("-");
                return `${year}-${month}-${day}`;
            }

            return null;
        };
        let serverPurchaseOrderId = null;
        if (returnData.purchaseorderid) {
            const [poMaster] = await connection.execute(
                "SELECT id FROM purchaseordermaster WHERE orderid = ? AND companyid = ?",
                [returnData.purchaseorderid, returnData.companyid]
            );
            if (poMaster.length > 0) {
                serverPurchaseOrderId = poMaster[0].id;
            }
        }

        // Insert purchase return master
        const returnQuery = `
            INSERT INTO purchaseorderreturnmaster (
                returnid, locationid, supplierid, purchaseorderid, serverpurchaseorderid, smuniquekey,
                returnnumber, datekey, referencebillnumber, referencechallannumber, debitnotenumber,
                purchaseorderreturndate, remarks, totalamount, discounttype, discountpercentamt,
                totaltaxableamount, additionalcharge, roundoffamount, totalcessamt, totaltax,
                grandtotal, isdeleted, ipaddress, companyid, uniquekey, clientcreateddate,
                clientmodifieddate, clientcreatedby, clientmodifiedby, createdby, createddate,
                modifiedby, modifieddate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
        `;

        // Prepare values array
        const returnValues = [
            returnData.returnid,
            returnData.locationid,
            returnData.supplierid,
            returnData.purchaseorderid || null,
            serverPurchaseOrderId,
            returnData.smuniquekey || null,
            returnData.returnnumber || "0",
            returnData.datekey,
            returnData.referencebillnumber || "",
            returnData.referencechallannumber || "",
            returnData.debitnotenumber || "0",
            returnData.purchaseorderreturndate,
            returnData.remarks || "",
            returnData.totalamount,
            returnData.discounttype || 0,
            returnData.discountpercentamt || 0,
            returnData.totaltaxableamount,
            returnData.additionalcharge || 0,
            returnData.roundoffamount || 0,
            returnData.totalcessamt || 0,
            returnData.totaltax || 0,
            returnData.grandtotal,
            returnData.isdeleted || 0,
            returnData.ipaddress,
            returnData.companyid || 0,
            returnData.uniquekey,
            returnData.createddate || null,
            returnData.modifieddate || null,
            returnData.createdby || null,
            returnData.modifiedby || null,
            null,
            null, // Server createddate
            null,
            null, // Server modifieddate
        ];

        const [returnResult] = await connection.execute(returnQuery, returnValues);
        const serverReturnId = returnResult.insertId;


        // Insert purchase return items details
        const itemsData = returnData.purchaseReturnItemsDetails;
        if (itemsData && itemsData.length > 0) {
            for (const item of itemsData) {
                const itemQuery = `
                    INSERT INTO purchaseorderreturnitemsdetails (
                        returnitemsdetailsid, serverreturnid, returnid, itemid, productuniquekey,
                        taxprofileid, locationid, uomid, unitprice, quantity, totalamount,
                        discountpercent, discountamount, taxableamount, cessamount, cesspercent,
                        taxamount, totaltaxamount, expirydate, isdeleted, ipaddress, remarks,
                        batchid, batchdate, uniquekey, companyid, clientcreateddate,
                        clientmodifieddate, clientcreatedby, clientmodifiedby, createdby,
                        createddate, modifiedby, modifieddate
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
                `;

                const [itemResult] = await connection.execute(itemQuery, [
                    item.returnitemsdetailsid,
                    serverReturnId, // Server return ID reference
                    returnData.returnid, // Client return ID
                    item.itemid,
                    item.productuniquekey || null,
                    item.taxprofileid || null,
                    item.locationid,
                    item.uomid || null,
                    item.unitprice,
                    item.quantity,
                    item.totalamount,
                    item.discountpercent || 0,
                    item.discountamount || 0,
                    item.taxableamount,
                    item.cessamount || null,
                    item.cesspercent || null,
                    item.taxamount || 0,
                    item.totaltaxamount || 0,
                    // item.expirydate || null,
                    convertDateToMySQL(item.expirydate),
                    item.isdeleted || 0,
                    item.ipaddress || returnData.ipaddress,
                    item.remarks || "",
                    item.batchid || null,
                    // item.batchdate || null,
                    convertDateToMySQL(item.batchdate),
                    item.uniquekey || returnData.uniquekey,
                    item.companyid || returnData.companyid || 0,
                    item.createddate || null,
                    item.modifieddate || null,
                    item.createdby || null,
                    item.modifiedby || null,
                    null,
                    null, // Server createddate
                    null,
                    null, // Server modifieddate
                ]);

                const serverReturnItemsDetailsId = itemResult.insertId;

                // Insert item tax details for this item
                const taxDetails = item.purchaseReturnItemsTaxDetails;
                if (taxDetails && taxDetails.length > 0) {
                    for (const taxDetail of taxDetails) {
                        const taxQuery = `
                            INSERT INTO purchaseorderreturnitemstaxdetails (
                                returnitemstaxdetailsid, returnitemsdetailsid, serverreturnitemsdetailsid,
                                returnid, serverreturnid, locationid, taxid, taxamount, taxpercentage,
                                isdeleted, uniquekey, companyid, clientcreateddate, clientmodifieddate,
                                clientcreatedby, clientmodifiedby, createdby, createddate, modifiedby, modifieddate
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
                        `;

                        await connection.execute(taxQuery, [
                            taxDetail.id || taxDetail.returnitemstaxdetailsid,
                            item.returnitemsdetailsid, // Client item ID
                            serverReturnItemsDetailsId, // Server item ID
                            returnData.returnid, // Client return ID
                            serverReturnId, // Server return ID
                            taxDetail.locationid,
                            taxDetail.taxid,
                            taxDetail.taxamount,
                            taxDetail.taxpercentage,
                            taxDetail.isdeleted || 0,
                            taxDetail.uniquekey || returnData.uniquekey,
                            taxDetail.companyid || returnData.companyid || 0,
                            taxDetail.createddate || null,
                            taxDetail.modifieddate || null,
                            taxDetail.createdby || null,
                            taxDetail.modifiedby || null,
                            null,
                            null, // Server createddate
                            null,
                            null, // Server modifieddate
                        ]);
                    }
                }
            }
        }
    },

    async updatePurchaseReturn(connection, returnData) {
        const convertDateToMySQL = (dateStr) => {
            if (!dateStr || dateStr.toString().trim() === "") return null;

            const str = dateStr.toString().trim();

            // Check if already in YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

            // Handle ISO 8601 datetime format (YYYY-MM-DDTHH:mm:ss.sssZ)
            if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
                return str.split("T")[0]; // Extract just the date part
            }

            // Convert DD/MM/YYYY to YYYY-MM-DD (with forward slash)
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
                const [day, month, year] = str.split("/");
                return `${year}-${month}-${day}`;
            }

            // Convert DD-MM-YYYY to YYYY-MM-DD (with hyphen)
            if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
                const [day, month, year] = str.split("-");
                return `${year}-${month}-${day}`;
            }

            return null;
        };
        // Update purchase return master
        const updateReturnQuery = `
            UPDATE purchaseorderreturnmaster
            SET totalamount = ?, discounttype = ?, discountpercentamt = ?, totaltaxableamount = ?,
                additionalcharge = ?, roundoffamount = ?, totalcessamt = ?, totaltax = ?,
                grandtotal = ?, remarks = ?, referencebillnumber = ?, referencechallannumber = ?,
                debitnotenumber = ?, purchaseorderreturndate = STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'),
                modifiedby = ?, modifieddate = ?, clientmodifiedby = ?, clientmodifieddate = STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'),
                isdeleted = ?, smuniquekey = ?
            WHERE uniquekey = ?
        `;

        await connection.execute(updateReturnQuery, [
            returnData.totalamount,
            returnData.discounttype || 0,
            returnData.discountpercentamt || 0,
            returnData.totaltaxableamount,
            returnData.additionalcharge || 0,
            returnData.roundoffamount || 0,
            returnData.totalcessamt || 0,
            returnData.totaltax || 0,
            returnData.grandtotal,
            returnData.remarks || "",
            returnData.referencebillnumber || "",
            returnData.referencechallannumber || "",
            returnData.debitnotenumber || "0",
            returnData.purchaseorderreturndate || null,
            null,
            null,
            returnData.modifiedby || null,
            returnData.modifieddate || null,
            returnData.isdeleted || 0,
            returnData.smuniquekey || null,
            returnData.uniquekey,
        ]);

        // Get server return id
        const [returnResult] = await connection.execute(
            "SELECT id FROM purchaseorderreturnmaster WHERE uniquekey = ?",
            [returnData.uniquekey]
        );
        const serverReturnId = returnResult[0].id;

        // Update purchase return items
        const itemsData = returnData.purchaseReturnItemsDetails;
        if (itemsData && itemsData.length > 0) {
            for (const item of itemsData) {
                // Check if item exists
                const [existingItem] = await connection.execute(
                    "SELECT id FROM purchaseorderreturnitemsdetails WHERE uniquekey = ? AND returnitemsdetailsid = ?",
                    [returnData.uniquekey, item.returnitemsdetailsid]
                );

                if (existingItem.length > 0) {
                    // Update existing item
                    const updateItemQuery = `
                        UPDATE purchaseorderreturnitemsdetails
                        SET unitprice = ?, quantity = ?, totalamount = ?, discountpercent = ?,
                            discountamount = ?, taxableamount = ?, cessamount = ?, cesspercent = ?,
                            taxamount = ?, totaltaxamount = ?, expirydate = STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'),
                            remarks = ?, batchid = ?, batchdate = ?, modifiedby = ?, modifieddate = ?,
                            clientmodifiedby = ?, clientmodifieddate = STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), isdeleted = ?
                        WHERE uniquekey = ? AND returnitemsdetailsid = ?
                    `;

                    await connection.execute(updateItemQuery, [
                        item.unitprice,
                        item.quantity,
                        item.totalamount,
                        item.discountpercent || 0,
                        item.discountamount || 0,
                        item.taxableamount,
                        item.cessamount || null,
                        item.cesspercent || null,
                        item.taxamount || 0,
                        item.totaltaxamount || 0,
                        // item.expirydate || null,
                        convertDateToMySQL(item.expirydate),
                        item.remarks || "",
                        item.batchid || null,
                        // item.batchdate || null,
                        convertDateToMySQL(item.batchdate),
                        null,
                        null,
                        item.modifiedby || null,
                        item.modifieddate || null,
                        item.isdeleted || 0,
                        returnData.uniquekey,
                        item.returnitemsdetailsid,
                    ]);

                    const serverReturnItemsDetailsId = existingItem[0].id;

                    // Update item tax details
                    const taxDetails = item.purchaseReturnItemsTaxDetails;
                    if (taxDetails && taxDetails.length > 0) {
                        for (const taxDetail of taxDetails) {
                            const taxId = taxDetail.id || taxDetail.returnitemstaxdetailsid;

                            // Check if tax detail exists
                            const [existingTax] = await connection.execute(
                                "SELECT id FROM purchaseorderreturnitemstaxdetails WHERE uniquekey = ? AND returnitemstaxdetailsid = ? AND returnitemsdetailsid = ?",
                                [returnData.uniquekey, taxId, item.returnitemsdetailsid]
                            );

                            if (existingTax.length > 0) {
                                // Update existing tax detail
                                const updateTaxQuery = `
                                    UPDATE purchaseorderreturnitemstaxdetails
                                    SET taxamount = ?, taxpercentage = ?, modifiedby = ?, modifieddate = ?,
                                        clientmodifiedby = ?, clientmodifieddate = STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), isdeleted = ?
                                    WHERE uniquekey = ? AND returnitemstaxdetailsid = ? AND returnitemsdetailsid = ?
                                `;

                                await connection.execute(updateTaxQuery, [
                                    taxDetail.taxamount,
                                    taxDetail.taxpercentage,
                                    null,
                                    null,
                                    taxDetail.modifiedby || null,
                                    taxDetail.modifieddate || null,
                                    taxDetail.isdeleted || 0,
                                    returnData.uniquekey,
                                    taxId,
                                    item.returnitemsdetailsid,
                                ]);
                            } else {
                                // Insert new tax detail
                                const insertTaxQuery = `
                                    INSERT INTO purchaseorderreturnitemstaxdetails (
                                        returnitemstaxdetailsid, returnitemsdetailsid, serverreturnitemsdetailsid,
                                        returnid, serverreturnid, locationid, taxid, taxamount, taxpercentage,
                                        isdeleted, uniquekey, companyid, clientcreateddate, clientmodifieddate,
                                        clientcreatedby, clientmodifiedby, createdby, createddate, modifiedby, modifieddate
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
                                `;

                                await connection.execute(insertTaxQuery, [
                                    taxId,
                                    item.returnitemsdetailsid,
                                    serverReturnItemsDetailsId,
                                    returnData.returnid,
                                    serverReturnId,
                                    taxDetail.locationid,
                                    taxDetail.taxid,
                                    taxDetail.taxamount,
                                    taxDetail.taxpercentage,
                                    taxDetail.isdeleted || 0,
                                    taxDetail.uniquekey || returnData.uniquekey,
                                    taxDetail.companyid || returnData.companyid || 0,
                                    taxDetail.createddate || null,
                                    taxDetail.modifieddate || null,
                                    taxDetail.createdby || null,
                                    taxDetail.modifiedby || null,
                                    null,
                                    null,
                                    null,
                                    null,
                                ]);
                            }
                        }
                    }
                } else {
                    // Insert new item (similar to insertPurchaseReturn item logic)
                    const insertItemQuery = `
                        INSERT INTO purchaseorderreturnitemsdetails (
                            returnitemsdetailsid, serverreturnid, returnid, itemid, productuniquekey,
                            taxprofileid, locationid, uomid, unitprice, quantity, totalamount,
                            discountpercent, discountamount, taxableamount, cessamount, cesspercent,
                            taxamount, totaltaxamount, expirydate, isdeleted, ipaddress, remarks,
                            batchid, batchdate, uniquekey, companyid, clientcreateddate,
                            clientmodifieddate, clientcreatedby, clientmodifiedby, createdby,
                            createddate, modifiedby, modifieddate
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
                    `;

                    const [newItemResult] = await connection.execute(insertItemQuery, [
                        item.returnitemsdetailsid,
                        serverReturnId,
                        returnData.returnid,
                        item.itemid,
                        item.productuniquekey || null,
                        item.taxprofileid || null,
                        item.locationid,
                        item.uomid || null,
                        item.unitprice,
                        item.quantity,
                        item.totalamount,
                        item.discountpercent || 0,
                        item.discountamount || 0,
                        item.taxableamount,
                        item.cessamount || null,
                        item.cesspercent || null,
                        item.taxamount || 0,
                        item.totaltaxamount || 0,
                        // item.expirydate || null,
                        convertDateToMySQL(item.expirydate),
                        item.isdeleted || 0,
                        item.ipaddress || returnData.ipaddress,
                        item.remarks || "",
                        item.batchid || null,
                        // item.batchdate || null,
                        convertDateToMySQL(item.batchdate),
                        item.uniquekey || returnData.uniquekey,
                        item.companyid || returnData.companyid || 0,
                        item.createddate || null,
                        item.modifieddate || null,
                        item.createdby || null,
                        item.modifiedby || null,
                        null,
                        null,
                        null,
                        null,
                    ]);

                    const serverReturnItemsDetailsId = newItemResult.insertId;

                    // Insert tax details for new item
                    const taxDetails = item.purchaseReturnItemsTaxDetails;
                    if (taxDetails && taxDetails.length > 0) {
                        for (const taxDetail of taxDetails) {
                            const taxQuery = `
                                INSERT INTO purchaseorderreturnitemstaxdetails (
                                    returnitemstaxdetailsid, returnitemsdetailsid, serverreturnitemsdetailsid,
                                    returnid, serverreturnid, locationid, taxid, taxamount, taxpercentage,
                                    isdeleted, uniquekey, companyid, clientcreateddate, clientmodifieddate,
                                    clientcreatedby, clientmodifiedby, createdby, createddate, modifiedby, modifieddate
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
                            `;

                            await connection.execute(taxQuery, [
                                taxDetail.id || taxDetail.returnitemstaxdetailsid,
                                item.returnitemsdetailsid,
                                serverReturnItemsDetailsId,
                                returnData.returnid,
                                serverReturnId,
                                taxDetail.locationid,
                                taxDetail.taxid,
                                taxDetail.taxamount,
                                taxDetail.taxpercentage,
                                taxDetail.isdeleted || 0,
                                taxDetail.uniquekey || returnData.uniquekey,
                                taxDetail.companyid || returnData.companyid || 0,
                                taxDetail.createddate || null,
                                taxDetail.modifieddate || null,
                                taxDetail.createdby || null,
                                taxDetail.modifiedby || null,
                                null,
                                null,
                                null,
                                null,
                            ]);
                        }
                    }
                }
            }
        }

        return 1;
    },
};

module.exports = purchaseReturnModel;
