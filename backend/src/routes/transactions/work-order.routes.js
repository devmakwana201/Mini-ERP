// routes/transactions/work-order.routes.js
// MASTER_PROMPT Section 6 — Work Orders API
// RULE-08: exports { path, router }

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { checkPermission } = require('../../middlewares/permission.middleware');
const { validateQuery } = require('../../middlewares/validation.middleware');
const { listWoQuerySchema } = require('../../validations/manufacturing-order.validation');
const woController = require('../../controllers/transactions/work-order.controller');

router.use(authMiddleware);

router.get('/',
    checkPermission('manufacturing', 'view'),
    validateQuery(listWoQuerySchema),
    woController.list
);
router.get('/:id',
    checkPermission('manufacturing', 'view'),
    woController.getById
);
router.put('/:id',
    checkPermission('manufacturing', 'update'),
    woController.update
);
router.post('/:id/start',
    checkPermission('manufacturing', 'update'),
    woController.start
);
router.post('/:id/complete',
    checkPermission('manufacturing', 'update'),
    woController.complete
);
router.post('/:id/cancel',
    checkPermission('manufacturing', 'update'),
    woController.cancel
);

module.exports = {
    path: '/work-orders',
    router,
};
