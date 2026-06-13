const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const productWiseOrderDetailsController = require("../../../controllers/reports/sales/productWiseOrderDetails.controller");
const router = express.Router();

// Get product-wise order details report with pagination and filters
router.get(
    "/product-wise-order-details",
    authMiddleware,
    productWiseOrderDetailsController.getProductWiseOrderDetails
);

module.exports = {
    path: "/reports/sales",
    router: router,
};
