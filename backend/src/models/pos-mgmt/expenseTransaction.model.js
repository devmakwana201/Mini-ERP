const db = require("../../config/db");
const winston = require("../../config/winston");
const { retryTransaction } = require("../../utils/dbRetry");

const expenseTransactionModel = {
    /**
     * Save expense transactions and their details (insert or update)
     * @param {Array} expenseTransactions - Array of expense transaction master objects
     * @returns {Object} Result object with success status and data
     */
    async saveExpenseTransactions(expenseTransactions) {
        try {
            return await retryTransaction(
                async (connection) => {
                    const masterResults = [];
                    const detailResults = [];

                    for (const transaction of expenseTransactions) {
                        let serverId;
                        try {
                            let existingTransaction;
                            try {
                                [existingTransaction] = await connection.execute(
                                    "SELECT id, expensetransactionid FROM expensetransactionmaster WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE NOWAIT",
                                    [transaction.uniquekey]
                                );
                            } catch (err) {
                                if (err.errno === 3572) { // ER_LOCK_NOWAIT
                                    [existingTransaction] = await connection.execute(
                                        "SELECT id, expensetransactionid FROM expensetransactionmaster WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE",
                                        [transaction.uniquekey]
                                    );
                                } else {
                                    throw err;
                                }
                            }

                    if (existingTransaction.length > 0) {
                        serverId = existingTransaction[0].id;

                        const updateQuery = `
                            UPDATE expensetransactionmaster
                            SET expensetransactionid = ?, frequencyid = ?, date = ?,
                                totalamount = ?, issync = ?, monthid = ?,
                                datekey = ?, shiftid = ?, yearid = ?,
                                isdeleted = ?, companyid = ?,
                                clientmodifieddate = ?, clientmodifiedby = ?,
                                modifiedby = ?, modifieddate = ?
                            WHERE uniquekey = ?
                        `;

                        await connection.execute(updateQuery, [
                            transaction.expensetransactionid || 0,
                            transaction.frequencyid || 0,
                            transaction.date,
                            transaction.totalamount || 0,
                            transaction.issync || 0,
                            transaction.monthid || 0,
                            transaction.datekey || 0,
                            transaction.shiftid || 0,
                            transaction.yearid || 0,
                            transaction.isdeleted || 0,
                            transaction.companyid || 0,
                            transaction.modifieddate || null,
                            transaction.modifiedby || null,
                            null,
                            null,
                            transaction.uniquekey
                        ]);

                        masterResults.push({
                            expensetransactionid: transaction.expensetransactionid,
                            uniquekey: transaction.uniquekey,
                            serverid: serverId,
                            issynced: 1,
                            message: "Expense transaction updated successfully"
                        });
                    } else {
                        const insertQuery = `
                            INSERT INTO expensetransactionmaster (
                                expensetransactionid, frequencyid, date, totalamount,
                                issync, monthid, datekey, shiftid, yearid,
                                isdeleted, companyid, uniquekey,
                                clientcreateddate, clientmodifieddate, clientcreatedby, clientmodifiedby,
                                createdby, createddate, modifiedby, modifieddate
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;

                        const [insertResult] = await connection.execute(insertQuery, [
                            transaction.expensetransactionid || 0,
                            transaction.frequencyid || 0,
                            transaction.date,
                            transaction.totalamount || 0,
                            transaction.issync || 0,
                            transaction.monthid || 0,
                            transaction.datekey || 0,
                            transaction.shiftid || 0,
                            transaction.yearid || 0,
                            transaction.isdeleted || 0,
                            transaction.companyid || 0,
                            transaction.uniquekey,
                            transaction.createddate || null,
                            transaction.modifieddate || null,
                            transaction.createdby || null,
                            transaction.modifiedby || null,
                            null, null, null, null
                        ]);

                        serverId = insertResult.insertId;

                        masterResults.push({
                            expensetransactionid: transaction.expensetransactionid,
                            uniquekey: transaction.uniquekey,
                            serverid: serverId,
                            issynced: 1,
                            message: "Expense transaction saved successfully"
                        });
                    }

                            const expenseTransactionDetails = transaction.expenseTransactionDetails || [];
                            for (const detail of expenseTransactionDetails) {
                                let existingDetail;
                                try {
                                    [existingDetail] = await connection.execute(
                                        "SELECT id FROM expensetransactiondetails WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE NOWAIT",
                                        [detail.uniquekey]
                                    );
                                } catch (err) {
                                    if (err.errno === 3572) { // ER_LOCK_NOWAIT
                                        [existingDetail] = await connection.execute(
                                            "SELECT id FROM expensetransactiondetails WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE",
                                            [detail.uniquekey]
                                        );
                                    } else {
                                        throw err;
                                    }
                                }

                        if (existingDetail.length > 0) {
                            const updateQuery = `
                                UPDATE expensetransactiondetails
                                SET expensetransactiondetailsId = ?, serverexpensetransactionid = ?,
                                    expenseid = ?, paymentamount = ?, remarks = ?,
                                    shiftbalance = ?, expensetransactionid = ?, isdeleted = ?,
                                    companyid = ?, datekey = ?, expenseuniquekey = ?,
                                    clientmodifieddate = ?, clientmodifiedby = ?,
                                    modifiedby = ?, modifieddate = ?
                                WHERE uniquekey = ?
                            `;
                            await connection.execute(updateQuery, [
                                detail.expensetransactiondetailsId || null,
                                serverId,
                                detail.expenseid || null,
                                detail.paymentamount || null,
                                detail.remarks || null,
                                detail.shiftbalance || null,
                                detail.expensetransactionid || null,
                                detail.isdeleted || 0,
                                detail.companyid || null,
                                detail.datekey || null,
                                detail.expenseuniquekey || null,
                                detail.modifieddate || null,
                                detail.modifiedby || null,
                                null, null,
                                detail.uniquekey
                            ]);
                            detailResults.push({
                                expensetransactiondetailsId: detail.expensetransactiondetailsId,
                                uniquekey: detail.uniquekey,
                                issynced: 1,
                                message: "Expense transaction detail updated successfully"
                            });
                        } else {
                            const insertQuery = `
                                INSERT INTO expensetransactiondetails (
                                    expensetransactiondetailsId, serverexpensetransactionid, expenseid,
                                    paymentamount, remarks, shiftbalance, expensetransactionid,
                                    isdeleted, companyid, uniquekey, datekey, expenseuniquekey,
                                    clientcreateddate, clientmodifieddate, clientcreatedby, clientmodifiedby,
                                    createdby, createddate, modifiedby, modifieddate
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `;
                            await connection.execute(insertQuery, [
                                detail.expensetransactiondetailsId || null,
                                serverId,
                                detail.expenseid || null,
                                detail.paymentamount || null,
                                detail.remarks || null,
                                detail.shiftbalance || null,
                                detail.expensetransactionid || null,
                                detail.isdeleted || 0,
                                detail.companyid || null,
                                detail.uniquekey,
                                detail.datekey || null,
                                detail.expenseuniquekey || null,
                                detail.createddate || null,
                                detail.modifieddate || null,
                                detail.createdby || null,
                                detail.modifiedby || null,
                                null, null, null, null
                            ]);
                            detailResults.push({
                                expensetransactiondetailsId: detail.expensetransactiondetailsId,
                                uniquekey: detail.uniquekey,
                                issynced: 1,
                                message: "Expense transaction detail saved successfully"
                            });
                        }
                    }
                } catch (error) {
                    winston.error(`Error saving expense transaction: ${error.message}`, {
                        source: "expenseTransaction.model.js",
                        function: "saveExpenseTransactions",
                        error: error.message,
                        code: error.code,
                        errno: error.errno,
                        stack: error.stack,
                        expensetransactionid: transaction.expensetransactionid,
                        uniquekey: transaction.uniquekey
                    });
                    masterResults.push({
                        expensetransactionid: transaction.expensetransactionid,
                        uniquekey: transaction.uniquekey,
                        issynced: 0,
                        message: "Failed to save expense transaction",
                        error: error.message
                    });
                        }
                    }

                    return {
                        success: true,
                        data: {
                            expenseTransactions: masterResults,
                            expenseTransactionDetails: detailResults
                        }
                    };
                },
                {
                    maxRetries: 3,
                    operationName: `Expense transaction save (batch of ${expenseTransactions.length})`,
                }
            );
        } catch (error) {
            winston.error(`Error saving expense transactions: ${error.message}`, {
                source: "expenseTransaction.model.js",
                function: "saveExpenseTransactions",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return {
                success: false,
                message: "Failed to save expense transactions",
                error: error.message
            };
        }
    }
};

module.exports = expenseTransactionModel;
