const db = require("../../config/db");
const winston = require("../../config/winston");

const itemSupplierMappingModel = {
    /**
     * Sync item supplier mapping records (insert or update)
     * @param {Array} itemSupplierMapping - Array of item supplier mapping objects
     * @returns {Object} Result object with success status and data
     */
    async syncItemSupplierMapping(itemSupplierMapping) {
        const pool = db.connection;
        const results = [];

        for (const mapping of itemSupplierMapping) {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                const [existing] = await connection.execute(
                    "SELECT id FROM itemsuppliermapping WHERE itemsuppliermapid = ? AND companyid = ?",
                    [mapping.itemsuppliermapid, mapping.companyid]
                );

                if (existing.length > 0) {
                    // Update existing record
                    const updateQuery = `
                        UPDATE itemsuppliermapping
                        SET itemid = ?, supplierid = ?, pmuniquekey = ?, smuniquekey = ?,
                            isdeleted = ?, ipaddress = ?, clientmodifieddate = ?,
                            clientmodifiedby = ?, modifiedby = ?, modifieddate = ?
                        WHERE itemsuppliermapid = ? AND companyid = ?
                    `;
                    await connection.execute(updateQuery, [
                        mapping.itemid,
                        mapping.supplierid,
                        mapping.pmuniquekey,
                        mapping.smuniquekey,
                        mapping.isdeleted,
                        mapping.ipaddress,
                        mapping.modifieddate,
                        mapping.modifiedby,
                        null,
                        null,
                        mapping.itemsuppliermapid,
                        mapping.companyid
                    ]);
                    results.push({
                        itemsuppliermapid: mapping.itemsuppliermapid,
                        issynced: 1,
                        message: "Item supplier mapping updated successfully"
                    });
                } else {
                    // Insert new record
                    const insertQuery = `
                        INSERT INTO itemsuppliermapping (
                            itemsuppliermapid, itemid, supplierid, pmuniquekey, smuniquekey,
                            isdeleted, ipaddress, companyid, clientcreateddate,
                            clientmodifieddate, clientcreatedby, clientmodifiedby,
                            createdby, createddate
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    await connection.execute(insertQuery, [
                        mapping.itemsuppliermapid,
                        mapping.itemid,
                        mapping.supplierid,
                        mapping.pmuniquekey,
                        mapping.smuniquekey,
                        mapping.isdeleted,
                        mapping.ipaddress,
                        mapping.companyid,
                        mapping.createddate,
                        mapping.modifieddate,
                        mapping.createdby,
                        mapping.modifiedby,
                        null,
                        null
                    ]);
                    results.push({
                        itemsuppliermapid: mapping.itemsuppliermapid,
                        issynced: 1,
                        message: "Item supplier mapping created successfully"
                    });
                }
                await connection.commit();
            } catch (error) {
                await connection.rollback();
                winston.error(`Error syncing item supplier mapping: ${error.message}`, {
                    source: "itemsuppliermapping.model.js",
                    function: "syncItemSupplierMapping",
                    error: error.message,
                    code: error.code,
                    errno: error.errno,
                    stack: error.stack,
                    itemsuppliermapid: mapping.itemsuppliermapid
                });
                results.push({
                    itemsuppliermapid: mapping.itemsuppliermapid,
                    issynced: 0,
                    message: "Failed to sync item supplier mapping",
                    error: error.message
                });
            } finally {
                connection.release();
            }
        }

        return { success: true, data: results };
    }
};

module.exports = itemSupplierMappingModel;
