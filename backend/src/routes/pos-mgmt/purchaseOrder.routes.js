const express = require("express");
const router = express.Router();
const purchaseOrderController = require("../../controllers/pos-mgmt/purchaseOrder.controller");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");
const { validateBody } = require("../../middlewares/validation");
const { validationRules } = require("../../middlewares/validation");

// Save Purchase Order Route
router.post(
    "/save",
    verifyPOSToken,
    validateBody(validationRules.savePurchaseOrder),
    purchaseOrderController.savePurchaseOrder
);

// Get Purchase Order Status Route
router.get(
    "/status/:uniquekey",
    verifyPOSToken,
    purchaseOrderController.getPurchaseOrderStatus
);

// Get Purchase Order Details Route
router.get(
    "/details/:uniquekey",
    verifyPOSToken,
    purchaseOrderController.getPurchaseOrderDetails
);

module.exports = {
    path: "/pos/purchase-order",
    router,
};
