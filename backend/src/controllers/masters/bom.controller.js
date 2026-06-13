const bomModel = require("../../models/masters/bom.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError, NotFoundError } = require("../../utils/customErrors");
const winston = require("../../config/winston");

module.exports = {
    /**
     * GET /api/v1/bom
     * List all BOMs with pagination
     */
    getBOMs: asyncHandler(async (req, res) => {
        const { start = 0, length = 10, filters, sortField, sortOrder } = req.query;

        let parsedFilters = {};
        try {
            parsedFilters = filters ? JSON.parse(filters) : {};
        } catch {
            parsedFilters = {};
        }

        winston.info("Fetching BOM list", {
            source: "bom.controller.js",
            function: "getBOMs",
            start, length, sortField, sortOrder,
        });

        const result = await bomModel.getBOMs({
            filters: parsedFilters,
            start: parseInt(start),
            length: parseInt(length),
            sortField,
            sortOrder,
        });

        if (!result.success) {
            throw new Error(result.message || "Failed to fetch BOMs");
        }

        res.status(200).json(
            ResponseFormatter.paginated(result.data, parseInt(start), parseInt(length), result.total, "BOMs fetched successfully")
        );
    }),

    /**
     * GET /api/v1/bom/:id
     * Get single BOM with components
     */
    getBOMById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            throw new BadRequestError("Valid BOM ID is required");
        }

        winston.info("Fetching BOM by ID", {
            source: "bom.controller.js",
            function: "getBOMById",
            bomid: id,
        });

        const result = await bomModel.getBOMById(id);

        if (!result.success) {
            throw new NotFoundError("BOM");
        }

        res.status(200).json(ResponseFormatter.success(result.data, "BOM fetched successfully"));
    }),

    /**
     * POST /api/v1/bom
     * Create a new BOM
     */
    createBOM: asyncHandler(async (req, res) => {
        const { bomname, finisheditemid, quantity, components = [] } = req.body;

        if (!bomname || !bomname.trim()) {
            throw new BadRequestError("BOM name is required");
        }

        if (!finisheditemid) {
            throw new BadRequestError("Finished item is required");
        }

        if (!Array.isArray(components) || components.length === 0) {
            throw new BadRequestError("At least one component is required");
        }

        // Validate components
        for (const comp of components) {
            if (!comp.componentitemid) {
                throw new BadRequestError("Each component must have a componentitemid");
            }
            if (!comp.quantity || comp.quantity <= 0) {
                throw new BadRequestError("Each component must have a valid quantity greater than 0");
            }
        }

        const payload = {
            ...req.body,
            createdby: req.user?.id || 1,
            ipaddress: req.ip,
        };

        winston.info("Creating BOM", {
            source: "bom.controller.js",
            function: "createBOM",
            bomname,
            finisheditemid,
            componentsCount: components.length,
            userId: req.user?.id,
        });

        const result = await bomModel.createBOM(payload);

        if (!result.success) {
            throw new BadRequestError(result.message || "Failed to create BOM");
        }

        res.status(201).json(ResponseFormatter.created(result.data, result.message));
    }),

    /**
     * PUT /api/v1/bom/:id
     * Update an existing BOM
     */
    updateBOM: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { bomname, finisheditemid } = req.body;

        if (!id || isNaN(id)) {
            throw new BadRequestError("Valid BOM ID is required");
        }

        if (!bomname || !bomname.trim()) {
            throw new BadRequestError("BOM name is required");
        }

        if (!finisheditemid) {
            throw new BadRequestError("Finished item is required");
        }

        const payload = {
            ...req.body,
            modifiedby: req.user?.id || 1,
            ipaddress: req.ip,
        };

        winston.info("Updating BOM", {
            source: "bom.controller.js",
            function: "updateBOM",
            bomid: id,
            userId: req.user?.id,
        });

        const result = await bomModel.updateBOM(id, payload);

        if (!result.success) {
            throw new BadRequestError(result.message || "Failed to update BOM");
        }

        res.status(200).json(ResponseFormatter.updated(result.data, result.message));
    }),

    /**
     * DELETE /api/v1/bom/:id
     * Soft delete a BOM
     */
    deleteBOM: asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            throw new BadRequestError("Valid BOM ID is required");
        }

        winston.info("Deleting BOM", {
            source: "bom.controller.js",
            function: "deleteBOM",
            bomid: id,
            userId: req.user?.id,
        });

        const result = await bomModel.deleteBOM(id, req.user?.id || 1);

        if (!result.success) {
            throw new NotFoundError("BOM");
        }

        res.status(200).json(ResponseFormatter.deleted(result.message));
    }),

    /**
     * GET /api/v1/bom/items/search
     * Search items for BOM dropdowns
     */
    getItemsForBOM: asyncHandler(async (req, res) => {
        const { search = "" } = req.query;

        const result = await bomModel.getItemsForBOM(search);

        if (!result.success) {
            throw new Error(result.message || "Failed to fetch items");
        }

        res.status(200).json(ResponseFormatter.success(result.data, "Items fetched successfully"));
    }),

    /**
     * GET /api/v1/bom/:id/cost
     * Get cost analysis of a BOM
     */
    getBOMCost: asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            throw new BadRequestError("Valid BOM ID is required");
        }

        winston.info("Getting BOM cost analysis", {
            source: "bom.controller.js",
            function: "getBOMCost",
            bomid: id,
        });

        const result = await bomModel.getBOMCost(id);

        if (!result.success) {
            throw new Error(result.message || "Failed to get BOM cost");
        }

        res.status(200).json(ResponseFormatter.success(result.data, "BOM cost analysis fetched successfully"));
    }),
};
