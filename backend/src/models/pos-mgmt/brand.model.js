const db = require("../../config/db");
const winston = require("../../config/winston");
const { retryTransaction } = require("../../utils/dbRetry");
const imageHelper = require("../../helpers/imageHelper");

const brandModel = {
    /**
     * Map brands to company (insert or update company_brandmaster)
     * Companies can only MAP approved brands, not modify brand details
     * Uses UPSERT for atomic operations - production ready
     *
     * @param {Object} payload - { companyid, brands: [{brandid, uniquekey}] }
     * @returns {Object} Result with success/failure counts
     */
    async brandMapping(payload) {
        try {
            const { companyid, brands = [] } = payload;

            if (!companyid) {
                return {
                    success: false,
                    message: "companyid is required",
                };
            }

            if (!Array.isArray(brands) || brands.length === 0) {
                return {
                    success: false,
                    message: "brands array is required and cannot be empty",
                };
            }

            const results = {
                success: true,
                totalBrands: brands.length,
                insertedCount: 0,
                updatedCount: 0,
                failedCount: 0,
                successCount: 0,
                details: [],
            };

            // Process each brand with UPSERT (single atomic query per brand)
            for (const brand of brands) {
                try {
                    const result = await retryTransaction(
                        async (connection) => {
                            const currDate = new Date()
                                .toISOString()
                                .slice(0, 19)
                                .replace("T", " ");

                            // Verify brand exists and is approved (only approved brands can be mapped)
                            const [brandCheck] = await connection.execute(
                                `SELECT brandid, brandname, isapproved, isdeleted
                                 FROM brandmaster
                                 WHERE brandid = ? AND isapproved = 1 AND isdeleted = 0`,
                                [brand.brandid]
                            );

                            if (brandCheck.length === 0) {
                                throw new Error(
                                    `Brand ID ${brand.brandid} not found or not approved`
                                );
                            }

                            // UPSERT: Insert new or update existing (atomic, no race conditions)
                            // Uses unique key (companyid, brandid, isdeleted) to determine insert vs update
                            const upsertQuery = `
                                INSERT INTO company_brandmaster (
                                    companyid, brandid, uniquekey,
                                    isactive, issync, lastsyncdate,
                                    createdby, createddate, modifiedby, modifieddate,
                                    ipaddress, isdeleted
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                ON DUPLICATE KEY UPDATE
                                    uniquekey = VALUES(uniquekey),
                                    isactive = VALUES(isactive),
                                    issync = VALUES(issync),
                                    lastsyncdate = VALUES(lastsyncdate),
                                    modifiedby = VALUES(modifiedby),
                                    modifieddate = VALUES(modifieddate)
                            `;

                            const [upsertResult] = await connection.execute(upsertQuery, [
                                companyid,
                                brand.brandid,
                                brand.uniquekey || null,
                                brand.isactive ?? 1, // Use payload value or default to 1
                                1, // issync
                                currDate,
                                brand.createdby || 1,
                                currDate,
                                brand.modifiedby || brand.createdby || 1,
                                currDate,
                                brand.ipaddress || null,
                                0, // isdeleted
                            ]);

                            // affectedRows = 1 means INSERT, affectedRows = 2 means UPDATE
                            const wasInsert = upsertResult.affectedRows === 1;
                            const wasUpdate = upsertResult.affectedRows === 2;

                            return {
                                success: true,
                                operation: wasInsert
                                    ? "insert"
                                    : wasUpdate
                                    ? "update"
                                    : "no-change",
                                brandid: brand.brandid,
                                brandname: brandCheck[0].brandname,
                            };
                        },
                        {
                            maxRetries: 3,
                            operationName: `Brand mapping (brandid: ${brand.brandid})`,
                        }
                    );

                    if (result.success) {
                        results.successCount++;
                        if (result.operation === "insert") {
                            results.insertedCount++;
                        } else if (result.operation === "update") {
                            results.updatedCount++;
                        }

                        results.details.push({
                            brandid: result.brandid,
                            brandname: result.brandname,
                            operation: result.operation,
                            status: "success",
                        });

                        winston.info(`Brand mapped successfully`, {
                            source: "brand.model.js",
                            function: "brandMapping",
                            companyid,
                            brandid: result.brandid,
                            operation: result.operation,
                        });
                    }
                } catch (error) {
                    results.failedCount++;
                    results.details.push({
                        brandid: brand.brandid,
                        error: error.message,
                        status: "failed",
                    });

                    winston.error(`Failed to map brand: ${error.message}`, {
                        source: "brand.model.js",
                        function: "brandMapping",
                        companyid,
                        brandid: brand.brandid,
                        error: error.message,
                    });
                }
            }

            winston.info(`Brand mapping batch completed`, {
                source: "brand.model.js",
                function: "brandMapping",
                companyid,
                total: results.totalBrands,
                success: results.successCount,
                inserted: results.insertedCount,
                updated: results.updatedCount,
                failed: results.failedCount,
            });

            return results;
        } catch (error) {
            winston.error(`Error in brand mapping: ${error.message}`, {
                source: "brand.model.js",
                function: "brandMapping",
                error: error.message,
                stack: error.stack,
            });

            return {
                success: false,
                message: "Failed to process brand mapping",
                error: error.message,
            };
        }
    },

    /**
     * Save brand (insert or update) from POS sync
     * @param {Object} brand - Brand object
     * @returns {Object} Result object with success status and data
     */
    async saveBrand(brand) {
        try {
            // Log incoming brand data for debugging
            winston.debug(`saveBrand called with uniquekey: ${brand.uniquekey}`, {
                source: "brand.model.js",
                function: "saveBrand",
            });

            // Process base64 image if provided
            let brandIconPath = brand.brandicon || null;

            if (brand.base64Image && typeof brand.base64Image === "string") {
                try {
                    // Validate base64 image first
                    const validation = imageHelper.validateBase64Image(brand.base64Image);

                    if (!validation.valid) {
                        winston.warn(
                            `Invalid brand image for ${brand.brandname}: ${validation.error}`,
                            {
                                source: "brand.model.js",
                                function: "saveBrand",
                            }
                        );
                        // Continue without image, don't fail the entire sync
                        brandIconPath = null;
                    } else {
                        // Process and save image
                        brandIconPath = await imageHelper.processBase64Image(
                            brand.base64Image,
                            "brands/icons",
                            "brand"
                        );
                        winston.info(`Brand image processed: ${brandIconPath}`, {
                            source: "brand.model.js",
                            function: "saveBrand",
                        });
                    }
                } catch (imgError) {
                    winston.error(
                        `Error processing brand image for ${brand.brandname}: ${imgError.message}`,
                        {
                            source: "brand.model.js",
                            function: "saveBrand",
                            error: imgError.message,
                            code: imgError.code,
                            errno: imgError.errno,
                            stack: imgError.stack,
                        }
                    );
                    // Continue without image, don't fail sync
                    brandIconPath = null;
                }

                // Clear base64 from memory immediately
                delete brand.base64Image;
            }

            return await retryTransaction(
                async (connection) => {
                    const currDate = new Date().toISOString().slice(0, 19).replace("T", " ");

                    // NOTE: Companies can only ADD new brands, NOT modify existing ones
                    // Always insert new brand and set isapproved=0 for support team review

                    winston.debug(`Inserting new brand with uniquekey: ${brand.uniquekey}`, {
                        source: "brand.model.js",
                        function: "saveBrand",
                    });

                    const insertQuery = `
                        INSERT INTO brandmaster (
                            brandname, branddesc, brandcategory, brandicon, companyid,
                            isapproved, approvalremark, replacewith, uniquekey, issync,
                            ipaddress, createdby, createddate, modifiedby, modifieddate, isdeleted
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    const [result] = await connection.execute(insertQuery, [
                        brand.brandname || null,
                        brand.branddesc || null,
                        brand.brandcategory || null,
                        brandIconPath, // Use processed image path
                        brand.companyid,
                        0, // isapproved = 0 (needs approval)
                        brand.approvalremark || null,
                        brand.replacewith || null,
                        brand.uniquekey || null,
                        1, // issync = 1 for synced data
                        brand.ipaddress || null,
                        brand.createdby || 1,
                        currDate,
                        brand.modifiedby || brand.createdby || 1,
                        currDate,
                        brand.isdeleted || 0,
                    ]);

                    winston.info("Brand inserted from POS sync (pending approval)", {
                        source: "brand.model.js",
                        function: "saveBrand",
                        brandid: result.insertId,
                        brandname: brand.brandname,
                        companyid: brand.companyid,
                    });

                    return {
                        success: true,
                        issynced: 1,
                        message: "Brand synced successfully, pending approval",
                        data: {
                            serverBrandId: result.insertId,
                            uniquekey: brand.uniquekey,
                            companyid: brand.companyid,
                            isapproved: 0, // Pending approval
                        },
                    };
                },
                {
                    maxRetries: 3,
                    operationName: `Brand insert (${brand.uniquekey})`,
                }
            );
        } catch (error) {
            winston.error(`Error saving brand from POS sync: ${error.message}`, {
                source: "brand.model.js",
                function: "saveBrand",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                brandname: brand.brandname,
            });

            return {
                success: false,
                issynced: 0,
                message: "Failed to save brand",
                error: error.message,
            };
        }
    },

    /**
     * Check approval status for multiple brands (webhook for POS)
     * Used by POS cron to check if brands have been approved/rejected
     *
     * @param {Array} uniquekeys - Array of uniquekeys to check
     * @returns {Object} Result with status for each brand
     */
    async checkApprovalStatus(uniquekeys) {
        try {
            if (!uniquekeys || !Array.isArray(uniquekeys) || uniquekeys.length === 0) {
                return {
                    success: false,
                    message: "uniquekeys array is required and cannot be empty",
                };
            }

            // Query brands by uniquekey array
            const placeholders = uniquekeys.map(() => "?").join(",");
            const sql = `
                SELECT
                    brandid,
                    brandname,
                    branddesc,
                    brandcategory,
                    brandicon,
                    companyid,
                    uniquekey,
                    isapproved,
                    approvalremark,
                    isdeleted,
                    createddate,
                    modifieddate
                FROM brandmaster
                WHERE uniquekey IN (${placeholders})
            `;

            const brands = await db.getResults(sql, uniquekeys);

            // Process each uniquekey
            const results = uniquekeys.map((uniquekey) => {
                const brand = brands.find((b) => b.uniquekey === uniquekey);

                // Status 1: Brand not found
                if (!brand) {
                    return {
                        uniquekey,
                        status: "not_found",
                        message: "Brand does not exist in the system",
                        data: null,
                    };
                }

                // Status 2: Approved
                if (brand.isapproved === 1 && brand.isdeleted === 0) {
                    return {
                        uniquekey,
                        status: "approved",
                        message: "Brand has been approved",
                        data: {
                            brandid: brand.brandid,
                            brandname: brand.brandname,
                            branddesc: brand.branddesc,
                            approvalremark: brand.approvalremark,
                            modifieddate: brand.modifieddate,
                        },
                    };
                }

                // Status 3: Rejected (soft deleted)
                if (brand.isdeleted === 1) {
                    return {
                        uniquekey,
                        status: "rejected",
                        message: "Brand was rejected and has been removed",
                        rejectionremark: brand.approvalremark || "",
                        data: {
                            brandid: brand.brandid,
                            brandname: brand.brandname,
                            rejectionremark: brand.approvalremark,
                        },
                    };
                }

                // Status 4: Pending (no decision yet)
                if (brand.isapproved === 0 && brand.isdeleted === 0) {
                    return {
                        uniquekey,
                        status: "pending",
                        message: "Brand is still awaiting approval",
                        data: {
                            brandid: brand.brandid,
                            brandname: brand.brandname,
                            createddate: brand.createddate,
                        },
                    };
                }

                // Fallback for unexpected states
                return {
                    uniquekey,
                    status: "unknown",
                    message: "Brand status could not be determined",
                    data: {
                        brandid: brand.brandid,
                        isapproved: brand.isapproved,
                        isdeleted: brand.isdeleted,
                    },
                };
            });

            winston.info("Approval status checked for brands", {
                source: "brand.model.js",
                function: "checkApprovalStatus",
                totalBrands: uniquekeys.length,
                results: results.map((r) => ({ uniquekey: r.uniquekey, status: r.status })),
            });

            return {
                success: true,
                message: `Checked status for ${uniquekeys.length} brand(s)`,
                data: results,
            };
        } catch (error) {
            winston.error(`Error checking brand approval status: ${error.message}`, {
                source: "brand.model.js",
                function: "checkApprovalStatus",
                error: error.message,
                stack: error.stack,
            });

            return {
                success: false,
                message: "Failed to check brand approval status",
                error: error.message,
            };
        }
    },
};

module.exports = brandModel;
