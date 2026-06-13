const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const salesSummaryController = require("../../../controllers/reports/sales/salesSummary.controller");
const router = express.Router();

// Get sales summary report with pagination and filters
router.get("/sales-summary", authMiddleware, salesSummaryController.getSalesSummary);

module.exports = {
    path: "/reports/sales",
    router: router,
};
