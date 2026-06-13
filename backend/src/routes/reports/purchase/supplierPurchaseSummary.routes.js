const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const supplierPurchaseSummaryController = require("../../../controllers/reports/purchase/supplierPurchaseSummary.controller");
const router = express.Router();

// Get supplier purchase summary report with pagination and filters
router.get(
    "/supplier-purchase-summary",
    authMiddleware,
    supplierPurchaseSummaryController.getSupplierPurchaseSummary
);

module.exports = {
    path: "/reports/purchase",
    router: router,
};
