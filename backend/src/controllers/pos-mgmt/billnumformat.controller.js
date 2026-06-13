const billNumFormatModel = require("../../models/pos-mgmt/billnumformat.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError } = require("../../utils/customErrors");
const winston = require("../../config/winston");

module.exports = {
    /**
     * Sync bill number formats from POS
     * POST /api/v1/pos/billnumformat/sync
     */
    syncBillNumFormats: asyncHandler(async (req, res) => {
        const { billnumformats } = req.body;

        if (!billnumformats || !Array.isArray(billnumformats) || billnumformats.length === 0) {
            throw new BadRequestError("Bill number formats array is required and cannot be empty");
        }

        // Validate required fields for each bill number format
        for (let i = 0; i < billnumformats.length; i++) {
            const format = billnumformats[i];
            if (!format.formatid) {
                throw new BadRequestError(`Bill number format at index ${i} missing required field: formatid`);
            }
        }

        // Log the sync request
        if (req.pos) {
            winston.debug(`Bill number format sync request with token`, {
                source: "billnumformat.controller.js",
                function: "syncBillNumFormats",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                locationId: req.pos.locationId,
                billNumFormatsCount: billnumformats.length,
                productKey: req.pos.productKey
            });
        } else {
            winston.debug(`Bill number format sync request without token`, {
                source: "billnumformat.controller.js",
                function: "syncBillNumFormats",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                billNumFormatsCount: billnumformats.length,
                ip: req.ip
            });
        }

        const result = await billNumFormatModel.saveBillNumFormats(billnumformats);

        if (result.success) {
            const syncedCount = result.data.filter(f => f.issynced === 1).length;

            winston.debug(`Bill number format sync completed: ${syncedCount}/${billnumformats.length} formats synced`, {
                source: "billnumformat.controller.js",
                function: "syncBillNumFormats",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                syncedCount,
                totalFormats: billnumformats.length
            });

            res.status(200).json(
                ResponseFormatter.success(
                    result.data,
                    `Successfully synced ${syncedCount}/${billnumformats.length} bill number formats.`
                )
            );
        } else {
            res.status(400).json(ResponseFormatter.error("Failed to sync bill number formats"));
        }
    })
};
