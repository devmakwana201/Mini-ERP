const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const dailyPurchaseSummaryController = require("../../../controllers/reports/purchase/dailyPurchaseSummary.controller");
const router = express.Router();

// Get daily purchase summary report with pagination and filters
router.get(
    "/daily-purchase-summary",
    authMiddleware,
    dailyPurchaseSummaryController.getDailyPurchaseSummary
);

module.exports = {
    path: "/reports/purchase",
    router: router,
};
