const express = require("express");
const router = express.Router();
const supplierController = require("../../controllers/pos-mgmt/supplier.controller");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");
const { validateBody, validationRules } = require("../../middlewares/validation");

// Sync suppliers from POS
router.post(
    "/sync",
    verifyPOSToken,
    validateBody(validationRules.saveSuppliers),
    supplierController.syncSuppliers
);

// Sync supplier account details from POS
router.post(
    "/sync-details",
    verifyPOSToken,
    validateBody(validationRules.saveSupplierAccountDetails),
    supplierController.syncSupplierAccountDetails
);

/**
 * @route POST /api/v1/pos/supplier/mapping
 * @desc Map approved suppliers to company
 * @access Private (POS)
 * @body { companyid, suppliers: [{supplierid, uniquekey}] }
 */
router.post(
    "/mapping",
    verifyPOSToken,
    supplierController.supplierMapping
);

/**
 * @route POST /api/v1/pos/supplier/check-approval-status
 * @desc Check approval status for suppliers (webhook for POS cron)
 * @access Private (POS)
 * @body { uniquekeys: ["12345...", "67890..."] }
 */
router.post(
    "/check-approval-status",
    verifyPOSToken,
    supplierController.checkApprovalStatus
);

module.exports = {
    path: "/pos/supplier",
    router: router,
};
