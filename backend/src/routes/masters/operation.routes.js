const express = require("express");
const router = express.Router();
const operationController = require("../../controllers/masters/operation.controller");
const { authMiddleware } = require("../../middlewares/auth.middleware");

/**
 * @route   GET /api/v1/operations
 * @desc    Get paginated list of operations
 * @access  Protected
 * @query   start, length, filters (JSON), sortField, sortOrder
 */
router.get("/", authMiddleware, operationController.getOperations);

/**
 * @route   GET /api/v1/operations/active
 * @desc    Get all active operations (for dropdowns); filter by ?work_center_id=X
 * @access  Protected
 * @query   work_center_id (optional)
 */
router.get("/active", authMiddleware, operationController.getActiveOperations);

/**
 * @route   GET /api/v1/operations/:id
 * @desc    Get single operation by ID (includes work center details)
 * @access  Protected
 */
router.get("/:id", authMiddleware, operationController.getOperationById);

/**
 * @route   POST /api/v1/operations
 * @desc    Create a new operation
 * @access  Protected
 * @body    { work_center_id, name, code, description?, duration_minutes?, is_active? }
 */
router.post("/", authMiddleware, operationController.createOperation);

/**
 * @route   PUT /api/v1/operations/:id
 * @desc    Update an existing operation
 * @access  Protected
 */
router.put("/:id", authMiddleware, operationController.updateOperation);

/**
 * @route   DELETE /api/v1/operations/:id
 * @desc    Soft delete an operation
 * @access  Protected
 */
router.delete("/:id", authMiddleware, operationController.deleteOperation);

module.exports = {
    path: "/operations",
    router,
};
