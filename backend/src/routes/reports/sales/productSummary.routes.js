const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const productSummaryController = require("../../../controllers/reports/sales/productSummary.controller");
const router = express.Router();

// Get product summary report with pagination and filters
router.get("/product-summary", authMiddleware, productSummaryController.getProductSummary);

module.exports = {
    path: "/reports/sales",
    router: router,
};
