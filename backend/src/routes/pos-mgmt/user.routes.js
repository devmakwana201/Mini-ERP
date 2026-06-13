const express = require("express");
const router = express.Router();
const userController = require("../../controllers/pos-mgmt/user.controller");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");
const { validateBody, validationRules } = require("../../middlewares/validation");

// Sync users from POS
router.post(
    "/sync",
    verifyPOSToken,
    validateBody(validationRules.syncUsers),
    userController.syncUsers
);

module.exports = {
    path: "/pos/user",
    router: router,
};
