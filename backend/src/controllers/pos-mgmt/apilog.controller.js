const apilogModel = require("../../models/pos-mgmt/apilog.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError } = require("../../utils/customErrors");
const winston = require("../../config/winston");

module.exports = {
    /**
     * Sync API logs from POS
     * POST /api/v1/pos/apilog/sync
     */
    syncApiLogs: asyncHandler(async (req, res) => {
        const { apilogs } = req.body;

        if (!apilogs || !Array.isArray(apilogs) || apilogs.length === 0) {
            throw new BadRequestError("API logs array is required and cannot be empty");
        }

        // Log the sync request
        if (req.pos) {
            winston.debug(`API log sync request with token`, {
                source: "apilog.controller.js",
                function: "syncApiLogs",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                locationId: req.pos.locationId,
                apiLogsCount: apilogs.length,
                productKey: req.pos.productKey
            });
        } else {
            winston.debug(`API log sync request without token`, {
                source: "apilog.controller.js",
                function: "syncApiLogs",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                apiLogsCount: apilogs.length,
                ip: req.ip
            });
        }

        const result = await apilogModel.saveApiLogs(apilogs);

        if (result.success) {
            const syncedCount = result.data.filter(l => l.issynced === 1).length;

            winston.debug(`API log sync completed: ${syncedCount}/${apilogs.length} logs synced`, {
                source: "apilog.controller.js",
                function: "syncApiLogs",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                syncedCount,
                totalLogs: apilogs.length
            });

            res.status(200).json(
                ResponseFormatter.success(
                    result.data,
                    `Successfully synced ${syncedCount}/${apilogs.length} API logs.`
                )
            );
        } else {
            res.status(400).json(ResponseFormatter.error("Failed to sync API logs"));
        }
    })
};
