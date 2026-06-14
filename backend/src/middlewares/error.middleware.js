// middlewares/error.middleware.js
// Global error handler — MUST be mounted LAST in server.js (after all routes).
// MASTER_PROMPT RULE-09: all error responses follow { success: false, message, errors? }

const { AppError } = require('../constants/errors');
const { error: errorResponse } = require('../utils/response.utils');
const winston = require('../config/winston');

/**
 * Express 4-argument error handler — catches everything thrown via next(err).
 */
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
    // Known application error — send structured response
    if (err instanceof AppError) {
        // Log 5xx errors as error, 4xx as warn
        if (err.statusCode >= 500) {
            winston.error(`[${err.statusCode}] ${err.message}`, {
                path: req.path,
                method: req.method,
                stack: err.stack,
            });
        } else {
            winston.warn(`[${err.statusCode}] ${err.message}`, {
                path: req.path,
                method: req.method,
            });
        }
        return errorResponse(res, err.message, err.statusCode, err.errors || []);
    }

    // MySQL duplicate entry — map to 409
    if (err.code === 'ER_DUP_ENTRY') {
        winston.warn(`[409] Duplicate entry: ${err.message}`, { path: req.path });
        return errorResponse(res, 'A record with this value already exists', 409);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        winston.warn(`[401] JWT error: ${err.message}`, { path: req.path });
        return errorResponse(res, 'Invalid or expired token', 401);
    }

    // Unknown / unexpected error
    winston.error(`[500] Unhandled error: ${err.message}`, {
        path: req.path,
        method: req.method,
        stack: err.stack,
    });

    // Don't leak stack traces in production
    const message = process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message;

    return errorResponse(res, message, 500);
};
