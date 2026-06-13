const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const stockAdjustmentReportController = require("../../../controllers/reports/stock/stockAdjustmentReport.controller");
const router = express.Router();

// Get stock adjustment report with pagination and filters
router.get(
    "/stock-adjustment-report",
    authMiddleware,
    stockAdjustmentReportController.getStockAdjustmentReport
);

module.exports = {
    path: "/reports/stock",
    router: router,
};
