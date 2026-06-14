// routes/inventory/warehouse.routes.js
// MASTER_PROMPT Section 6 — Warehouses + Stock Locations API
// RULE-08: exports { path, router }

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { checkPermission } = require('../../middlewares/permission.middleware');
const { validateBody, validateQuery } = require('../../middlewares/validation.middleware');
const {
    createWarehouseSchema,
    updateWarehouseSchema,
    createLocationSchema,
    updateLocationSchema,
    listLocationQuerySchema,
} = require('../../validations/inventory.validation');
const whCtrl = require('../../controllers/inventory/warehouse.controller');

router.use(authMiddleware);

// Warehouses CRUD
router.get('/',
    checkPermission('inventory', 'view'),
    whCtrl.list
);
router.get('/:id',
    checkPermission('inventory', 'view'),
    whCtrl.getById
);
router.post('/',
    checkPermission('inventory', 'create'),
    validateBody(createWarehouseSchema),
    whCtrl.create
);
router.put('/:id',
    checkPermission('inventory', 'update'),
    validateBody(updateWarehouseSchema),
    whCtrl.update
);
router.delete('/:id',
    checkPermission('inventory', 'delete'),
    whCtrl.softDelete
);

// Stock Locations sub-resource
router.get('/locations/all',
    checkPermission('inventory', 'view'),
    validateQuery(listLocationQuerySchema),
    whCtrl.listLocations
);
router.post('/locations',
    checkPermission('inventory', 'create'),
    validateBody(createLocationSchema),
    whCtrl.createLocation
);
router.put('/locations/:id',
    checkPermission('inventory', 'update'),
    validateBody(updateLocationSchema),
    whCtrl.updateLocation
);
router.delete('/locations/:id',
    checkPermission('inventory', 'delete'),
    whCtrl.deleteLocation
);

module.exports = {
    path: '/warehouses',
    router,
};
