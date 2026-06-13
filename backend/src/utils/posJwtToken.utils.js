const jwt = require("jsonwebtoken");
const config = require("../config/config");

// Separate JWT configuration for POS tokens
const POS_JWT_SECRET = config.posJwt.secret;
const POS_JWT_EXPIRES_IN = config.posJwt.expiresIn;

/**
 * Generate POS access token with long expiry
 */
const generatePOSToken = (data) => {
    return jwt.sign(data, POS_JWT_SECRET, { expiresIn: POS_JWT_EXPIRES_IN });
};

/**
 * Verify POS access token
 */
const verifyPOSToken = (token) => {
    try {
        return jwt.verify(token, POS_JWT_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * Decode POS token without verification
 */
const decodePOSToken = (token) => {
    return jwt.decode(token);
};

/**
 * Check if POS token is expired
 */
const isPOSTokenExpired = (token) => {
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
 * Get remaining time for POS token in days
 */
const getPOSTokenRemainingDays = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) {
            return 0;
        }
        const remainingSeconds = decoded.exp - (Date.now() / 1000);
        return Math.floor(remainingSeconds / (24 * 60 * 60)); // Convert to days
    } catch (error) {
        return 0;
    }
};

module.exports = {
    generatePOSToken,
    verifyPOSToken,
    decodePOSToken,
    isPOSTokenExpired,
    getPOSTokenRemainingDays,
    POS_JWT_SECRET,
    POS_JWT_EXPIRES_IN,
};