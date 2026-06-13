const expenseTransactionModel = require("../../models/pos-mgmt/expenseTransaction.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError } = require("../../utils/customErrors");
const winston = require("../../config/winston");

module.exports = {
    /**
     * Sync expense transactions and details from POS
     * POST /api/v1/pos/expense-transaction/sync
     */
    syncExpenseTransactions: asyncHandler(async (req, res) => {
        const { expenseTransactions } = req.body;

        // Validate expense transactions array
        if (!expenseTransactions || !Array.isArray(expenseTransactions) || expenseTransactions.length === 0) {
            throw new BadRequestError("Expense transactions array is required and cannot be empty");
        }

        let expenseTransactionDetailsCount = 0;
        // Validate required fields for each expense transaction
        for (let i = 0; i < expenseTransactions.length; i++) {
            const transaction = expenseTransactions[i];
            if (!transaction.expensetransactionid || !transaction.uniquekey) {
                throw new BadRequestError(
                    `Expense transaction at index ${i} missing required fields: expensetransactionid, uniquekey`
                );
            }
            if (
                !transaction.expenseTransactionDetails ||
                !Array.isArray(transaction.expenseTransactionDetails) ||
                transaction.expenseTransactionDetails.length === 0
            ) {
                throw new BadRequestError(
                    `Expense transaction at index ${i} must have at least one detail`
                );
            }
            expenseTransactionDetailsCount += transaction.expenseTransactionDetails.length;

            for (let j = 0; j < transaction.expenseTransactionDetails.length; j++) {
                const detail = transaction.expenseTransactionDetails[j];
                if (!detail.expensetransactiondetailsId || !detail.uniquekey || !detail.expensetransactionid) {
                    throw new BadRequestError(
                        `Expense transaction detail at index ${j} for transaction at index ${i} missing required fields: expensetransactiondetailsId, uniquekey, expensetransactionid`
                    );
                }
            }
        }

        // Log the sync request
        if (req.pos) {
            winston.debug(`Expense transaction sync request with token`, {
                source: "pos-mgmt/expenseTransaction.controller.js",
                function: "syncExpenseTransactions",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                locationId: req.pos.locationId,
                expenseTransactionsCount: expenseTransactions.length,
                expenseTransactionDetailsCount: expenseTransactionDetailsCount,
                productKey: req.pos.productKey
            });
        } else {
            winston.debug(`Expense transaction sync request without token`, {
                source: "pos-mgmt/expenseTransaction.controller.js",
                function: "syncExpenseTransactions",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                expenseTransactionsCount: expenseTransactions.length,
                expenseTransactionDetailsCount: expenseTransactionDetailsCount,
                ip: req.ip
            });
        }

        const result = await expenseTransactionModel.saveExpenseTransactions(expenseTransactions);

        if (result.success) {
            const syncedMasterCount = result.data.expenseTransactions.filter(t => t.issynced === 1).length;
            const syncedDetailCount = result.data.expenseTransactionDetails.filter(d => d.issynced === 1).length;

            winston.debug(
                `Expense transaction sync completed: ${syncedMasterCount}/${expenseTransactions.length} transactions, ` +
                `${syncedDetailCount}/${expenseTransactionDetailsCount} details synced`, {
                    source: "pos-mgmt/expenseTransaction.controller.js",
                    function: "syncExpenseTransactions",
                    endpoint: req.path,
                    method: req.method,
                    userId: req.user?.id,
                }
            );

            res.status(200).json(
                ResponseFormatter.success(
                    result.data,
                    `Successfully synced ${syncedMasterCount}/${expenseTransactions.length} expense transactions ` +
                    `and ${syncedDetailCount}/${expenseTransactionDetailsCount} details.`
                )
            );
        } else {
            res.status(400).json(ResponseFormatter.error("Failed to sync expense transactions"));
        }
    })
};
