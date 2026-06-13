const workCenterModel = require("../../models/masters/work-center.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError, NotFoundError } = require("../../utils/customErrors");
const winston = require("../../config/winston");

module.exports = {
    /**
     * GET /api/v1/work-centers
     * List all work centers with pagination
     */
    getWorkCenters: asyncHandler(async (req, res) => {
        const { start = 0, length = 10, filters, sortField, sortOrder } = req.query;

        let parsedFilters = {};
        try {
            parsedFilters = filters ? JSON.parse(filters) : {};
        } catch {
            parsedFilters = {};
        }

        winston.info("Fetching Work Centers list", {
            source: "work-center.controller.js", function: "getWorkCenters",
            start, length, sortField, sortOrder,
        });

        const result = await workCenterModel.getWorkCenters({
            filters: parsedFilters,
            start: parseInt(start),
            length: parseInt(length),
            sortField,
            sortOrder,
        });

        if (!result.success) {
            throw new Error(result.message || "Failed to fetch Work Centers");
        }

        res.status(200).json(
            ResponseFormatter.paginated(result.data, parseInt(start), parseInt(length), result.total, "Work Centers fetched successfully")
        );
    }),

    /**
     * GET /api/v1/work-centers/active
     * Get active work centers for dropdown use
     */
    getActiveWorkCenters: asyncHandler(async (req, res) => {
        const result = await workCenterModel.getActiveWorkCenters();

        if (!result.success) {
            throw new Error(result.message || "Failed to fetch active Work Centers");
        }

        res.status(200).json(ResponseFormatter.success(result.data, "Active Work Centers fetched successfully"));
    }),

    /**
     * GET /api/v1/work-centers/:id
     * Get single work center
     */
    getWorkCenterById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            throw new BadRequestError("Valid Work Center ID is required");
        }

        winston.info("Fetching Work Center by ID", {
            source: "work-center.controller.js", function: "getWorkCenterById", id,
        });

        const result = await workCenterModel.getWorkCenterById(id);

        if (!result.success) {
            throw new NotFoundError("Work Center");
        }

        res.status(200).json(ResponseFormatter.success(result.data, "Work Center fetched successfully"));
    }),

    /**
     * POST /api/v1/work-centers
     * Create a new work center
     */
    createWorkCenter: asyncHandler(async (req, res) => {
        const { name, code } = req.body;

        if (!name || !name.trim()) {
            throw new BadRequestError("Work Center name is required");
        }
        if (!code || !code.trim()) {
            throw new BadRequestError("Work Center code is required");
        }

        const payload = {
            ...req.body,
            created_by: req.user?.userId || null,
        };

        winston.info("Creating Work Center", {
            source: "work-center.controller.js", function: "createWorkCenter",
            name, code, userId: req.user?.userId,
        });

        const result = await workCenterModel.createWorkCenter(payload);

        if (!result.success) {
            throw new BadRequestError(result.message || "Failed to create Work Center");
        }

        res.status(201).json(ResponseFormatter.created(result.data, result.message));
    }),

    /**
     * PUT /api/v1/work-centers/:id
     * Update an existing work center
     */
    updateWorkCenter: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { name, code } = req.body;

        if (!id || isNaN(id)) {
            throw new BadRequestError("Valid Work Center ID is required");
        }
        if (!name || !name.trim()) {
            throw new BadRequestError("Work Center name is required");
        }
        if (!code || !code.trim()) {
            throw new BadRequestError("Work Center code is required");
        }

        const payload = {
            ...req.body,
            updated_by: req.user?.userId || null,
        };

        winston.info("Updating Work Center", {
            source: "work-center.controller.js", function: "updateWorkCenter",
            work_center_id: id, userId: req.user?.userId,
        });

        const result = await workCenterModel.updateWorkCenter(id, payload);

        if (!result.success) {
            throw new BadRequestError(result.message || "Failed to update Work Center");
        }

        res.status(200).json(ResponseFormatter.updated(result.data, result.message));
    }),

    /**
     * DELETE /api/v1/work-centers/:id
     * Soft delete a work center
     */
    deleteWorkCenter: asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            throw new BadRequestError("Valid Work Center ID is required");
        }

        winston.info("Deleting Work Center", {
            source: "work-center.controller.js", function: "deleteWorkCenter",
            work_center_id: id, userId: req.user?.userId,
        });

        const result = await workCenterModel.deleteWorkCenter(id, req.user?.userId || null);

        if (!result.success) {
            throw new BadRequestError(result.message || "Failed to delete Work Center");
        }

        res.status(200).json(ResponseFormatter.deleted(result.message));
    }),
};
