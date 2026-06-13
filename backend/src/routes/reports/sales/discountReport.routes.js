const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const discountReportController = require("../../../controllers/reports/sales/discountReport.controller");
const router = express.Router();

// Get discount report with pagination and filters
router.get("/discount-report", authMiddleware, discountReportController.getDiscountReport);

module.exports = {
    path: "/reports/sales",
    router: router,
};
