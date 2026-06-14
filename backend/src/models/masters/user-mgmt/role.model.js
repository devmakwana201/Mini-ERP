const db = require("../../../config/db");
const moment = require("moment");
const winston = require("../../../config/winston");

// ─── Column map (new schema) ────────────────────────────────
// Table  : roles
// PK     : role_id
// name   : name
// perms  : permissions (JSON)
// soft-del: is_deleted
// audit  : created_at / updated_at / created_by / updated_by
// ────────────────────────────────────────────────────────────

module.exports = {
    /**
     * Check if role exists by name
     */
    checkRoleExists: async (name, excludeId = null) => {
        try {
            let sql = `SELECT role_id FROM roles WHERE LOWER(name) = LOWER(?) AND is_deleted = 0`;
            const params = [name];

            if (excludeId) {
                sql += ` AND role_id != ?`;
                params.push(excludeId);
            }

            const res = await db.getResults(sql, params);
            return res && res.length > 0;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get roles with pagination and filtering
     */
    getRoles: async (req) => {
        const { start = 0, length = 10, filters, sortField = "role_id", sortOrder = "desc" } = req.query;

        let sql = `
            SELECT role_id, name, permissions,
                   created_by, created_at, updated_by, updated_at, is_deleted
            FROM roles
            WHERE is_deleted = 0
        `;

        const params = [];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "role.model.js",
                    function: "getRoles",
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        const roleName = getFilterValue("name");
        if (roleName) {
            sql += ` AND name LIKE ?`;
            params.push(`%${roleName}%`);
        }

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND name LIKE ?`;
            params.push(`%${global}%`);
        }

        // Sorting
        const allowedSort = ["role_id", "name", "created_at"];
        const safeSort = allowedSort.includes(sortField) ? sortField : "role_id";
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
        let countSql = `SELECT COUNT(*) as total FROM roles WHERE is_deleted = 0`;
        const countParams = [];

        if (roleName) {
            countSql += ` AND name LIKE ?`;
            countParams.push(`%${roleName}%`);
        }

        if (global) {
            countSql += ` AND name LIKE ?`;
            countParams.push(`%${global}%`);
        }

        const totalResult = await db.getResults(countSql, countParams);
        const totalRecords = totalResult[0]?.total || 0;
        const totalPages = Math.ceil(totalRecords / (lengthNum || 1));

        return {
            data,
            pagination: {
                start: startNum,
                length: lengthNum,
                total: totalRecords,
                totalPages,
            },
        };
    },

    /**
     * Get role data by ID
     */
    getData: async (id) => {
        const sql = `
            SELECT role_id, name, permissions,
                   created_by, created_at, updated_by, updated_at
            FROM roles
            WHERE role_id = ? AND is_deleted = 0
        `;
        const results = await db.getResults(sql, [id]);
        if (results.length === 0) return [];
        return results;
    },

    /**
     * Create new role
     */
    create: async (data) => {
        try {
            data.created_at = moment().format("YYYY-MM-DD HH:mm:ss");
            data.updated_at = moment().format("YYYY-MM-DD HH:mm:ss");
            data.is_deleted = 0;

            // Ensure permissions is stored as JSON string if passed as object
            if (data.permissions && typeof data.permissions === "object") {
                data.permissions = JSON.stringify(data.permissions);
            }

            const result = await db.insert("roles", data);
            if (!result.insertId) {
                return { status: 500, success: 0, msg: "Failed to create role" };
            }

            return {
                status: 201,
                success: 1,
                msg: "Role created successfully",
                data: { role_id: result.insertId, ...data },
            };
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY") {
                return { status: 409, success: 0, msg: "Role with this name already exists" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Update role
     */
    update: async (id, data) => {
        try {
            data.updated_at = moment().format("YYYY-MM-DD HH:mm:ss");

            if (data.permissions && typeof data.permissions === "object") {
                data.permissions = JSON.stringify(data.permissions);
            }

            const result = await db.update(
                "roles",
                Object.keys(data).map((key) => ({ column: key, value: data[key] })),
                [{ column: "role_id", value: id }, { column: "is_deleted", value: 0 }]
            );
            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "Role not found" };
            }

            return {
                status: 200,
                success: 1,
                msg: "Role updated successfully",
                data: { role_id: id, ...data },
            };
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY") {
                return { status: 409, success: 0, msg: "Role name already exists" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Soft delete role
     */
    delete: async (id, data) => {
        try {
            const result = await db.update(
                "roles",
                Object.keys(data).map((key) => ({ column: key, value: data[key] })),
                [{ column: "role_id", value: id }]
            );
            if (!result.affectedRows) {
                return { status: 500, success: 0, msg: "Role not found" };
            }
            return { status: 200, success: 1, msg: "Role deleted successfully" };
        } catch (error) {
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Get all roles for dropdown
     */
    getAllRoles: async () => {
        try {
            const sql = `
                SELECT role_id, name, permissions
                FROM roles
                WHERE is_deleted = 0
                ORDER BY name ASC
            `;
            return await db.getResults(sql);
        } catch (error) {
            winston.error(`Error getting all roles: ${error.message}`, {
                source: "role.model.js",
                function: "getAllRoles",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            return [];
        }
    },
};