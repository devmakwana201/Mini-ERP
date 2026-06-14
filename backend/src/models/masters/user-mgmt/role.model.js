const db = require("../../../config/db");
const moment = require("moment");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Check if role exists by name
     */
    checkRoleExists: async (rolename, excludeId = null) => {
        try {
            let sql = `SELECT role_id AS roleid FROM roles WHERE LOWER(name) = LOWER(?) AND is_deleted = 0`;
            const params = [rolename];
            
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
        const { start = 1, length = 10, filters, sortField = 'roleid', sortOrder = 'desc' } = req.query;

        let sql = `
            SELECT role_id AS roleid, name AS rolename, '1' AS type,
                   created_by AS createdby, created_at AS createddate, updated_by AS modifedby, updated_at AS modifeddate, is_deleted AS isdeleted
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
                    function: "getRoles"
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Apply filters
        const rolename = getFilterValue("rolename");
        if (rolename) {
            sql += ` AND name LIKE ?`;
            params.push(`%${rolename}%`);
        }

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND name LIKE ?`;
            const g = `%${global}%`;
            params.push(g);
        }

        // Sorting
        const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        let orderField = 'role_id';
        if (sortField === 'rolename') orderField = 'name';
        sql += ` ORDER BY ${orderField} ${order}`;

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
        let countParams = [];

        // Apply same filters for count
        if (rolename) {
            countSql += ` AND name LIKE ?`;
            countParams.push(`%${rolename}%`);
        }

        if (global) {
            countSql += ` AND name LIKE ?`;
            const g = `%${global}%`;
            countParams.push(g);
        }

        const totalResult = await db.getResults(countSql, countParams);
        const totalRecords = totalResult[0]?.total || 0;
        const totalPages = Math.ceil(totalRecords / lengthNum);

        return {
            data,
            pagination: {
                start: startNum,
                length: lengthNum,
                total: totalRecords,
                totalPages
            }
        };
    },

    /**
     * Get role data by ID
     */
    getData: async (id) => {
        const sql = `
            SELECT role_id AS roleid, name AS rolename, '1' AS type,
                   created_by AS createdby, created_at AS createddate, updated_by AS modifedby, updated_at AS modifeddate
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
            const dbData = {
                name: data.rolename,
                permissions: JSON.stringify({ access: 'full' }), // default permissions
                is_deleted: 0,
                created_by: data.createdby || null,
                created_at: data.createddate || moment().format("YYYY-MM-DD HH:mm:ss"),
                updated_by: data.modifedby || null,
                updated_at: data.modifeddate || moment().format("YYYY-MM-DD HH:mm:ss")
            };
            
            const result = await db.insert('roles', dbData);
            if (!result.insertId) {
                return { status: 500, success: 0, msg: "Failed to create role" };
            }
            
            return { 
                status: 201, 
                success: 1, 
                msg: "Role created successfully",
                data: { roleid: result.insertId, ...data }
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
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
            const dbUpdates = {};
            if (data.rolename !== undefined) dbUpdates.name = data.rolename;
            if (data.modifedby !== undefined) dbUpdates.updated_by = data.modifedby;
            dbUpdates.updated_at = data.modifeddate || moment().format("YYYY-MM-DD HH:mm:ss");
            
            const result = await db.update('roles', 
                Object.keys(dbUpdates).map(key => ({ column: key, value: dbUpdates[key] })),
                [{ column: 'role_id', value: id }, { column: 'is_deleted', value: 0 }]
            );
            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "Role not found" };
            }
            
            return { 
                status: 200, 
                success: 1, 
                msg: "Role updated successfully",
                data: { roleid: id, ...data }
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
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
            const dbUpdates = {
                is_deleted: 1,
                updated_by: data.modifedby,
                updated_at: data.modifieddate || moment().format("YYYY-MM-DD HH:mm:ss")
            };
            const result = await db.update('roles', 
                Object.keys(dbUpdates).map(key => ({ column: key, value: dbUpdates[key] })),
                [{ column: 'role_id', value: id }]
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
                SELECT role_id AS roleid, name AS rolename, '1' AS type 
                FROM roles 
                WHERE is_deleted = 0
                ORDER BY name ASC
            `;
            return await db.getResults(sql);
        } catch (error) {
            winston.error(`Error getting all roles: ${error.message}`, {
                source: "role.model.js",
                function: "getAllRoles",
                error: error.message
            });
            return [];
        }
    },
};