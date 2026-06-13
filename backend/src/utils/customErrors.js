class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, errors = []) {
        super(message, 422);
        this.errors = errors;
    }
}

class AuthenticationError extends AppError {
    constructor(message = "Authentication failed") {
        super(message, 401);
    }
}

class AuthorizationError extends AppError {
    constructor(message = "Access forbidden") {
        super(message, 403);
    }
}

class NotFoundError extends AppError {
    constructor(resource = "Resource") {
        super(`${resource} not found`, 404);
    }
}

class ConflictError extends AppError {
    constructor(message = "Resource conflict") {
        super(message, 409);
    }
}

class BadRequestError extends AppError {
    constructor(message = "Bad request") {
        super(message, 400);
    }
}

class TooManyRequestsError extends AppError {
    constructor(message = "Too many requests") {
        super(message, 429);
    }
}

class DatabaseError extends AppError {
    constructor(message = "Database operation failed", originalError = null) {
        super(message, 500);
        this.originalError = originalError;
    }
}

class ExternalServiceError extends AppError {
    constructor(service, message = "External service error", originalError = null) {
        super(`${service}: ${message}`, 503);
        this.service = service;
        this.originalError = originalError;
    }
}

module.exports = {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    BadRequestError,
    TooManyRequestsError,
    DatabaseError,
    ExternalServiceError,
};