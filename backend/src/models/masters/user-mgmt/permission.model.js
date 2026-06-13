const db = require("../../../config/db");
const moment = require("moment");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Check if permission exists by title
     */
    checkPermissionExists: async (permissiontitle, excludeId = null) => {
        try {
            let sql = `SELECT permissionid FROM permissionmaster WHERE LOWER(permissiontitle) = LOWER(?) AND isdeleted = 0`;
            const params = [permissiontitle];
            
            if (excludeId) {
                sql += ` AND permissionid != ?`;
                params.push(excludeId);
            }
            
            const res = await db.getResults(sql, params);
            return res && res.length > 0;
        } catch (error) {
            return false;
        }
    },

    /**
     * Check if permission code exists
     */
    checkPermissionCodeExists: async (permissioncode, excludeId = null) => {
        try {
            let sql = `SELECT permissionid FROM permissionmaster WHERE LOWER(permissioncode) = LOWER(?) AND isdeleted = 0`;
            const params = [permissioncode];
            
            if (excludeId) {
                sql += ` AND permissionid != ?`;
                params.push(excludeId);
            }
            
            const res = await db.getResults(sql, params);
            return res && res.length > 0;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get permissions with pagination and filtering
     */
    getPermissions: async (req) => {
        const { start = 1, length = 10, filters, sortField = 'permissionid', sortOrder = 'desc' } = req.query;

        let sql = `
            SELECT permissionid, permissiontitle, permissioncode, permissiontype, 
                   moduleid, applicablefor,
                   createdby, createddate, modifiedby, modifieddate, ipaddress, isdeleted
            FROM permissionmaster
            WHERE isdeleted = 0
        `;

        const params = [];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "permission.model.js",
                    function: "getPermissions"
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Apply filters
        const filterFields = ['permissiontitle', 'permissioncode'];
        filterFields.forEach(field => {
            const value = getFilterValue(field);
            if (value) {
                sql += ` AND ${field} LIKE ?`;
                params.push(`%${value}%`);
            }
        });

        // Permission type filter
        const permissiontype = getFilterValue("permissiontype");
        if (permissiontype) {
            sql += ` AND permissiontype = ?`;
            params.push(permissiontype);
        }

        // Module filter
        const moduleid = getFilterValue("moduleid");
        if (moduleid) {
            sql += ` AND moduleid = ?`;
            params.push(moduleid);
        }


        // Applicable on filter (1=web, 2=desktop)
        const applicableon = getFilterValue("applicableon");
        if (applicableon) {
            sql += ` AND applicableon = ?`;
            params.push(applicableon);
        }

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (permissiontitle LIKE ? OR permissioncode LIKE ?)`;
            const g = `%${global}%`;
            params.push(g, g);
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
        let countSql = `SELECT COUNT(*) as total FROM permissionmaster WHERE isdeleted = 0`;
        let countParams = [];

        // Apply same filters for count
        filterFields.forEach(field => {
            const value = getFilterValue(field);
            if (value) {
                countSql += ` AND ${field} LIKE ?`;
                countParams.push(`%${value}%`);
            }
        });

        if (permissiontype) {
            countSql += ` AND permissiontype = ?`;
            countParams.push(permissiontype);
        }

        if (moduleid) {
            countSql += ` AND moduleid = ?`;
            countParams.push(moduleid);
        }


        if (applicableon) {
            countSql += ` AND applicableon = ?`;
            countParams.push(applicableon);
        }

        if (global) {
            countSql += ` AND (permissiontitle LIKE ? OR permissioncode LIKE ?)`;
            const g = `%${global}%`;
            countParams.push(g, g);
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
     * Get permission data by ID
     */
    getData: async (id) => {
        const sql = `
            SELECT permissionid, permissiontitle, permissioncode, permissiontype, 
                   moduleid, applicablefor,
                   createdby, createddate, modifiedby, modifieddate, ipaddress
            FROM permissionmaster 
            WHERE permissionid = ? AND isdeleted = 0
        `;
        const results = await db.getResults(sql, [id]);

        if (results.length === 0) return [];

        return results;
    },

    /**
     * Create new permission
     */
    create: async (data) => {
        try {
            // Add timestamps
            data.createddate = moment().format("YYYY-MM-DD HH:mm:ss");
            data.modifieddate = moment().format("YYYY-MM-DD HH:mm:ss");
            
            // Set defaults
            data.isdeleted = 0;
            data.applicablefor = data.applicablefor || 1; // Default to web
            
            const result = await db.insert('permissionmaster', data);
            if (!result.insertId) {
                return { status: 500, success: 0, msg: "Failed to create permission" };
            }
            
            return { 
                status: 201, 
                success: 1, 
                msg: "Permission created successfully",
                data: { permissionid: result.insertId, ...data }
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { status: 409, success: 0, msg: "Permission with this title or code already exists" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Update permission
     */
    update: async (id, data) => {
        try {
            // Add modified timestamp
            data.modifieddate = moment().format("YYYY-MM-DD HH:mm:ss");
            
            const result = await db.update('permissionmaster', 
                Object.keys(data).map(key => ({ column: key, value: data[key] })),
                [{ column: 'permissionid', value: id }, { column: 'isdeleted', value: 0 }]
            );
            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "Permission not found" };
            }
            
            return { 
                status: 200, 
                success: 1, 
                msg: "Permission updated successfully",
                data: { permissionid: id, ...data }
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { status: 409, success: 0, msg: "Permission title or code already exists" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Soft delete permission
     */
    delete: async (id, data) => {
        try {
            const result = await db.update('permissionmaster', 
                Object.keys(data).map(key => ({ column: key, value: data[key] })),
                [{ column: 'permissionid', value: id }]
            );
            if (!result.affectedRows) {
                return { status: 500, success: 0, msg: "Permission not found" };
            }
            return { status: 200, success: 1, msg: "Permission deleted successfully" };
        } catch (error) {
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Get all permissions for dropdown
     */
    getAllPermissions: async () => {
        try {
            const sql = `
                SELECT permissionid, permissiontitle, permissioncode, permissiontype, moduleid, applicablefor 
                FROM permissionmaster 
                WHERE isdeleted = 0
                ORDER BY moduleid ASC, permissiontitle ASC
            `;
            return await db.getResults(sql);
        } catch (error) {
            winston.error(`Error getting all permissions: ${error.message}`, {
                source: "permission.model.js",
                function: "getAllPermissions",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return [];
        }
    },

    /**
     * Get permissions by module
     */
    getPermissionsByModule: async (moduleid) => {
        try {
            const sql = `
                SELECT permissionid, permissiontitle, permissioncode, permissiontype, applicablefor 
                FROM permissionmaster 
                WHERE moduleid = ? AND isdeleted = 0
                ORDER BY permissiontitle ASC
            `;
            return await db.getResults(sql, [moduleid]);
        } catch (error) {
            winston.error(`Error getting permissions by module: ${error.message}`, {
                source: "permission.model.js",
                function: "getPermissionsByModule",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                modulename: modulename
            });
            return [];
        }
    },

};