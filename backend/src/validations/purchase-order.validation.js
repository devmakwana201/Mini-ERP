// validations/purchase-order.validation.js
// Joi schemas for /api/v1/purchase-orders
// MASTER_PROMPT Section 7.4 + Section 4.2 (purchase_orders, purchase_order_lines)

const Joi = require('joi');
const { PO_STATUS } = require('../constants/enums');

/** POST /purchase-orders */
const createPoSchema = Joi.object({
    vendor_id:     Joi.number().integer().required(),
    expected_date: Joi.date().iso().allow(null).default(null),
    notes:         Joi.string().max(1000).allow('', null).default(null),
    lines: Joi.array().items(Joi.object({
        product_id:  Joi.number().integer().required(),
        qty_ordered: Joi.number().precision(3).min(0.001).required(),
        unit_cost:   Joi.number().precision(2).min(0).required(),
        // NOTE: subtotal is GENERATED — never send (RULE-03)
    })).min(1).required().messages({
        'array.min': 'A purchase order must have at least one line item',
    }),
});

/** PUT /purchase-orders/:id */
const updatePoSchema = Joi.object({
    vendor_id:     Joi.number().integer(),
    expected_date: Joi.date().iso().allow(null),
    notes:         Joi.string().max(1000).allow('', null),
});

/** GET /purchase-orders — query params */
const listPoQuerySchema = Joi.object({
    status:    Joi.string().valid(...PO_STATUS).allow('', null).optional(),
    vendor_id: Joi.number().integer(),
    search:    Joi.string().max(200).allow('', null),
    page:      Joi.number().integer().min(1).default(1),
    limit:     Joi.number().integer().min(1).max(100).default(20),
});

/** POST /purchase-orders/:id/receive — receive goods (Section 7.4) */
const receiveSchema = Joi.object({
    location_id: Joi.number().integer().allow(null).default(null),
    lines: Joi.array().items(Joi.object({
        pol_id:       Joi.number().integer().required(),
        product_id:   Joi.number().integer().required(),
        qty_received: Joi.number().precision(3).min(0.001).required(),
    })).min(1).required(),
});

module.exports = {
    createPoSchema,
    updatePoSchema,
    listPoQuerySchema,
    receiveSchema,
};
