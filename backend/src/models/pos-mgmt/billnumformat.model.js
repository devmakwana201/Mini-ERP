const db = require("../../config/db");
const winston = require("../../config/winston");
const { retryTransaction } = require("../../utils/dbRetry");

const billNumFormatModel = {
    /**
     * Map format name to format_type
     * @param {string} formatName - The format name
     * @returns {number|null} The format type ID
     */
    getFormatType(formatName) {
        if (!formatName) return null;

        const formatMap = {
            seeds: 1,
            fertilizers: 2,
            pesticides: 3,
            other: 4,
            "sales order": 5,
            purchase: 6,
            customer: 7,
            "purchase return": 8,
            debit: 9,
            credit: 10,
        };

        return formatMap[formatName.toLowerCase()] || null;
    },

    /**
     * Save bill number formats (insert or update)
     * @param {Array} billNumFormats - Array of bill number format objects
     * @returns {Object} Result object with success status and data
     */
    async saveBillNumFormats(billNumFormats) {
        try {
            return await retryTransaction(
                async (connection) => {
                    const results = [];

                    for (const format of billNumFormats) {
                        try {
                            // Determine format_type from format name if not provided
                            const formatType =
                                format.format_type || this.getFormatType(format.format);

                            // Check if record exists (maintains original logic)
                            // Use NOWAIT first, fallback to regular lock if busy
                            let existingFormat;
                            try {
                                [existingFormat] = await connection.execute(
                                    "SELECT id, isdeleted FROM billnumformat WHERE formatid = ? FOR UPDATE NOWAIT",
                                    [format.formatid]
                                );
                            } catch (err) {
                                if (err.errno === 3572) {
                                    // ER_LOCK_NOWAIT
                                    [existingFormat] = await connection.execute(
                                        "SELECT id, isdeleted FROM billnumformat WHERE formatid = ? FOR UPDATE",
                                        [format.formatid]
                                    );
                                } else {
                                    throw err;
                                }
                            }

                            let result;
                            let isUpdate = false;

                            if (existingFormat.length > 0) {
                                // Record exists - update it
                                const updateQuery = `
                                    UPDATE billnumformat
                                    SET format = ?, format_type = ?, prefix = ?, startnumber = ?,
                                        locationid = ?, termconditions = ?, jurisdiction = ?,
                                        bankdetails = ?, tagline = ?, invoicemsg = ?,
                                        lastupdate = ?, isdeleted = ?
                                    WHERE formatid = ?
                                `;

                                [result] = await connection.execute(updateQuery, [
                                    format.format || null,
                                    formatType,
                                    format.prefix || null,
                                    format.startnumber || 0,
                                    format.locationid || null,
                                    format.termconditions || null,
                                    format.jurisdiction || null,
                                    format.bankdetails || null,
                                    format.tagline || null,
                                    format.invoicemsg || null,
                                    format.lastupdate || 0,
                                    format.isdeleted || 0,
                                    format.formatid,
                                ]);

                                isUpdate = true;
                            } else {
                                // Record doesn't exist - insert new one
                                const insertQuery = `
                                    INSERT INTO billnumformat (
                                        formatid, format, format_type, prefix, startnumber, locationid,
                                        isdeleted, lastupdate, termconditions, jurisdiction,
                                        bankdetails, tagline, invoicemsg
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                `;

                                [result] = await connection.execute(insertQuery, [
                                    format.formatid,
                                    format.format || null,
                                    formatType,
                                    format.prefix || null,
                                    format.startnumber || 0,
                                    format.locationid || null,
                                    format.isdeleted || 0,
                                    format.lastupdate || 0,
                                    format.termconditions || null,
                                    format.jurisdiction || null,
                                    format.bankdetails || null,
                                    format.tagline || null,
                                    format.invoicemsg || null,
                                ]);

                                isUpdate = false;
                            }

                            results.push({
                                formatid: format.formatid,
                                issynced: 1,
                                message: isUpdate
                                    ? "Bill number format updated successfully"
                                    : "Bill number format saved successfully",
                            });

                            winston.debug(
                                `Bill number format ${isUpdate ? "updated" : "inserted"}`,
                                {
                                    source: "billnumformat.model.js",
                                    function: "saveBillNumFormats",
                                    formatid: format.formatid,
                                    format: format.format,
                                    format_type: formatType,
                                    locationid: format.locationid,
                                }
                            );
                        } catch (error) {
                            winston.error(`Error processing bill number format: ${error.message}`, {
                                source: "billnumformat.model.js",
                                function: "saveBillNumFormats",
                                error: error.message,
                                code: error.code,
                                errno: error.errno,
                                stack: error.stack,
                                formatid: format.formatid,
                            });
                            results.push({
                                formatid: format.formatid,
                                issynced: 0,
                                message: "Failed to save bill number format",
                                error: error.message,
                            });
                        }
                    }

                    return { success: true, data: results };
                },
                {
                    maxRetries: 3,
                    operationName: `Bill number format save (batch of ${billNumFormats.length})`,
                }
            );
        } catch (error) {
            winston.error(`Error saving bill number formats: ${error.message}`, {
                source: "billnumformat.model.js",
                function: "saveBillNumFormats",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            const failedResults = billNumFormats.map((format) => ({
                formatid: format.formatid,
                issynced: 0,
                message: "Failed to save bill number format due to a transaction error",
                error: error.message,
            }));
            return { success: false, data: failedResults, error: error.message };
        }
    },
};

module.exports = billNumFormatModel;
