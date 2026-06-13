const db = require("../../config/db");
const winston = require("../../config/winston");
const { retryTransaction } = require("../../utils/dbRetry");

const apilogModel = {
    /**
     * Save API logs (insert or update)
     * @param {Array} apilogs - Array of API log objects
     * @returns {Object} Result object with success status and data
     */
    async saveApiLogs(apilogs) {
        try {
            return await retryTransaction(
                async (connection) => {
                    const results = [];

                    for (const log of apilogs) {
                        try {
                            const insertQuery = `
                                INSERT INTO apilogs (
                                    apilogid, request, response, action, apiurl,
                                    header, statuscode, ip, companyid,
                                    clientcreateddate, clientmodifieddate, clientcreatedby,
                                    clientmodifiedby
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `;

                            await connection.execute(insertQuery, [
                                log.id || log.apilogid || null,
                                log.request || null,
                                log.response || null,
                                log.action || null,
                                log.apiurl || null,
                                log.header || null,
                                log.statuscode || null,
                                log.ip || null,
                                log.companyid || 0,
                                log.createddate || null,
                                log.modifieddate || null,
                                log.createdby || null,
                                log.modifiedby || null,
                            ]);

                            results.push({
                                apilogid: log.id || log.apilogid,
                                issynced: 1,
                                message: "API log saved successfully",
                            });
                        } catch (error) {
                            winston.error(`Error saving API log: ${error.message}`, {
                                source: "apilog.model.js",
                                function: "saveApiLogs",
                                error: error.message,
                                code: error.code,
                                errno: error.errno,
                                stack: error.stack,
                                apilogid: log.id || log.apilogid
                            });
                            results.push({
                                apilogid: log.id || log.apilogid,
                                issynced: 0,
                                message: "Failed to save API log",
                                error: error.message,
                            });
                        }
                    }

                    return { success: true, data: results };
                },
                {
                    maxRetries: 3,
                    operationName: `API log save (batch of ${apilogs.length})`,
                }
            );
        } catch (error) {
            winston.error(`Error saving API logs: ${error.message}`, {
                source: "apilog.model.js",
                function: "saveApiLogs",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            const failedResults = apilogs.map(log => ({
                apilogid: log.id || log.apilogid,
                issynced: 0,
                message: "Failed to save API log due to transaction error",
                error: error.message,
            }));
            return { success: false, data: failedResults, error: error.message };
        }
    },
};

module.exports = apilogModel;
