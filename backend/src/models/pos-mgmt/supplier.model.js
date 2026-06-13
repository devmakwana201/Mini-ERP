const db = require("../../config/db");
const winston = require("../../config/winston");
const { retryTransaction } = require("../../utils/dbRetry");
const imageHelper = require("../../helpers/imageHelper");

const supplierModel = {
    /**
     * Save suppliers (insert or update)
     * @param {Array} suppliers - Array of supplier objects
     * @returns {Object} Result object with success status and data
     */
    async saveSuppliers(suppliers) {
        const convertDateToMySQL = (dateStr) => {
            if (!dateStr || dateStr.toString().trim() === "") return null;
            const str = dateStr.toString().trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
            if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
                return str.split('T')[0];
            }
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
                const [day, month, year] = str.split("/");
                return `${year}-${month}-${day}`;
            }
            if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
                const [day, month, year] = str.split("-");
                return `${year}-${month}-${day}`;
            }
            return null;
        };

        try {
            return await retryTransaction(
                async (connection) => {
                    const results = [];

                    for (const supplier of suppliers) {
                        try {
                            let existingSupplier;
                            try {
                                [existingSupplier] = await connection.execute(
                                    "SELECT id FROM suppliermaster WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE NOWAIT",
                                    [supplier.uniquekey]
                                );
                            } catch (err) {
                                if (err.errno === 3572) { // ER_LOCK_NOWAIT
                                    [existingSupplier] = await connection.execute(
                                        "SELECT id FROM suppliermaster WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE",
                                        [supplier.uniquekey]
                                    );
                                } else {
                                    throw err;
                                }
                            }

                    if (existingSupplier.length > 0) {
                        const updateQuery = `
                            UPDATE suppliermaster
                            SET suppliername = ?, address = ?, gstno = ?, panno = ?, vatno = ?,
                                phoneno = ?, email = ?, pincode = ?, contactperson = ?,
                                countryid = ?, stateid = ?, cityid = ?, supplierimage = ?,
                                outstandingamt = ?, overduelimit = ?, uniquekey = ?,
                                seedslicensenumber = ?, seedslicensedate = ?,
                                fertilizerlicensenumber = ?, fertilizerlicensedate = ?,
                                pesticideslicensenumber = ?, pesticideslicensedate = ?,
                                isactive = ?, isapproved = ?, approvalremark = ?, replacewith = ?,
                                licensetype = ?, isdeleted = ?, ipaddress = ?,
                                clientmodifieddate = ?,
                                clientmodifiedby = ?, modifiedby = ?, modifieddate = ?
                            WHERE supplierid = ?
                        `;
                        await connection.execute(updateQuery, [
                            supplier.suppliername || null,
                            supplier.address || null,
                            supplier.gstno || null,
                            supplier.panno || null,
                            supplier.vatno || null,
                            supplier.phoneno || null,
                            supplier.email || null,
                            supplier.pincode || null,
                            supplier.contactperson || null,
                            supplier.countryid || null,
                            supplier.stateid || null,
                            supplier.cityid || null,
                            supplier.supplierimage || null,
                            supplier.outstandingamt || 0,
                            supplier.overduelimit || 0,
                            supplier.uniquekey || null,
                            supplier.seedslicensenumber || null,
                            convertDateToMySQL(supplier.seedslicensedate),
                            supplier.fertilizerlicensenumber || null,
                            convertDateToMySQL(supplier.fertilizerlicensedate),
                            supplier.pesticideslicensenumber || null,
                            convertDateToMySQL(supplier.pesticideslicensedate),
                            supplier.isactive !== undefined ? supplier.isactive : 1,
                            supplier.isapproved !== undefined ? supplier.isapproved : 0,
                            supplier.approvalremark || null,
                            supplier.replacewith || null,
                            supplier.licensetype || null,
                            supplier.isdeleted || 0,
                            supplier.ipaddress || null,
                            supplier.modifieddate || null,
                            supplier.modifiedby || null,
                            null, null,
                            supplier.supplierid,
                        ]);
                        results.push({
                            supplierid: supplier.supplierid,
                            issynced: 1,
                            message: "Supplier updated successfully",
                        });
                    } else {
                        const insertQuery = `
                            INSERT INTO suppliermaster (
                                supplierid, suppliername, address, gstno, panno, vatno,
                                phoneno, email, pincode, contactperson, countryid, stateid,
                                cityid, supplierimage, outstandingamt,
                                overduelimit, uniquekey, seedslicensenumber, seedslicensedate,
                                fertilizerlicensenumber, fertilizerlicensedate, pesticideslicensenumber,
                                pesticideslicensedate, isactive, isapproved, approvalremark,
                                replacewith, licensetype, isdeleted, ipaddress,
                                clientcreateddate, clientmodifieddate, clientcreatedby,
                                clientmodifiedby, createdby, createddate, modifiedby, modifieddate
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                        await connection.execute(insertQuery, [
                            supplier.supplierid,
                            supplier.suppliername || null,
                            supplier.address || null,
                            supplier.gstno || null,
                            supplier.panno || null,
                            supplier.vatno || null,
                            supplier.phoneno || null,
                            supplier.email || null,
                            supplier.pincode || null,
                            supplier.contactperson || null,
                            supplier.countryid || null,
                            supplier.stateid || null,
                            supplier.cityid || null,
                            supplier.supplierimage || null,
                            supplier.outstandingamt || 0,
                            supplier.overduelimit || 0,
                            supplier.uniquekey || null,
                            supplier.seedslicensenumber || null,
                            convertDateToMySQL(supplier.seedslicensedate),
                            supplier.fertilizerlicensenumber || null,
                            convertDateToMySQL(supplier.fertilizerlicensedate),
                            supplier.pesticideslicensenumber || null,
                            convertDateToMySQL(supplier.pesticideslicensedate),
                            supplier.isactive !== undefined ? supplier.isactive : 1,
                            supplier.isapproved !== undefined ? supplier.isapproved : 0,
                            supplier.approvalremark || null,
                            supplier.replacewith || null,
                            supplier.licensetype || null,
                            supplier.isdeleted || 0,
                            supplier.ipaddress || null,
                            supplier.createddate || null,
                            supplier.modifieddate || null,
                            supplier.createdby || null,
                            supplier.modifiedby || null,
                            null, null, null, null,
                        ]);
                        results.push({
                            supplierid: supplier.supplierid,
                            issynced: 1,
                            message: "Supplier saved successfully",
                        });
                    }
                } catch (error) {
                    winston.error(`Error saving supplier`, {
                        source: "supplier.model.js",
                        function: "saveSuppliers",
                        supplierid: supplier.supplierid,
                        error: error.message,
                        code: error.code,
                        errno: error.errno,
                        stack: error.stack
                    });
                    results.push({
                        supplierid: supplier.supplierid,
                        issynced: 0,
                        message: "Failed to save supplier",
                        error: error.message,
                    });
                }
                    }

                    return { success: true, data: results };
                },
                {
                    maxRetries: 3,
                    operationName: `Supplier save (batch of ${suppliers.length})`,
                }
            );
        } catch (error) {
            winston.error(`Error saving suppliers`, {
                source: "supplier.model.js",
                function: "saveSuppliers",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return { success: false, message: "Failed to save suppliers", error: error.message };
        }
    },

    async saveSupplierAccountDetails(supplierAccountDetails) {
        try {
            return await retryTransaction(
                async (connection) => {
                    const results = [];

                    for (const detail of supplierAccountDetails) {
                        try {
                            let existingDetail;
                            try {
                                [existingDetail] = await connection.execute(
                                    "SELECT id FROM supplieraccountdetails WHERE supplieraccountid = ? AND locationid = ? AND isdeleted = 0 FOR UPDATE NOWAIT",
                                    [detail.supplieraccountid, detail.locationid]
                                );
                            } catch (err) {
                                if (err.errno === 3572) { // ER_LOCK_NOWAIT
                                    [existingDetail] = await connection.execute(
                                        "SELECT id FROM supplieraccountdetails WHERE supplieraccountid = ? AND locationid = ? AND isdeleted = 0 FOR UPDATE",
                                        [detail.supplieraccountid, detail.locationid]
                                    );
                                } else {
                                    throw err;
                                }
                            }

                    if (existingDetail.length > 0) {
                        // Update existing supplier account detail
                        const updateQuery = `
                            UPDATE supplieraccountdetails
                            SET supplierid = ?, creditamount = ?,
                                debitamount = ?, balance = ?, paymentdate = ?,
                                datekey = ?, description = ?,
                                paymodeid = ?, purchaseorderid = ?,
                                shiftid = ?, txntype = ?, isdeleted = ?, companyid = ?,
                                supplieruniquekey = ?, purchaseorderuniquekey = ?, shiftuniquekey = ?,
                                clientmodifieddate = ?,
                                clientmodifiedby = ?, modifiedby = ?, modifieddate = ?
                            WHERE supplieraccountid = ? AND locationid = ?
                        `;

                        await connection.execute(updateQuery, [
                            detail.supplierid,
                            detail.creditamount || 0,
                            detail.debitamount || 0,
                            detail.balance || null,
                            detail.paymentdate || null,
                            detail.datekey || null,
                            detail.description || null,
                            detail.paymodeid || null,
                            detail.purchaseorderid || null,
                            detail.shiftid || null,
                            detail.txntype || null,
                            detail.isdeleted || 0,
                            detail.companyid || null,
                            detail.supplieruniquekey || null,
                            detail.purchaseorderuniquekey || null,
                            detail.shiftuniquekey || null,
                            detail.modifieddate || null,
                            detail.modifiedby || null,
                            null,
                            null,
                            detail.supplieraccountid,
                            detail.locationid,
                        ]);
                        results.push({
                            supplieraccountid: detail.supplieraccountid,
                            locationid: detail.locationid,
                            issynced: 1,
                            message: "Supplier account detail updated successfully",
                        });
                    } else {
                        const insertQuery = `
                            INSERT INTO supplieraccountdetails (
                                supplieraccountid, supplierid, creditamount, debitamount,
                                balance, paymentdate, datekey, description,
                                locationid, paymodeid, purchaseorderid, shiftid, txntype,
                                isdeleted, companyid, supplieruniquekey, purchaseorderuniquekey, shiftuniquekey,
                                clientcreateddate, clientmodifieddate, clientcreatedby, clientmodifiedby,
                                createdby, createddate, modifiedby, modifieddate
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;

                        await connection.execute(insertQuery, [
                            detail.supplieraccountid,
                            detail.supplierid,
                            detail.creditamount || 0,
                            detail.debitamount || 0,
                            detail.balance || null,
                            detail.paymentdate || null,
                            detail.datekey || null,
                            detail.description || null,
                            detail.locationid,
                            detail.paymodeid || null,
                            detail.purchaseorderid || null,
                            detail.shiftid || null,
                            detail.txntype || null,
                            detail.isdeleted || 0,
                            detail.companyid || null,
                            detail.supplieruniquekey || null,
                            detail.purchaseorderuniquekey || null,
                            detail.shiftuniquekey || null,
                            detail.createddate || null,
                            detail.modifieddate || null,
                            detail.createdby || null,
                            detail.modifiedby || null,
                            null, null, null, null,
                        ]);
                        results.push({
                            supplieraccountid: detail.supplieraccountid,
                            locationid: detail.locationid,
                            issynced: 1,
                            message: "Supplier account detail saved successfully",
                        });
                    }
                } catch (error) {
                    winston.error(`Error saving supplier account detail`, {
                        source: "supplier.model.js",
                        function: "saveSupplierAccountDetails",
                        supplieraccountid: detail.supplieraccountid,
                        locationid: detail.locationid,
                        error: error.message,
                        code: error.code,
                        errno: error.errno,
                        stack: error.stack
                    });
                    results.push({
                        supplieraccountid: detail.supplieraccountid,
                        locationid: detail.locationid,
                        issynced: 0,
                        message: "Failed to save supplier account detail",
                        error: error.message,
                    });
                }
                    }

                    return { success: true, data: results };
                },
                {
                    maxRetries: 3,
                    operationName: `Supplier account details save (batch of ${supplierAccountDetails.length})`,
                }
            );
        } catch (error) {
            winston.error(`Error saving supplier account details`, {
                source: "supplier.model.js",
                function: "saveSupplierAccountDetails",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return { success: false, message: "Failed to save supplier account details", error: error.message };
        }
    },

    /**
     * Map suppliers to company (insert or update company_suppliermaster)
     * Companies can only MAP approved suppliers, not modify supplier details
     * Uses UPSERT for atomic operations - production ready
     *
     * @param {Object} payload - { companyid, suppliers: [{supplierid, uniquekey}] }
     * @returns {Object} Result with success/failure counts
     */
    async supplierMapping(payload) {
        try {
            const { companyid, suppliers = [] } = payload;

            if (!companyid) {
                return {
                    success: false,
                    message: "companyid is required"
                };
            }

            if (!Array.isArray(suppliers) || suppliers.length === 0) {
                return {
                    success: false,
                    message: "suppliers array is required and cannot be empty"
                };
            }

            const results = {
                success: true,
                totalSuppliers: suppliers.length,
                insertedCount: 0,
                updatedCount: 0,
                failedCount: 0,
                successCount: 0,
                details: []
            };

            // Process each supplier with UPSERT (single atomic query per supplier)
            for (const supplier of suppliers) {
                try {
                    const result = await retryTransaction(
                        async (connection) => {
                            const currDate = new Date()
                                .toISOString()
                                .slice(0, 19)
                                .replace("T", " ");

                            // Verify supplier exists and is approved (only approved suppliers can be mapped)
                            const [supplierCheck] = await connection.execute(
                                `SELECT supplierid, suppliername, isapproved, isdeleted
                                 FROM suppliermaster
                                 WHERE supplierid = ? AND isapproved = 1 AND isdeleted = 0`,
                                [supplier.supplierid]
                            );

                            if (supplierCheck.length === 0) {
                                throw new Error(
                                    `Supplier ID ${supplier.supplierid} not found or not approved`
                                );
                            }

                            // UPSERT: Insert new or update existing (atomic, no race conditions)
                            // Uses unique key (companyid, supplierid, isdeleted) to determine insert vs update
                            const upsertQuery = `
                                INSERT INTO company_suppliermaster (
                                    companyid, supplierid, uniquekey,
                                    isactive, outstandingamt, issync, lastsyncdate,
                                    createdby, createddate, modifiedby, modifieddate,
                                    ipaddress, isdeleted
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                ON DUPLICATE KEY UPDATE
                                    uniquekey = VALUES(uniquekey),
                                    isactive = VALUES(isactive),
                                    outstandingamt = VALUES(outstandingamt),
                                    issync = VALUES(issync),
                                    lastsyncdate = VALUES(lastsyncdate),
                                    modifiedby = VALUES(modifiedby),
                                    modifieddate = VALUES(modifieddate)
                            `;

                            const [upsertResult] = await connection.execute(upsertQuery, [
                                companyid,
                                supplier.supplierid,
                                supplier.uniquekey || null,
                                supplier.isactive ?? 1, // Use payload value or default to 1
                                supplier.outstandingamt ?? 0, // Company-specific outstanding amount
                                1, // issync
                                currDate,
                                supplier.createdby || 1,
                                currDate,
                                supplier.modifiedby || supplier.createdby || 1,
                                currDate,
                                supplier.ipaddress || null,
                                0 // isdeleted
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
                                supplierid: supplier.supplierid,
                                suppliername: supplierCheck[0].suppliername
                            };
                        },
                        {
                            maxRetries: 3,
                            operationName: `Supplier mapping (supplierid: ${supplier.supplierid})`,
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
                            supplierid: result.supplierid,
                            suppliername: result.suppliername,
                            operation: result.operation,
                            status: "success"
                        });

                        winston.info(`Supplier mapped successfully`, {
                            source: "supplier.model.js",
                            function: "supplierMapping",
                            companyid,
                            supplierid: result.supplierid,
                            operation: result.operation
                        });
                    }
                } catch (error) {
                    results.failedCount++;
                    results.details.push({
                        supplierid: supplier.supplierid,
                        error: error.message,
                        status: "failed"
                    });

                    winston.error(`Failed to map supplier: ${error.message}`, {
                        source: "supplier.model.js",
                        function: "supplierMapping",
                        companyid,
                        supplierid: supplier.supplierid,
                        error: error.message
                    });
                }
            }

            winston.info(`Supplier mapping batch completed`, {
                source: "supplier.model.js",
                function: "supplierMapping",
                companyid,
                total: results.totalSuppliers,
                success: results.successCount,
                inserted: results.insertedCount,
                updated: results.updatedCount,
                failed: results.failedCount
            });

            return results;
        } catch (error) {
            winston.error(`Error in supplier mapping: ${error.message}`, {
                source: "supplier.model.js",
                function: "supplierMapping",
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                message: "Failed to process supplier mapping",
                error: error.message
            };
        }
    },

    /**
     * Check approval status for multiple suppliers (webhook for POS)
     * Used by POS cron to check if suppliers have been approved/rejected
     *
     * @param {Array} uniquekeys - Array of uniquekeys to check
     * @returns {Object} Result with status for each supplier
     */
    async checkApprovalStatus(uniquekeys) {
        try {
            if (!uniquekeys || !Array.isArray(uniquekeys) || uniquekeys.length === 0) {
                return {
                    success: false,
                    message: "uniquekeys array is required and cannot be empty"
                };
            }

            // Query suppliers by uniquekey array
            const placeholders = uniquekeys.map(() => "?").join(",");
            const sql = `
                SELECT
                    id,
                    suppliername,
                    address,
                    gstno,
                    phoneno,
                    email,
                    companyid,
                    uniquekey,
                    isapproved,
                    approvalremark,
                    isdeleted,
                    createddate,
                    modifieddate
                FROM suppliermaster
                WHERE uniquekey IN (${placeholders})
            `;

            const suppliers = await db.getResults(sql, uniquekeys);

            // Process each uniquekey
            const results = uniquekeys.map((uniquekey) => {
                const supplier = suppliers.find((s) => s.uniquekey.toString() === uniquekey.toString());

                // Status 1: Supplier not found
                if (!supplier) {
                    return {
                        uniquekey,
                        status: "not_found",
                        message: "Supplier does not exist in the system",
                        data: null
                    };
                }

                // Status 2: Approved
                if (supplier.isapproved === 1 && supplier.isdeleted === 0) {
                    return {
                        uniquekey,
                        status: "approved",
                        message: "Supplier has been approved",
                        data: {
                            supplierid: supplier.id,
                            suppliername: supplier.suppliername,
                            address: supplier.address,
                            approvalremark: supplier.approvalremark,
                            modifieddate: supplier.modifieddate
                        }
                    };
                }

                // Status 3: Rejected (soft deleted)
                if (supplier.isdeleted === 1) {
                    return {
                        uniquekey,
                        status: "rejected",
                        message: "Supplier was rejected and has been removed",
                        rejectionremark: supplier.approvalremark || "",
                        data: {
                            supplierid: supplier.id,
                            suppliername: supplier.suppliername,
                            rejectionremark: supplier.approvalremark
                        }
                    };
                }

                // Status 4: Pending (no decision yet)
                if (supplier.isapproved === 0 && supplier.isdeleted === 0) {
                    return {
                        uniquekey,
                        status: "pending",
                        message: "Supplier is still awaiting approval",
                        data: {
                            supplierid: supplier.id,
                            suppliername: supplier.suppliername,
                            createddate: supplier.createddate
                        }
                    };
                }

                // Fallback for unexpected states
                return {
                    uniquekey,
                    status: "unknown",
                    message: "Supplier status could not be determined",
                    data: {
                        supplierid: supplier.id,
                        isapproved: supplier.isapproved,
                        isdeleted: supplier.isdeleted
                    }
                };
            });

            winston.info("Approval status checked for suppliers", {
                source: "supplier.model.js",
                function: "checkApprovalStatus",
                totalSuppliers: uniquekeys.length,
                results: results.map((r) => ({ uniquekey: r.uniquekey, status: r.status }))
            });

            return {
                success: true,
                message: `Checked status for ${uniquekeys.length} supplier(s)`,
                data: results
            };
        } catch (error) {
            winston.error(`Error checking supplier approval status: ${error.message}`, {
                source: "supplier.model.js",
                function: "checkApprovalStatus",
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                message: "Failed to check supplier approval status",
                error: error.message
            };
        }
    }
};

module.exports = supplierModel;
