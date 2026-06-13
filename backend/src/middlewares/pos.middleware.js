const jwt = require('jsonwebtoken');
const jwtUtils = require('../utils/jwtToken.utils');
const posJwtUtils = require('../utils/posJwtToken.utils');
const db = require('../config/db');
const ResponseFormatter = require('../utils/responseFormatter');
const winston = require('../config/winston');
const config = require('../config/config');
const posTokenModel = require('../models/pos-mgmt/posToken.model');

/**
 * Generate POS JWT Token and store in database
 */
const generatePOSToken = async (posData) => {
    try {
        const payload = {
            type: 'pos',
            serialId: posData.serial_id || posData.serialId,
            productKey: posData.productKey,
            companyId: posData.companyid || posData.companyId,
            companyName: posData.companyname || posData.companyName,
            hardwareProfile: posData.hardware_profile || posData.hardwareProfile,
            isActive: posData.is_active || posData.isActive,
            activationCount: posData.activation_count || posData.activationCount,
        };

        // Use the separate POS JWT utility with extended expiry
        const token = posJwtUtils.generatePOSToken(payload);

        // Decode to get expiry time
        const decoded = posJwtUtils.decodePOSToken(token);

        // Store token in database (company-level)
        const tokenData = {
            serial_id: payload.serialId,
            product_key: payload.productKey,
            token: token,
            expiry: new Date(decoded.exp * 1000),
            hardware_profile: JSON.stringify(payload.hardwareProfile),
            company_id: payload.companyId
        };

        // Insert new token
        const result = await db.insert('pos_jwt_tokens', tokenData);

        if (!result.insertId) {
            throw new Error('Failed to store POS token');
        }

        winston.info(`Company-level POS token generated for ${payload.companyName} (${payload.productKey})`, {
            source: "pos.middleware.js",
            function: "generatePOSToken",
            companyId: payload.companyId
        });

        return {
            token: `${token}`,
            expiresIn: decoded.exp,
            tokenType: 'pos'
        };
    } catch (error) {
        winston.error(`Failed to generate POS token: ${error.message}`, {
            source: "pos.middleware.js",
            function: "generatePOSToken",
            error: error.message,
            code: error.code,
            stack: error.stack
        });
        throw error;
    }
};

/**
 * Verify POS JWT Token Middleware
 */
const verifyPOSToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json(ResponseFormatter.unauthorized('POS token required'));
        }

        // Handle both "Bearer token" and just "token" formats
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : authHeader.trim();
        
        // Check if token exists in database (company-level tokens)
        const tokenQuery = `
            SELECT pt.*,
                   cm.companyid,
                   cm.companyname
            FROM pos_jwt_tokens pt
            INNER JOIN companymaster cm ON pt.company_id = cm.companyid
            WHERE pt.token = ? AND cm.isdeleted = 0
        `;
        const tokenResult = await db.getResults(tokenQuery, [token]);

        winston.info('POS Token DB Check', {
            source: "pos.middleware.js",
            function: "verifyPOSToken",
            endpoint: req.path,
            method: req.method,
            tokenPrefix: token.substring(0, 20) + '...',
            dbResultCount: tokenResult ? tokenResult.length : 0,
            found: tokenResult && tokenResult.length > 0
        });

        if (!tokenResult || tokenResult.length === 0) {
            winston.warn('POS token not found in database', {
                source: "pos.middleware.js",
                function: "verifyPOSToken",
                endpoint: req.path,
                method: req.method,
                token: token.substring(0, 20) + '...',
                ip: req.ip
            });
            return res.status(401).json(
                ResponseFormatter.unauthorized('Invalid or expired POS token')
            );
        }

        const tokenData = tokenResult[0];
        
        // Check if POS company is still active
        if (tokenData.isdeleted === 0) {
            winston.warn('Deleted company attempted access', {
                source: "pos.middleware.js",
                function: "verifyPOSToken",
                endpoint: req.path,
                method: req.method,
                companyId: tokenData.companyid,
                companyName: tokenData.companyname,
                productKey: tokenData.product_key
            });
            return res.status(401).json(
                ResponseFormatter.unauthorized('Company POS is deleted')
            );
        }
        
        // First try to verify with new POS JWT secret
        let decoded = posJwtUtils.verifyPOSToken(token);
        let isOldToken = false;

        // If verification fails, try with old JWT secret (for backward compatibility)
        if (!decoded) {
            winston.info('POS token failed new secret verification, trying old secret', {
                source: "pos.middleware.js",
                function: "verifyPOSToken",
                endpoint: req.path,
                method: req.method,
                token: token.substring(0, 20) + '...'
            });

            try {
                decoded = jwt.verify(token, config.posJwt.secret);
                isOldToken = true;
                winston.info('POS token verified with old secret - needs regeneration', {
                    source: "pos.middleware.js",
                    function: "verifyPOSToken",
                    endpoint: req.path,
                    method: req.method,
                    token: token.substring(0, 20) + '...',
                    companyId: decoded.companyId
                });
            } catch (error) {
                winston.warn('POS JWT verification failed with both secrets', {
                    source: "pos.middleware.js",
                    function: "verifyPOSToken",
                    endpoint: req.path,
                    method: req.method,
                    token: token.substring(0, 20) + '...',
                    error: error.message
                });
            }
        }

        if (!decoded) {
            winston.warn('POS JWT verification completely failed', {
                source: "pos.middleware.js",
                function: "verifyPOSToken",
                endpoint: req.path,
                method: req.method,
                token: token.substring(0, 20) + '...'
            });
            // Remove invalid token from database
            await db.getResults(
                `DELETE FROM pos_jwt_tokens WHERE token = ?`,
                [token]
            );
            return res.status(401).json(
                ResponseFormatter.unauthorized('Invalid POS token')
            );
        }

        // Log successful verification
        winston.info('POS JWT verification successful', {
            source: "pos.middleware.js",
            function: "verifyPOSToken",
            endpoint: req.path,
            method: req.method,
            token: token.substring(0, 20) + '...',
            companyId: decoded.companyId,
            usingOldSecret: isOldToken
        });
        
        // Check if it's a POS token
        if (decoded.type !== 'pos') {
            return res.status(401).json(
                ResponseFormatter.unauthorized('Invalid token type')
            );
        }
        
        // Update last_used timestamp
        // Disabling this query to prevent lock waits. It can be re-enabled with a more robust strategy if needed.
        // await db.getResults(
        //     `UPDATE pos_jwt_tokens SET last_used = NOW() WHERE token = ?`,
        //     [token]
        // );
        
        // Add company-level POS data to request object
        req.pos = {
            serialId: decoded.serialId,
            productKey: decoded.productKey,
            companyId: decoded.companyId,
            companyName: tokenData.companyname,
            hardwareProfile: decoded.hardwareProfile,
            isActive: decoded.isActive,
            activationCount: decoded.activationCount
        };

        // Add token to request for potential use in logout
        req.posToken = token;
        req.isOldPOSToken = isOldToken;

        winston.info(`Company POS authenticated: ${req.pos.companyName} (${req.pos.productKey})`, {
            source: "pos.middleware.js",
            function: "verifyPOSToken",
            endpoint: req.path,
            method: req.method,
            companyId: req.pos.companyId,
            usingOldToken: isOldToken
        });

        // If using old token, suggest regeneration in response header
        if (isOldToken) {
            res.setHeader('X-POS-Token-Regeneration-Needed', 'true');
            res.setHeader('X-POS-Refresh-Endpoint', '/api/v1/pos/installation/refresh-token');
            winston.warn('POS system using old token format - should refresh token', {
                source: "pos.middleware.js",
                function: "verifyPOSToken",
                endpoint: req.path,
                method: req.method,
                locationId: decoded.locationId,
                productKey: decoded.productKey,
                refreshEndpoint: '/api/v1/pos/installation/refresh-token'
            });
        }

        next();

    } catch (error) {
        winston.error(`POS token verification error: ${error.message}`, {
            source: "pos.middleware.js",
            function: "verifyPOSToken",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id || req.userId,
            error: error.message,
            code: error.code,
            stack: error.stack
        });
        
        // Handle specific JWT errors
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json(
                ResponseFormatter.unauthorized('Invalid POS token')
            );
        }
        
        if (error.name === 'TokenExpiredError') {
            // Clean up expired token
            const token = req.headers.authorization?.substring(7);
            if (token) {
                await db.getResults(
                    `DELETE FROM pos_jwt_tokens WHERE token = ?`,
                    [token]
                ).catch(() => {}); // Ignore cleanup errors
            }
            return res.status(401).json(
                ResponseFormatter.unauthorized('POS token expired')
            );
        }
        
        // Generic error
        res.status(500).json(
            ResponseFormatter.serverError('Authentication error')
        );
    }
};

