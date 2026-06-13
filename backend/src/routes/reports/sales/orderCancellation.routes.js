const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const orderCancellationController = require("../../../controllers/reports/sales/orderCancellation.controller");

const router = express.Router();

router.get(
    "/order-cancellation",
    authMiddleware,
    orderCancellationController.getOrderCancellation
);

module.exports = {
    path: "/reports/sales",
    router,
};
