const db = require("../../../config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const moment = require("moment");
const winston = require("../../../config/winston");
const { jwt: jwtConfig, server, security } = require("../../../config/config");
const { verifyPassword, hashPassword } = require("../../../utils/passwordVerify.utils");
const JWT_SECRET = jwtConfig.secret;

// ─── Column map (new schema) ────────────────────────────────
// Table  : users
// PK     : user_id
// login  : email  (no separate username column)
// display: name
// pwd    : password_hash
// soft-del: is_deleted
// audit  : created_at / updated_at / created_by / updated_by
// ────────────────────────────────────────────────────────────

module.exports = {
    /**
     * Find user by email and verify password
     */
    findUser: async (email, password) => {
        try {
            const res = await db.getResults(
                `SELECT user_id AS userId, name AS userName, name AS firstName, '' AS lastName,
                        email, password_hash AS password
                 FROM users
                 WHERE LOWER(email) = LOWER(?) AND is_deleted = 0`,
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
        try {
            await db.getResults(`DELETE FROM user_jwt_tokens WHERE token = ?`, [token]);
        } catch (error) {
            winston.warn("removeToken: failed", { error: error.message });
        }
    },

    /**
     * Update/Insert JWT token in database
     */
    updateToken: async (userId, token) => {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const expiry = moment.unix(decoded.exp).format("YYYY-MM-DD HH:mm:ss");
            
            // Remove old tokens for this user (single active session)
            await db.getResults(`DELETE FROM user_jwt_tokens WHERE userid = ?`, [userId]);
            
            // Insert new token — table uses 'userid' column (not 'user_id')
            const result = await db.insert("user_jwt_tokens", {
                userid: userId,
                token: token,
                expiry: expiry,
            });
            return result.affectedRows ? { success: 1 } : { success: 1 };
        } catch (error) {
            winston.warn("updateToken: could not save JWT token", {
                error: error.message,
                userId
            });
            return { success: 1 }; // Don't block login if token table has issues
        }
    },

    /**
     * Save user login log
     */
    saveLogs: async (ip, userId, userAgent = null) => {
        try {
            const result = await db.insert("login_logs", {
                user_id: userId,
                login_at: moment().format("YYYY-MM-DD HH:mm:ss"),
                ip_address: ip,
                user_agent: userAgent,
            });
            return result.insertId ? { success: 1 } : { success: 0 };
        } catch (error) {
            winston.warn("saveLogs: skipped (table may not exist yet)", { error: error.message });
            return { success: 0, msg: error.message };
        }
    },

    /**
     * Update logout time in login logs
     */
    updateLogs: async (userId) => {
        try {
            await db.getResults(
                `UPDATE login_logs SET logout_at = ? WHERE user_id = ? ORDER BY log_id DESC LIMIT 1`,
                [moment().format("YYYY-MM-DD HH:mm:ss"), userId]
            );
        } catch (error) {
            winston.warn("updateLogs: skipped (table may not exist yet)", { error: error.message });
        }
    },

    /**
     * Get users with pagination and filtering
     */
    getUsers: async (req) => {
        const { start = 0, length = 10, filters, sortField = "user_id", sortOrder = "desc" } = req.query;

        let sql = `
            SELECT user_id, name, email, role_id, status,
                   created_by, created_at, updated_by, updated_at, is_deleted
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
                    error: err.message,
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Apply filters
        const filterFields = ["name", "email"];
        filterFields.forEach((field) => {
            const value = getFilterValue(field);
            if (value) {
                sql += ` AND ${field} LIKE ?`;
                params.push(`%${value}%`);
            }
        });

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (name LIKE ? OR email LIKE ?)`;
            const g = `%${global}%`;
            params.push(g, g);
        }

        // Sorting
        const allowedSort = ["user_id", "name", "email", "created_at", "status"];
        const safeSort = allowedSort.includes(sortField) ? sortField : "user_id";
        const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";
        sql += ` ORDER BY ${safeSort} ${order}`;

        // Pagination
        const startNum = parseInt(start);
        const lengthNum = parseInt(length);

        if (lengthNum !== -1) {
            sql += ` LIMIT ?, ?`;
            params.push(startNum, lengthNum);
        }

        const data = await db.getResults(sql, params);

        // Count total records
        let countSql = `SELECT COUNT(*) as total FROM users WHERE is_deleted = 0`;
        const countParams = [];

        filterFields.forEach((field) => {
            const value = getFilterValue(field);
            if (value) {
                countSql += ` AND ${field} LIKE ?`;
                countParams.push(`%${value}%`);
            }
        });

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
                recordsFiltered: totalRecords,
            },
        };
    },

    /**
     * Get user data by ID
     */
    getData: async (id) => {
        const sql = `
            SELECT user_id, name, email, role_id, status
            FROM users
            WHERE user_id = ? AND is_deleted = 0
        `;
        const results = await db.getResults(sql, [id]);
        if (results.length === 0) return [];
        return results;
    },

    /**
     * Create new user
     */
    create: async (data) => {
        try {
            if (data.password) {
                data.password_hash = await hashPassword(data.password, security.bcryptRounds);
                delete data.password;
            }

            data.created_at = moment().format("YYYY-MM-DD HH:mm:ss");
            data.updated_at = moment().format("YYYY-MM-DD HH:mm:ss");
            data.is_deleted = 0;

            const result = await db.insert("users", data);
            if (!result.insertId) {
                return { status: 500, success: 0, msg: "Failed to create user" };
            }

            const responseData = { ...data };
            delete responseData.password_hash;

            return {
                status: 201,
                success: 1,
                msg: "User created successfully",
                data: { userId: result.insertId, ...responseData },
            };
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY") {
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
            if (data.password) {
                data.password_hash = await hashPassword(data.password, security.bcryptRounds);
                delete data.password;
            }

            data.updated_at = moment().format("YYYY-MM-DD HH:mm:ss");

            const result = await db.update(
                "users",
                Object.keys(data).map((key) => ({ column: key, value: data[key] })),
                [{ column: "user_id", value: id }, { column: "is_deleted", value: 0 }]
            );
            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "User not found" };
            }

            const responseData = { ...data };
            delete responseData.password_hash;

            return {
                status: 200,
                success: 1,
                msg: "User updated successfully",
                data: { userId: id, ...responseData },
            };
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY") {
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
            const result = await db.update(
                "users",
                Object.keys(data).map((key) => ({ column: key, value: data[key] })),
                [{ column: "user_id", value: id }]
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
            const expiry = moment().add(1, "hour").format("YYYY-MM-DD HH:mm:ss");
            await db.getResults(`DELETE FROM password_reset_tokens WHERE email = ?`, [email]);
            const result = await db.insert("password_reset_tokens", {
                email: email,
                token: token,
                expiry: expiry,
                created_at: moment().format("YYYY-MM-DD HH:mm:ss"),
            });
            return result.affectedRows > 0;
        } catch (error) {
            winston.error(`Error saving password reset token: ${error.message}`, {
                source: "user.model.js",
                function: "savePasswordResetToken",
                error: error.message,
                code: error.code,
            });
            return false;
        }
    },

    /**
     * Verify password reset token
     */
    verifyPasswordResetToken: async (token) => {
        try {
            const result = await db.getResults(
                `SELECT email, expiry FROM password_reset_tokens WHERE token = ? AND expiry > NOW()`,
                [token]
            );
            if (result.length === 0) return null;
            return { email: result[0].email, expiry: result[0].expiry };
        } catch (error) {
            winston.error(`Error verifying password reset token: ${error.message}`, {
                source: "user.model.js",
                function: "verifyPasswordResetToken",
                error: error.message,
                code: error.code,
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
                `SELECT password_hash FROM users WHERE user_id = ? AND is_deleted = 0`,
                [userId]
            );
            if (!result || result.length === 0) return false;
            return await verifyPassword(currentPassword, result[0].password_hash);
        } catch (error) {
            winston.error(`Error verifying password: ${error.message}`, {
                source: "user.model.js",
                function: "verifyPassword",
                error: error.message,
                code: error.code,
                userId: userId,
            });
            return false;
        }
    },

    /**
     * Self-service signup
     * @param {object} data - { username, email, password }
     *   username → stored as `name` (the users table has no separate username column)
     */
    signupUser: async ({ username, email, password }) => {
        try {
            // 1. Check name uniqueness (replaces old username check)
            const existingName = await db.getResults(
                `SELECT user_id FROM users WHERE LOWER(name) = LOWER(?) AND is_deleted = 0`,
                [username]
            );
            if (existingName && existingName.length > 0) {
                return {
                    success: 0,
                    status: 409,
                    msg: `Login ID '${username}' is already taken. Please choose a different one.`,
                };
            }

            // 2. Check email uniqueness
            const existingEmail = await db.getResults(
                `SELECT user_id FROM users WHERE LOWER(email) = LOWER(?) AND is_deleted = 0`,
                [email]
            );
            if (existingEmail && existingEmail.length > 0) {
                return {
                    success: 0,
                    status: 409,
                    msg: `Email '${email}' is already registered. Please use a different email or login.`,
                };
            }

            // 3. Resolve a default role_id (role_id is NOT NULL in schema)
            //    Use the first available role, or fall back to 1.
            let defaultRoleId = 1;
            try {
                const roleRows = await db.getResults(
                    `SELECT role_id FROM roles WHERE is_deleted = 0 ORDER BY role_id ASC LIMIT 1`
                );
                if (roleRows && roleRows.length > 0) defaultRoleId = roleRows[0].role_id;
            } catch (_) { /* leave as 1 if roles table doesn't exist yet */ }

            // 4. Hash password
            const hashedPassword = await hashPassword(password, security.bcryptRounds);

            // 5. Insert user
            const now = moment().format("YYYY-MM-DD HH:mm:ss");
            const result = await db.insert("users", {
                role_id: defaultRoleId,
                name: username,          // username field → name column
                email: email.toLowerCase(),
                password_hash: hashedPassword,
                status: "active",
                is_deleted: 0,
                created_at: now,
                updated_at: now,
            });

            if (!result || !result.insertId) {
                return { success: 0, status: 500, msg: "Failed to create account. Please try again." };
            }

            winston.info("New user signed up successfully", {
                source: "user.model.js",
                function: "signupUser",
                userId: result.insertId,
                username,
                email,
            });

            return {
                success: 1,
                status: 201,
                msg: "Account created successfully! You can now log in.",
                data: { userId: result.insertId, username, email },
            };
        } catch (error) {
            winston.error(`Error in signupUser: ${error.message}`, {
                source: "user.model.js",
                function: "signupUser",
                error: error.message,
                code: error.code,
                stack: error.stack,
            });
            if (error.code === "ER_DUP_ENTRY") {
                return { success: 0, status: 409, msg: "A user with this Login ID or Email already exists." };
            }
            return { success: 0, status: 500, msg: error.message || "Failed to create account." };
        }
    },
};