const jwt = require("jsonwebtoken");
const jwtUtils = require("../utils/jwtToken.utils");
const db = require("../config/db");
const winston = require("../config/winston");
const ResponseFormatter = require("../utils/responseFormatter");
const { AuthenticationError, AuthorizationError } = require("../utils/customErrors");
const config = require("../config/config");

/**
 * Authentication middleware to verify JWT tokens
 */
const authMiddleware = async (req, res, next) => {
    try {
        // Check for Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader  || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json(
                ResponseFormatter.unauthorized("No token provided")
            );
        }

        // Extract token
        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json(
                ResponseFormatter.unauthorized("Invalid token format")
            );
        }

        // Check if token exists in database
        // Support both column names: 'user_id' (new schema) and 'userid' (old schema)
        let tokenResult;
        try {
            tokenResult = await db.getResults(
                `SELECT id, user_id AS userId FROM user_jwt_tokens WHERE token = ? LIMIT 1`,
                [token]
            );
        } catch (_colErr) {
            // Fallback: table may use 'userid' column
            try {
                tokenResult = await db.getResults(
                    `SELECT id, userid AS userId FROM user_jwt_tokens WHERE token = ? LIMIT 1`,
                    [token]
                );
            } catch (_e) {
                tokenResult = [];
            }
        }

        if (!tokenResult || tokenResult.length === 0) {
            winston.warn("Invalid or expired token attempt", {
                source: "auth.middleware.js",
                function: "authMiddleware",
                endpoint: req.path,
                method: req.method,
                token: token.substring(0, 20) + "..."
            });
            return res.status(401).json(
                ResponseFormatter.unauthorized("Invalid or expired token")
            );
        }

        // Verify JWT signature and expiration
        const decoded = jwtUtils.verifyToken(token);
        if (!decoded) {
            return res.status(401).json(
                ResponseFormatter.unauthorized("Invalid or expired token")
            );
        }

        // Fetch user + role from DB to populate req.user fully
        const userRows = await db.getResults(
            `SELECT u.user_id, u.role_id, u.name, u.email, r.name AS role_name, r.permissions
             FROM users u
             JOIN roles r ON r.role_id = u.role_id
             WHERE u.user_id = ? AND u.is_deleted = 0 AND u.status = 'active'`,
            [decoded.userId]
        );

        if (!userRows || userRows.length === 0) {
            return res.status(401).json(
                ResponseFormatter.unauthorized("User account not found or inactive")
            );
        }

        const dbUser = userRows[0];
        let permissions = dbUser.permissions || {};
        if (typeof permissions === 'string') {
            try { permissions = JSON.parse(permissions); } catch { permissions = {}; }
        }

        // Attach enriched user to request
        req.user = {
            userId:     dbUser.user_id,
            role_id:    dbUser.role_id,
            role_name:  dbUser.role_name,
            email:      dbUser.email,
            name:       dbUser.name,
            permissions,
            // keep decoded payload too
            ...decoded,
        };

        // Add token to request for potential use in logout
        req.token = token;

        next();
    } catch (error) {
        winston.error(`Auth middleware error: ${error.message}`, {
            source: "auth.middleware.js",
            function: "authMiddleware",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id || req.userId,
            error: error.message,
            code: error.code,
            stack: error.stack
        });

        // Handle specific JWT errors
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json(
                ResponseFormatter.unauthorized("Invalid token")
            );
        }
        
        if (error.name === "TokenExpiredError") {
            return res.status(401).json(
                ResponseFormatter.unauthorized("Token expired")
            );
        }

        // Generic error
        res.status(500).json(
            ResponseFormatter.serverError("Authentication error")
        );
    }
};

/**
 * Authorization middleware to check user roles
 * @param {string|Array} allowedRoles - Single role or array of allowed roles
 */
