const express = require("express");
const router = express.Router();
const workCenterController = require("../../controllers/masters/work-center.controller");
const { authMiddleware } = require("../../middlewares/auth.middleware");

/**
 * @route   GET /api/v1/work-centers
 * @desc    Get paginated list of work centers
 * @access  Protected
 * @query   start, length, filters (JSON), sortField, sortOrder
 */
router.get("/", authMiddleware, workCenterController.getWorkCenters);

/**
 * @route   GET /api/v1/work-centers/active
 * @desc    Get all active work centers (for dropdowns)
 * @access  Protected
 */
router.get("/active", authMiddleware, workCenterController.getActiveWorkCenters);

/**
 * @route   GET /api/v1/work-centers/:id
 * @desc    Get single work center by ID
 * @access  Protected
 */
router.get("/:id", authMiddleware, workCenterController.getWorkCenterById);

/**
 * @route   POST /api/v1/work-centers
 * @desc    Create a new work center
 * @access  Protected
 * @body    { name, code, description?, capacity_per_day?, cost_per_hour?, is_active? }
 */
router.post("/", authMiddleware, workCenterController.createWorkCenter);

/**
 * @route   PUT /api/v1/work-centers/:id
 * @desc    Update an existing work center
 * @access  Protected
 */
router.put("/:id", authMiddleware, workCenterController.updateWorkCenter);

/**
 * @route   DELETE /api/v1/work-centers/:id
 * @desc    Soft delete a work center
 * @access  Protected
 */
router.delete("/:id", authMiddleware, workCenterController.deleteWorkCenter);

module.exports = {
    path: "/work-centers",
    router,
};
