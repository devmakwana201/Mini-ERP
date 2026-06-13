const express = require("express");
const router = express.Router();
const billNumFormatController = require("../../controllers/pos-mgmt/billnumformat.controller");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");
const { validateBody, validationRules } = require("../../middlewares/validation");

// Sync bill number formats from POS
router.post(
    "/sync",
    verifyPOSToken,
    validateBody(validationRules.saveBillNumFormats),
    billNumFormatController.syncBillNumFormats
);

module.exports = {
    path: "/pos/billnumformat",
    router: router,
};
