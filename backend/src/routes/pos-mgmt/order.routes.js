const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/pos-mgmt/order.controller");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");
const { validateBody } = require("../../middlewares/validation");
const { validationRules } = require("../../middlewares/validation");

// Save Order Route
router.post(
    "/save",
    verifyPOSToken,
    validateBody(validationRules.saveOrder),
    orderController.saveOrder
);

// Get Order Status Route
router.get(
    "/status/:uniquekey",
    verifyPOSToken,
    orderController.getOrderStatus
);

// Get Order Details Route
router.get(
    "/details/:uniquekey",
    verifyPOSToken,
    orderController.getOrderDetails
);

module.exports = {
    path: "/pos/order",
    router,
};