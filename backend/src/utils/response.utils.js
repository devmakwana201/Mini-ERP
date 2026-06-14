// utils/response.utils.js
// Standard API response helpers — RULE-09: all responses follow this shape.
// Success: { success: true, message, data, meta? }
// Error:   { success: false, message, errors? }

/**
 * 200 OK / custom status — success response
 * @param {import('express').Response} res
 * @param {*} data
 * @param {string} message
 * @param {number} statusCode
 * @param {object|null} meta  — pagination metadata
 */
const success = (res, data, message = 'Success', statusCode = 200, meta = null) => {
    const response = { success: true, message, data };
    if (meta) response.meta = meta;
    return res.status(statusCode).json(response);
};

/**
 * 201 Created
 */
const created = (res, data, message = 'Created successfully') =>
    success(res, data, message, 201);

/**
 * Error response — used by error.middleware.js
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} statusCode
 * @param {Array} errors  — field-level validation errors
 */
const error = (res, message, statusCode = 500, errors = []) =>
    res.status(statusCode).json({ success: false, message, errors });

module.exports = { success, created, error };
