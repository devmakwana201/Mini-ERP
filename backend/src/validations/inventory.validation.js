// validations/inventory.validation.js
// Joi schemas for /api/v1/inventory, /api/v1/warehouses, /api/v1/locations,
// /api/v1/procurement-rules
// MASTER_PROMPT Section 4.2 + Section 7.8

const Joi = require('joi');
const { TXN_TYPE, TXN_REFERENCE_TYPE, LOCATION_TYPE, RULE_STRATEGY } = require('../constants/enums');

/** GET /inventory/transactions — query params */
const listTxnQuerySchema = Joi.object({
    product_id:     Joi.number().integer(),
    txn_type:       Joi.string().valid(...TXN_TYPE),
    reference_type: Joi.string().valid(...TXN_REFERENCE_TYPE),
    reference_id:   Joi.number().integer(),
    location_id:    Joi.number().integer(),
    page:           Joi.number().integer().min(1).default(1),
    limit:          Joi.number().integer().min(1).max(100).default(50),
});

/** GET /inventory/reservations — query params */
const listReservationQuerySchema = Joi.object({
    so_id:      Joi.number().integer(),
    product_id: Joi.number().integer(),
    status:     Joi.string().valid('active', 'released', 'consumed'),
    page:       Joi.number().integer().min(1).default(1),
    limit:      Joi.number().integer().min(1).max(100).default(20),
});

/** POST /warehouses */
const createWarehouseSchema = Joi.object({
    name:      Joi.string().min(2).max(150).required(),
    address:   Joi.string().max(500).allow('', null).default(null),
    is_active: Joi.boolean().default(true),
});

/** PUT /warehouses/:id */
const updateWarehouseSchema = Joi.object({
    name:      Joi.string().min(2).max(150),
    address:   Joi.string().max(500).allow('', null),
    is_active: Joi.boolean(),
});

/** POST /locations */
const createLocationSchema = Joi.object({
    warehouse_id:  Joi.number().integer().required(),
    name:          Joi.string().min(2).max(100).required(),
    code:          Joi.string().max(50).required(),
    location_type: Joi.string().valid(...LOCATION_TYPE).default('storage'),
});

/** PUT /locations/:id */
const updateLocationSchema = Joi.object({
    name:          Joi.string().min(2).max(100),
    code:          Joi.string().max(50),
    location_type: Joi.string().valid(...LOCATION_TYPE),
});

/** GET /locations — query params */
const listLocationQuerySchema = Joi.object({
    warehouse_id:  Joi.number().integer(),
    location_type: Joi.string().valid(...LOCATION_TYPE),
    page:          Joi.number().integer().min(1).default(1),
    limit:         Joi.number().integer().min(1).max(100).default(20),
});

/** POST /procurement-rules */
const createRuleSchema = Joi.object({
    product_id:          Joi.number().integer().required(),
    strategy:            Joi.string().valid(...RULE_STRATEGY).default('MTS'),
    min_stock_qty:       Joi.number().precision(3).min(0).default(0),
    reorder_qty:         Joi.number().precision(3).min(0).default(0),
    preferred_vendor_id: Joi.number().integer().allow(null).default(null),
    is_active:           Joi.boolean().default(true),
});

/** PUT /procurement-rules/:id */
const updateRuleSchema = Joi.object({
    strategy:            Joi.string().valid(...RULE_STRATEGY),
    min_stock_qty:       Joi.number().precision(3).min(0),
    reorder_qty:         Joi.number().precision(3).min(0),
    preferred_vendor_id: Joi.number().integer().allow(null),
    is_active:           Joi.boolean(),
});

module.exports = {
    listTxnQuerySchema,
    listReservationQuerySchema,
    createWarehouseSchema,
    updateWarehouseSchema,
    createLocationSchema,
    updateLocationSchema,
    listLocationQuerySchema,
    createRuleSchema,
    updateRuleSchema,
};
