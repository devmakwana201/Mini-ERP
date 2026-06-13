const bcrypt = require("bcrypt");
const crypto = require("crypto");
const winston = require("../config/winston");

/**
 * Verifies passwords that may be hashed using either MD5 (from PHP) or bcrypt (Node.js)
 * MD5 hashes are typically 32 characters hex string
 * Bcrypt hashes start with $2a$, $2b$, or $2y$
 */
const verifyPassword = async (plainPassword, hashedPassword) => {
    try {
        // Check if it's a bcrypt hash (starts with $2)
        if (hashedPassword && hashedPassword.startsWith('$2')) {
            return await bcrypt.compare(plainPassword, hashedPassword);
        }
        
        // Assume it's an MD5 hash (32 character hex string)
        // Create MD5 hash of the plain password and compare
        const md5Hash = crypto.createHash('md5').update(plainPassword).digest('hex');
        return md5Hash === hashedPassword;
        
    } catch (error) {
        winston.error(`Error verifying password: ${error.message}`, {
            source: "passwordVerify.utils.js",
            function: "verifyPassword",
            error: error.message,
            code: error.code,
            errno: error.errno,
            stack: error.stack
        });
        return false;
    }
};

/**
 * Hashes a password using bcrypt for new passwords
 * This should be used for all new password creation/updates
 */
const hashPassword = async (plainPassword, rounds = 10) => {
    return await bcrypt.hash(plainPassword, rounds);
};

/**
 * Creates MD5 hash (for comparison with legacy passwords only)
 * WARNING: MD5 is not secure for password storage, use only for verification
 */
const createMD5Hash = (plainPassword) => {
    return crypto.createHash('md5').update(plainPassword).digest('hex');
};

/**
 * Checks if a hash is MD5 (32 character hex string)
 */
const isMD5Hash = (hash) => {
    return hash && /^[a-f0-9]{32}$/i.test(hash);
};

/**
 * Checks if a hash is bcrypt
 */
const isBcryptHash = (hash) => {
    return hash && hash.startsWith('$2');
};

module.exports = {
    verifyPassword,
    hashPassword,
    createMD5Hash,
    isMD5Hash,
    isBcryptHash
};