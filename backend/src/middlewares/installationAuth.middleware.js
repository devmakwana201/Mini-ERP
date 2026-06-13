const installationJwtUtils = require('../utils/installationJwt.utils');
const ResponseFormatter = require('../utils/responseFormatter');
const winston = require('../config/winston');

/**
 * Middleware to verify installation JWT token
 * Used for Steps 2 and 3 of installation flow
 */
const verifyInstallationToken = (expectedStep) => {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader) {
                winston.warn(`Installation step ${expectedStep} attempted without token`, {
                    source: "installationAuth.middleware.js",
                    function: "verifyInstallationToken",
                    endpoint: req.path,
                    method: req.method,
                    ip: req.ip,
                    expectedStep
                });
                return res.status(401).json(
                    ResponseFormatter.unauthorized('Installation token required')
                );
            }

            // Handle both "Bearer token" and just "token" formats
            const token = authHeader.startsWith('Bearer ')
                ? authHeader.substring(7)
                : authHeader.trim();

            if (!token) {
                winston.warn(`Installation step ${expectedStep} attempted with empty token`, {
                    source: "installationAuth.middleware.js",
                    function: "verifyInstallationToken",
                    endpoint: req.path,
                    method: req.method,
                    ip: req.ip,
                    expectedStep
                });
                return res.status(401).json(
                    ResponseFormatter.unauthorized('Installation token required')
                );
            }

            // Validate token for the expected step
            const validation = installationJwtUtils.validateTokenForStep(token, expectedStep);

            if (!validation.valid) {
                winston.warn(`Installation token validation failed for step ${expectedStep}`, {
                    source: "installationAuth.middleware.js",
                    function: "verifyInstallationToken",
                    endpoint: req.path,
                    method: req.method,
                    error: validation.error,
                    ip: req.ip,
                    token: token.substring(0, 20) + '...',
                    expectedStep
                });
                return res.status(401).json(
                    ResponseFormatter.unauthorized(validation.error)
                );
            }

            // Verify the token data matches request body
            const tokenData = validation.data;
            const { companyId } = req.body;

            if (tokenData.companyId !== companyId) {
                winston.warn(`Company ID mismatch in installation step ${expectedStep}`, {
                    source: "installationAuth.middleware.js",
                    function: "verifyInstallationToken",
                    endpoint: req.path,
                    method: req.method,
                    tokenCompanyId: tokenData.companyId,
                    requestCompanyId: companyId,
                    ip: req.ip,
                    expectedStep
                });
                return res.status(401).json(
                    ResponseFormatter.unauthorized('Token and request data mismatch: Company ID')
                );
            }

            // Add installation data to request for use in controller
            req.installation = {
                companyId: tokenData.companyId,
                productKey: tokenData.productKey,
                deviceId: tokenData.deviceId,
                phone: tokenData.phone,
                email: tokenData.email,
                companyName: tokenData.companyName,
                currentStep: expectedStep,
                tokenStep: tokenData.step,
                token: token
            };

            winston.info(`Installation step ${expectedStep} authenticated successfully`, {
                source: "installationAuth.middleware.js",
                function: "verifyInstallationToken",
                endpoint: req.path,
                method: req.method,
                companyId: tokenData.companyId,
                productKey: tokenData.productKey,
                deviceId: tokenData.deviceId,
                tokenStep: tokenData.step,
                expectedStep
            });

            next();

        } catch (error) {
            winston.error(`Installation authentication error for step ${expectedStep}: ${error.message}`, {
                source: "installationAuth.middleware.js",
                function: "verifyInstallationToken",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id || req.userId,
                error: error.message,
                code: error.code,
                stack: error.stack,
                expectedStep
            });

            // Handle specific JWT errors
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json(
                    ResponseFormatter.unauthorized('Invalid installation token')
                );
            }

            if (error.name === 'TokenExpiredError') {
                return res.status(401).json(
                    ResponseFormatter.unauthorized('Installation token expired. Please restart the installation process.')
                );
            }

            // Generic error
            res.status(500).json(
                ResponseFormatter.serverError('Installation authentication error')
            );
        }
    };
};

/**
 * Middleware specifically for Step 2 (Register User and Activate Serial)
 */
const verifyStep2Token = verifyInstallationToken(2);

/**
 * Middleware specifically for Step 3 (Create Location)
 */
const verifyStep3Token = verifyInstallationToken(3);

/**
 * Optional installation token middleware (for mixed endpoints)
 */
const optionalInstallationToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return next(); // No token provided, continue without authentication
        }

        const token = authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : authHeader.trim();

        if (!token) {
            return next(); // Invalid format, continue without installation info
        }

        const decoded = installationJwtUtils.verifyInstallationToken(token);

        if (decoded && decoded.type === 'installation') {
            req.installation = {
                companyId: decoded.companyId,
                productKey: decoded.productKey,
                deviceId: decoded.deviceId,
                phone: decoded.phone,
                email: decoded.email,
                companyName: decoded.companyName,
                currentStep: decoded.step,
                token: token
            };

            winston.debug('Optional installation token authenticated', {
                source: "installationAuth.middleware.js",
                function: "optionalInstallationToken",
                endpoint: req.path,
                method: req.method,
                companyId: decoded.companyId,
                step: decoded.step
            });
        }

        next();
    } catch (error) {
        winston.debug(`Optional installation auth error (continuing): ${error.message}`, {
            source: "installationAuth.middleware.js",
            function: "optionalInstallationToken",
            endpoint: req.path,
            method: req.method,
            error: error.message
        });
        // Continue without installation info if there's an error
        next();
    }
};

module.exports = {
    verifyInstallationToken,
    verifyStep2Token,
    verifyStep3Token,
    optionalInstallationToken
};