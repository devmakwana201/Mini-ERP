const shiftModel = require("../../models/pos-mgmt/shift.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const winston = require("../../config/winston");

module.exports = {
    saveShift: asyncHandler(async (req, res) => {
        const requestBody = req.body; // Already validated by Joi
        const isBulk = Array.isArray(requestBody);
        const shifts = isBulk ? requestBody : [requestBody];

        const results = [];
        const errors = [];

        for (const shift of shifts) {
            try {
                const result = await shiftModel.saveShift(shift);
                if (result.success) {
                    results.push({
                        uniquekey: shift.uniquekey,
                        success: true,
                        issynced: result.issynced,
                        message: result.msg,
                    });
                } else {
                    errors.push({
                        uniquekey: shift.uniquekey,
                        success: false,
                        message: result.msg,
                        error: result.error,
                    });
                }
            } catch (error) {
                winston.error(`Error processing shift: ${error.message}`, {
                    source: "shift.controller.js",
                    function: "saveShift",
                    endpoint: req.path,
                    method: req.method,
                    userId: req.user?.id,
                    uniquekey: shift.uniquekey,
                    error: error.message,
                    code: error.code,
                    errno: error.errno,
                    stack: error.stack
                });
                errors.push({
                    uniquekey: shift.uniquekey,
                    success: false,
                    message: error.message,
                });
            }
        }

        const allResults = [...results, ...errors];
        const successCount = results.length;
        const errorCount = errors.length;
        const totalCount = allResults.length;

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
                        `Processed ${totalCount} shift(s): ${successCount} successful, ${errorCount} failed`
                    )
                );
            } else {
                return res.status(200).json(
                    ResponseFormatter.success(
                        responseData,
                        `Successfully processed ${totalCount} shift(s)`
                    )
                );
            }
        } else {
            // Single shift response
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
    }),
};
