const db = require("../../config/db");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const winston = require("../../config/winston");
const { jwt: jwtConfig } = require("../../config/config");

const JWT_SECRET = jwtConfig.secret;

module.exports = {
    /**
     * Update/Insert POS JWT token in database
     */
    updateToken: async (companyId, serialId, productKey, token) => {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const posTokenObj = {
                companyid: companyId,
                serial_id: serialId,
                product_key: productKey,
                token: token,
                expiry: moment.unix(decoded.exp).format("YYYY-MM-DD HH:mm:ss"),
                hardware_profile: JSON.stringify(decoded.hardwareProfile || {})
            };
            
            // Remove old tokens for this POS
            await db.getResults(
                `DELETE FROM pos_jwt_tokens WHERE company_id = ? AND serial_id = ?`,
                [companyId, serialId]
            );
            
            // Insert new token
            const result = await db.insert('pos_jwt_tokens', posTokenObj);
            return result.insertId ? { success: 1, tokenId: result.insertId } : { success: 0 };
        } catch (error) {
            winston.error('Failed to update POS token:', {
                source: "posToken.model.js",
                function: "updateToken",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return { success: 0, msg: error.message };
        }
    },

    /**
     * Remove POS JWT token from database
     */
    removeToken: async (token) => {
        try {
            const result = await db.getResults(
                `DELETE FROM pos_jwt_tokens WHERE token = ?`,
                [token]
            );
            return { success: 1, removed: result.affectedRows > 0 };
        } catch (error) {
            winston.error('Failed to remove POS token:', {
                source: "posToken.model.js",
                function: "removeToken",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return { success: 0, msg: error.message };
        }
    },

    /**
     * Remove all tokens for a specific POS
     */
    removeAllPOSTokens: async (companyId, serialId) => {
        try {
            const result = await db.getResults(
                `DELETE FROM pos_jwt_tokens WHERE company_id = ? AND serial_id = ?`,
                [companyId, serialId]
            );
            return { success: 1, removed: result.affectedRows };
        } catch (error) {
            winston.error('Failed to remove POS tokens:', {
                source: "posToken.model.js",
                function: "removeAllPOSTokens",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return { success: 0, msg: error.message };
        }
    },

    /**
     * Verify if POS token exists and is valid
     */
    verifyTokenExists: async (token) => {
        try {
            const res = await db.getResults(
                `SELECT pt.*, cm.companyname 
                 FROM pos_jwt_tokens pt
                 LEFT JOIN companymaster cm ON pt.company_id = cm.companyid
                 WHERE pt.token = ? AND pt.expiry > NOW()`,
                [token]
            );
            
            if (!res || res.length === 0) {
                return { success: 0, msg: "Token not found or expired" };
            }
            
            const tokenData = res[0];
            if (tokenData.isactive === 0) {
                return { success: 0, msg: "POS is inactive" };
            }
            
            return { success: 1, data: tokenData };
        } catch (error) {
            winston.error('Failed to verify POS token:', {
                source: "posToken.model.js",
                function: "verifyTokenExists",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return { success: 0, msg: error.message };
        }
    },

    /**
     * Get all active tokens for a POS
     */
    getPOSTokens: async (companyId, serialId) => {
        try {
            const res = await db.getResults(
                `SELECT id, token, expiry, created_at, last_used 
                 FROM pos_jwt_tokens 
                 WHERE company_id = ? AND serial_id = ? AND expiry > NOW()
                 ORDER BY created_at DESC`,
                [companyId, serialId]
            );
            return { success: 1, data: res };
        } catch (error) {
            winston.error('Failed to get POS tokens:', {
                source: "posToken.model.js",
                function: "getPOSTokens",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return { success: 0, msg: error.message };
        }
    },

    /**
     * Clean up expired POS tokens
     */
    cleanupExpiredTokens: async () => {
        try {
            const result = await db.getResults(
                `DELETE FROM pos_jwt_tokens WHERE expiry < NOW()`
            );
            
            if (result.affectedRows > 0) {
                winston.info(`Cleaned up ${result.affectedRows} expired POS tokens`, {
                    source: "posToken.model.js",
                    function: "cleanupExpiredTokens"
                });
            }
            
            return { success: 1, cleaned: result.affectedRows };
        } catch (error) {
            winston.error('Failed to cleanup expired POS tokens:', {
                source: "posToken.model.js",
                function: "cleanupExpiredTokens",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return { success: 0, msg: error.message };
        }
    },

    /**
     * Update last used timestamp for a token
     */
    updateLastUsed: async (token) => {
        try {
            const result = await db.getResults(
                `UPDATE pos_jwt_tokens SET last_used = NOW() WHERE token = ?`,
                [token]
            );
            return { success: 1, updated: result.affectedRows > 0 };
        } catch (error) {
            winston.error('Failed to update last_used for POS token:', {
                source: "posToken.model.js",
                function: "updateLastUsed",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return { success: 0, msg: error.message };
        }
    },

    /**
     * Get token statistics for monitoring
     */
    getTokenStats: async () => {
        try {
            const stats = await db.getResults(`
                SELECT 
                    COUNT(*) as total_tokens,
                    COUNT(DISTINCT company_id) as unique_company,
                    COUNT(DISTINCT serial_id) as unique_devices,
                    COUNT(CASE WHEN expiry > NOW() THEN 1 END) as active_tokens,
                    COUNT(CASE WHEN expiry <= NOW() THEN 1 END) as expired_tokens,
                    COUNT(CASE WHEN last_used > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as recently_used
                FROM pos_jwt_tokens
            `);
            
            return { success: 1, data: stats[0] };
        } catch (error) {
            winston.error('Failed to get POS token stats:', {
                source: "posToken.model.js",
                function: "getTokenStats",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return { success: 0, msg: error.message };
        }
    }
};