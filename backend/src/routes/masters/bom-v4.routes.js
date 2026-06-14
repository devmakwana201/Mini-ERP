// routes/masters/bom-v4.routes.js
// MASTER_PROMPT Section 6 — BOM API
// RULE-08: exports { path, router }

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { checkPermission } = require('../../middlewares/permission.middleware');
const { validateBody, validateQuery } = require('../../middlewares/validation.middleware');
const {
    createBomSchema,
    updateBomSchema,
    listBomQuerySchema,
    createLineSchema,
    updateLineSchema,
} = require('../../validations/bom.validation');
const bomCtrl = require('../../controllers/masters/bom-v4.controller');

router.use(authMiddleware);

// Specific routes before /:id
router.get('/product/:productId',
    checkPermission('bom', 'view'),
    bomCtrl.getByProduct
);

router.get('/',
    checkPermission('bom', 'view'),
    validateQuery(listBomQuerySchema),
    bomCtrl.list
);
router.get('/:id',
    checkPermission('bom', 'view'),
    bomCtrl.getById
);
router.post('/',
    checkPermission('bom', 'create'),
    validateBody(createBomSchema),
    bomCtrl.create
);
router.put('/:id',
    checkPermission('bom', 'update'),
    validateBody(updateBomSchema),
    bomCtrl.update
);
router.delete('/:id',
    checkPermission('bom', 'delete'),
    bomCtrl.softDelete
);

// BOM Lines sub-resource (RULE-03: subtotal is GENERATED — Joi schema never sends it)
router.post('/:id/lines',
    checkPermission('bom', 'update'),
    validateBody(createLineSchema),
    bomCtrl.addLine
);
router.put('/:id/lines/:lineId',
    checkPermission('bom', 'update'),
    validateBody(updateLineSchema),
    bomCtrl.updateLine
);
router.delete('/:id/lines/:lineId',
    checkPermission('bom', 'update'),
    bomCtrl.removeLine
);

module.exports = {
    path: '/bom',
    router,
};
