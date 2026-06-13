const jwt = require("jsonwebtoken");
const config = require("../config/config");
const winston = require("../config/winston");

// Installation JWT configuration - from environment variables
const INSTALLATION_JWT_SECRET = config.installationJwt.secret;
const INSTALLATION_JWT_EXPIRES_IN = config.installationJwt.expiresIn;

/**
 * Generate installation JWT token for 3-step installation flow
 * This token is used to authenticate between Step 1, 2, and 3
 */
const generateInstallationToken = (data) => {
    try {
        const payload = {
            type: 'installation',
            companyId: data.companyId,
            productKey: data.productKey,
            deviceId: data.deviceId,
            phone: data.phone,
            email: data.email,
            companyName: data.companyName,
            step: data.step || 1, // Current step completed
            iat: Math.floor(Date.now() / 1000),
            iss: 'agripos-installation'
        };

        const token = jwt.sign(payload, INSTALLATION_JWT_SECRET, {
            expiresIn: INSTALLATION_JWT_EXPIRES_IN
        });

        winston.info(`Installation token generated for company: ${data.companyId}, step: ${payload.step}`, {
            source: "installationJwt.utils.js",
            function: "generateInstallationToken",
            companyId: data.companyId,
            step: payload.step
        });

        return token;
    } catch (error) {
        winston.error(`Failed to generate installation token: ${error.message}`, {
            source: "installationJwt.utils.js",
            function: "generateInstallationToken",
            error: error.message,
            code: error.code,
            errno: error.errno,
            stack: error.stack
        });
        throw error;
    }
};

/**
 * Verify installation JWT token
 */
const verifyInstallationToken = (token) => {
    try {
        const decoded = jwt.verify(token, INSTALLATION_JWT_SECRET);

        // Ensure it's an installation token
        if (decoded.type !== 'installation') {
            winston.warn("Invalid token type for installation", {
                source: "installationJwt.utils.js",
                function: "verifyInstallationToken",
                tokenType: decoded.type
            });
            return null;
        }

        // Ensure token issuer is correct
        if (decoded.iss !== 'agripos-installation') {
            winston.warn("Invalid token issuer for installation", {
                source: "installationJwt.utils.js",
                function: "verifyInstallationToken",
                issuer: decoded.iss
            });
            return null;
        }

        winston.debug("Installation token verified successfully for company", {
            source: "installationJwt.utils.js",
            function: "verifyInstallationToken",
            companyId: decoded.companyId
        });
        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            winston.warn("Installation token expired", {
                source: "installationJwt.utils.js",
                function: "verifyInstallationToken"
            });
        } else if (error.name === 'JsonWebTokenError') {
            winston.warn("Invalid installation token format", {
                source: "installationJwt.utils.js",
                function: "verifyInstallationToken"
            });
        } else {
            winston.error(`Installation token verification error: ${error.message}`, {
                source: "installationJwt.utils.js",
                function: "verifyInstallationToken",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
        }
        return null;
    }
};

/**
 * Decode installation token without verification (for debugging)
 */
const decodeInstallationToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (error) {
        winston.error(`Failed to decode installation token: ${error.message}`, {
            source: "installationJwt.utils.js",
            function: "decodeInstallationToken",
            error: error.message,
            code: error.code,
            errno: error.errno,
            stack: error.stack
        });
        return null;
    }
};

/**
 * Check if installation token is expired
 */
const isInstallationTokenExpired = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) {
            return true;
        }
        return decoded.exp < Date.now() / 1000;
    } catch (error) {
        return true;
    }
};

/**
 * Get remaining time for installation token in minutes
 */
const getInstallationTokenRemainingMinutes = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) {
            return 0;
        }
        const remainingSeconds = decoded.exp - (Date.now() / 1000);
        return Math.floor(remainingSeconds / 60); // Convert to minutes
    } catch (error) {
        return 0;
    }
};

/**
 * Validate token for specific step
 * Ensures token is for the previous step before allowing current step
 */
const validateTokenForStep = (token, expectedStep) => {
    try {
        const decoded = verifyInstallationToken(token);
        if (!decoded) {
            return { valid: false, error: "Invalid or expired token" };
        }

        // For step 2, token should have step 1 completed
        // For step 3, token should have step 2 completed
        const requiredCompletedStep = expectedStep - 1;

        if (decoded.step < requiredCompletedStep) {
            return {
                valid: false,
                error: `Previous step (${requiredCompletedStep}) not completed. Current token step: ${decoded.step}`
            };
        }

        // Additional validation: check if same company and device
        return {
            valid: true,
            data: decoded,
            message: `Token valid for step ${expectedStep}`
        };
    } catch (error) {
        winston.error(`Token step validation error: ${error.message}`, {
            source: "installationJwt.utils.js",
            function: "validateTokenForStep",
            error: error.message,
            code: error.code,
            errno: error.errno,
            stack: error.stack,
            expectedStep: expectedStep
        });
        return { valid: false, error: "Token validation failed" };
    }
};

/**
 * Update token for next step
 * Used after completing each step to prepare token for next step
 */
const updateTokenForNextStep = (currentTokenData, completedStep) => {
    try {
        const updatedData = {
            ...currentTokenData,
            step: completedStep,
            updatedAt: Math.floor(Date.now() / 1000)
        };

        return generateInstallationToken(updatedData);
    } catch (error) {
        winston.error(`Failed to update token for next step: ${error.message}`, {
            source: "installationJwt.utils.js",
            function: "updateTokenForNextStep",
            error: error.message,
            code: error.code,
            errno: error.errno,
            stack: error.stack,
            completedStep: completedStep
        });
        throw error;
    }
};

module.exports = {
    generateInstallationToken,
    verifyInstallationToken,
    decodeInstallationToken,
    isInstallationTokenExpired,
    getInstallationTokenRemainingMinutes,
    validateTokenForStep,
    updateTokenForNextStep,
    INSTALLATION_JWT_SECRET,
    INSTALLATION_JWT_EXPIRES_IN,
};