const brandModel = require("../../models/pos-mgmt/brand.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError } = require("../../utils/customErrors");
const winston = require("../../config/winston");

module.exports = {
    /**
     * Map brands to company
     * POST /api/v1/pos/brand/mapping
     * Body: { companyid, brands: [{brandid, uniquekey}] }
     */
    brandMapping: asyncHandler(async (req, res) => {
        const { companyid, brands = [] } = req.body;

        // Validate input
        if (!companyid) {
            throw new BadRequestError("companyid is required");
        }

        if (!Array.isArray(brands) || brands.length === 0) {
            throw new BadRequestError("brands array is required and must not be empty");
        }

        // Limit batch size
        const MAX_BATCH_SIZE = 500;
        if (brands.length > MAX_BATCH_SIZE) {
            throw new BadRequestError(`Maximum batch size is ${MAX_BATCH_SIZE} brands. Please split your request.`);
        }

        // Validate each brand has brandid
        const invalidBrands = brands.filter(brand => !brand.brandid);
        if (invalidBrands.length > 0) {
            throw new BadRequestError("All brands must have brandid field");
        }

        winston.info(`Starting brand mapping`, {
            source: "pos-mgmt/brand.controller.js",
            function: "brandMapping",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            companyid,
            brandCount: brands.length
        });

        const startTime = Date.now();

        // Process brands
        const result = await brandModel.brandMapping({
            companyid,
            brands
        });

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

        winston.info(`Brand mapping completed`, {
            source: "pos-mgmt/brand.controller.js",
            function: "brandMapping",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            companyid,
            total: result.totalBrands,
            success: result.successCount,
            inserted: result.insertedCount,
            updated: result.updatedCount,
            failed: result.failedCount,
            totalTime: `${totalTime}s`
        });

        if (!result.success) {
            throw new BadRequestError(result.message || "Failed to process brand mapping");
        }

        res.status(200).json(
            ResponseFormatter.success(
                result,
                `Brand mapping completed: ${result.successCount}/${result.totalBrands} brands mapped successfully in ${totalTime}s`
            )
        );
    }),

    /**
     * Sync brands from POS (batch operation)
     * POST /api/v1/pos-mgmt/brands/sync
     */
    syncBrands: asyncHandler(async (req, res) => {
        const { brands } = req.body;

        // Validate input
        if (!brands || !Array.isArray(brands) || brands.length === 0) {
            throw new BadRequestError("Brands array is required and must not be empty");
        }

        // Limit batch size to prevent memory issues
        const MAX_BATCH_SIZE = 100;
        if (brands.length > MAX_BATCH_SIZE) {
            throw new BadRequestError(
                `Maximum batch size is ${MAX_BATCH_SIZE} brands. Please split your request.`
            );
        }

        const brandsWithImages = brands.filter((b) => b.base64Image).length;
        const estimatedTimeSeconds = brands.length * 2; // Rough estimate

        winston.info(`Starting batch brand sync`, {
            source: "pos-mgmt/brand.controller.js",
            function: "syncBrands",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            count: brands.length,
            companyid: brands[0]?.companyid,
            withImages: brandsWithImages,
            estimatedTime: `~${estimatedTimeSeconds}s`,
        });

        const results = {
            success: [],
            failed: [],
            total: brands.length,
        };

        // Process brands in parallel batches for better performance
        const PARALLEL_BATCH_SIZE = 5; // Process 5 brands at a time
        const startTime = Date.now();
        let processed = 0;

        for (let i = 0; i < brands.length; i += PARALLEL_BATCH_SIZE) {
            const batch = brands.slice(i, i + PARALLEL_BATCH_SIZE);

            // Process current batch in parallel
            const batchResults = await Promise.allSettled(
                batch.map(async (brand, batchIndex) => {
                    const globalIndex = i + batchIndex;

                    // Validate required fields
                    if (!brand.brandname) {
                        throw new Error("Brand name is required");
                    }

                    if (!brand.companyid) {
                        throw new Error("Company ID is required");
                    }

                    // Validate that either uniquekey or brandid exists for sync
                    if (!brand.uniquekey && !brand.brandid) {
                        throw new Error("Either uniquekey or brandid is required for sync");
                    }

                    // Validate base64 format if provided
                    if (brand.base64Image && typeof brand.base64Image !== "string") {
                        throw new Error("base64Image must be a string");
                    }

                    // Save brand (model will handle base64 image processing)
                    const result = await brandModel.saveBrand(brand);

                    if (!result.success) {
                        throw new Error(result.message || "Failed to save brand");
                    }

                    return {
                        globalIndex,
                        brand,
                        result,
                    };
                })
            );

            // Process results
            batchResults.forEach((promiseResult, batchIndex) => {
                const globalIndex = i + batchIndex;
                const brand = batch[batchIndex];

                if (promiseResult.status === "fulfilled") {
                    const { result } = promiseResult.value;
                    results.success.push({
                        index: globalIndex,
                        brandid: result.data.brandid,
                        brandname: brand.brandname,
                        uniquekey: result.data.uniquekey,
                    });
                } else {
                    results.failed.push({
                        index: globalIndex,
                        brandname: brand.brandname,
                        error: promiseResult.reason?.message || "Unknown error",
                    });
                }
            });

            processed += batch.length;

            // Log progress
            if (brands.length > 10) {
                const progress = ((processed / brands.length) * 100).toFixed(1);
                winston.info(`Batch progress: ${processed}/${brands.length} (${progress}%)`, {
                    source: "pos-mgmt/brand.controller.js",
                    function: "syncBrands",
                    endpoint: req.path,
                    method: req.method,
                    userId: req.user?.id,
                });
            }
        }

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        const successRate = ((results.success.length / results.total) * 100).toFixed(2);

        winston.info(`Batch brand sync completed`, {
            source: "pos-mgmt/brand.controller.js",
            function: "syncBrands",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            total: results.total,
            success: results.success.length,
            failed: results.failed.length,
            successRate: `${successRate}%`,
            totalTime: `${totalTime}s`,
            avgTimePerBrand: `${(totalTime / brands.length).toFixed(2)}s`,
        });

        // Return success even if some brands failed, with detailed results
        res.status(200).json(
            ResponseFormatter.success(
                results,
                `Batch brand sync completed. ${results.success.length}/${results.total} brands synced successfully in ${totalTime}s`
            )
        );
    }),

    /**
     * Check approval status for brands (webhook for POS cron)
     * POST /api/v1/pos/brand/check-approval-status
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
            throw new BadRequestError(`Maximum batch size is ${MAX_BATCH_SIZE} brands. Please split your request.`);
        }

        winston.info(`Checking brand approval status`, {
            source: "pos-mgmt/brand.controller.js",
            function: "checkApprovalStatus",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            count: uniquekeys.length
        });

        const result = await brandModel.checkApprovalStatus(uniquekeys);

        if (!result.success) {
            throw new BadRequestError(result.message || "Failed to check approval status");
        }

        // Group results by status for summary
        const statusSummary = result.data.reduce((acc, brand) => {
            acc[brand.status] = (acc[brand.status] || 0) + 1;
            return acc;
        }, {});

        winston.info(`Brand approval status check completed`, {
            source: "pos-mgmt/brand.controller.js",
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
