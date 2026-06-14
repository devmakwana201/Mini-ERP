// routes/masters/partner.routes.js
// MASTER_PROMPT Section 6 + Section 12 Route Template
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
    linkProductSchema,
} = require('../../validations/partner.validation');
const partnerController = require('../../controllers/masters/partner.controller');

// All routes require authentication
router.use(authMiddleware);

// Shortcut filters — must be before /:id
router.get('/vendors',
    checkPermission('partners', 'view'),
    partnerController.listVendors
);
router.get('/customers',
    checkPermission('partners', 'view'),
    partnerController.listCustomers
);

// CRUD
router.get('/',
    checkPermission('partners', 'view'),
    validateQuery(listQuerySchema),
    partnerController.list
);
router.get('/:id',
    checkPermission('partners', 'view'),
    partnerController.getById
);
router.post('/',
    checkPermission('partners', 'create'),
    validateBody(createSchema),
    partnerController.create
);
router.put('/:id',
    checkPermission('partners', 'update'),
    validateBody(updateSchema),
    partnerController.update
);
router.delete('/:id',
    checkPermission('partners', 'delete'),
    partnerController.softDelete
);

// Vendor-Product links sub-resource
router.get('/:id/products',
    checkPermission('partners', 'view'),
    partnerController.getPartnerProducts
);
router.post('/:id/products',
    checkPermission('partners', 'update'),
    validateBody(linkProductSchema),
    partnerController.addProductLink
);
router.delete('/:id/products/:pvId',
    checkPermission('partners', 'update'),
    partnerController.removeProductLink
);

module.exports = {
    path: '/partners',
    router,
};
