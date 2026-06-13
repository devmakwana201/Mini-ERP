const db = require("../../../config/db");
const moment = require("moment");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Check if UOM exists by name
     */
    checkUOMExists: async (uomname, companyid, excludeId = null) => {
        try {
            let sql = `SELECT uomid FROM uommaster WHERE LOWER(uomname) = LOWER(?) AND companyid = ? AND isdeleted = 0`;
            const params = [uomname, companyid];
            
            if (excludeId) {
                sql += ` AND uomid != ?`;
                params.push(excludeId);
            }
            
            const res = await db.getResults(sql, params);
            return res && res.length > 0;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get UOMs with pagination and filtering
     */
    getUOMs: async (req) => {
        const { start = 1, length = 10, filters, sortField = 'uomid', sortOrder = 'desc' } = req.query;

        let sql = `
            SELECT uomid, uomname, companyid, createdby, createddate, 
                   modifiedby, modifieddate, ipaddress, isdeleted
            FROM uommaster
            WHERE isdeleted = 0
        `;

        const params = [];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "uom.model.js",
                    function: "getUOMs"
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Apply filters
        const filterFields = ['uomname'];
        filterFields.forEach(field => {
            const value = getFilterValue(field);
            if (value) {
                sql += ` AND ${field} LIKE ?`;
                params.push(`%${value}%`);
            }
        });

        // Company filter
        const companyid = getFilterValue("companyid");
        if (companyid) {
            sql += ` AND companyid = ?`;
            params.push(companyid);
        }

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND uomname LIKE ?`;
            const g = `%${global}%`;
            params.push(g);
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
        let countSql = `SELECT COUNT(*) as total FROM uommaster WHERE isdeleted = 0`;
        let countParams = [];

        // Apply same filters for count
        filterFields.forEach(field => {
            const value = getFilterValue(field);
            if (value) {
                countSql += ` AND ${field} LIKE ?`;
                countParams.push(`%${value}%`);
            }
        });

        if (companyid) {
            countSql += ` AND companyid = ?`;
            countParams.push(companyid);
        }

        if (global) {
            countSql += ` AND uomname LIKE ?`;
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
     * Get UOM data by ID
     */
    getData: async (id) => {
        const sql = `SELECT uomid, uomname, companyid, createdby, createddate, 
                     modifiedby, modifieddate, ipaddress FROM uommaster 
                     WHERE uomid = ? AND isdeleted = 0`;
        const results = await db.getResults(sql, [id]);

        if (results.length === 0) return [];

        return results;
    },

    /**
     * Create new UOM
     */
    create: async (data) => {
        try {
            // Add timestamps
            data.createddate = moment().format("YYYY-MM-DD HH:mm:ss");
            data.modifieddate = moment().format("YYYY-MM-DD HH:mm:ss");
            
            // Set defaults
            data.isdeleted = 0;
            
            const result = await db.insert('uommaster', data);
            if (!result.insertId) {
                return { status: 500, success: 0, msg: "Failed to create UOM" };
            }
            
            return { 
                status: 201, 
                success: 1, 
                msg: "UOM created successfully",
                data: { uomid: result.insertId, ...data }
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { status: 409, success: 0, msg: "UOM with this name already exists in this company" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Update UOM
     */
    update: async (id, data) => {
        try {
            // Add modified timestamp
            data.modifieddate = moment().format("YYYY-MM-DD HH:mm:ss");
            
            const result = await db.update('uommaster', 
                Object.keys(data).map(key => ({ column: key, value: data[key] })),
                [{ column: 'uomid', value: id }, { column: 'isdeleted', value: 0 }]
            );
            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "UOM not found" };
            }
            
            return { 
                status: 200, 
                success: 1, 
                msg: "UOM updated successfully",
                data: { uomid: id, ...data }
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { status: 409, success: 0, msg: "UOM name already exists in this company" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Soft delete UOM
     */
    delete: async (id, data) => {
        try {
            const result = await db.update('uommaster', 
                Object.keys(data).map(key => ({ column: key, value: data[key] })),
                [{ column: 'uomid', value: id }]
            );
            if (!result.affectedRows) {
                return { status: 500, success: 0, msg: "UOM not found" };
            }
            return { status: 200, success: 1, msg: "UOM deleted successfully" };
        } catch (error) {
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Get UOMs by company
     */
    getUOMsByCompany: async (companyid) => {
        try {
            const sql = `SELECT uomid, uomname 
                         FROM uommaster WHERE companyid = ? AND isdeleted = 0 ORDER BY uomname ASC`;
            return await db.getResults(sql, [companyid]);
        } catch (error) {
            winston.error(`Error getting UOMs by company: ${error.message}`, {
                source: "uom.model.js",
                function: "getUOMsByCompany",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                companyid: companyid
            });
            return [];
        }
    },
    getUOM: async () => {
        try {
            const sql = `SELECT uomid as id, uomname as name
                         FROM uommaster WHERE isdeleted = 0`;
            return await db.getResults(sql);
        } catch (error) {
            winston.error(`Error getting UOMs: ${error.message}`, {
                source: "uom.model.js",
                function: "getUOM",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return [];
        }
    },
};