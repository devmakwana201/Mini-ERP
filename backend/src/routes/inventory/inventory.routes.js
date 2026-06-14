// routes/inventory/inventory.routes.js
// MASTER_PROMPT Section 6 — Inventory Transactions + Reservations
// RULE-18: inventory_transactions is APPEND-ONLY — no create/update/delete routes here
// RULE-08: exports { path, router }

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { checkPermission } = require('../../middlewares/permission.middleware');
const { validateQuery } = require('../../middlewares/validation.middleware');
const {
    listTxnQuerySchema,
    listReservationQuerySchema,
} = require('../../validations/inventory.validation');
const invCtrl = require('../../controllers/inventory/inventory.controller');

router.use(authMiddleware);

// Inventory transaction ledger (IMMUTABLE — read-only routes only)
router.get('/transactions',
    checkPermission('inventory', 'view'),
    validateQuery(listTxnQuerySchema),
    invCtrl.listTransactions
);
router.get('/transactions/:id',
    checkPermission('inventory', 'view'),
    invCtrl.getTransaction
);
router.get('/ledger/:productId',
    checkPermission('inventory', 'view'),
    invCtrl.getLedger
);

// Stock reservations
router.get('/reservations',
    checkPermission('inventory', 'view'),
    validateQuery(listReservationQuerySchema),
    invCtrl.listReservations
);

module.exports = {
    path: '/inventory',
    router,
};
