const installationJwtUtils = require('../utils/installationJwt.utils');
const posJwtUtils = require('../utils/posJwtToken.utils');
const db = require('../config/db');
const ResponseFormatter = require('../utils/responseFormatter');
const winston = require('../config/winston');

/**
 * Dual Authentication Middleware
 * Accepts EITHER installation token (Step 3) OR POS token
 * Used for APIs that work in both registration and logged-in flows
 */
const verifyDualToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            winston.warn('Dual auth attempted without token', {
                source: "dualAuth.middleware.js",
                function: "verifyDualToken",
                endpoint: req.path,
                method: req.method,
                ip: req.ip
            });
            return res.status(401).json(
                ResponseFormatter.unauthorized('Authentication required - provide either installation token or POS token')
            );
        }

        // Handle both "Bearer token" and just "token" formats
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : authHeader.trim();

        if (!token) {
            winston.warn('Dual auth attempted with empty token', {
                source: "dualAuth.middleware.js",
                function: "verifyDualToken",
                endpoint: req.path,
                method: req.method,
                ip: req.ip
            });
            return res.status(401).json(
                ResponseFormatter.unauthorized('Authentication token required')
            );
        }

        // Try to decode token to determine type
        let decoded = null;
        let tokenType = null;

        // First, try decoding as installation token
        try {
            decoded = installationJwtUtils.verifyInstallationToken(token);
            if (decoded && decoded.type === 'installation') {
                tokenType = 'installation';
            }
        } catch (error) {
            // Not an installation token, that's okay - try POS token next
            winston.debug('Token is not installation token, trying POS token', {
                source: "dualAuth.middleware.js",
                function: "verifyDualToken",
                endpoint: req.path,
                method: req.method,
                error: error.message
            });
        }

        // If not installation token, try POS token
        if (!tokenType) {
            try {
                decoded = posJwtUtils.verifyPOSToken(token);
                if (decoded && decoded.type === 'pos') {
                    tokenType = 'pos';
                }
            } catch (error) {
                winston.warn('Token is not POS token either', {
                    source: "dualAuth.middleware.js",
                    function: "verifyDualToken",
                    endpoint: req.path,
                    method: req.method,
                    error: error.message
                });
            }
        }

        // If neither token type worked, reject
        if (!decoded || !tokenType) {
            winston.warn('Dual auth failed - invalid token', {
                source: "dualAuth.middleware.js",
                function: "verifyDualToken",
                endpoint: req.path,
                method: req.method,
                token: token.substring(0, 20) + '...',
                ip: req.ip
            });
            return res.status(401).json(
                ResponseFormatter.unauthorized('Invalid authentication token')
            );
        }

        // Handle Installation Token (Registration Flow)
        if (tokenType === 'installation') {
            // Validate for step 3 (create location step)
            const validation = installationJwtUtils.validateTokenForStep(token, 3);

            if (!validation.valid) {
                winston.warn('Installation token validation failed for step 3', {
                    source: "dualAuth.middleware.js",
                    function: "verifyDualToken",
                    endpoint: req.path,
                    method: req.method,
                    error: validation.error,
                    ip: req.ip
                });
                return res.status(401).json(
                    ResponseFormatter.unauthorized(validation.error)
                );
            }

            // Verify token data matches request body (only for installation flow)
            const tokenData = validation.data;
            const { companyId, productKey, deviceId } = req.body;

            if (tokenData.companyId !== companyId) {
                winston.warn('Company ID mismatch in installation flow', {
                    tokenCompanyId: tokenData.companyId,
                    requestCompanyId: companyId,
                    ip: req.ip
                });
                return res.status(401).json(
                    ResponseFormatter.unauthorized('Token and request data mismatch: Company ID')
                );
            }

            // Add installation data to request
            req.installation = {
                companyId: tokenData.companyId,
                productKey: tokenData.productKey,
                deviceId: tokenData.deviceId,
                phone: tokenData.phone,
                email: tokenData.email,
                companyName: tokenData.companyName,
                currentStep: 3,
                tokenStep: tokenData.step,
                token: token
            };

            req.flowType = 'registration';
            req.authType = 'installation';

            winston.info('Dual auth successful - Installation token (registration flow)', {
                source: "dualAuth.middleware.js",
                function: "verifyDualToken",
                endpoint: req.path,
                method: req.method,
                companyId: tokenData.companyId,
                productKey: tokenData.productKey,
                deviceId: tokenData.deviceId
            });

            return next();
        }

        // Handle POS Token (Logged-in Flow)
        if (tokenType === 'pos') {
            // Check if token exists in database
            const tokenQuery = `
                SELECT pt.*, lm.locationname, lm.companyid
                FROM pos_jwt_tokens pt
                LEFT JOIN locationmaster lm ON pt.locationid = lm.locationid
                WHERE pt.token = ?
            `;
            const tokenResult = await db.getResults(tokenQuery, [token]);

            if (!tokenResult || tokenResult.length === 0) {
                winston.warn('POS token not found in database', {
                    source: "dualAuth.middleware.js",
                    function: "verifyDualToken",
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

            // Check if POS is still active
            if (tokenData.isactive === 0) {
                winston.warn('Inactive POS attempted access', {
                    source: "dualAuth.middleware.js",
                    function: "verifyDualToken",
                    endpoint: req.path,
                    method: req.method,
                    locationId: tokenData.locationid,
                    productKey: tokenData.product_key
                });
                return res.status(401).json(
                    ResponseFormatter.unauthorized('POS is inactive')
                );
            }

            // Update last_used timestamp
            await db.getResults(
                `UPDATE pos_jwt_tokens SET last_used = NOW() WHERE token = ?`,
                [token]
            );

            // Add POS data to request
            req.pos = {
                locationId: decoded.locationId,
                serialId: decoded.serialId,
                productKey: decoded.productKey,
                locationName: decoded.locationName || tokenData.locationname,
                companyId: decoded.companyId || tokenData.companyid,
                hardwareProfile: decoded.hardwareProfile,
                isActive: decoded.isActive,
                activationCount: decoded.activationCount
            };

            req.posToken = token;
            req.flowType = 'logged-in';
            req.authType = 'pos';

            winston.info('Dual auth successful - POS token (logged-in flow)', {
                source: "dualAuth.middleware.js",
                function: "verifyDualToken",
                endpoint: req.path,
                method: req.method,
                locationId: req.pos.locationId,
                productKey: req.pos.productKey,
                companyId: req.pos.companyId
            });

            return next();
        }

    } catch (error) {
        winston.error(`Dual authentication error: ${error.message}`, {
            source: "dualAuth.middleware.js",
            function: "verifyDualToken",
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
                ResponseFormatter.unauthorized('Invalid authentication token')
            );
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json(
                ResponseFormatter.unauthorized('Authentication token expired')
            );
        }

        // Generic error
        res.status(500).json(
            ResponseFormatter.serverError('Authentication error')
        );
    }
};

/**
 * Optional POS Token with Required Installation Token Middleware
 * Installation token: REQUIRED (must be present and valid for registration flow)
 * POS token: OPTIONAL (if present, validates it; if not, continues)
 * Used for APIs that work in both registration and logged-in flows
 */
const optionalDualToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            winston.warn('No authorization header provided', {
                source: "dualAuth.middleware.js",
                function: "optionalDualToken",
                endpoint: req.path,
                method: req.method,
                ip: req.ip
            });
            return res.status(401).json(
                ResponseFormatter.unauthorized('Authentication required - provide installation token or POS token')
            );
        }

        // Handle both "Bearer token" and just "token" formats
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : authHeader.trim();

        if (!token) {
            winston.warn('Empty token in authorization header', {
                source: "dualAuth.middleware.js",
                function: "optionalDualToken",
                endpoint: req.path,
                method: req.method,
                ip: req.ip
            });
            return res.status(401).json(
                ResponseFormatter.unauthorized('Authentication token required')
            );
        }

        // Try to decode token to determine type
        let decoded = null;
        let tokenType = null;

        // First, try decoding as installation token
        try {
            decoded = installationJwtUtils.verifyInstallationToken(token);
            if (decoded && decoded.type === 'installation') {
                tokenType = 'installation';
            }
        } catch (error) {
            winston.debug('Token is not installation token, trying POS token', {
                source: "dualAuth.middleware.js",
                function: "optionalDualToken",
                endpoint: req.path,
                method: req.method,
                error: error.message
            });
        }

        // If not installation token, try POS token
        if (!tokenType) {
            try {
                decoded = posJwtUtils.verifyPOSToken(token);
                if (decoded && decoded.type === 'pos') {
                    tokenType = 'pos';
                }
            } catch (error) {
                winston.warn('Token is not POS token either', {
                    source: "dualAuth.middleware.js",
                    function: "optionalDualToken",
                    endpoint: req.path,
                    method: req.method,
                    error: error.message
                });
            }
        }

        // If neither token type worked, reject
        if (!decoded || !tokenType) {
            winston.warn('Invalid authentication token', {
                source: "dualAuth.middleware.js",
                function: "optionalDualToken",
                endpoint: req.path,
                method: req.method,
                token: token.substring(0, 20) + '...',
                ip: req.ip
            });
            return res.status(401).json(
                ResponseFormatter.unauthorized('Invalid authentication token')
            );
        }

        // Handle Installation Token (REQUIRED for registration flow)
        if (tokenType === 'installation') {
            const validation = installationJwtUtils.validateTokenForStep(token, 3);

            if (!validation.valid) {
                winston.warn('Installation token validation failed for step 3', {
                    source: "dualAuth.middleware.js",
                    function: "optionalDualToken",
                    endpoint: req.path,
                    method: req.method,
                    error: validation.error,
                    ip: req.ip
                });
                return res.status(401).json(
                    ResponseFormatter.unauthorized(validation.error)
                );
            }

            // Verify token data matches request body (only for installation flow)
            const tokenData = validation.data;
            const { companyId, productKey, deviceId } = req.body;

            if (tokenData.companyId !== companyId) {
                winston.warn('Company ID mismatch in installation flow', {
                    source: "dualAuth.middleware.js",
                    function: "optionalDualToken",
                    endpoint: req.path,
                    method: req.method,
                    tokenCompanyId: tokenData.companyId,
                    requestCompanyId: companyId,
                    ip: req.ip
                });
                return res.status(401).json(
                    ResponseFormatter.unauthorized('Token and request data mismatch: Company ID')
                );
            }

            // Add installation data to request
            req.installation = {
                companyId: tokenData.companyId,
                productKey: tokenData.productKey,
                deviceId: tokenData.deviceId,
                phone: tokenData.phone,
                email: tokenData.email,
                companyName: tokenData.companyName,
                currentStep: 3,
                tokenStep: tokenData.step,
                token: token
            };

            req.flowType = 'registration';
            req.authType = 'installation';

            winston.info('Installation token authenticated (registration flow)', {
                source: "dualAuth.middleware.js",
                function: "optionalDualToken",
                endpoint: req.path,
                method: req.method,
                companyId: tokenData.companyId,
                productKey: tokenData.productKey,
                deviceId: tokenData.deviceId
            });

            return next();
        }

        // Handle POS Token (OPTIONAL - validates if present)
        if (tokenType === 'pos') {
            // Check if token exists in database
            const tokenQuery = `
                SELECT pt.*, lm.locationname, lm.companyid
                FROM pos_jwt_tokens pt
                LEFT JOIN locationmaster lm ON pt.locationid = lm.locationid
                WHERE pt.token = ?
            `;
            const tokenResult = await db.getResults(tokenQuery, [token]);

            if (!tokenResult || tokenResult.length === 0) {
                winston.warn('POS token not found in database', {
                    source: "dualAuth.middleware.js",
                    function: "optionalDualToken",
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

            // Check if POS is still active
            if (tokenData.isactive === 0) {
                winston.warn('Inactive POS attempted access', {
                    source: "dualAuth.middleware.js",
                    function: "optionalDualToken",
                    endpoint: req.path,
                    method: req.method,
                    locationId: tokenData.locationid,
                    productKey: tokenData.product_key
                });
                return res.status(401).json(
                    ResponseFormatter.unauthorized('POS is inactive')
                );
            }

            // Update last_used timestamp
            await db.getResults(
                `UPDATE pos_jwt_tokens SET last_used = NOW() WHERE token = ?`,
                [token]
            );

            // Add POS data to request
            req.pos = {
                locationId: decoded.locationId,
                serialId: decoded.serialId,
                productKey: decoded.productKey,
                locationName: decoded.locationName || tokenData.locationname,
                companyId: decoded.companyId || tokenData.companyid,
                hardwareProfile: decoded.hardwareProfile,
                isActive: decoded.isActive,
                activationCount: decoded.activationCount
            };

            req.posToken = token;
            req.flowType = 'logged-in';
            req.authType = 'pos';

            winston.info('POS token authenticated (logged-in flow)', {
                source: "dualAuth.middleware.js",
                function: "optionalDualToken",
                endpoint: req.path,
                method: req.method,
                locationId: req.pos.locationId,
                productKey: req.pos.productKey,
                companyId: req.pos.companyId
            });

            return next();
        }

    } catch (error) {
        winston.error(`Authentication error: ${error.message}`, {
            source: "dualAuth.middleware.js",
            function: "optionalDualToken",
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
                ResponseFormatter.unauthorized('Invalid authentication token')
            );
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json(
                ResponseFormatter.unauthorized('Authentication token expired')
            );
        }

        // Generic error
        res.status(500).json(
            ResponseFormatter.serverError('Authentication error')
        );
    }
};

module.exports = {
    verifyDualToken,
    optionalDualToken
};