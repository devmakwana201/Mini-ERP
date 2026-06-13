const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const dailySalesSummaryController = require("../../../controllers/reports/sales/dailySalesSummary.controller");
const router = express.Router();

// Get daily sales summary report with pagination and filters
router.get(
    "/daily-sales-summary",
    authMiddleware,
    dailySalesSummaryController.getDailySalesSummary
);

module.exports = {
    path: "/reports/sales",
    router: router,
};
