// validations/work-center.validation.js
// Joi schemas for /api/v1/work-centers + /api/v1/operations

const Joi = require('joi');

/** POST /work-centers */
const createWcSchema = Joi.object({
    name:             Joi.string().min(2).max(150).required(),
    code:             Joi.string().max(50).required(),
    description:      Joi.string().max(500).allow('', null).default(null),
    capacity_per_day: Joi.number().precision(2).min(0).default(8),
    cost_per_hour:    Joi.number().precision(2).min(0).default(0),
    is_active:        Joi.boolean().default(true),
});

/** PUT /work-centers/:id */
const updateWcSchema = Joi.object({
    name:             Joi.string().min(2).max(150),
    code:             Joi.string().max(50),
    description:      Joi.string().max(500).allow('', null),
    capacity_per_day: Joi.number().precision(2).min(0),
    cost_per_hour:    Joi.number().precision(2).min(0),
    is_active:        Joi.boolean(),
});

/** GET /work-centers — query params */
const listWcQuerySchema = Joi.object({
    is_active: Joi.boolean(),
    page:      Joi.number().integer().min(1).default(1),
    limit:     Joi.number().integer().min(1).max(100).default(20),
});

/** POST /operations */
const createOpSchema = Joi.object({
    work_center_id:   Joi.number().integer().required(),
    name:             Joi.string().min(2).max(150).required(),
    code:             Joi.string().max(50).required(),
    description:      Joi.string().max(500).allow('', null).default(null),
    duration_minutes: Joi.number().precision(2).min(0).default(0),
    is_active:        Joi.boolean().default(true),
});

/** PUT /operations/:id */
const updateOpSchema = Joi.object({
    work_center_id:   Joi.number().integer(),
    name:             Joi.string().min(2).max(150),
    code:             Joi.string().max(50),
    description:      Joi.string().max(500).allow('', null),
    duration_minutes: Joi.number().precision(2).min(0),
    is_active:        Joi.boolean(),
});

/** GET /operations — query params */
const listOpQuerySchema = Joi.object({
    work_center_id: Joi.number().integer(),
    is_active:      Joi.boolean(),
    page:           Joi.number().integer().min(1).default(1),
    limit:          Joi.number().integer().min(1).max(100).default(20),
});

module.exports = {
    createWcSchema,
    updateWcSchema,
    listWcQuerySchema,
    createOpSchema,
    updateOpSchema,
    listOpQuerySchema,
};
