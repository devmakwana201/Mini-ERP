const db = require("../../config/db");
const winston = require("../../config/winston");

const stockAdjustmentDetailsModel = {
    /**
     * Sync stock adjustment details records (insert or update)
     * @param {Array} stockAdjustments - Array of stock adjustment objects
     * @returns {Object} Result object with success status and data
     */
    async syncStockAdjustmentDetails(stockAdjustments) {
        const pool = db.connection;
        const results = [];

        for (const adjustment of stockAdjustments) {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                const [existing] = await connection.execute(
                    "SELECT id FROM stockadjustmentdetails WHERE pmuniquekey = ? AND companyid = ? AND locationid = ?",
                    [adjustment.pmuniquekey, adjustment.companyid, adjustment.locationid]
                );

                if (existing.length > 0) {
                    // Update existing record
                    const updateQuery = `
                        UPDATE stockadjustmentdetails
                        SET stockid = ?, batchid = ?, itemid = ?, quantity = ?,
                            remarks = ?, isdeleted = ?, ipaddress = ?, datekey = ?,
                            previousqty = ?, reasonid = ?, adjustmenttype = ?,
                            clientmodifieddate = ?, clientmodifiedby = ?,
                            modifiedby = ?, modifieddate = ?
                        WHERE pmuniquekey = ? AND companyid = ? AND locationid = ?
                    `;
                    await connection.execute(updateQuery, [
                        adjustment.stockid,
                        adjustment.batchid,
                        adjustment.itemid,
                        adjustment.quantity,
                        adjustment.remarks,
                        adjustment.isdeleted,
                        adjustment.ipaddress,
                        adjustment.datekey,
                        adjustment.previousqty,
                        adjustment.reasonid,
                        adjustment.adjustmenttype,
                        adjustment.modifieddate,
                        adjustment.modifiedby,
                        null,
                        null,
                        adjustment.pmuniquekey,
                        adjustment.companyid,
                        adjustment.locationid
                    ]);
                    results.push({
                        pmuniquekey: adjustment.pmuniquekey,
                        stockid: adjustment.stockid,
                        issynced: 1,
                        message: "Stock adjustment details updated successfully"
                    });
                } else {
                    // Insert new record
                    const insertQuery = `
                        INSERT INTO stockadjustmentdetails (
                            stockid, batchid, itemid, pmuniquekey, quantity, remarks,
                            isdeleted, locationid, companyid, ipaddress, datekey,
                            previousqty, reasonid, adjustmenttype,
                            clientcreateddate, clientmodifieddate,
                            clientcreatedby, clientmodifiedby,
                            createdby, createddate
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    await connection.execute(insertQuery, [
                        adjustment.stockid,
                        adjustment.batchid,
                        adjustment.itemid,
                        adjustment.pmuniquekey,
                        adjustment.quantity,
                        adjustment.remarks,
                        adjustment.isdeleted,
                        adjustment.locationid,
                        adjustment.companyid,
                        adjustment.ipaddress,
                        adjustment.datekey,
                        adjustment.previousqty,
                        adjustment.reasonid,
                        adjustment.adjustmenttype,
                        adjustment.createddate,
                        adjustment.modifieddate,
                        adjustment.createdby,
                        adjustment.modifiedby,
                        null,
                        null
                    ]);
                    results.push({
                        pmuniquekey: adjustment.pmuniquekey,
                        stockid: adjustment.stockid,
                        issynced: 1,
                        message: "Stock adjustment details created successfully"
                    });
                }
                await connection.commit();
            } catch (error) {
                await connection.rollback();
                winston.error(`Error syncing stock adjustment details: ${error.message}`, {
                    source: "stockadjustmentdetails.model.js",
                    function: "syncStockAdjustmentDetails",
                    error: error.message,
                    code: error.code,
                    errno: error.errno,
                    stack: error.stack,
                    pmuniquekey: adjustment.pmuniquekey
                });
                results.push({
                    pmuniquekey: adjustment.pmuniquekey,
                    stockid: adjustment.stockid,
                    issynced: 0,
                    message: "Failed to sync stock adjustment details",
                    error: error.message
                });
            } finally {
                connection.release();
            }
        }

        return { success: true, data: results };
    }
};

module.exports = stockAdjustmentDetailsModel;
