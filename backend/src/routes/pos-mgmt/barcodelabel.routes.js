const express = require("express");
const router = express.Router();
const barcodeLabelController = require("../../controllers/pos-mgmt/barcodelabel.controller");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");

/**
 * @route   POST /api/v1/pos/barcodelabel/sync
 * @desc    Sync barcode labels from POS to server
 * @access  Protected (POS token)
 */
router.post(
    "/sync",
    verifyPOSToken,
    barcodeLabelController.syncBarcodeLabels
);

module.exports = {
    path: "/pos/barcodelabel",
    router: router,
};
