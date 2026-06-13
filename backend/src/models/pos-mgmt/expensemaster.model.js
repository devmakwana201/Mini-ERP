const db = require("../../config/db");
const winston = require("../../config/winston");
const { retryTransaction } = require("../../utils/dbRetry");

const convertDateTimeToMySQL = (dateStr) => {
    if (!dateStr || dateStr.toString().trim() === "") return null;
    const str = dateStr.toString().trim();
    // Already in MySQL DATETIME format
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) return str;
    // MySQL DATE format - add time
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str + " 00:00:00";
    // ISO format (2025-09-24T12:19:11.000Z) - convert to MySQL DATETIME
    if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
        return str.slice(0, 19).replace("T", " ");
    }
    return null;
};

const expenseMasterModel = {
    /**
     * Sync expense master records (insert or update)
     * @param {Array} expenseMaster - Array of expense master objects
     * @returns {Object} Result object with success status and data
     */
    async syncExpenseMaster(expenseMaster) {
        try {
            return await retryTransaction(
                async (connection) => {
                    const results = [];

                    for (const expense of expenseMaster) {
                        try {
                            let existing;
                            try {
                                [existing] = await connection.execute(
                                    "SELECT id FROM expensemaster WHERE uniquekey = ? AND companyid = ? FOR UPDATE NOWAIT",
                                    [expense.uniquekey, expense.companyid]
                                );
                            } catch (err) {
                                if (err.errno === 3572) {
                                    // ER_LOCK_NOWAIT
                                    [existing] = await connection.execute(
                                        "SELECT id FROM expensemaster WHERE uniquekey = ? AND companyid = ? FOR UPDATE",
                                        [expense.uniquekey, expense.companyid]
                                    );
                                } else {
                                    throw err;
                                }
                            }

                            if (existing.length > 0) {
                                // Update existing record
                                const updateQuery = `
                            UPDATE expensemaster
                            SET expid = ?, expname = ?, expdisplayname = ?, expdescription = ?,
                                isdeleted = ?, ipaddress = ?, clientmodifieddate = ?,
                                clientmodifiedby = ?, modifiedby = ?, modifieddate = ?
                            WHERE uniquekey = ? AND companyid = ?
                        `;
                                await connection.execute(updateQuery, [
                                    expense.expid,
                                    expense.expname,
                                    expense.expdisplayname,
                                    expense.expdescription,
                                    expense.isdeleted,
                                    expense.ipaddress,
                                    convertDateTimeToMySQL(expense.modifieddate),
                                    expense.modifiedby,
                                    null,
                                    null,
                                    expense.uniquekey,
                                    expense.companyid,
                                ]);
                                results.push({
                                    uniquekey: expense.uniquekey,
                                    issynced: 1,
                                    message: "Expense master updated successfully",
                                });
                            } else {
                                // Insert new record
                                const insertQuery = `
                            INSERT INTO expensemaster (
                                expid, expname, expdisplayname, expdescription, isdeleted,
                                ipaddress, companyid, uniquekey, clientcreateddate,
                                clientmodifieddate, clientcreatedby, clientmodifiedby,
                                createdby, createddate
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                                await connection.execute(insertQuery, [
                                    expense.expid,
                                    expense.expname,
                                    expense.expdisplayname,
                                    expense.expdescription,
                                    expense.isdeleted,
                                    expense.ipaddress,
                                    expense.companyid,
                                    expense.uniquekey,
                                    convertDateTimeToMySQL(expense.createddate),
                                    convertDateTimeToMySQL(expense.modifieddate),
                                    expense.createdby,
                                    expense.modifiedby,
                                    null,
                                    null,
                                ]);
                                results.push({
                                    uniquekey: expense.uniquekey,
                                    issynced: 1,
                                    message: "Expense master created successfully",
                                });
                            }
                        } catch (error) {
                            winston.error(`Error syncing expense master: ${error.message}`, {
                                source: "expensemaster.model.js",
                                function: "syncExpenseMaster",
                                error: error.message,
                                code: error.code,
                                errno: error.errno,
                                stack: error.stack,
                                uniquekey: expense.uniquekey,
                            });
                            results.push({
                                uniquekey: expense.uniquekey,
                                issynced: 0,
                                message: "Failed to sync expense master",
                                error: error.message,
                            });
                        }
                    }

                    return { success: true, data: results };
                },
                {
                    maxRetries: 3,
                    operationName: `Expense master sync (batch of ${expenseMaster.length})`,
                }
            );
        } catch (error) {
            winston.error(`Error syncing expense master records: ${error.message}`, {
                source: "expensemaster.model.js",
                function: "syncExpenseMaster",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            const failedResults = expenseMaster.map((e) => ({
                uniquekey: e.uniquekey,
                issynced: 0,
                message: "Failed to sync expense master due to transaction error",
                error: error.message,
            }));
            return { success: false, data: failedResults, error: error.message };
        }
    },
};

module.exports = expenseMasterModel;
