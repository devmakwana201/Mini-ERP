const express = require("express");
const router = express.Router();
const shiftController = require("../../controllers/pos-mgmt/shift.controller");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");
const { validateBody, validationRules } = require("../../middlewares/validation");

router.post(
    "/save",
    verifyPOSToken,
    validateBody(validationRules.saveShift),
    shiftController.saveShift
);

module.exports = {
    path: "/pos/shift",
    router,
};
