const express = require("express");
const router = express.Router();
const syncController = require("../../controllers/pos-mgmt/sync.controller");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");
const { validateBody, validationRules } = require("../../middlewares/validation");

router.post(
    "/master-data",
    verifyPOSToken,
    validateBody(validationRules.masterData),
    syncController.getMasterData
);

router.post(
    "/items",
    verifyPOSToken,
    validateBody(validationRules.getItems),
    syncController.getItems
);

module.exports = {
    path: "/pos/sync",
    router: router,
};
