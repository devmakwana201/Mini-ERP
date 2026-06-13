const express = require("express");
const router = express.Router();
const expenseMasterController = require("../../controllers/pos-mgmt/expensemaster.controller");
const { validateSchema } = require("../../middlewares/validation");
const { validationRules } = require("../../middlewares/validation");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");

router.post(
    "/sync",
    verifyPOSToken,
    validateSchema(validationRules.syncExpenseMaster),
    expenseMasterController.syncExpenseMaster
);

module.exports = {
    router: router,
    path: "/pos/expense-master"
};