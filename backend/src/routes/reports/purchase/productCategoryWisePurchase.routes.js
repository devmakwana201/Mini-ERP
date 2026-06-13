const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const productCategoryWisePurchaseController = require("../../../controllers/reports/purchase/productCategoryWisePurchase.controller");
const router = express.Router();

// Get product category wise purchase report with pagination and filters
router.get(
    "/product-category-wise-purchase",
    authMiddleware,
    productCategoryWisePurchaseController.getProductCategoryWisePurchase
);

module.exports = {
    path: "/reports/purchase",
    router: router,
};
