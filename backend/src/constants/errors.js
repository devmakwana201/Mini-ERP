// constants/errors.js
// Custom error classes for consistent HTTP error responses across the application

class AppError extends Error {
    constructor(message, statusCode, errors = []) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errors = errors;
        Error.captureStackTrace(this, this.constructor);
    }
}

/** 401 — No valid token or session expired */
class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401);
    }
}

/** 403 — Authenticated but no permission */
class ForbiddenError extends AppError {
    constructor(message = 'You do not have permission to perform this action') {
        super(message, 403);
    }
}

/** 404 — Resource not found */
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404);
    }
}

/** 409 — Duplicate / unique constraint violation */
class ConflictError extends AppError {
    constructor(message = 'A record with this value already exists') {
        super(message, 409);
    }
}

/** 422 — Request body/query fails Joi validation */
class ValidationError extends AppError {
    constructor(errors = [], message = 'Validation failed') {
        super(message, 422, errors);
    }
}

/** 422 — Business logic rule violation (e.g. cannot cancel a done SO) */
class BusinessRuleError extends AppError {
    constructor(message = 'Business rule violation') {
        super(message, 422);
    }
}

module.exports = {
    AppError,
    AuthenticationError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    ValidationError,
    BusinessRuleError,
};
