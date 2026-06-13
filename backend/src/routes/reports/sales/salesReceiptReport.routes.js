const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const salesReceiptReportController = require("../../../controllers/reports/sales/salesReceiptReport.controller");
const router = express.Router();

// Get sales receipt report with pagination and filters
router.get("/sales-receipt", authMiddleware, salesReceiptReportController.getSalesReceiptReport);

module.exports = {
    path: "/reports/sales",
    router: router,
};
