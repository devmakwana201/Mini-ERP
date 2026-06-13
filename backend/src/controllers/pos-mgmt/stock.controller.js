const stockModel = require("../../models/pos-mgmt/stock.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError } = require("../../utils/customErrors");
const winston = require("../../config/winston");

module.exports = {
    /**
     * Sync current stock master from POS
     * POST /api/v1/pos/stock/sync-current-stock
     */
    syncCurrentStockMaster: asyncHandler(async (req, res) => {
        const { currentStockMaster } = req.body;

        if (!currentStockMaster || !Array.isArray(currentStockMaster) || currentStockMaster.length === 0) {
            throw new BadRequestError("Current stock master array is required and cannot be empty");
        }

        // Validate required fields
        for (let i = 0; i < currentStockMaster.length; i++) {
            const stock = currentStockMaster[i];
            if (!stock.currentstockid || !stock.locationid || !stock.productid) {
                throw new BadRequestError(`Current stock at index ${i} missing required fields: currentstockid, locationid, productid`);
            }
        }

        // Log the sync request
        if (req.pos) {
            winston.debug(`Current stock master sync request with token`, {
                source: "pos-mgmt/stock.controller.js",
                function: "syncCurrentStockMaster",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                locationId: req.pos.locationId,
                currentStockCount: currentStockMaster.length,
                productKey: req.pos.productKey
            });
        } else {
            winston.debug(`Current stock master sync request without token`, {
                source: "pos-mgmt/stock.controller.js",
                function: "syncCurrentStockMaster",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                currentStockCount: currentStockMaster.length,
                ip: req.ip
            });
        }

        const result = await stockModel.saveCurrentStockMaster(currentStockMaster);

        if (result.success) {
            const syncedCount = result.data.filter(s => s.issynced === 1).length;

            winston.debug(`Current stock master sync completed: ${syncedCount}/${currentStockMaster.length} stocks synced`, {
                source: "pos-mgmt/stock.controller.js",
                function: "syncCurrentStockMaster",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
            });

            res.status(200).json(
                ResponseFormatter.success(
                    result.data,
                    `Successfully synced ${syncedCount}/${currentStockMaster.length} current stock records.`
                )
            );
        } else {
            res.status(400).json(ResponseFormatter.error("Failed to sync current stock master"));
        }
    }),

    syncCurrentStockAuditMaster: asyncHandler(async (req, res) => {
        const { currentStockAuditMaster } = req.body;

        if (!currentStockAuditMaster || !Array.isArray(currentStockAuditMaster) || currentStockAuditMaster.length === 0) {
            throw new BadRequestError("currentStockAuditMaster array is required and cannot be empty");
        }

        const result = await stockModel.saveCurrentStockAuditMaster(currentStockAuditMaster);

        if (result.success) {
            const syncedCount = result.data.filter(s => s.issynced === 1).length;

            winston.debug(`Current stock audit sync completed: ${syncedCount}/${currentStockAuditMaster.length} audits synced`, {
                source: "pos-mgmt/stock.controller.js",
                function: "syncCurrentStockAuditMaster",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
            });

            res.status(200).json(
                ResponseFormatter.success(
                    result.data,
                    `Successfully synced ${syncedCount}/${currentStockAuditMaster.length} current stock audit records.`
                )
            );
        } else {
            res.status(400).json(ResponseFormatter.error("Failed to sync current stock audit master"));
        }
    }),

    /**
     * Sync item day wise stock details from POS
     * POST /api/v1/pos/stock/sync-daywise-stock
     */
    syncItemDayWiseStock: asyncHandler(async (req, res) => {
        const { itemDayWiseStock } = req.body;

        if (!itemDayWiseStock || !Array.isArray(itemDayWiseStock) || itemDayWiseStock.length === 0) {
            throw new BadRequestError("Item day wise stock array is required and cannot be empty");
        }

        // Validate required fields
        for (let i = 0; i < itemDayWiseStock.length; i++) {
            const stock = itemDayWiseStock[i];
            if (!stock.dwsdid || !stock.locationid || !stock.itemid) {
                throw new BadRequestError(`Item day wise stock at index ${i} missing required fields: dwsdid, locationid, itemid`);
            }
        }

        // Log the sync request
        if (req.pos) {
            winston.debug(`Item day wise stock sync request with token`, {
                source: "pos-mgmt/stock.controller.js",
                function: "syncItemDayWiseStock",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                locationId: req.pos.locationId,
                itemDayWiseStockCount: itemDayWiseStock.length,
                productKey: req.pos.productKey
            });
        } else {
            winston.debug(`Item day wise stock sync request without token`, {
                source: "pos-mgmt/stock.controller.js",
                function: "syncItemDayWiseStock",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                itemDayWiseStockCount: itemDayWiseStock.length,
                ip: req.ip
            });
        }

        const result = await stockModel.saveItemDayWiseStock(itemDayWiseStock);

        if (result.success) {
            const syncedCount = result.data.filter(s => s.issynced === 1).length;

            winston.debug(`Item day wise stock sync completed: ${syncedCount}/${itemDayWiseStock.length} stocks synced`, {
                source: "pos-mgmt/stock.controller.js",
                function: "syncItemDayWiseStock",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
            });

            res.status(200).json(
                ResponseFormatter.success(
                    result.data,
                    `Successfully synced ${syncedCount}/${itemDayWiseStock.length} item day wise stock records.`
                )
            );
        } else {
            res.status(400).json(ResponseFormatter.error("Failed to sync item day wise stock"));
        }
    })
};
