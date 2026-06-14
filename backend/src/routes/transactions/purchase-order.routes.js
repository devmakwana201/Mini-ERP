// routes/transactions/purchase-order.routes.js
// MASTER_PROMPT Section 6 — Purchase Orders API
// RULE-08: exports { path, router }

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { checkPermission } = require('../../middlewares/permission.middleware');
const { validateBody, validateQuery } = require('../../middlewares/validation.middleware');
const {
    createPoSchema,
    updatePoSchema,
    listPoQuerySchema,
    receiveSchema,
} = require('../../validations/purchase-order.validation');
const poController = require('../../controllers/transactions/purchase-order.controller');

router.use(authMiddleware);

router.get('/stats',
    checkPermission('purchase', 'view'),
    poController.getStats
);
router.get('/',
    checkPermission('purchase', 'view'),
    validateQuery(listPoQuerySchema),
    poController.list
);
router.get('/:id',
    checkPermission('purchase', 'view'),
    poController.getById
);
router.post('/',
    checkPermission('purchase', 'create'),
    validateBody(createPoSchema),
    poController.create
);
router.put('/:id',
    checkPermission('purchase', 'update'),
    validateBody(updatePoSchema),
    poController.update
);
router.delete('/:id',
    checkPermission('purchase', 'delete'),
    poController.softDelete
);

// Status transitions (Section 7.4)
router.post('/:id/send',
    checkPermission('purchase', 'update'),
    poController.send
);
router.post('/:id/confirm',
    checkPermission('purchase', 'update'),
    poController.confirmPO
);
router.post('/:id/receive',
    checkPermission('purchase', 'update'),
    validateBody(receiveSchema),
    poController.receive
);
router.post('/:id/cancel',
    checkPermission('purchase', 'update'),
    poController.cancelPO
);

module.exports = {
    path: '/purchase-orders',
    router,
};
