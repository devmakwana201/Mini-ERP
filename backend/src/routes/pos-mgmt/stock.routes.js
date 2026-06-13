const express = require("express");
const router = express.Router();
const stockController = require("../../controllers/pos-mgmt/stock.controller");
const stockAdjustmentDetailsController = require("../../controllers/pos-mgmt/stockadjustmentdetails.controller");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");
const { validateBody, validationRules } = require("../../middlewares/validation");

// Sync current stock master from POS
router.post(
    "/sync-current-stock",
    verifyPOSToken,
    validateBody(validationRules.saveCurrentStockMaster),
    stockController.syncCurrentStockMaster
);

// Sync item day wise stock details from POS
router.post(
    "/sync-daywise-stock",
    verifyPOSToken,
    validateBody(validationRules.saveItemDayWiseStock),
    stockController.syncItemDayWiseStock
);

// Sync current stock audit master from POS
router.post(
    "/sync-stock-audit",
    verifyPOSToken,
    validateBody(validationRules.saveCurrentStockAuditMaster),
    stockController.syncCurrentStockAuditMaster
);

// Sync stock adjustment details from POS
router.post(
    "/sync-stock-adjustment-details",
    verifyPOSToken,
    validateBody(validationRules.syncStockAdjustmentDetails),
    stockAdjustmentDetailsController.syncStockAdjustmentDetails
);

module.exports = {
    path: "/pos/stock",
    router: router,
};
