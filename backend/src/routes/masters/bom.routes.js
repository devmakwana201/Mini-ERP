const express = require("express");
const router = express.Router();
const bomController = require("../../controllers/masters/bom.controller");
const { authMiddleware } = require("../../middlewares/auth.middleware");

/**
 * @route   GET /api/v1/bom
 * @desc    Get paginated list of BOMs
 * @access  Protected
 * @query   start, length, filters (JSON), sortField, sortOrder
 */
router.get("/", authMiddleware, bomController.getBOMs);

/**
 * @route   GET /api/v1/bom/items/search
 * @desc    Search items for BOM dropdowns (finished goods & components)
 * @access  Protected
 * @query   search
 */
router.get("/items/search", authMiddleware, bomController.getItemsForBOM);

/**
 * @route   GET /api/v1/bom/:id
 * @desc    Get single BOM with all components
 * @access  Protected
 */
router.get("/:id", authMiddleware, bomController.getBOMById);

/**
 * @route   GET /api/v1/bom/:id/cost
 * @desc    Get cost analysis of a BOM
 * @access  Protected
 */
router.get("/:id/cost", authMiddleware, bomController.getBOMCost);

/**
 * @route   POST /api/v1/bom
 * @desc    Create a new BOM with components
 * @access  Protected
 * @body    { bomname, bomcode, bomtype, finisheditemid, quantity, uomid, status, description, effectivedate, expirydate, components: [{componentitemid, quantity, uomid, scrap_percentage, notes, isoptional, sortorder}] }
 */
router.post("/", authMiddleware, bomController.createBOM);

/**
 * @route   PUT /api/v1/bom/:id
 * @desc    Update an existing BOM and its components
 * @access  Protected
 */
router.put("/:id", authMiddleware, bomController.updateBOM);

/**
 * @route   DELETE /api/v1/bom/:id
 * @desc    Soft delete a BOM
 * @access  Protected
 */
router.delete("/:id", authMiddleware, bomController.deleteBOM);

module.exports = {
    path: "/bom",
    router,
};
