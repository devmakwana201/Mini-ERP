const express = require("express");
const router = express.Router();
const purchaseReturnController = require("../../controllers/pos-mgmt/purchaseReturn.controller");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");
const { validateBody } = require("../../middlewares/validation");
const { validationRules } = require("../../middlewares/validation");

// Save Purchase Return Route
router.post(
    "/save",
    verifyPOSToken,
    validateBody(validationRules.savePurchaseReturn),
    purchaseReturnController.savePurchaseReturn
);

// Get Purchase Return Status Route
router.get(
    "/status/:uniquekey",
    verifyPOSToken,
    purchaseReturnController.getPurchaseReturnStatus
);

// Get Purchase Return Details Route
router.get(
    "/details/:uniquekey",
    verifyPOSToken,
    purchaseReturnController.getPurchaseReturnDetails
);

module.exports = {
    path: "/pos/purchase-return",
    router,
};
