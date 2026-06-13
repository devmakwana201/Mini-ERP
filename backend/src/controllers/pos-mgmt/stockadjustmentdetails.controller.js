const stockAdjustmentDetailsModel = require("../../models/pos-mgmt/stockadjustmentdetails.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError } = require("../../utils/customErrors");
const winston = require("../../config/winston");

module.exports = {
    /**
     * Sync stock adjustment details records from POS
     * POST /api/v1/pos/stock-adjustment-details/sync
     */
    syncStockAdjustmentDetails: asyncHandler(async (req, res) => {
        const { stockadjustments } = req.body;

        if (!stockadjustments || !Array.isArray(stockadjustments) || stockadjustments.length === 0) {
            throw new BadRequestError("stockadjustments array is required and cannot be empty");
        }

        winston.debug("Stock adjustment details sync request received", {
            source: "pos-mgmt/stockadjustmentdetails.controller.js",
            function: "syncStockAdjustmentDetails",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            count: stockadjustments.length,
            ip: req.ip
        });

        const result = await stockAdjustmentDetailsModel.syncStockAdjustmentDetails(stockadjustments);

        if (result.success) {
            const syncedCount = result.data.filter(r => r.issynced === 1).length;
            winston.debug(`Stock adjustment details sync completed: ${syncedCount}/${stockadjustments.length} records synced.`, {
                source: "pos-mgmt/stockadjustmentdetails.controller.js",
                function: "syncStockAdjustmentDetails",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
            });
            res.status(200).json(
                ResponseFormatter.success(
                    result.data,
                    `Successfully synced ${syncedCount}/${stockadjustments.length} stock adjustment details records.`
                )
            );
        } else {
            res.status(400).json(ResponseFormatter.error("Failed to sync stock adjustment details records"));
        }
    })
};
