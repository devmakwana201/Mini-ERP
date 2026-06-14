// validations/sales-order.validation.js
// Joi schemas for /api/v1/sales-orders
// MASTER_PROMPT Section 7.1, 7.2, 7.3 + Section 4.2 (sales_orders, sales_order_lines)

const Joi = require('joi');
const { SO_TYPE, SO_STATUS } = require('../constants/enums');

/** POST /sales-orders — create draft */
const createSoSchema = Joi.object({
    customer_id:   Joi.number().integer().required(),
    so_type:       Joi.string().valid(...SO_TYPE).default('MTS'),
    delivery_date: Joi.date().iso().allow(null).default(null),
    notes:         Joi.string().max(1000).allow('', null).default(null),
    // Lines optional at creation — can be added via /lines sub-resource
    lines: Joi.array().items(Joi.object({
        product_id: Joi.number().integer().required(),
        qty:        Joi.number().precision(3).min(0.001).required(),
        unit_price: Joi.number().precision(2).min(0).required(),
        // NOTE: subtotal is GENERATED — never send (RULE-03)
    })).default([]),
});

/** PUT /sales-orders/:id — update draft only */
const updateSoSchema = Joi.object({
    customer_id:   Joi.number().integer(),
    so_type:       Joi.string().valid(...SO_TYPE),
    delivery_date: Joi.date().iso().allow(null),
    notes:         Joi.string().max(1000).allow('', null),
});

/** GET /sales-orders — query params */
const listSoQuerySchema = Joi.object({
    status:      Joi.string().valid(...SO_STATUS).allow('', null).optional(),
    so_type:     Joi.string().valid(...SO_TYPE),
    customer_id: Joi.number().integer(),
    search:      Joi.string().max(200).allow('', null),
    page:        Joi.number().integer().min(1).default(1),
    limit:       Joi.number().integer().min(1).max(100).default(20),
});

/** POST /sales-orders/:id/lines — add line to draft */
const addLineSchema = Joi.object({
    product_id: Joi.number().integer().required(),
    qty:        Joi.number().precision(3).min(0.001).required(),
    unit_price: Joi.number().precision(2).min(0).required(),
});

/** PUT /sales-orders/:id/lines/:solId */
const updateLineSchema = Joi.object({
    qty:        Joi.number().precision(3).min(0.001),
    unit_price: Joi.number().precision(2).min(0),
});

/** POST /sales-orders/:id/deliver — deliver quantities */
const deliverSchema = Joi.object({
    location_id: Joi.number().integer().allow(null).default(null),
    // Accept both 'delivery_lines' (frontend service) and 'lines' (alternative)
    delivery_lines: Joi.array().items(Joi.object({
        product_id:     Joi.number().integer().required(),
        qty_to_deliver: Joi.number().precision(3).min(0.001).required(),
        sol_id:         Joi.number().integer().optional(),
    })).min(1).optional(),
    lines: Joi.array().items(Joi.object({
        product_id:     Joi.number().integer().required(),
        qty_to_deliver: Joi.number().precision(3).min(0.001).required(),
        sol_id:         Joi.number().integer().optional(),
    })).min(1).optional(),
}).or('delivery_lines', 'lines');  // at least one must be present


module.exports = {
    createSoSchema,
    updateSoSchema,
    listSoQuerySchema,
    addLineSchema,
    updateLineSchema,
    deliverSchema,
};
