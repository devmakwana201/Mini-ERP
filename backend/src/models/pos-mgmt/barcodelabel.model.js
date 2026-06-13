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

const barcodeLabelModel = {
    /**
     * Save barcode labels (insert or update)
     * @param {Array} barcodeLabels - Array of barcode label objects
     * @returns {Object} Result object with success status and data
     */
    async saveBarcodeLabels(barcodeLabels) {
        try {
            return await retryTransaction(
                async (connection) => {
                    const results = [];

                    for (const label of barcodeLabels) {
                        try {
                            let existingLabel;
                            try {
                                [existingLabel] = await connection.execute(
                                    "SELECT id FROM barcodelabelmaster WHERE id = ? AND isdeleted = 0 FOR UPDATE NOWAIT",
                                    [label.id]
                                );
                            } catch (err) {
                                if (err.errno === 3572) {
                                    // ER_LOCK_NOWAIT
                                    [existingLabel] = await connection.execute(
                                        "SELECT id FROM barcodelabelmaster WHERE id = ? AND isdeleted = 0 FOR UPDATE",
                                        [label.id]
                                    );
                                } else {
                                    throw err;
                                }
                            }

                            if (existingLabel.length > 0) {
                                // Update existing barcode label
                                const updateQuery = `
                                    UPDATE barcodelabelmaster
                                    SET labelname = ?, prndata = ?, productlength = ?,
                                        isactive = ?, companyid = ?, isdeleted = ?,
                                        modifiedby = ?, modifieddate = ?
                                    WHERE id = ?
                                `;

                                await connection.execute(updateQuery, [
                                    label.labelname || null,
                                    label.prndata || null,
                                    label.productlength || null,
                                    label.isactive !== undefined ? label.isactive : 1,
                                    label.companyid || null,
                                    label.isdeleted || 0,
                                    label.modifiedby || null,
                                    convertDateTimeToMySQL(label.modifieddate),
                                    label.id,
                                ]);

                                results.push({
                                    id: label.id,
                                    issynced: 1,
                                    message: "Barcode label updated successfully",
                                });

                                winston.debug("Barcode label updated", {
                                    source: "barcodelabel.model.js",
                                    function: "saveBarcodeLabels",
                                    id: label.id,
                                    labelname: label.labelname,
                                });
                            } else {
                                // Insert new barcode label
                                const insertQuery = `
                                    INSERT INTO barcodelabelmaster (
                                        id, labelname, prndata, productlength,
                                        isactive, companyid, isdeleted,
                                        createdby, createddate, modifiedby, modifieddate
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                `;

                                await connection.execute(insertQuery, [
                                    label.id,
                                    label.labelname || null,
                                    label.prndata || null,
                                    label.productlength || null,
                                    label.isactive !== undefined ? label.isactive : 1,
                                    label.companyid || null,
                                    label.isdeleted || 0,
                                    label.createdby || null,
                                    convertDateTimeToMySQL(label.createddate),
                                    label.modifiedby || null,
                                    convertDateTimeToMySQL(label.modifieddate),
                                ]);

                                results.push({
                                    id: label.id,
                                    issynced: 1,
                                    message: "Barcode label saved successfully",
                                });

                                winston.debug("Barcode label inserted", {
                                    source: "barcodelabel.model.js",
                                    function: "saveBarcodeLabels",
                                    id: label.id,
                                    labelname: label.labelname,
                                });
                            }
                        } catch (error) {
                            winston.error(`Error processing barcode label: ${error.message}`, {
                                source: "barcodelabel.model.js",
                                function: "saveBarcodeLabels",
                                error: error.message,
                                code: error.code,
                                errno: error.errno,
                                stack: error.stack,
                                id: label.id,
                            });
                            results.push({
                                id: label.id,
                                issynced: 0,
                                message: "Failed to save barcode label",
                                error: error.message,
                            });
                        }
                    }

                    return { success: true, data: results };
                },
                {
                    maxRetries: 3,
                    operationName: `Barcode label save (batch of ${barcodeLabels.length})`,
                }
            );
        } catch (error) {
            winston.error(`Error saving barcode labels: ${error.message}`, {
                source: "barcodelabel.model.js",
                function: "saveBarcodeLabels",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            const failedResults = barcodeLabels.map((label) => ({
                id: label.id,
                issynced: 0,
                message: "Failed to save barcode label due to a transaction error",
                error: error.message,
            }));
            return { success: false, data: failedResults, error: error.message };
        }
    },
};

module.exports = barcodeLabelModel;
