const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const currentStockReportController = require("../../../controllers/reports/stock/currentStockReport.controller");
const router = express.Router();

// Get current stock report with pagination and filters
router.get(
    "/current-stock-report",
    authMiddleware,
    currentStockReportController.getCurrentStockReport
);

module.exports = {
    path: "/reports/stock",
    router: router,
};
