const operationModel = require("../../models/masters/operation.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError, NotFoundError } = require("../../utils/customErrors");
const winston = require("../../config/winston");

module.exports = {
    /**
     * GET /api/v1/operations
     * List all operations with pagination
     */
    getOperations: asyncHandler(async (req, res) => {
        const { start = 0, length = 10, filters, sortField, sortOrder } = req.query;

        let parsedFilters = {};
        try {
            parsedFilters = filters ? JSON.parse(filters) : {};
        } catch {
            parsedFilters = {};
        }

        winston.info("Fetching Operations list", {
            source: "operation.controller.js", function: "getOperations",
            start, length, sortField, sortOrder,
        });

        const result = await operationModel.getOperations({
            filters: parsedFilters,
            start: parseInt(start),
            length: parseInt(length),
            sortField,
            sortOrder,
        });

        if (!result.success) {
            throw new Error(result.message || "Failed to fetch Operations");
        }

        res.status(200).json(
            ResponseFormatter.paginated(result.data, parseInt(start), parseInt(length), result.total, "Operations fetched successfully")
        );
    }),

    /**
     * GET /api/v1/operations/active
     * Get active operations for dropdown (optionally filter by ?work_center_id=X)
     */
    getActiveOperations: asyncHandler(async (req, res) => {
        const { work_center_id } = req.query;

        const result = await operationModel.getActiveOperations(work_center_id || null);

        if (!result.success) {
            throw new Error(result.message || "Failed to fetch active Operations");
        }

        res.status(200).json(ResponseFormatter.success(result.data, "Active Operations fetched successfully"));
    }),

    /**
     * GET /api/v1/operations/:id
     * Get single operation with its work center details
     */
    getOperationById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            throw new BadRequestError("Valid Operation ID is required");
        }

        winston.info("Fetching Operation by ID", {
            source: "operation.controller.js", function: "getOperationById", id,
        });

        const result = await operationModel.getOperationById(id);

        if (!result.success) {
            throw new NotFoundError("Operation");
        }

        res.status(200).json(ResponseFormatter.success(result.data, "Operation fetched successfully"));
    }),

    /**
     * POST /api/v1/operations
     * Create a new operation
     */
    createOperation: asyncHandler(async (req, res) => {
        const { name, code, work_center_id } = req.body;

        if (!name || !name.trim()) {
            throw new BadRequestError("Operation name is required");
        }
        if (!code || !code.trim()) {
            throw new BadRequestError("Operation code is required");
        }
        if (!work_center_id || isNaN(work_center_id)) {
            throw new BadRequestError("Valid Work Center ID is required");
        }

        const payload = {
            ...req.body,
            created_by: req.user?.userId || null,
        };

        winston.info("Creating Operation", {
            source: "operation.controller.js", function: "createOperation",
            name, code, work_center_id, userId: req.user?.userId,
        });

        const result = await operationModel.createOperation(payload);

        if (!result.success) {
            throw new BadRequestError(result.message || "Failed to create Operation");
        }

        res.status(201).json(ResponseFormatter.created(result.data, result.message));
    }),

    /**
     * PUT /api/v1/operations/:id
     * Update an existing operation
     */
    updateOperation: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { name, code, work_center_id } = req.body;

        if (!id || isNaN(id)) {
            throw new BadRequestError("Valid Operation ID is required");
        }
        if (!name || !name.trim()) {
            throw new BadRequestError("Operation name is required");
        }
        if (!code || !code.trim()) {
            throw new BadRequestError("Operation code is required");
        }
        if (!work_center_id || isNaN(work_center_id)) {
            throw new BadRequestError("Valid Work Center ID is required");
        }

        const payload = {
            ...req.body,
            updated_by: req.user?.userId || null,
        };

        winston.info("Updating Operation", {
            source: "operation.controller.js", function: "updateOperation",
            operation_id: id, userId: req.user?.userId,
        });

        const result = await operationModel.updateOperation(id, payload);

        if (!result.success) {
            throw new BadRequestError(result.message || "Failed to update Operation");
        }

        res.status(200).json(ResponseFormatter.updated(result.data, result.message));
    }),

    /**
     * DELETE /api/v1/operations/:id
     * Soft delete an operation
     */
    deleteOperation: asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            throw new BadRequestError("Valid Operation ID is required");
        }

        winston.info("Deleting Operation", {
            source: "operation.controller.js", function: "deleteOperation",
            operation_id: id, userId: req.user?.userId,
        });

        const result = await operationModel.deleteOperation(id, req.user?.userId || null);

        if (!result.success) {
            throw new BadRequestError(result.message || "Failed to delete Operation");
        }

        res.status(200).json(ResponseFormatter.deleted(result.message));
    }),
};
