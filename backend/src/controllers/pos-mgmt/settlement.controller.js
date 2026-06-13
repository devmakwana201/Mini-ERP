const settlementModel = require('../../models/pos-mgmt/settlement.model');
const ResponseFormatter = require('../../utils/responseFormatter');
const { asyncHandler } = require('../../utils/asyncHandler');
const winston = require('../../config/winston');

module.exports = {
    syncSettlement: asyncHandler(async (req, res) => {
        const requestBody = req.body; // Already validated by Joi
        const isBulk = Array.isArray(requestBody);
        const settlements = isBulk ? requestBody : [requestBody];

        const results = [];
        const errors = [];

        for (const settlement of settlements) {
            try {
                const result = await settlementModel.saveSettlement(settlement);
                if (result.success) {
                    results.push({
                        uniquekey: settlement.uniquekey,
                        success: true,
                        issynced: result.issynced,
                        message: result.msg,
                    });
                } else {
                    errors.push({
                        uniquekey: settlement.uniquekey,
                        success: false,
                        message: result.msg,
                        error: result.error,
                    });
                }
            } catch (error) {
                winston.error(`Error processing settlement ${settlement.uniquekey}:`, {
                    source: "settlement.controller.js",
                    function: "syncSettlement",
                    endpoint: req.path,
                    method: req.method,
                    userId: req.user?.id,
                    uniquekey: settlement.uniquekey,
                    error: error.message,
                    code: error.code,
                    errno: error.errno,
                    stack: error.stack
                });
                errors.push({
                    uniquekey: settlement.uniquekey,
                    success: false,
                    message: "Failed to process settlement",
                    error: error.message,
                });
            }
        }

        const allResults = [...results, ...errors];
        const successCount = results.length;
        const errorCount = errors.length;
        const totalCount = allResults.length;

        winston.info(`Settlement sync completed: ${successCount} successful, ${errorCount} failed`, {
            source: "settlement.controller.js",
            function: "syncSettlement",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            successCount,
            errorCount,
            totalCount: allResults.length
        });

        if (isBulk) {
            const responseData = {
                summary: {
                    total: totalCount,
                    successful: successCount,
                    failed: errorCount,
                    type: "BULK",
                },
                results: allResults,
            };

            if (errorCount > 0) {
                return res.status(207).json(
                    ResponseFormatter.multiStatus(
                        responseData,
                        `Processed ${totalCount} settlement(s): ${successCount} successful, ${errorCount} failed`
                    )
                );
            } else {
                return res.status(200).json(
                    ResponseFormatter.success(
                        responseData,
                        `Successfully processed ${totalCount} settlement(s)`
                    )
                );
            }
        } else {
            // Single settlement response
            if (results.length > 0) {
                return res.status(200).json(
                    ResponseFormatter.success(
                        {
                            uniquekey: results[0].uniquekey,
                            issynced: results[0].issynced,
                        },
                        results[0].message
                    )
                );
            } else {
                return res.status(400).json(
                    ResponseFormatter.error(errors[0].message, 400, errors[0].error)
                );
            }
        }
    })
};