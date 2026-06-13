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
                `SELECT userid AS userId, username AS userName, firstname AS firstName, lastname as lastName, email, password FROM usermaster WHERE LOWER(email) = LOWER(?) and isdeleted=0`,
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
                `SELECT userid FROM usermaster WHERE LOWER(email) = LOWER(?) AND isdeleted = 0`,
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
            
            // Remove old tokens for this user
            // await db.getResults(`DELETE FROM user_jwt_tokens WHERE userid = ?`, [userId]);
            
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
                `UPDATE logmst SET logOut = ? WHERE userId = ? ORDER BY logId DESC LIMIT 1`,
                [moment().format("YYYY-MM-DD HH:mm:ss"), userId]
            );
        } catch (error) {
            winston.error(`Error updating logout logs: ${error.message}`, {
                source: "user.model.js",
                function: "updateLogs",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                userId: userId
            });
        }
    },

    /**
     * Get users with pagination and filtering
     */
    getUsers: async (req) => {
        const { start = 0, length = 10, filters, sortField = 'userid', sortOrder = 'desc' } = req.query;

        let sql = `
            SELECT userid, username, firstname, lastname, email, createdby, createddate, modifedby, modifieddate, isdeleted, ipaddress
            FROM usermaster
            WHERE isdeleted = 0
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
        const filterFields = ['username', 'firstname', 'lastname', 'email'];
        filterFields.forEach(field => {
            const value = getFilterValue(field);
            if (value) {
                sql += ` AND ${field} LIKE ?`;
                params.push(`%${value}%`);
            }
        });

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (username LIKE ? OR firstname LIKE ? OR lastname LIKE ? OR email LIKE ?)`;
            const g = `%${global}%`;
            params.push(g, g, g, g);
        }

        // Sorting
        const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ${sortField} ${order}`;

        // Pagination using start and length
        const startNum = parseInt(start);
        const lengthNum = parseInt(length);
        
        if (lengthNum !== -1) {
            sql += ` LIMIT ?, ?`;
            params.push(startNum, lengthNum);
        }

        const data = await db.getResults(sql, params);

        // Count total records
        let countSql = `SELECT COUNT(*) as total FROM usermaster WHERE isdeleted = 0`;
        let countParams = [];

        // Apply same filters for count
        filterFields.forEach(field => {
            const value = getFilterValue(field);
            if (value) {
                countSql += ` AND ${field} LIKE ?`;
                countParams.push(`%${value}%`);
            }
        });

        if (global) {
            countSql += ` AND (username LIKE ? OR firstname LIKE ? OR lastname LIKE ? OR email LIKE ?)`;
            const g = `%${global}%`;
            countParams.push(g, g, g, g);
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
        const sql = `SELECT um.userid,um.username,um.firstname,um.lastname,um.email
            FROM usermaster um WHERE um.userid = ? AND um.isdeleted = 0`;
        const results = await db.getResults(sql, [id]);

        if (results.length === 0) return [];

        const user = results[0];
        const BASE_URL = `${server.baseUrl}:${server.port}`;
        // if (user.profilepic) {
        //     user.profilepic = `${BASE_URL}${user.profilepic}`;
        // }

        return [user];
    },

    /**
     * Create new user
     */
    create: async (data) => {
        try {
            // Hash password if provided
            if (data.password) {
                data.password = await hashPassword(data.password, security.bcryptRounds);
            }
            
            // Add timestamps
            data.createddate = moment().format("YYYY-MM-DD HH:mm:ss");
            data.modifieddate = moment().format("YYYY-MM-DD HH:mm:ss");
            
            const result = await db.insert('usermaster', data);
            if (!result.insertId) {
                return { status: 500, success: 0, msg: "Failed to create user" };
            }
            
            // Remove password from response data
            const responseData = { ...data };
            delete responseData.password;
            
            return { 
                status: 201, 
                success: 1, 
                msg: "User created successfully",
                data: { userId: result.insertId, ...responseData }
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
            // Hash password if provided
            if (data.password) {
                data.password = await hashPassword(data.password, security.bcryptRounds);
            }
            
            // Add modified timestamp
            data.modifieddate = moment().format("YYYY-MM-DD HH:mm:ss");
            
            const result = await db.update('usermaster', 
                Object.keys(data).map(key => ({ column: key, value: data[key] })),
                [{ column: 'userid', value: id }, { column: 'isdeleted', value: 0 }]
            );
            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "User not found" };
            }
            
            // Remove password from response data
            const responseData = { ...data };
            delete responseData.password;
            
            return { 
                status: 200, 
                success: 1, 
                msg: "User updated successfully",
                data: { userId: id, ...responseData }
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
            const result = await db.update('usermaster', 
                Object.keys(data).map(key => ({ column: key, value: data[key] })),
                [{ column: 'userid', value: id }]
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
                code: error.code,
                errno: error.errno,
                stack: error.stack,
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
                return null; // Token not found or expired
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
                code: error.code,
                errno: error.errno,
                stack: error.stack,
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
                code: error.code,
                errno: error.errno,
                stack: error.stack,
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
                `UPDATE usermaster SET password = ?, modifieddate = ? WHERE email = ? AND isdeleted = 0`,
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
                `UPDATE usermaster SET password = ?, modifieddate = ? WHERE userid = ? AND isdeleted = 0`,
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
                `SELECT password FROM usermaster WHERE userid = ? AND isdeleted = 0`,
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
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                userId: userId
            });
            return false;
        }
    },
};