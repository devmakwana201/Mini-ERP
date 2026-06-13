const itemSupplierMappingModel = require("../../models/pos-mgmt/itemsuppliermapping.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError } = require("../../utils/customErrors");
const winston = require("../../config/winston");

module.exports = {
    /**
     * Sync item supplier mapping records from POS
     * POST /api/v1/pos/item-supplier-mapping/sync
     */
    syncItemSupplierMapping: asyncHandler(async (req, res) => {
        const { itemSupplierMapping } = req.body;

        if (!itemSupplierMapping || !Array.isArray(itemSupplierMapping) || itemSupplierMapping.length === 0) {
            throw new BadRequestError("itemSupplierMapping array is required and cannot be empty");
        }

        winston.debug("Item supplier mapping sync request received", {
            source: "itemsuppliermapping.controller.js",
            function: "syncItemSupplierMapping",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            count: itemSupplierMapping.length,
            ip: req.ip
        });

        const result = await itemSupplierMappingModel.syncItemSupplierMapping(itemSupplierMapping);

        if (result.success) {
            const syncedCount = result.data.filter(r => r.issynced === 1).length;
            winston.debug(`Item supplier mapping sync completed: ${syncedCount}/${itemSupplierMapping.length} records synced.`, {
                source: "itemsuppliermapping.controller.js",
                function: "syncItemSupplierMapping",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                syncedCount,
                totalRecords: itemSupplierMapping.length
            });
            res.status(200).json(
                ResponseFormatter.success(
                    result.data,
                    `Successfully synced ${syncedCount}/${itemSupplierMapping.length} item supplier mapping records.`
                )
            );
        } else {
            res.status(400).json(ResponseFormatter.error("Failed to sync item supplier mapping records"));
        }
    })
};
