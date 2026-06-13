const moComponentModel = require("../../models/manufacturing/mo-component.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError, NotFoundError } = require("../../utils/customErrors");
const winston = require("../../config/winston");

module.exports = {
    /**
     * GET /api/v1/mo/:moId/components
     * Get all components for a Manufacturing Order
     */
    getMOComponents: asyncHandler(async (req, res) => {
        const { moId } = req.params;

        if (!moId || isNaN(moId)) {
            throw new BadRequestError("Valid Manufacturing Order ID is required");
        }

        winston.info("Fetching MO Components", {
            source: "mo-component.controller.js", function: "getMOComponents", moId,
        });

        const result = await moComponentModel.getMOComponents(moId);

        if (!result.success) {
            throw new Error(result.message || "Failed to fetch MO Components");
        }

        res.status(200).json(ResponseFormatter.success(result.data, "MO Components fetched successfully"));
    }),

    /**
     * POST /api/v1/mo/:moId/components
     * Add a single component manually to an MO
     */
    createMOComponent: asyncHandler(async (req, res) => {
        const { moId } = req.params;
        const { product_id, qty_planned } = req.body;

        if (!moId || isNaN(moId)) {
            throw new BadRequestError("Valid Manufacturing Order ID is required");
        }
        if (!product_id || isNaN(product_id)) {
            throw new BadRequestError("Valid Product ID is required");
        }
        if (!qty_planned || isNaN(qty_planned) || parseFloat(qty_planned) <= 0) {
            throw new BadRequestError("Planned quantity must be a positive number");
        }

        const payload = {
            ...req.body,
            created_by: req.user?.userId || null,
        };

        winston.info("Creating MO Component", {
            source: "mo-component.controller.js", function: "createMOComponent",
            moId, product_id, qty_planned, userId: req.user?.userId,
        });

        const result = await moComponentModel.createMOComponent(moId, payload);

        if (!result.success) {
            throw new BadRequestError(result.message || "Failed to add MO Component");
        }

        res.status(201).json(ResponseFormatter.created(result.data, result.message));
    }),

    /**
     * POST /api/v1/mo/:moId/components/explode
     * Auto-create components by exploding the BOM linked to this MO
     */
    explodeBOM: asyncHandler(async (req, res) => {
        const { moId } = req.params;

        if (!moId || isNaN(moId)) {
            throw new BadRequestError("Valid Manufacturing Order ID is required");
        }

        winston.info("Exploding BOM for MO", {
            source: "mo-component.controller.js", function: "explodeBOM",
            moId, userId: req.user?.userId,
        });

        const result = await moComponentModel.explodeBOM(moId, req.user?.userId || null);

        if (!result.success) {
            throw new BadRequestError(result.message || "Failed to explode BOM");
        }

        res.status(200).json(ResponseFormatter.success(result.data, result.message));
    }),

    /**
     * PUT /api/v1/mo/:moId/components/:id
     * Update actual consumed quantity for a component
     */
    updateConsumedQty: asyncHandler(async (req, res) => {
        const { moId, id } = req.params;
        const { qty_consumed } = req.body;

        if (!moId || isNaN(moId)) {
            throw new BadRequestError("Valid Manufacturing Order ID is required");
        }
        if (!id || isNaN(id)) {
            throw new BadRequestError("Valid Component ID is required");
        }
        if (qty_consumed === undefined || isNaN(qty_consumed) || parseFloat(qty_consumed) < 0) {
            throw new BadRequestError("Consumed quantity must be a non-negative number");
        }

        winston.info("Updating MO Component consumed qty", {
            source: "mo-component.controller.js", function: "updateConsumedQty",
            moId, component_id: id, qty_consumed, userId: req.user?.userId,
        });

        const result = await moComponentModel.updateConsumedQty(id, parseFloat(qty_consumed));

        if (!result.success) {
            throw new NotFoundError("MO Component");
        }

        res.status(200).json(ResponseFormatter.updated(result.data, result.message));
    }),

    /**
     * DELETE /api/v1/mo/:moId/components/:id
     * Delete a single MO component (hard delete)
     */
    deleteMOComponent: asyncHandler(async (req, res) => {
        const { moId, id } = req.params;

        if (!moId || isNaN(moId)) {
            throw new BadRequestError("Valid Manufacturing Order ID is required");
        }
        if (!id || isNaN(id)) {
            throw new BadRequestError("Valid Component ID is required");
        }

        winston.info("Deleting MO Component", {
            source: "mo-component.controller.js", function: "deleteMOComponent",
            moId, component_id: id, userId: req.user?.userId,
        });

        const result = await moComponentModel.deleteMOComponent(id);

        if (!result.success) {
            throw new NotFoundError("MO Component");
        }

        res.status(200).json(ResponseFormatter.deleted(result.message));
    }),
};
