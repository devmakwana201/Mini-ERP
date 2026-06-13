const jwt = require("jsonwebtoken");
const config = require("../config/config");

const JWT_SECRET = config.jwt.secret;
const JWT_REFRESH_SECRET = config.jwt.refreshSecret;
const JWT_EXPIRES_IN = config.jwt.expiresIn;
const JWT_REFRESH_EXPIRES_IN = config.jwt.refreshExpiresIn;

/**
 * Generate access token
 */
const generateToken = (data) => {
    return jwt.sign(data, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (data) => {
    return jwt.sign(data, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
};

/**
 * Verify access token
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * Generate password reset token (Database-based approach)
 */
const generatePasswordResetToken = (email) => {
    // Generate a secure random token instead of JWT
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Verify password reset token (Database-based approach)
 * Note: This now just returns the token for database lookup
 */
const verifyPasswordResetToken = (token) => {
    // For database-based tokens, just return the token
    // The actual verification happens in the database
    return token;
};

/**
 * Decode token without verification
 */
const decodeToken = (token) => {
    return jwt.decode(token);
};

/**
 * Check if token is expired
 */
const isTokenExpired = (token) => {
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

module.exports = {
    generateToken,
    generateRefreshToken,
    verifyToken,
    verifyRefreshToken,
    generatePasswordResetToken,
    verifyPasswordResetToken,
    decodeToken,
    isTokenExpired,
};