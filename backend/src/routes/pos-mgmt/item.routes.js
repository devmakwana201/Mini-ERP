const express = require("express");
const router = express.Router();
const itemController = require("../../controllers/pos-mgmt/item.controller");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");

// Increased body parser limit for routes with image uploads (500MB for batch with images)
const largePayloadParser = express.json({ limit: '500mb' });

/**
 * @route   POST /api/pos/item/mapping
 * @desc    Map selected items to company or update existing item data (price, tax, itemcode)
 * @access  Protected (POS token required)
 * @body    { companyid, ismodified, items: [{itemid, sellingprice, purchaseprice, wholesaleprice, netcost, safetyquantity, ignoretax, ignorediscount, itemcode, defaulttaxprofileid}] }
 */
router.post(
    "/mapping",
    verifyPOSToken,
    itemController.itemMapping
);

/**
 * @route   POST /api/pos/item/sync
 * @desc    Sync items from POS (batch operation)
 * @access  Protected (POS token required)
 * @body    JSON with items array containing item objects with base64Image field
 * @note    Uses increased body parser limit (500MB) to handle batch items with base64 images
 */
router.post(
    "/sync",
    largePayloadParser,
    verifyPOSToken,
    itemController.syncItems
);

/**
 * @route   POST /api/pos/item/check-approval-status
 * @desc    Check approval status for multiple items (webhook for POS cron)
 * @access  Protected (POS token required)
 * @body    { uniquekeys: ["12345...", "67890..."] }
 * @returns Array of objects with status for each uniquekey:
 *          - approved: Item approved and made global
 *          - rejected_duplicate: Item deleted as duplicate with original item data
 *          - company_specific: Item kept for company only (non-duplicate rejection)
 *          - pending: Still awaiting approval
 *          - not_found: Item doesn't exist
 */
router.post(
    "/check-approval-status",
    verifyPOSToken,
    itemController.checkApprovalStatus
);

module.exports = {
    path: "/pos/item",
    router: router,
};
