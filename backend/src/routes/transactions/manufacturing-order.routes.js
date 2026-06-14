// routes/transactions/manufacturing-order.routes.js
// MASTER_PROMPT Section 6 — Manufacturing Orders API
// RULE-08: exports { path, router }

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { checkPermission } = require('../../middlewares/permission.middleware');
const { validateBody, validateQuery } = require('../../middlewares/validation.middleware');
const {
    createMoSchema,
    updateMoSchema,
    listMoQuerySchema,
    produceSchema,
} = require('../../validations/manufacturing-order.validation');
const moController = require('../../controllers/transactions/manufacturing-order.controller');

router.use(authMiddleware);

router.get('/stats',
    checkPermission('manufacturing', 'view'),
    moController.getStats
);
router.get('/',
    checkPermission('manufacturing', 'view'),
    validateQuery(listMoQuerySchema),
    moController.list
);
router.get('/:id',
    checkPermission('manufacturing', 'view'),
    moController.getById
);
router.post('/',
    checkPermission('manufacturing', 'create'),
    validateBody(createMoSchema),
    moController.create
);
router.put('/:id',
    checkPermission('manufacturing', 'update'),
    validateBody(updateMoSchema),
    moController.update
);
router.delete('/:id',
    checkPermission('manufacturing', 'delete'),
    moController.softDelete
);

// Status transitions (Sections 7.5 + 7.6)
router.post('/:id/confirm',
    checkPermission('manufacturing', 'update'),
    moController.confirm     // BOM explosion happens here
);
router.post('/:id/start',
    checkPermission('manufacturing', 'update'),
    moController.start
);
router.post('/:id/produce',
    checkPermission('manufacturing', 'update'),
    validateBody(produceSchema),
    moController.produce     // Stock IN/OUT happens here
);
router.post('/:id/cancel',
    checkPermission('manufacturing', 'update'),
    moController.cancel
);

module.exports = {
    path: '/manufacturing-orders',
    router,
};
