const express = require("express");
const router = express.Router();
const apilogController = require("../../controllers/pos-mgmt/apilog.controller");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");
const { validateBody, validationRules } = require("../../middlewares/validation");

// Sync API logs from POS
router.post(
    "/sync",
    verifyPOSToken,
    validateBody(validationRules.syncApiLogs),
    apilogController.syncApiLogs
);

module.exports = {
    path: "/pos/apilog",
    router: router,
};