/**
 * Optional POS Token Middleware (for mixed endpoints)
 */
const optionalPOSToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return next(); // No token provided, continue without authentication
        }

        // Handle both "Bearer token" and just "token" formats
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : authHeader.trim();
        
        if (!token) {
            return next(); // Invalid format, continue without POS info
        }

        // Verify token using POS JWT utility
        const decoded = posJwtUtils.verifyPOSToken(token);
        
        if (decoded && decoded.type === 'pos') {
            // Check if token exists in database (company-level)
            const tokenQuery = `
                SELECT pt.*,
                       cm.companyid,
                       cm.companyname
                FROM pos_jwt_tokens pt
                INNER JOIN companymaster cm ON pt.company_id = cm.companyid
                WHERE pt.token = ? AND cm.isdeleted = 0
            `;
            const tokenResult = await db.getResults(tokenQuery, [token]);

            if (tokenResult && tokenResult.length > 0 && tokenResult[0].isactive === 1) {
                req.pos = {
                    serialId: decoded.serialId,
                    productKey: decoded.productKey,
                    companyId: decoded.companyId,
                    companyName: tokenResult[0].companyname,
                    hardwareProfile: decoded.hardwareProfile,
                    isActive: decoded.isActive,
                    activationCount: decoded.activationCount
                };
                req.posToken = token;

                // Update last_used timestamp
                // Disabling this query to prevent lock waits, similar to verifyPOSToken.
                // await db.getResults(
                //     `UPDATE pos_jwt_tokens SET last_used = NOW() WHERE token = ?`,
                //     [token]
                // ).catch(() => {}); // Ignore update errors for optional auth
            }
        }
        
        next();
    } catch (error) {
        winston.debug(`Optional POS auth error (continuing): ${error.message}`, {
            source: "pos.middleware.js",
            function: "optionalPOSToken",
            endpoint: req.path,
            method: req.method,
            error: error.message
        });
        // Continue without POS info if there's an error
        next();
    }
};

/**
 * Remove POS token from database (for logout)
 */
const removePOSToken = async (token) => {
    try {
        const result = await posTokenModel.removeToken(token);
        return result.success && result.removed;
    } catch (error) {
        winston.error(`Failed to remove POS token: ${error.message}`, {
            source: "pos.middleware.js",
            function: "removePOSToken",
            error: error.message,
            code: error.code,
            stack: error.stack
        });
        return false;
    }
};

/**
 * Clean up expired POS tokens (can be run periodically)
 */
const cleanupExpiredPOSTokens = async () => {
    try {
        const result = await posTokenModel.cleanupExpiredTokens();
        return result.success ? result.cleaned : 0;
    } catch (error) {
        winston.error(`Failed to cleanup expired POS tokens: ${error.message}`, {
            source: "pos.middleware.js",
            function: "cleanupExpiredPOSTokens",
            error: error.message,
            code: error.code,
            stack: error.stack
        });
        return 0;
    }
};

module.exports = {
    generatePOSToken,
    verifyPOSToken,
    optionalPOSToken,
    removePOSToken,
    cleanupExpiredPOSTokens
};