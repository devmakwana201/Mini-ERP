const express = require("express");
const router = express.Router({ mergeParams: true }); // mergeParams to access :moId from parent
const moComponentController = require("../../controllers/manufacturing/mo-component.controller");
const { authMiddleware } = require("../../middlewares/auth.middleware");

/**
 * @route   GET /api/v1/mo/:moId/components
 * @desc    Get all components for a Manufacturing Order
 * @access  Protected
 */
router.get("/", authMiddleware, moComponentController.getMOComponents);

/**
 * @route   POST /api/v1/mo/:moId/components/explode
 * @desc    Explode the BOM linked to this MO and auto-create component lines
 * @access  Protected
 */
router.post("/explode", authMiddleware, moComponentController.explodeBOM);

/**
 * @route   POST /api/v1/mo/:moId/components
 * @desc    Manually add a single component to an MO
 * @access  Protected
 * @body    { product_id, qty_planned, uom?, notes? }
 */
router.post("/", authMiddleware, moComponentController.createMOComponent);

/**
 * @route   PUT /api/v1/mo/:moId/components/:id
 * @desc    Update the consumed quantity for a component
 * @access  Protected
 * @body    { qty_consumed }
 */
router.put("/:id", authMiddleware, moComponentController.updateConsumedQty);

/**
 * @route   DELETE /api/v1/mo/:moId/components/:id
 * @desc    Remove a component from an MO (hard delete)
 * @access  Protected
 */
router.delete("/:id", authMiddleware, moComponentController.deleteMOComponent);

module.exports = {
    path: "/mo/:moId/components",
    router,
};
