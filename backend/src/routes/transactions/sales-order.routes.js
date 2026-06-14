// routes/transactions/sales-order.routes.js
// MASTER_PROMPT Section 6 — Sales Orders API
// RULE-08: exports { path, router }

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { checkPermission } = require('../../middlewares/permission.middleware');
const { validateBody, validateQuery } = require('../../middlewares/validation.middleware');
const {
    createSoSchema,
    updateSoSchema,
    listSoQuerySchema,
    addLineSchema,
    updateLineSchema,
    deliverSchema,
} = require('../../validations/sales-order.validation');
const soController = require('../../controllers/transactions/sales-order.controller');

router.use(authMiddleware);

// Specific routes before /:id
router.get('/stats',
    checkPermission('sales', 'view'),
    soController.getStats
);

router.get('/',
    checkPermission('sales', 'view'),
    validateQuery(listSoQuerySchema),
    soController.list
);
router.get('/:id',
    checkPermission('sales', 'view'),
    soController.getById
);
router.post('/',
    checkPermission('sales', 'create'),
    validateBody(createSoSchema),
    soController.create
);
router.put('/:id',
    checkPermission('sales', 'update'),
    validateBody(updateSoSchema),
    soController.update
);
router.delete('/:id',
    checkPermission('sales', 'delete'),
    soController.softDelete
);

// Status transitions (Section 7.1, 7.2, 7.3)
router.post('/:id/confirm',
    checkPermission('sales', 'update'),
    soController.confirm
);
router.post('/:id/deliver',
    checkPermission('sales', 'update'),
    validateBody(deliverSchema),
    soController.deliver
);
router.post('/:id/cancel',
    checkPermission('sales', 'update'),
    soController.cancel
);

// Line items sub-resource
router.post('/:id/lines',
    checkPermission('sales', 'update'),
    validateBody(addLineSchema),
    soController.addLine
);
router.put('/:id/lines/:solId',
    checkPermission('sales', 'update'),
    validateBody(updateLineSchema),
    soController.updateLine
);
router.delete('/:id/lines/:solId',
    checkPermission('sales', 'update'),
    soController.removeLine
);

module.exports = {
    path: '/sales-orders',
    router,
};
