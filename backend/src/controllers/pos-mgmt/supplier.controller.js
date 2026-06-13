const supplierModel = require("../../models/pos-mgmt/supplier.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError } = require("../../utils/customErrors");
const winston = require("../../config/winston");

module.exports = {
    /**
     * Sync suppliers from POS
     * POST /api/v1/pos/supplier/sync
     */
    syncSuppliers: asyncHandler(async (req, res) => {
        const { suppliers } = req.body;        
        if (!suppliers || !Array.isArray(suppliers) || suppliers.length === 0) {
            throw new BadRequestError("Suppliers array is required and cannot be empty");
        }

        // Validate required fields for each supplier
        for (let i = 0; i < suppliers.length; i++) {
            const supplier = suppliers[i];
            if (!supplier.supplierid) {
                throw new BadRequestError(`Supplier at index ${i} missing required field: supplierid`);
            }
        }

        // Log the sync request
        if (req.pos) {
            winston.debug(`Supplier sync request with token`, {
                source: "pos-mgmt/supplier.controller.js",
                function: "syncSuppliers",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                locationId: req.pos.locationId,
                suppliersCount: suppliers.length,
                productKey: req.pos.productKey
            });
        } else {
            winston.debug(`Supplier sync request without token`, {
                source: "pos-mgmt/supplier.controller.js",
                function: "syncSuppliers",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                suppliersCount: suppliers.length,
                ip: req.ip
            });
        }

        const result = await supplierModel.saveSuppliers(suppliers);

        if (result.success) {
            const syncedCount = result.data.filter(s => s.issynced === 1).length;

            winston.debug(`Supplier sync completed: ${syncedCount}/${suppliers.length} suppliers synced`, {
                source: "pos-mgmt/supplier.controller.js",
                function: "syncSuppliers",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
            });

            res.status(200).json(
                ResponseFormatter.success(
                    result.data,
                    `Successfully synced ${syncedCount}/${suppliers.length} suppliers.`
                )
            );
        } else {
            res.status(400).json(ResponseFormatter.error("Failed to sync suppliers"));
        }
    }),

    /**
     * Sync supplier account details from POS
     * POST /api/v1/pos/supplier/sync-details
     */
    syncSupplierAccountDetails: asyncHandler(async (req, res) => {
        const { supplierAccounts } = req.body;

        if (!supplierAccounts || !Array.isArray(supplierAccounts) || supplierAccounts.length === 0) {
            throw new BadRequestError("Supplier accounts array is required and cannot be empty");
        }

        // Note: supplieraccountid, locationid, and supplierid are nullable in the database schema
        // No strict validation required - database will handle nulls appropriately

        // Log the sync request
        if (req.pos) {
            winston.debug(`Supplier account details sync request with token`, {
                source: "pos-mgmt/supplier.controller.js",
                function: "syncSupplierAccountDetails",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                locationId: req.pos.locationId,
                supplierAccountsCount: supplierAccounts.length,
                productKey: req.pos.productKey
            });
        } else {
            winston.debug(`Supplier account details sync request without token`, {
                source: "pos-mgmt/supplier.controller.js",
                function: "syncSupplierAccountDetails",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                supplierAccountsCount: supplierAccounts.length,
                ip: req.ip
            });
        }

        const result = await supplierModel.saveSupplierAccountDetails(supplierAccounts);

        if (result.success) {
            const syncedCount = result.data.filter(s => s.issynced === 1).length;

            winston.debug(`Supplier account details sync completed: ${syncedCount}/${supplierAccounts.length} details synced`, {
                source: "pos-mgmt/supplier.controller.js",
                function: "syncSupplierAccountDetails",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
            });

            res.status(200).json(
                ResponseFormatter.success(
                    result.data,
                    `Successfully synced ${syncedCount}/${supplierAccounts.length} supplier account details.`
                )
            );
        } else {
            res.status(400).json(ResponseFormatter.error("Failed to sync supplier account details"));
        }
    }),

    /**
     * Map suppliers to company
     * POST /api/v1/pos/supplier/mapping
     * Body: { companyid, suppliers: [{supplierid, uniquekey}] }
     */
    supplierMapping: asyncHandler(async (req, res) => {
        const { companyid, suppliers = [] } = req.body;

        // Validate input
        if (!companyid) {
            throw new BadRequestError("companyid is required");
        }

        if (!Array.isArray(suppliers) || suppliers.length === 0) {
            throw new BadRequestError("suppliers array is required and must not be empty");
        }

        // Limit batch size
        const MAX_BATCH_SIZE = 500;
        if (suppliers.length > MAX_BATCH_SIZE) {
            throw new BadRequestError(`Maximum batch size is ${MAX_BATCH_SIZE} suppliers. Please split your request.`);
        }

        // Validate each supplier has supplierid
        const invalidSuppliers = suppliers.filter(supplier => !supplier.supplierid);
        if (invalidSuppliers.length > 0) {
            throw new BadRequestError("All suppliers must have supplierid field");
        }

        winston.info(`Starting supplier mapping`, {
            source: "pos-mgmt/supplier.controller.js",
            function: "supplierMapping",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            companyid,
            supplierCount: suppliers.length
        });

        const startTime = Date.now();

        // Process suppliers
        const result = await supplierModel.supplierMapping({
            companyid,
            suppliers
        });

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

        winston.info(`Supplier mapping completed`, {
            source: "pos-mgmt/supplier.controller.js",
            function: "supplierMapping",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            companyid,
            total: result.totalSuppliers,
            success: result.successCount,
            inserted: result.insertedCount,
            updated: result.updatedCount,
            failed: result.failedCount,
            totalTime: `${totalTime}s`
        });

        if (!result.success) {
            throw new BadRequestError(result.message || "Failed to process supplier mapping");
        }

        res.status(200).json(
            ResponseFormatter.success(
                result,
                `Supplier mapping completed: ${result.successCount}/${result.totalSuppliers} suppliers mapped successfully in ${totalTime}s`
            )
        );
    }),

    /**
     * Check approval status for suppliers (webhook for POS cron)
     * POST /api/v1/pos/supplier/check-approval-status
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
            throw new BadRequestError(`Maximum batch size is ${MAX_BATCH_SIZE} suppliers. Please split your request.`);
        }

        winston.info(`Checking supplier approval status`, {
            source: "pos-mgmt/supplier.controller.js",
            function: "checkApprovalStatus",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            count: uniquekeys.length
        });

        const result = await supplierModel.checkApprovalStatus(uniquekeys);

        if (!result.success) {
            throw new BadRequestError(result.message || "Failed to check approval status");
        }

        // Group results by status for summary
        const statusSummary = result.data.reduce((acc, supplier) => {
            acc[supplier.status] = (acc[supplier.status] || 0) + 1;
            return acc;
        }, {});

        winston.info(`Supplier approval status check completed`, {
            source: "pos-mgmt/supplier.controller.js",
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
