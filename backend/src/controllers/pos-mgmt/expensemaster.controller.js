const expenseMasterModel = require("../../models/pos-mgmt/expensemaster.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError } = require("../../utils/customErrors");
const winston = require("../../config/winston");

module.exports = {
    /**
     * Sync expense master records from POS
     * POST /api/v1/pos/expense-master/sync
     */
    syncExpenseMaster: asyncHandler(async (req, res) => {
        const { expenseMaster } = req.body;

        if (!expenseMaster || !Array.isArray(expenseMaster) || expenseMaster.length === 0) {
            throw new BadRequestError("expenseMaster array is required and cannot be empty");
        }

        winston.debug("Expense master sync request received", {
            source: "expensemaster.controller.js",
            function: "syncExpenseMaster",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            count: expenseMaster.length,
            ip: req.ip
        });

        const result = await expenseMasterModel.syncExpenseMaster(expenseMaster);

        if (result.success) {
            const syncedCount = result.data.filter(r => r.issynced === 1).length;
            winston.debug(`Expense master sync completed: ${syncedCount}/${expenseMaster.length} records synced.`, {
                source: "expensemaster.controller.js",
                function: "syncExpenseMaster",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                syncedCount,
                totalRecords: expenseMaster.length
            });
            res.status(200).json(
                ResponseFormatter.success(
                    result.data,
                    `Successfully synced ${syncedCount}/${expenseMaster.length} expense master records.`
                )
            );
        } else {
            res.status(400).json(ResponseFormatter.error("Failed to sync expense master records"));
        }
    })
};
