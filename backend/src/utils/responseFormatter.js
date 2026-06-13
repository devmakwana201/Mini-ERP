const { server } = require('../config/config');

class ResponseFormatter {
    static success(data = null, message = "Success", meta = {}) {
        return {
            success: 1,
            message,
            data,
            statusCode: 200,
            ...(Object.keys(meta).length > 0 && { meta }),
            timestamp: new Date().toISOString(),
        };
    }

    static error(message = "An error occurred", statusCode = 500, details = null) {
        return {
            success: 0,
            error: {
                message,
                statusCode,
                ...(details && { details }),
            },
            timestamp: new Date().toISOString(),
        };
    }

    static paginated(data, start, length, total, message = "Success") {
        const totalPages = Math.ceil(total / length);
        return {
            success: 1,
            message,
            data,
            pagination: {
                start: parseInt(start),
                length: parseInt(length),
                total,
                totalPages,
                hasNext: start < totalPages,
                hasPrev: start > 1,
            },
            timestamp: new Date().toISOString(),
        };
    }

    static created(data = null, message = "Resource created successfully") {
        return {
            success: 1,
            message,
            data,
            statusCode: 201,
            timestamp: new Date().toISOString(),
        };
    }

    static updated(data = null, message = "Resource updated successfully") {
        return {
            success: 1,
            message,
            data,
            statusCode: 200,
            timestamp: new Date().toISOString(),
        };
    }

    static deleted(message = "Resource deleted successfully") {
        return {
            success: 1,
            message,
            statusCode: 200,
            timestamp: new Date().toISOString(),
        };
    }

    static unauthorized(message = "Unauthorized access") {
        return {
            success: 0,
            error: {
                message,
                statusCode: 401,
            },
            timestamp: new Date().toISOString(),
        };
    }

    static forbidden(message = "Access forbidden") {
        return {
            success: 0,
            error: {
                message,
                statusCode: 403,
            },
            timestamp: new Date().toISOString(),
        };
    }

    static notFound(resource = "Resource") {
        return {
            success: 0,
            error: {
                message: `${resource} not found`,
                statusCode: 404,
            },
            timestamp: new Date().toISOString(),
        };
    }

    static validationError(errors) {
        return {
            success: 0,
            error: {
                message: "Validation failed",
                statusCode: 422,
                details: errors,
            },
            timestamp: new Date().toISOString(),
        };
    }

    static conflict(message = "Resource conflict") {
        return {
            success: 0,
            error: {
                message,
                statusCode: 409,
            },
            timestamp: new Date().toISOString(),
        };
    }

    static tooManyRequests(message = "Too many requests") {
        return {
            success: 0,
            error: {
                message,
                statusCode: 429,
            },
            timestamp: new Date().toISOString(),
        };
    }

    static serverError(message = "Internal server error", details = null) {
        return {
            success: 0,
            error: {
                message,
                statusCode: 500,
                ...(!server.isProduction && details && { details }),
            },
            timestamp: new Date().toISOString(),
        };
    }

    static multiStatus(data = null, message = "Multi-status response") {
        return {
            success: 1,
            message,
            data,
            statusCode: 207,
            timestamp: new Date().toISOString(),
        };
    }

    static custom(statusCode, data = null, message = "Response", success = true) {
        return {
            success: success ? 1 : 0,
            message,
            ...(data && { data }),
            statusCode,
            timestamp: new Date().toISOString(),
        };
    }
}

module.exports = ResponseFormatter;