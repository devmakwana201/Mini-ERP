// validations/product.validation.js
// Joi schemas for /api/v1/products
// MASTER_PROMPT Section 4.2 (products table) + G-02 (never send generated columns)

const Joi = require('joi');
const {
    PRODUCT_TYPE,
    PROCUREMENT_TYPE,
    PROCUREMENT_STRATEGY,
} = require('../constants/enums');

/** POST /products */
const createSchema = Joi.object({
    product_code:         Joi.string().max(50).required(),
    product_name:         Joi.string().max(200).required(),
    description:          Joi.string().max(1000).allow('', null).default(null),
    product_type:         Joi.string().valid(...PRODUCT_TYPE).default('storable'),
    procurement_type:     Joi.string().valid(...PROCUREMENT_TYPE).default('buy'),
    procurement_strategy: Joi.string().valid(...PROCUREMENT_STRATEGY).default('MTS'),
    vendor_id:            Joi.number().integer().allow(null).default(null),
    bom_id:               Joi.number().integer().allow(null).default(null),
    sales_price:          Joi.number().precision(2).min(0).default(0),
    cost_price:           Joi.number().precision(2).min(0).default(0),
    uom:                  Joi.string().max(20).default('Unit'),
    on_hand_qty:          Joi.number().precision(3).min(0).default(0),
    reserved_qty:         Joi.number().precision(3).min(0).default(0),
    // NOTE: free_to_use_qty is GENERATED — never send it (RULE-03 / G-02)
    min_stock_qty:        Joi.number().precision(3).min(0).default(0),
    is_active:            Joi.boolean().default(true),
});

/** PUT /products/:id */
const updateSchema = Joi.object({
    product_code:         Joi.string().max(50),
    product_name:         Joi.string().max(200),
    description:          Joi.string().max(1000).allow('', null),
    product_type:         Joi.string().valid(...PRODUCT_TYPE),
    procurement_type:     Joi.string().valid(...PROCUREMENT_TYPE),
    procurement_strategy: Joi.string().valid(...PROCUREMENT_STRATEGY),
    vendor_id:            Joi.number().integer().allow(null),
    bom_id:               Joi.number().integer().allow(null),
    sales_price:          Joi.number().precision(2).min(0),
    cost_price:           Joi.number().precision(2).min(0),
    uom:                  Joi.string().max(20),
    min_stock_qty:        Joi.number().precision(3).min(0),
    is_active:            Joi.boolean(),
    // NOTE: on_hand_qty / reserved_qty / free_to_use_qty are NOT allowed here
    // Use PUT /products/:id/stock for manual stock adjustments
});

/** GET /products — query params */
const listQuerySchema = Joi.object({
    product_type:         Joi.string().valid(...PRODUCT_TYPE),
    procurement_type:     Joi.string().valid(...PROCUREMENT_TYPE),
    procurement_strategy: Joi.string().valid(...PROCUREMENT_STRATEGY),
    is_active:            Joi.boolean(),
    search:               Joi.string().max(200).allow('', null),
    page:                 Joi.number().integer().min(1).default(1),
    limit:                Joi.number().integer().min(1).max(100).default(20),
});

/** PUT /products/:id/stock — manual stock adjustment */
const stockAdjustSchema = Joi.object({
    adjustment_qty: Joi.number().precision(3).required()
        .messages({ 'any.required': 'adjustment_qty is required (can be negative for deductions)' }),
    location_id:    Joi.number().integer().allow(null).default(null),
    notes:          Joi.string().max(500).allow('', null).default(null),
});

/** POST /products/:id/vendors — add vendor link */
const addVendorSchema = Joi.object({
    partner_id:          Joi.number().integer().required(),
    vendor_product_code: Joi.string().max(100).allow('', null).default(null),
    unit_cost:           Joi.number().precision(2).min(0).default(0),
    lead_time_days:      Joi.number().integer().min(0).default(0),
    min_order_qty:       Joi.number().precision(3).min(0).default(1),
    is_preferred:        Joi.boolean().default(false),
    is_active:           Joi.boolean().default(true),
});

module.exports = { createSchema, updateSchema, listQuerySchema, stockAdjustSchema, addVendorSchema };
