const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const productSalesSummaryController = require("../../../controllers/reports/sales/productSalesSummary.controller");
const router = express.Router();

// Get product sales summary report with pagination and filters
router.get(
    "/product-sales-summary",
    authMiddleware,
    productSalesSummaryController.getProductSalesSummary
);

module.exports = {
    path: "/reports/sales",
    router: router,
};
