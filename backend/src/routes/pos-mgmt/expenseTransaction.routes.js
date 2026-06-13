const express = require("express");
const router = express.Router();
const expenseTransactionController = require("../../controllers/pos-mgmt/expenseTransaction.controller");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");
const { validateBody, validationRules } = require("../../middlewares/validation");

// Sync expense transactions and details from POS
router.post(
    "/sync",
    verifyPOSToken,
    validateBody(validationRules.saveExpenseTransactions),
    expenseTransactionController.syncExpenseTransactions
);

module.exports = {
    path: "/pos/expense-transaction",
    router: router,
};
