const barcodeLabelModel = require("../../models/pos-mgmt/barcodelabel.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError } = require("../../utils/customErrors");
const winston = require("../../config/winston");

module.exports = {
    /**
     * Sync barcode labels from POS (batch operation)
     * POST /api/v1/pos-mgmt/barcodelabels/sync
     */
    syncBarcodeLabels: asyncHandler(async (req, res) => {
        const { barcodelabels } = req.body;

        // Validate input
        if (!barcodelabels || !Array.isArray(barcodelabels) || barcodelabels.length === 0) {
            throw new BadRequestError("Barcode labels array is required and must not be empty");
        }

        // Validate each barcode label has required fields
        for (const label of barcodelabels) {
            if (!label.id) {
                throw new BadRequestError("Each barcode label must have an id");
            }
            if (!label.labelname) {
                throw new BadRequestError(`Barcode label ${label.id} must have a labelname`);
            }
        }

        winston.info(`Starting barcode label sync`, {
            source: "barcodelabel.controller.js",
            function: "syncBarcodeLabels",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            count: barcodelabels.length,
            locationId: req.pos?.locationId || req.installation?.locationId
        });

        const result = await barcodeLabelModel.saveBarcodeLabels(barcodelabels);

        if (result.success) {
            const successCount = result.data.filter(r => r.issynced === 1).length;
            const failedCount = result.data.filter(r => r.issynced === 0).length;

            winston.info(`Barcode label sync completed`, {
                source: "barcodelabel.controller.js",
                function: "syncBarcodeLabels",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                total: barcodelabels.length,
                success: successCount,
                failed: failedCount
            });

            return res.status(200).json(
                ResponseFormatter.success(
                    result.data,
                    `Barcode label sync completed. ${successCount}/${barcodelabels.length} labels synced successfully`
                )
            );
        } else {
            return res.status(500).json(
                ResponseFormatter.error(
                    result.error || "Failed to sync barcode labels",
                    result.data
                )
            );
        }
    })
};
