const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const purchaseOrdersController = require("../../../controllers/reports/purchase/purchaseOrders.controller");
const router = express.Router();

// Get purchase orders report with pagination and filters
router.get("/purchase-orders", authMiddleware, purchaseOrdersController.getPurchaseOrders);

module.exports = {
    path: "/reports/purchase",
    router: router,
};
