const express = require("express");
const router = express.Router();
const salesReturnController = require("../../controllers/pos-mgmt/salesReturn.controller");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");
const { validateBody } = require("../../middlewares/validation");
const { validationRules } = require("../../middlewares/validation");

// Save Sales Return Route
router.post(
    "/save",
    verifyPOSToken,
    validateBody(validationRules.saveSalesReturn),
    salesReturnController.saveSalesReturn
);

// Get Sales Return Status Route
router.get(
    "/status/:uniquekey",
    verifyPOSToken,
    salesReturnController.getSalesReturnStatus
);

// Get Sales Return Details Route
router.get(
    "/details/:uniquekey",
    verifyPOSToken,
    salesReturnController.getSalesReturnDetails
);

module.exports = {
    path: "/pos/sales-return",
    router,
};
