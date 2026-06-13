const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const productWisePurchaseController = require("../../../controllers/reports/purchase/productWisePurchase.controller");
const router = express.Router();

// Get product wise purchase report with pagination and filters
router.get(
    "/product-wise-purchase",
    authMiddleware,
    productWisePurchaseController.getProductWisePurchase
);

module.exports = {
    path: "/reports/purchase",
    router: router,
};
