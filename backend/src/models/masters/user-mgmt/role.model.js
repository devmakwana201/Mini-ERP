const db = require("../../../config/db");
const moment = require("moment");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Check if role exists by name
     */
    checkRoleExists: async (rolename, excludeId = null) => {
        try {
            let sql = `SELECT roleid FROM rolemaster WHERE LOWER(rolename) = LOWER(?) AND isdeleted = 0`;
            const params = [rolename];
            
            if (excludeId) {
                sql += ` AND roleid != ?`;
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
            SELECT roleid, rolename, type,
                   createdby, createddate, modifedby, modifeddate, ipaddress, isdeleted
            FROM rolemaster
            WHERE isdeleted = 0
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
            sql += ` AND rolename LIKE ?`;
            params.push(`%${rolename}%`);
        }

        // Type filter
        const type = getFilterValue("type");
        if (type) {
            sql += ` AND type = ?`;
            params.push(type);
        }


        const global = getFilterValue("global");
        if (global) {
            sql += ` AND rolename LIKE ?`;
            const g = `%${global}%`;
            params.push(g);
        }

        // Sorting
        const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ${sortField} ${order}`;

        // Pagination
        const startNum = parseInt(start);
        const lengthNum = parseInt(length);
        
        if (lengthNum !== -1) {
            sql += ` LIMIT ?, ?`;
            params.push(startNum, lengthNum);
        }

        const data = await db.getResults(sql, params);

        // Count total records
        let countSql = `SELECT COUNT(*) as total FROM rolemaster WHERE isdeleted = 0`;
        let countParams = [];

        // Apply same filters for count
        if (rolename) {
            countSql += ` AND rolename LIKE ?`;
            countParams.push(`%${rolename}%`);
        }

        if (type) {
            countSql += ` AND type = ?`;
            countParams.push(type);
        }


        if (global) {
            countSql += ` AND rolename LIKE ?`;
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
            SELECT roleid, rolename, type,
                   createdby, createddate, modifedby, modifeddate, ipaddress
            FROM rolemaster 
            WHERE roleid = ? AND isdeleted = 0
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
            // Add timestamps
            data.createddate = moment().format("YYYY-MM-DD HH:mm:ss");
            data.modifeddate = moment().format("YYYY-MM-DD HH:mm:ss");
            
            // Set defaults
            data.isdeleted = 0;
            data.type = data.type || 1;
            
            const result = await db.insert('rolemaster', data);
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
            // Add modified timestamp
            data.modifeddate = moment().format("YYYY-MM-DD HH:mm:ss");
            
            const result = await db.update('rolemaster', 
                Object.keys(data).map(key => ({ column: key, value: data[key] })),
                [{ column: 'roleid', value: id }, { column: 'isdeleted', value: 0 }]
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
            const result = await db.update('rolemaster', 
                Object.keys(data).map(key => ({ column: key, value: data[key] })),
                [{ column: 'roleid', value: id }]
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
                SELECT roleid, rolename, type 
                FROM rolemaster 
                WHERE isdeleted = 0
                ORDER BY rolename ASC
            `;
            return await db.getResults(sql);
        } catch (error) {
            winston.error(`Error getting all roles: ${error.message}`, {
                source: "role.model.js",
                function: "getAllRoles",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return [];
        }
    },

};