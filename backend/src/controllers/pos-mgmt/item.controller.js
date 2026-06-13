const itemModel = require("../../models/pos-mgmt/item.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError } = require("../../utils/customErrors");
const winston = require("../../config/winston");

module.exports = {
    /**
     * Map or update items in company_itemmaster
     * POST /api/v1/pos-mgmt/item/mapping
     * Body: { companyid, ismodified, items: [{itemid, sellingprice, ...}] }
     */
    itemMapping: asyncHandler(async (req, res) => {
        const { companyid, ismodified = 0, items = [] } = req.body;

        // Validate input
        if (!companyid) {
            throw new BadRequestError("companyid is required");
        }

        if (!Array.isArray(items) || items.length === 0) {
            throw new BadRequestError("items array is required and must not be empty");
        }

        // Limit batch size
        const MAX_BATCH_SIZE = 500;
        if (items.length > MAX_BATCH_SIZE) {
            throw new BadRequestError(`Maximum batch size is ${MAX_BATCH_SIZE} items. Please split your request.`);
        }

        // Validate each item has itemid
        const invalidItems = items.filter(item => !item.itemid);
        if (invalidItems.length > 0) {
            throw new BadRequestError("All items must have itemid field");
        }

        const mode = ismodified === 1 ? "update" : "insert";

        winston.info(`Starting item mapping/update`, {
            source: "pos-mgmt/item.controller.js",
            function: "itemMapping",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            companyid,
            itemCount: items.length,
            mode
        });

        const startTime = Date.now();

        // Process items
        const result = await itemModel.itemMapping({
            companyid,
            ismodified,
            items
        });

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

        winston.info(`Item mapping completed`, {
            source: "pos-mgmt/item.controller.js",
            function: "itemMapping",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            companyid,
            mode,
            total: result.totalItems,
            success: result.successCount,
            failed: result.failedCount,
            totalTime: `${totalTime}s`
        });

        if (!result.success) {
            throw new BadRequestError(result.message || "Failed to process item mapping");
        }

        res.status(200).json(
            ResponseFormatter.success(result, `Item ${mode} completed: ${result.successCount}/${result.totalItems} items processed successfully in ${totalTime}s`)
        );
    }),

    /**
     * Sync items from POS (batch operation)
     * POST /api/v1/pos-mgmt/items/sync
     */
    syncItems: asyncHandler(async (req, res) => {
        const { items } = req.body;

        // Validate input
        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new BadRequestError("Items array is required and must not be empty");
        }

        // Limit batch size to prevent memory issues
        const MAX_BATCH_SIZE = 100;
        if (items.length > MAX_BATCH_SIZE) {
            throw new BadRequestError(`Maximum batch size is ${MAX_BATCH_SIZE} items. Please split your request.`);
        }

        const itemsWithImages = items.filter(i => i.base64Image).length;
        const estimatedTimeSeconds = items.length * 2; // Rough estimate

        winston.info(`Starting batch item sync`, {
            source: "pos-mgmt/item.controller.js",
            function: "syncItems",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            count: items.length,
            companyid: items[0]?.companyid,
            withImages: itemsWithImages,
            estimatedTime: `~${estimatedTimeSeconds}s`
        });

        const results = {
            success: [],
            failed: [],
            total: items.length
        };

        // Process items in parallel batches for better performance
        const PARALLEL_BATCH_SIZE = 5; // Process 5 items at a time
        const startTime = Date.now();
        let processed = 0;

        for (let i = 0; i < items.length; i += PARALLEL_BATCH_SIZE) {
            const batch = items.slice(i, i + PARALLEL_BATCH_SIZE);

            // Process current batch in parallel
            const batchResults = await Promise.allSettled(
                batch.map(async (item, batchIndex) => {
                    const globalIndex = i + batchIndex;

                    // Validate required fields
                    if (!item.itemname) {
                        throw new Error("Item name is required");
                    }

                    if (!item.companyid) {
                        throw new Error("Company ID is required");
                    }

                    // Validate that either uniquekey or itemid exists for sync
                    if (!item.uniquekey && !item.itemid) {
                        throw new Error("Either uniquekey or itemid is required for sync");
                    }

                    // Validate base64 format if provided
                    if (item.base64Image && typeof item.base64Image !== 'string') {
                        throw new Error("base64Image must be a string");
                    }

                    // Save item (model will handle base64 image processing)
                    const result = await itemModel.saveItem(item);

                    if (!result.success) {
                        throw new Error(result.message || "Failed to save item");
                    }

                    return {
                        globalIndex,
                        item,
                        result
                    };
                })
            );

            // Process results
            batchResults.forEach((promiseResult, batchIndex) => {
                const globalIndex = i + batchIndex;
                const item = batch[batchIndex];

                if (promiseResult.status === 'fulfilled') {
                    const { result } = promiseResult.value;
                    results.success.push({
                        index: globalIndex,
                        serverItemId: result.data.serverItemId,
                        localItemId: result.data.localItemId,
                        itemname: item.itemname,
                        uniquekey: result.data.uniquekey,
                        matchedBy: result.data.matchedBy,
                        isLinkedToExisting: result.data.isLinkedToExisting,
                        isRejected: result.data.isRejected || false,
                        message: result.message
                    });
                } else {
                    results.failed.push({
                        index: globalIndex,
                        itemname: item.itemname,
                        uniquekey: item.uniquekey,
                        error: promiseResult.reason?.message || "Unknown error"
                    });
                }
            });

            processed += batch.length;

            // Log progress
            if (items.length > 10) {
                const progress = ((processed / items.length) * 100).toFixed(1);
                winston.info(`Batch progress: ${processed}/${items.length} (${progress}%)`, {
                    source: "pos-mgmt/item.controller.js",
                    function: "syncItems",
                    endpoint: req.path,
                    method: req.method,
                    userId: req.user?.id,
                });
            }
        }

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        const successRate = ((results.success.length / results.total) * 100).toFixed(2);

        winston.info(`Batch item sync completed`, {
            source: "pos-mgmt/item.controller.js",
            function: "syncItems",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            total: results.total,
            success: results.success.length,
            failed: results.failed.length,
            successRate: `${successRate}%`,
            totalTime: `${totalTime}s`,
            avgTimePerItem: `${(totalTime / items.length).toFixed(2)}s`
        });

        // Return success even if some items failed, with detailed results
        res.status(200).json(
            ResponseFormatter.success(results, `Batch item sync completed. ${results.success.length}/${results.total} items synced successfully in ${totalTime}s`)
        );
    }),

    /**
     * Check approval status for items (webhook for POS cron)
     * POST /api/v1/pos-mgmt/items/check-approval-status
     * Body: { uniquekeys: ["12345...", "67890..."] }
     */
    checkApprovalStatus: asyncHandler(async (req, res) => {
        const { uniquekeys } = req.body;

        // Validate input
        if (!uniquekeys || !Array.isArray(uniquekeys) || uniquekeys.length === 0) {
            throw new BadRequestError("uniquekeys array is required and must not be empty");
        }

        // Limit batch size
        const MAX_BATCH_SIZE = 500;
        if (uniquekeys.length > MAX_BATCH_SIZE) {
            throw new BadRequestError(`Maximum batch size is ${MAX_BATCH_SIZE} items. Please split your request.`);
        }

        winston.info(`Checking approval status`, {
            source: "pos-mgmt/item.controller.js",
            function: "checkApprovalStatus",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            count: uniquekeys.length
        });

        const result = await itemModel.checkApprovalStatus(uniquekeys);

        if (!result.success) {
            throw new BadRequestError(result.message || "Failed to check approval status");
        }

        // Group results by status for summary
        const statusSummary = result.data.reduce((acc, item) => {
            acc[item.status] = (acc[item.status] || 0) + 1;
            return acc;
        }, {});

        winston.info(`Approval status check completed`, {
            source: "pos-mgmt/item.controller.js",
            function: "checkApprovalStatus",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            total: uniquekeys.length,
            summary: statusSummary
        });

        res.status(200).json(
            ResponseFormatter.success(result.data, result.message)
        );
    })
};
