const express = require("express");
const router = express.Router();
const brandController = require("../../controllers/pos-mgmt/brand.controller");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");

/**
 * @route   POST /api/pos/brand/mapping
 * @desc    Map brands to company (companies can map approved brands but cannot modify brand details)
 * @access  Protected (POS token required)
 * @body    { companyid, brands: [{brandid, uniquekey}] }
 */
router.post(
    "/mapping",
    verifyPOSToken,
    brandController.brandMapping
);

/**
 * @route   POST /api/pos/brand/sync
 * @desc    Sync brands from POS (batch operation)
 * @access  Protected (POS token required)
 * @body    JSON with brands array containing brand objects with base64Image field
 */
router.post(
    "/sync",
    verifyPOSToken,
    brandController.syncBrands
);

/**
 * @route   POST /api/pos/brand/check-approval-status
 * @desc    Check approval status for multiple brands (webhook for POS cron)
 * @access  Protected (POS token required)
 * @body    { uniquekeys: ["12345...", "67890..."] }
 * @returns Array of objects with status for each uniquekey:
 *          - approved: Brand approved
 *          - rejected: Brand rejected and soft deleted
 *          - pending: Still awaiting approval
 *          - not_found: Brand doesn't exist
 */
router.post(
    "/check-approval-status",
    verifyPOSToken,
    brandController.checkApprovalStatus
);

module.exports = {
    path: "/pos/brand",
    router: router,
};
