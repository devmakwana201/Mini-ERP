const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const orderSummaryController = require("../../../controllers/reports/sales/orderSummary.controller");
const router = express.Router();

// Get order summary report with pagination and filters
router.get("/order-summary", authMiddleware, orderSummaryController.getOrderSummary);

module.exports = {
    path: "/reports/sales",
    router: router,
};
