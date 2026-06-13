const db = require("../../config/db");
const winston = require("../../config/winston");
const { retryTransaction } = require("../../utils/dbRetry");

const stockModel = {
    /**
     * Save current stock master (insert or update)
     * @param {Array} currentStockMaster - Array of current stock objects
     * @returns {Object} Result object with success status and data
     */
    async saveCurrentStockMaster(currentStockMaster) {
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

                    for (const stock of currentStockMaster) {
                        try {
                            let existingStock;
                            try {
                                [existingStock] = await connection.execute(
                                    "SELECT id FROM currentstockmaster WHERE currentstockid = ? AND locationid = ? AND isdeleted = 0 FOR UPDATE NOWAIT",
                                    [stock.currentstockid, stock.locationid]
                                );
                            } catch (err) {
                                if (err.errno === 3572) { // ER_LOCK_NOWAIT
                                    [existingStock] = await connection.execute(
                                        "SELECT id FROM currentstockmaster WHERE currentstockid = ? AND locationid = ? AND isdeleted = 0 FOR UPDATE",
                                        [stock.currentstockid, stock.locationid]
                                    );
                                } else {
                                    throw err;
                                }
                            }

                    if (existingStock.length > 0) {
                        const updateQuery = `
                        UPDATE currentstockmaster
                        SET productid = ?, batchid = ?, batchdate = ?,
                            quantity = ?, lastaction = ?, lastactiontransactionid = ?,
                            expirydate = ?,
                            issync = ?, isdeleted = ?, ipaddress = ?, companyid = ?,
                            uniquekey = ?, pmuniquekey = ?, clientmodifieddate = ?,
                            clientmodifiedby = ?, modifiedby = ?, modifieddate = ?
                        WHERE currentstockid = ? AND locationid = ?
                    `;
                        await connection.execute(updateQuery, [
                            stock.productid,
                            stock.batchid || "",
                            convertDateToMySQL(stock.batchdate),
                            stock.quantity || null,
                            stock.lastaction || null,
                            stock.lastactiontransactionid || null,
                            convertDateToMySQL(stock.expirydate),
                            stock.issync || 0,
                            stock.isdeleted || 0,
                            stock.ipaddress || null,
                            stock.companyid || null,
                            stock.uniquekey || null,
                            stock.pmuniquekey || null,
                            stock.modifieddate || null,
                            stock.modifiedby || null,
                            null,
                            null,
                            stock.currentstockid,
                            stock.locationid,
                        ]);
                        results.push({
                            currentstockid: stock.currentstockid,
                            locationid: stock.locationid,
                            issynced: 1,
                            message: "Current stock updated successfully",
                        });
                        winston.debug(`Current stock updated`, {
                            source: "stock.model.js",
                            function: "saveCurrentStockMaster",
                            currentstockid: stock.currentstockid,
                            locationid: stock.locationid,
                        });
                    } else {
                        const insertQuery = `
                        INSERT INTO currentstockmaster (
                            currentstockid, productid, batchid, batchdate, quantity, locationid,
                            lastaction, lastactiontransactionid, expirydate, issync, isdeleted,
                            ipaddress, companyid, uniquekey, pmuniquekey, clientcreateddate, clientmodifieddate,
                            clientcreatedby, clientmodifiedby, createdby, createddate, modifiedby, modifieddate
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                        await connection.execute(insertQuery, [
                            stock.currentstockid,
                            stock.productid,
                            stock.batchid || "",
                            convertDateToMySQL(stock.batchdate),
                            stock.quantity || null,
                            stock.locationid,
                            stock.lastaction || null,
                            stock.lastactiontransactionid || null,
                            convertDateToMySQL(stock.expirydate),
                            stock.issync || 0,
                            stock.isdeleted || 0,
                            stock.ipaddress || null,
                            stock.companyid || null,
                            stock.uniquekey || null,
                            stock.pmuniquekey || null,
                            stock.createddate || null,
                            stock.modifieddate || null,
                            stock.createdby || null,
                            stock.modifiedby || null,
                            null,
                            null,
                            null,
                            null,
                        ]);
                        results.push({
                            currentstockid: stock.currentstockid,
                            locationid: stock.locationid,
                            issynced: 1,
                            message: "Current stock saved successfully",
                        });
                        winston.debug(`Current stock inserted`, {
                            source: "stock.model.js",
                            function: "saveCurrentStockMaster",
                            currentstockid: stock.currentstockid,
                            locationid: stock.locationid,
                        });
                    }
                } catch (error) {
                    winston.error(`Error processing current stock`, {
                        source: "stock.model.js",
                        function: "saveCurrentStockMaster",
                        currentstockid: stock.currentstockid,
                        locationid: stock.locationid,
                        error: error.message,
                        code: error.code,
                        errno: error.errno,
                        stack: error.stack
                    });
                    results.push({
                        currentstockid: stock.currentstockid,
                        locationid: stock.locationid,
                        issynced: 0,
                        message: "Failed to save current stock",
                        error: error.message,
                    });
                }
                    }

                    return { success: true, data: results };
                },
                {
                    maxRetries: 3,
                    operationName: `Current stock save (batch of ${currentStockMaster.length})`,
                }
            );
        } catch (error) {
            winston.error(`Error saving current stock master`, {
                source: "stock.model.js",
                function: "saveCurrentStockMaster",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            // Mark all items as failed if the transaction is rolled back
            const failedResults = currentStockMaster.map(stock => ({
                currentstockid: stock.currentstockid,
                locationid: stock.locationid,
                issynced: 0,
                message: "Failed to save current stock due to a transaction error",
                error: error.message,
            }));
            return { success: false, data: failedResults, error: error.message };
        }
    },

    async saveCurrentStockAuditMaster(currentStockAuditMaster) {
        const results = [];

        // Process each audit with its own retry transaction
        for (const audit of currentStockAuditMaster) {
            try {
                const result = await retryTransaction(
                    async (connection) => {
                        // Get servercurrentstockid from currentstockmaster
                        const [stockMasterRows] = await connection.execute(
                            "SELECT id FROM currentstockmaster WHERE currentstockid = ? AND locationid = ? AND isdeleted = 0",
                            [audit.currentstockid, audit.locationid]
                        );

                        let servercurrentstockid = null;
                        if (stockMasterRows.length > 0) {
                            servercurrentstockid = stockMasterRows[0].id;
                        }

                        const insertQuery = `
                            INSERT INTO currentstockaudits (
                                auditid, servercurrentstockid, currentstockid, productid, pmuniquekey,
                                batchid, batchdate, quantity, locationid, companyid, isdeleted,
                                ipaddress, lastaction, lastactiontransactionid, expirydate,
                                clientcreateddate, clientmodifieddate, clientcreatedby, clientmodifiedby,
                                createdby, createddate, modifiedby, modifieddate
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;

                        const insertData = [
                            audit.auditid,
                            servercurrentstockid,
                            audit.currentstockid,
                            audit.productid,
                            audit.pmuniquekey,
                            audit.batchid,
                            audit.batchdate,
                            audit.quantity,
                            audit.locationid,
                            audit.companyid,
                            audit.isdeleted,
                            audit.ipaddress,
                            audit.lastaction,
                            audit.lastactiontransactionid,
                            audit.expirydate,
                            audit.createddate,
                            audit.modifieddate,
                            audit.createdby,
                            audit.modifiedby,
                            null, // createdby (server)
                            null, // createddate (server)
                            null, // modifiedby (server)
                            null, // modifieddate (server)
                        ];

                        await connection.execute(insertQuery, insertData);

                        winston.debug(`Current stock audit inserted`, {
                            source: "stock.model.js",
                            function: "saveCurrentStockAuditMaster",
                            auditid: audit.auditid,
                        });

                        return {
                            auditid: audit.auditid,
                            issynced: 1,
                            message: "Current stock audit saved successfully",
                        };
                    },
                    {
                        maxRetries: 3,
                        operationName: `Stock audit save (${audit.auditid})`,
                    }
                );

                results.push(result);
            } catch (error) {
                winston.error(`Error saving current stock audit`, {
                    source: "stock.model.js",
                    function: "saveCurrentStockAuditMaster",
                    auditid: audit.auditid,
                    error: error.message,
                    code: error.code,
                    errno: error.errno,
                    stack: error.stack
                });

                results.push({
                    auditid: audit.auditid,
                    issynced: 0,
                    message: "Failed to save current stock audit",
                    error: error.message,
                });
            }
        }

        return {
            success: true,
            data: results,
        };
    },

    /**
     * Save item day wise stock details (insert or update)
     * @param {Array} itemDayWiseStock - Array of item day wise stock objects
     * @returns {Object} Result object with success status and data
     */
    async saveItemDayWiseStock(itemDayWiseStock) {
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

                    for (const stock of itemDayWiseStock) {
                        try {
                            let existingStock;
                            try {
                                [existingStock] = await connection.execute(
                                    "SELECT id FROM itemdaywisestockdetails WHERE dwsdid = ? AND locationid = ? AND isdeleted = 0 FOR UPDATE NOWAIT",
                                    [stock.dwsdid, stock.locationid]
                                );
                            } catch (err) {
                                if (err.errno === 3572) { // ER_LOCK_NOWAIT
                                    [existingStock] = await connection.execute(
                                        "SELECT id FROM itemdaywisestockdetails WHERE dwsdid = ? AND locationid = ? AND isdeleted = 0 FOR UPDATE",
                                        [stock.dwsdid, stock.locationid]
                                    );
                                } else {
                                    throw err;
                                }
                            }

                    if (existingStock.length > 0) {
                        const updateQuery = `
                        UPDATE itemdaywisestockdetails
                        SET itemid = ?, pmuniquekey = ?, batchid = ?, batchdate = ?,
                            companyid = ?, datekey = ?, stockdate = ?,
                            openingstock = ?, totalsales = ?, totalpurchase = ?, totalwastage = ?,
                            salereturn = ?, purchasereturn = ?, closingstock = ?, adjustin = ?,
                            adjustout = ?, adjustedstock = ?, issync = ?, isdeleted = ?,
                            ipaddress = ?, uniquekey = ?, clientmodifieddate = ?,
                            clientmodifiedby = ?, modifiedby = ?, modifieddate = ?
                        WHERE dwsdid = ? AND locationid = ?
                    `;
                        await connection.execute(updateQuery, [
                            stock.itemid,
                            stock.pmuniquekey || null,
                            stock.batchid || "",
                            convertDateToMySQL(stock.batchdate),
                            stock.companyid || null,
                            stock.datekey || null,
                            convertDateToMySQL(stock.stockdate),
                            stock.openingstock || null,
                            stock.totalsales || null,
                            stock.totalpurchase || null,
                            stock.totalwastage || null,
                            stock.salereturn || 0,
                            stock.purchasereturn || null,
                            stock.closingstock || null,
                            stock.adjustin || null,
                            stock.adjustout || null,
                            stock.adjustedstock || null,
                            stock.issync || 0,
                            stock.isdeleted || 0,
                            stock.ipaddress || null,
                            stock.uniquekey || null,
                            stock.modifieddate || null,
                            stock.modifiedby || null,
                            null,
                            null,
                            stock.dwsdid,
                            stock.locationid,
                        ]);
                        results.push({
                            dwsdid: stock.dwsdid,
                            locationid: stock.locationid,
                            issynced: 1,
                            message: "Item day wise stock updated successfully",
                        });
                        winston.debug(`Item day wise stock updated`, {
                            source: "stock.model.js",
                            function: "saveItemDayWiseStock",
                            dwsdid: stock.dwsdid,
                            locationid: stock.locationid,
                        });
                    } else {
                        const insertQuery = `
                        INSERT INTO itemdaywisestockdetails (
                            dwsdid, itemid, pmuniquekey, batchid, batchdate, locationid, companyid, datekey,
                            stockdate, openingstock, totalsales, totalpurchase, totalwastage,
                            salereturn, purchasereturn, closingstock, adjustin, adjustout,
                            adjustedstock, issync, isdeleted, ipaddress, uniquekey,
                            clientcreateddate, clientmodifieddate, clientcreatedby, clientmodifiedby,
                            createdby, createddate, modifiedby, modifieddate
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                        await connection.execute(insertQuery, [
                            stock.dwsdid,
                            stock.itemid,
                            stock.pmuniquekey || null,
                            stock.batchid || "",
                            convertDateToMySQL(stock.batchdate),
                            stock.locationid,
                            stock.companyid || null,
                            stock.datekey || null,
                            convertDateToMySQL(stock.stockdate),
                            stock.openingstock || null,
                            stock.totalsales || null,
                            stock.totalpurchase || null,
                            stock.totalwastage || null,
                            stock.salereturn || 0,
                            stock.purchasereturn || null,
                            stock.closingstock || null,
                            stock.adjustin || null,
                            stock.adjustout || null,
                            stock.adjustedstock || null,
                            stock.issync || 0,
                            stock.isdeleted || 0,
                            stock.ipaddress || null,
                            stock.uniquekey || null,
                            stock.createddate || null,
                            stock.modifieddate || null,
                            stock.createdby || null,
                            stock.modifiedby || null,
                            null,
                            null,
                            null,
                            null,
                        ]);
                        results.push({
                            dwsdid: stock.dwsdid,
                            locationid: stock.locationid,
                            issynced: 1,
                            message: "Item day wise stock saved successfully",
                        });
                        winston.debug(`Item day wise stock inserted`, {
                            source: "stock.model.js",
                            function: "saveItemDayWiseStock",
                            dwsdid: stock.dwsdid,
                            locationid: stock.locationid,
                        });
                    }
                } catch (error) {
                    winston.error(`Error processing item day wise stock`, {
                        source: "stock.model.js",
                        function: "saveItemDayWiseStock",
                        dwsdid: stock.dwsdid,
                        locationid: stock.locationid,
                        error: error.message,
                        code: error.code,
                        errno: error.errno,
                        stack: error.stack
                    });
                    results.push({
                        dwsdid: stock.dwsdid,
                        locationid: stock.locationid,
                        issynced: 0,
                        message: "Failed to save item day wise stock",
                        error: error.message,
                    });
                }
                    }

                    return { success: true, data: results };
                },
                {
                    maxRetries: 3,
                    operationName: `Item day wise stock save (batch of ${itemDayWiseStock.length})`,
                }
            );
        } catch (error) {
            winston.error(`Error saving item day wise stock`, {
                source: "stock.model.js",
                function: "saveItemDayWiseStock",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            // Mark all items as failed if the transaction is rolled back
            const failedResults = itemDayWiseStock.map(stock => ({
                dwsdid: stock.dwsdid,
                locationid: stock.locationid,
                issynced: 0,
                message: "Failed to save item day wise stock due to a transaction error",
                error: error.message,
            }));
            return { success: false, data: failedResults, error: error.message };
        }
    },
};

module.exports = stockModel;
