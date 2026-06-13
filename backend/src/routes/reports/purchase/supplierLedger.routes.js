const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const supplierLedgerController = require("../../../controllers/reports/purchase/supplierLedger.controller");
const router = express.Router();

// Get supplier ledger report with pagination and filters
router.get("/supplier-ledger", authMiddleware, supplierLedgerController.getSupplierLedger);

module.exports = {
    path: "/reports/purchase",
    router: router,
};
