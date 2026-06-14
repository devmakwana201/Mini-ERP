// middlewares/validation.middleware.js
// MASTER_PROMPT Section 5.7 — RULE-10: all request bodies validated by Joi BEFORE controllers.
// Never validate inside controllers.

const { ValidationError } = require('../constants/errors');

/**
 * Validate req.body against a Joi schema.
 * On failure: calls next(new ValidationError([{ field, message }]))
 * On success: sets req.body = validated (with defaults applied)
 *
 * @param {import('joi').Schema} schema
 */
const validateBody = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,    // remove undeclared keys — prevents field injection
    });

    if (error) {
        const errors = error.details.map((d) => ({
            field: d.path.join('.'),
            message: d.message.replace(/['"]/g, ''),  // clean Joi quotes
        }));
        return next(new ValidationError(errors));
    }

    req.body = value;  // use validated + defaulted value
    next();
};

/**
 * Validate req.query against a Joi schema.
 * On success: sets req.query = validated (with defaults applied, types coerced)
 *
 * @param {import('joi').Schema} schema
 */
const validateQuery = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
        convert: true,        // coerce strings to numbers/booleans for query params
    });

    if (error) {
        const errors = error.details.map((d) => ({
            field: d.path.join('.'),
            message: d.message.replace(/['"]/g, ''),
        }));
        return next(new ValidationError(errors));
    }

    req.query = value;
    next();
};

module.exports = { validateBody, validateQuery };
