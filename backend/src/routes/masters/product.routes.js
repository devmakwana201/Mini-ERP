// routes/masters/product.routes.js
// MASTER_PROMPT Section 6 — Products API
// RULE-08: exports { path, router }

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { checkPermission } = require('../../middlewares/permission.middleware');
const { validateBody, validateQuery } = require('../../middlewares/validation.middleware');
const {
    createSchema,
    updateSchema,
    listQuerySchema,
    stockAdjustSchema,
    addVendorSchema,
} = require('../../validations/product.validation');
const productController = require('../../controllers/masters/product.controller');

router.use(authMiddleware);

// Specific routes before /:id
router.get('/low-stock',
    checkPermission('products', 'view'),
    productController.getLowStock
);

router.get('/',
    checkPermission('products', 'view'),
    validateQuery(listQuerySchema),
    productController.list
);
router.get('/:id',
    checkPermission('products', 'view'),
    productController.getById
);
router.post('/',
    checkPermission('products', 'create'),
    validateBody(createSchema),
    productController.create
);
router.put('/:id',
    checkPermission('products', 'update'),
    validateBody(updateSchema),
    productController.update
);
router.delete('/:id',
    checkPermission('products', 'delete'),
    productController.softDelete
);

// Manual stock adjustment — requires inventory.create permission
router.put('/:id/stock',
    checkPermission('inventory', 'create'),
    validateBody(stockAdjustSchema),
    productController.adjustStock
);

// Vendor links sub-resource (product_vendors table)
router.get('/:id/vendors',
    checkPermission('products', 'view'),
    productController.getVendors
);
router.post('/:id/vendors',
    checkPermission('products', 'update'),
    validateBody(addVendorSchema),
    productController.addVendor
);
router.put('/:id/vendors/:pvId',
    checkPermission('products', 'update'),
    productController.updateVendor
);
router.delete('/:id/vendors/:pvId',
    checkPermission('products', 'update'),
    productController.deactivateVendor
);

module.exports = {
    path: '/products',
    router,
};
