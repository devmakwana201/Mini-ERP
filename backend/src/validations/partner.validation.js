// validations/partner.validation.js
// Joi schemas for /api/v1/partners
// MASTER_PROMPT Section 12 — exact template + G-01 rule (partners, not vendors/customers)

const Joi = require('joi');

/** POST /partners */
const createSchema = Joi.object({
    name:           Joi.string().min(2).max(150).required(),
    email:          Joi.string().email().allow('', null).default(null),
    phone:          Joi.string().pattern(/^[0-9+\-\s()]{7,20}$/).allow('', null).default(null),
    address:        Joi.string().max(500).allow('', null).default(null),
    city:           Joi.string().max(100).allow('', null).default(null),
    state:          Joi.string().max(100).allow('', null).default(null),
    country:        Joi.string().max(100).allow('', null).default('India'),
    gstin:          Joi.string().length(15).uppercase().allow('', null).default(null),
    lead_time_days: Joi.number().integer().min(0).default(0),
    is_vendor:      Joi.boolean().default(false),
    is_customer:    Joi.boolean().default(false),
    is_active:      Joi.boolean().default(true),
}).custom((value, helpers) => {
    if (!value.is_vendor && !value.is_customer) {
        return helpers.error('any.invalid', { message: 'Partner must be a vendor, a customer, or both' });
    }
    return value;
}).messages({ 'any.invalid': 'Partner must be a vendor, a customer, or both' });

/** PUT /partners/:id */
const updateSchema = Joi.object({
    name:           Joi.string().min(2).max(150),
    email:          Joi.string().email().allow('', null),
    phone:          Joi.string().pattern(/^[0-9+\-\s()]{7,20}$/).allow('', null),
    address:        Joi.string().max(500).allow('', null),
    city:           Joi.string().max(100).allow('', null),
    state:          Joi.string().max(100).allow('', null),
    country:        Joi.string().max(100).allow('', null),
    gstin:          Joi.string().length(15).uppercase().allow('', null),
    lead_time_days: Joi.number().integer().min(0),
    is_vendor:      Joi.boolean(),
    is_customer:    Joi.boolean(),
    is_active:      Joi.boolean(),
});

/** GET /partners — query params */
const listQuerySchema = Joi.object({
    is_vendor:   Joi.boolean(),
    is_customer: Joi.boolean(),
    is_active:   Joi.boolean(),
    search:      Joi.string().max(100).allow('', null),
    page:        Joi.number().integer().min(1).default(1),
    limit:       Joi.number().integer().min(1).max(500).default(20),
});

/** POST /partners/:id/products (link product to vendor) */
const linkProductSchema = Joi.object({
    product_id:          Joi.number().integer().required(),
    vendor_product_code: Joi.string().max(100).allow('', null).default(null),
    unit_cost:           Joi.number().precision(2).min(0).default(0),
    lead_time_days:      Joi.number().integer().min(0).default(0),
    min_order_qty:       Joi.number().precision(3).min(0).default(1),
    is_preferred:        Joi.boolean().default(false),
});

module.exports = { createSchema, updateSchema, listQuerySchema, linkProductSchema };
