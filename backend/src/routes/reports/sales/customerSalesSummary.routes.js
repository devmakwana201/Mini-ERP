const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const customerSalesSummaryController = require("../../../controllers/reports/sales/customerSalesSummary.controller");
const router = express.Router();

// Get customer sales summary report with pagination and filters
router.get(
    "/customer-sales-summary",
    authMiddleware,
    customerSalesSummaryController.getCustomerSalesSummary
);

module.exports = {
    path: "/reports/sales",
    router: router,
};