const authorizeRoles = (allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json(
                    ResponseFormatter.unauthorized("Authentication required")
                );
            }

            const userRole = req.user.role;
            const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

            if (!roles.includes(userRole)) {
                winston.warn("Unauthorized access attempt", {
                    source: "auth.middleware.js",
                    function: "authorizeRoles",
                    endpoint: req.path,
                    method: req.method,
                    userId: req.user.userId,
                    userRole,
                    requiredRoles: roles
                });

                return res.status(403).json(
                    ResponseFormatter.forbidden("Insufficient permissions")
                );
            }

            next();
        } catch (error) {
            winston.error(`Authorization middleware error: ${error.message}`, {
                source: "auth.middleware.js",
                function: "authorizeRoles",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id || req.userId,
                error: error.message,
                code: error.code,
                stack: error.stack
            });
            res.status(500).json(
                ResponseFormatter.serverError("Authorization error")
            );
        }
    };
};

/**
 * Optional authentication middleware
 * Adds user info if token is present but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(); // No token provided, continue without user info
        }

        const token = authHeader.split(" ")[1];
        
        if (!token) {
            return next(); // Invalid format, continue without user info
        }

        // Verify token
        const decoded = jwtUtils.verifyToken(token);
        
        if (decoded) {
            // Check if token exists in database
            const tokenQuery = `SELECT ujt.id FROM user_jwt_tokens ujt WHERE ujt.token = ?`;
            const tokenResult = await db.getResults(tokenQuery, [token]);

            if (tokenResult && tokenResult.length > 0) {
                req.user = {
                    userId: decoded.userId,
                    email: decoded.email,
                    role: decoded.role || "user",
                    ...decoded
                };
                req.token = token;
            }
        }

        next();
    } catch (error) {
        winston.error(`Optional auth middleware error: ${error.message}`, {
            source: "auth.middleware.js",
            function: "optionalAuth",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id || req.userId,
            error: error.message,
            code: error.code,
            stack: error.stack
        });
        // Continue without user info if there's an error
        next();
    }
};

/**
 * Middleware to check if user owns the resource
 * Compares req.user.userId with req.params.id or req.body.userId
 */
const checkResourceOwnership = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json(
                ResponseFormatter.unauthorized("Authentication required")
            );
        }

        const resourceUserId = req.params.id || req.body.userId || req.params.userId;
        const currentUserId = req.user.userId;

        // Allow if user is admin or owns the resource
        if (req.user.role === "admin" || currentUserId.toString() === resourceUserId.toString()) {
            return next();
        }

        winston.warn("Resource ownership violation", {
            source: "auth.middleware.js",
            function: "checkResourceOwnership",
            endpoint: req.path,
            method: req.method,
            userId: currentUserId,
            resourceUserId,
            route: req.route?.path
        });

        res.status(403).json(
            ResponseFormatter.forbidden("You can only access your own resources")
        );
    } catch (error) {
        winston.error(`Resource ownership check error: ${error.message}`, {
            source: "auth.middleware.js",
            function: "checkResourceOwnership",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id || req.userId,
            error: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json(
            ResponseFormatter.serverError("Authorization error")
        );
    }
};

/**
 * Middleware to validate API key for external access
 */
const validateApiKey = (req, res, next) => {
    try {
        const apiKey = req.headers["x-api-key"] || req.query.apiKey;
        
        if (!apiKey) {
            return res.status(401).json(
                ResponseFormatter.unauthorized("API key required")
            );
        }

        if (apiKey !== config.security.apiKey) {
            winston.warn("Invalid API key attempt", {
                source: "auth.middleware.js",
                function: "validateApiKey",
                endpoint: req.path,
                method: req.method,
                providedKey: apiKey.substring(0, 8) + "...",
                ip: req.ip
            });

            return res.status(401).json(
                ResponseFormatter.unauthorized("Invalid API key")
            );
        }

        next();
    } catch (error) {
        winston.error(`API key validation error: ${error.message}`, {
            source: "auth.middleware.js",
            function: "validateApiKey",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id || req.userId,
            error: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json(
            ResponseFormatter.serverError("API key validation error")
        );
    }
};

module.exports = {
    authMiddleware,
    authorizeRoles,
    optionalAuth,
    checkResourceOwnership,
    validateApiKey,
};