const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const categorySalesSummaryController = require("../../../controllers/reports/sales/categorySalesSummary.controller");
const router = express.Router();

// Get category sales summary report with pagination and filters
router.get(
    "/category-sales-summary",
    authMiddleware,
    categorySalesSummaryController.getCategorySalesSummary
);

module.exports = {
    path: "/reports/sales",
    router: router,
};
