// validations/manufacturing-order.validation.js
// Joi schemas for /api/v1/manufacturing-orders + work-orders
// MASTER_PROMPT Section 7.5 (BOM Explosion), 7.6 (Produce)

const Joi = require('joi');
const { MO_TYPE, MO_STATUS } = require('../constants/enums');

/** POST /manufacturing-orders */
const createMoSchema = Joi.object({
    product_id:     Joi.number().integer().required(),
    bom_id:         Joi.number().integer().required(),
    so_id:          Joi.number().integer().allow(null).default(null),
    mo_type:        Joi.string().valid(...MO_TYPE).default('MTS'),
    qty_planned:    Joi.number().precision(3).min(0.001).required(),
    scheduled_date: Joi.date().iso().allow(null).default(null),
});

/** PUT /manufacturing-orders/:id — draft only */
const updateMoSchema = Joi.object({
    qty_planned:    Joi.number().precision(3).min(0.001),
    scheduled_date: Joi.date().iso().allow(null),
});

/** GET /manufacturing-orders — query params */
const listMoQuerySchema = Joi.object({
    status:     Joi.string().valid(...MO_STATUS).allow('', null).optional(),
    mo_type:    Joi.string().valid(...MO_TYPE),
    product_id: Joi.number().integer(),
    so_id:      Joi.number().integer(),
    search:     Joi.string().max(200).allow('', null),
    page:       Joi.number().integer().min(1).default(1),
    limit:      Joi.number().integer().min(1).max(100).default(20),
});

/** POST /manufacturing-orders/:id/produce — Section 7.6 */
const produceSchema = Joi.object({
    qty_to_produce: Joi.number().precision(3).min(0.001).required(),
    location_id:    Joi.number().integer().allow(null).default(null),
});

/** GET /work-orders — query params */
const listWoQuerySchema = Joi.object({
    status:    Joi.string().valid('pending', 'in_progress', 'done', 'cancelled').allow('', null).optional(),
    mo_id:     Joi.number().integer(),
    page:      Joi.number().integer().min(1).default(1),
    limit:     Joi.number().integer().min(1).max(100).default(20),
});

module.exports = {
    createMoSchema,
    updateMoSchema,
    listMoQuerySchema,
    produceSchema,
    listWoQuerySchema,
};
