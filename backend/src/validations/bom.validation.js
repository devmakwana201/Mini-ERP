// validations/bom.validation.js
// Joi schemas for /api/v1/bom + bom lines sub-resource
// MASTER_PROMPT Section 4.2 (bom + bom_lines tables)

const Joi = require('joi');
const { BOM_TYPE } = require('../constants/enums');

/** POST /bom */
const createBomSchema = Joi.object({
    product_id: Joi.number().integer().required(),
    bom_name:   Joi.string().min(2).max(200).required(),
    qty:        Joi.number().precision(3).min(0.001).default(1),
    bom_type:   Joi.string().valid(...BOM_TYPE).default('manufacture'),
    is_active:  Joi.boolean().default(true),
});

/** PUT /bom/:id */
const updateBomSchema = Joi.object({
    bom_name:  Joi.string().min(2).max(200),
    qty:       Joi.number().precision(3).min(0.001),
    bom_type:  Joi.string().valid(...BOM_TYPE),
    is_active: Joi.boolean(),
});

/** GET /bom — query params */
const listBomQuerySchema = Joi.object({
    product_id: Joi.number().integer(),
    is_active:  Joi.boolean(),
    page:       Joi.number().integer().min(1).default(1),
    limit:      Joi.number().integer().min(1).max(500).default(20),
});

/** POST /bom/:id/lines — add component line */
const createLineSchema = Joi.object({
    component_id: Joi.number().integer().required()
        .messages({ 'any.required': 'component_id (product_id of the raw material) is required' }),
    qty:          Joi.number().precision(3).min(0.001).required(),
    uom:          Joi.string().max(20).default('Unit'),
    operation_id: Joi.number().integer().allow(null).default(null),
});

/** PUT /bom/:id/lines/:lineId */
const updateLineSchema = Joi.object({
    qty:          Joi.number().precision(3).min(0.001),
    uom:          Joi.string().max(20),
    operation_id: Joi.number().integer().allow(null),
});

module.exports = {
    createBomSchema,
    updateBomSchema,
    listBomQuerySchema,
    createLineSchema,
    updateLineSchema,
};
