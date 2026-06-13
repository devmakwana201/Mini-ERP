const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const productCancellationController = require("../../../controllers/reports/sales/productCancellation.controller");
const router = express.Router();

// Get product cancellation report with pagination and filters
router.get("/product-cancellation", authMiddleware, productCancellationController.getProductCancellation);

module.exports = {
    path: "/reports/sales",
    router: router,
};
