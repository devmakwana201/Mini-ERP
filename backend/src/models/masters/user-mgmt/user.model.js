const db = require("../../../config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const moment = require("moment");
const winston = require("../../../config/winston");
const { jwt: jwtConfig, server, security } = require("../../../config/config");
const { verifyPassword, hashPassword } = require("../../../utils/passwordVerify.utils");
const JWT_SECRET = jwtConfig.secret;

module.exports = {
    /**
     * Find user by email and verify password
     */
    findUser: async (email, password) => {
        try {
            let res = await db.getResults(
                `SELECT user_id AS userId, name AS userName, name AS firstName, '' AS lastName, email, password_hash AS password FROM users WHERE LOWER(email) = LOWER(?) AND is_deleted = 0`,
                [email]
            );
            if (!res?.length) return { success: 0, msg: "User not found" };
            
            const user = res[0];
            if (!user.password?.length) return { success: 0, msg: "Invalid Authentication" };

            const isMatch = await verifyPassword(password, user.password);
            if (!isMatch) return { success: 0, msg: "Invalid Authentication" };
            
            return { success: 1, data: user };
        } catch (error) {
            return { success: 0, msg: error.message, error: error.message };
        }
    },

    /**
     * Check if user exists by email
     */
    checkUserExists: async (email) => {
        try {
            const res = await db.getResults(
                `SELECT user_id FROM users WHERE LOWER(email) = LOWER(?) AND is_deleted = 0`,
                [email]
            );
            return res && res.length > 0;
        } catch (error) {
            return false;
        }
    },

    /**
     * Remove JWT token from database
     */
    removeToken: async (token) => {
        await db.getResults(`DELETE FROM user_jwt_tokens WHERE token = ?`, [token]);
    },

    /**
     * Update/Insert JWT token in database
     */
    updateToken: async (userId, token) => {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const userTokenObj = {
                userid: userId,
                token: token,
                expiry: moment.unix(decoded.exp).format("YYYY-MM-DD HH:mm:ss"),
            };
            
            // Insert new token
            const result = await db.insert('user_jwt_tokens', userTokenObj);
            return result.affectedRows ? { success: 1 } : { success: 0 };
        } catch (error) {
            return { success: 0, msg: error.message };
        }
    },

    /**
     * Save user login logs
     */
    saveLogs: async (ip, userId, userAgent = null) => {
        try {
            const logObj = {
                userid: userId,
                login: moment().format("YYYY-MM-DD HH:mm:ss"),
                ip: ip,
                userAgent: userAgent,
            };
            const result = await db.insert('logmst', logObj);
            return result.insertId ? { success: 1 } : { success: 0 };
        } catch (error) {
            return { success: 0, msg: error.message };
        }
    },

    /**
     * Update logout time in logs
     */
    updateLogs: async (userId) => {
        try {
            await db.getResults(
                `UPDATE logmst SET logOut = ? WHERE userid = ? ORDER BY logId DESC LIMIT 1`,
                [moment().format("YYYY-MM-DD HH:mm:ss"), userId]
            );
        } catch (error) {
            winston.error(`Error updating logout logs: ${error.message}`, {
                source: "user.model.js",
                function: "updateLogs",
                error: error.message,
                userId: userId
            });
        }
    },

    /**
     * Get users with pagination and filtering
     */
    getUsers: async (req) => {
        const { start = 0, length = 10, filters, sortField = 'user_id', sortOrder = 'desc' } = req.query;

        let sql = `
            SELECT user_id AS userid, name AS username, name AS firstname, '' AS lastname, email, created_by AS createdby, created_at AS createddate, updated_by AS modifedby, updated_at AS modifieddate, is_deleted AS isdeleted
            FROM users
            WHERE is_deleted = 0
        `;

        const params = [];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "user.model.js",
                    function: "getUsers",
                    error: err.message
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Apply filters
        const username = getFilterValue('username');
        if (username) {
            sql += ` AND name LIKE ?`;
            params.push(`%${username}%`);
        }
        const firstname = getFilterValue('firstname');
        if (firstname) {
            sql += ` AND name LIKE ?`;
            params.push(`%${firstname}%`);
        }
        const lastname = getFilterValue('lastname');
        if (lastname) {
            sql += ` AND name LIKE ?`;
            params.push(`%${lastname}%`);
        }
        const email = getFilterValue('email');
        if (email) {
            sql += ` AND email LIKE ?`;
            params.push(`%${email}%`);
        }

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (name LIKE ? OR email LIKE ?)`;
            const g = `%${global}%`;
            params.push(g, g);
        }

        // Sorting map
        let orderField = 'user_id';
        if (sortField === 'username' || sortField === 'firstname') {
            orderField = 'name';
        } else if (sortField === 'email') {
            orderField = 'email';
        } else if (sortField === 'createddate') {
            orderField = 'created_at';
        }

        const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ${orderField} ${order}`;

        // Pagination using start and length
        const startNum = parseInt(start);
        const lengthNum = parseInt(length);
        
        if (lengthNum !== -1) {
            sql += ` LIMIT ?, ?`;
            params.push(startNum, lengthNum);
        }

        const data = await db.getResults(sql, params);

        // Count total records
        let countSql = `SELECT COUNT(*) as total FROM users WHERE is_deleted = 0`;
        let countParams = [];

        // Apply same filters for count
        if (username) {
            countSql += ` AND name LIKE ?`;
            countParams.push(`%${username}%`);
        }
        if (firstname) {
            countSql += ` AND name LIKE ?`;
            countParams.push(`%${firstname}%`);
        }
        if (lastname) {
            countSql += ` AND name LIKE ?`;
            countParams.push(`%${lastname}%`);
        }
        if (email) {
            countSql += ` AND email LIKE ?`;
            countParams.push(`%${email}%`);
        }

        if (global) {
            countSql += ` AND (name LIKE ? OR email LIKE ?)`;
            const g = `%${global}%`;
            countParams.push(g, g);
        }

        const totalResult = await db.getResults(countSql, countParams);
        const totalRecords = totalResult[0]?.total || 0;

        return {
            data,
            pagination: {
                start: startNum,
                length: lengthNum,
                total: totalRecords,
                recordsFiltered: totalRecords
            }
        };
    },

    /**
     * Get user data by ID
     */
    getData: async (id) => {
        const sql = `SELECT user_id AS userid, name AS username, name AS firstname, '' AS lastname, email
            FROM users WHERE user_id = ? AND is_deleted = 0`;
        const results = await db.getResults(sql, [id]);

        if (results.length === 0) return [];

        return [results[0]];
    },

    /**
     * Create new user
     */
    create: async (data) => {
        try {
            // Hash password if provided
            let hashedPassword = data.password;
            if (data.password && !data.password.startsWith('$2b$')) {
                hashedPassword = await hashPassword(data.password, security.bcryptRounds);
            }
            
            const dbData = {
                role_id: 2, // Default: Sales User
                name: `${data.firstname || ''} ${data.lastname || ''}`.trim() || data.username,
                email: data.email.toLowerCase(),
                password_hash: hashedPassword,
                status: 'active',
                is_deleted: 0,
                created_by: data.createdby || null,
                created_at: data.createddate || moment().format("YYYY-MM-DD HH:mm:ss"),
                updated_by: data.modifedby || null,
                updated_at: data.modifieddate || moment().format("YYYY-MM-DD HH:mm:ss")
            };
            
            const result = await db.insert('users', dbData);
            if (!result.insertId) {
                return { status: 500, success: 0, msg: "Failed to create user" };
            }
            
            return { 
                status: 201, 
                success: 1, 
                msg: "User created successfully",
                data: { userId: result.insertId, ...data }
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { status: 409, success: 0, msg: "User with this email already exists" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Update user
     */
    update: async (id, data) => {
        try {
            const dbUpdates = {};
            if (data.firstname !== undefined || data.lastname !== undefined || data.username !== undefined) {
                const name = `${data.firstname || ''} ${data.lastname || ''}`.trim() || data.username;
                if (name) dbUpdates.name = name;
            }
            if (data.email !== undefined) dbUpdates.email = data.email.toLowerCase();
            if (data.password !== undefined) {
                let hashedPassword = data.password;
                if (!data.password.startsWith('$2b$')) {
                    hashedPassword = await hashPassword(data.password, security.bcryptRounds);
                }
                dbUpdates.password_hash = hashedPassword;
            }
            if (data.modifedby !== undefined) dbUpdates.updated_by = data.modifedby;
            dbUpdates.updated_at = data.modifieddate || moment().format("YYYY-MM-DD HH:mm:ss");
            
            const result = await db.update('users', 
                Object.keys(dbUpdates).map(key => ({ column: key, value: dbUpdates[key] })),
                [{ column: 'user_id', value: id }, { column: 'is_deleted', value: 0 }]
            );
            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "User not found" };
            }
            
            return { 
                status: 200, 
                success: 1, 
                msg: "User updated successfully",
                data: { userId: id, ...data }
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { status: 409, success: 0, msg: "Email already exists" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Soft delete user
     */
    delete: async (id, data) => {
        try {
            const dbUpdates = {
                is_deleted: 1,
                updated_by: data.modifedby,
                updated_at: data.modifieddate || moment().format("YYYY-MM-DD HH:mm:ss")
            };
            const result = await db.update('users', 
                Object.keys(dbUpdates).map(key => ({ column: key, value: dbUpdates[key] })),
                [{ column: 'user_id', value: id }]
            );
            if (!result.affectedRows) {
                return { status: 500, success: 0, msg: "User not found" };
            }
            return { status: 200, success: 1, msg: "User deleted successfully" };
        } catch (error) {
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Save password reset token
     */
    savePasswordResetToken: async (email, token) => {
        try {
            const expiry = moment().add(1, 'hour').format("YYYY-MM-DD HH:mm:ss");
            
            // Remove any existing reset tokens for this email
            await db.getResults(`DELETE FROM password_reset_tokens WHERE email = ?`, [email]);
            
            // Insert new reset token
            const result = await db.insert('password_reset_tokens', {
                email: email,
                token: token,
                expiry: expiry,
                created_at: moment().format("YYYY-MM-DD HH:mm:ss")
            });
            
            return result.affectedRows > 0;
        } catch (error) {
            winston.error(`Error saving password reset token: ${error.message}`, {
                source: "user.model.js",
                function: "savePasswordResetToken",
                error: error.message,
                email: email
            });
            return false;
        }
    },

    /**
     * Verify password reset token from database
     */
    verifyPasswordResetToken: async (token) => {
        try {
            const result = await db.getResults(
                `SELECT email, expiry FROM password_reset_tokens WHERE token = ? AND expiry > NOW()`,
                [token]
            );
            
            if (result.length === 0) {
                return null;
            }
            
            return {
                email: result[0].email,
                expiry: result[0].expiry
            };
        } catch (error) {
            winston.error(`Error verifying password reset token: ${error.message}`, {
                source: "user.model.js",
                function: "verifyPasswordResetToken",
                error: error.message,
                token: token
            });
            return null;
        }
    },

    /**
     * Clear password reset token
     */
    clearPasswordResetToken: async (email) => {
        try {
            await db.getResults(`DELETE FROM password_reset_tokens WHERE email = ?`, [email]);
            return true;
        } catch (error) {
            winston.error(`Error clearing password reset token: ${error.message}`, {
                source: "user.model.js",
                function: "clearPasswordResetToken",
                error: error.message,
                email: email
            });
            return false;
        }
    },

    /**
     * Update password by email
     */
    updatePassword: async (email, newPassword) => {
        try {
            const hashedPassword = await hashPassword(newPassword, security.bcryptRounds);
            const result = await db.getResults(
                `UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ? AND is_deleted = 0`,
                [hashedPassword, moment().format("YYYY-MM-DD HH:mm:ss"), email]
            );
            
            return { success: result.affectedRows > 0 };
        } catch (error) {
            return { success: false, msg: error.message };
        }
    },

    /**
     * Update password by user ID
     */
    updatePasswordById: async (userId, newPassword) => {
        try {
            const hashedPassword = await hashPassword(newPassword, security.bcryptRounds);
            const result = await db.getResults(
                `UPDATE users SET password_hash = ?, updated_at = ? WHERE user_id = ? AND is_deleted = 0`,
                [hashedPassword, moment().format("YYYY-MM-DD HH:mm:ss"), userId]
            );
            
            return { success: result.affectedRows > 0 };
        } catch (error) {
            return { success: false, msg: error.message };
        }
    },

    /**
     * Verify current password for user
     */
    verifyPassword: async (userId, currentPassword) => {
        try {
            const result = await db.getResults(
                `SELECT password_hash AS password FROM users WHERE user_id = ? AND is_deleted = 0`,
                [userId]
            );
            
            if (!result || result.length === 0) {
                return false;
            }
            
            const user = result[0];
            return await verifyPassword(currentPassword, user.password);
        } catch (error) {
            winston.error(`Error verifying password: ${error.message}`, {
                source: "user.model.js",
                function: "verifyPassword",
                error: error.message,
                userId: userId
            });
            return false;
        }
    },

    /**
     * Self-service signup
     */
    signupUser: async ({ username, email, password }) => {
        try {
            const existingEmail = await db.getResults(
                `SELECT user_id FROM users WHERE LOWER(email) = LOWER(?) AND is_deleted = 0`,
                [email]
            );
            if (existingEmail && existingEmail.length > 0) {
                return { success: 0, status: 409, msg: `Email '${email}' is already registered.` };
            }

            const hashedPassword = await hashPassword(password, security.bcryptRounds);

            const now = moment().format("YYYY-MM-DD HH:mm:ss");
            const result = await db.insert('users', {
                role_id: 2,
                name: username,
                email: email.toLowerCase(),
                password_hash: hashedPassword,
                status: 'active',
                is_deleted: 0,
                created_at: now,
                updated_at: now,
            });

            if (!result || !result.insertId) {
                return { success: 0, status: 500, msg: 'Failed to create account.' };
            }

            return {
                success: 1,
                status: 201,
                msg: 'Account created successfully!',
                data: { userId: result.insertId, username, email },
            };
        } catch (error) {
            winston.error(`Error in signupUser: ${error.message}`, {
                source: 'user.model.js',
                function: 'signupUser',
                error: error.message
            });
            return { success: 0, status: 500, msg: error.message || 'Failed to create account.' };
        }
    },
};