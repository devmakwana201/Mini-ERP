const db = require("../../../config/db");
const moment = require("moment");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Check if warehouse exists by name
     */
    checkWarehouseExists: async (warehousename, excludeId = null) => {
        try {
            let sql = `SELECT warehouseid FROM warehousemaster WHERE LOWER(warehousename) = LOWER(?) AND isdeleted = 0`;
            const params = [warehousename];
            
            if (excludeId) {
                sql += ` AND warehouseid != ?`;
                params.push(excludeId);
            }
            
            const res = await db.getResults(sql, params);
            return res && res.length > 0;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get warehouses with pagination and filtering
     */
    getWarehouses: async (req) => {
        const { start = 1, length = 10, filters, sortField = 'warehouseid', sortOrder = 'desc' } = req.query;

        let sql = `
            SELECT wm.warehouseid, wm.warehousename, lm.locationid, lm.locationname as locationname, wm.isdefaultwarehouse, 
                   wm.createdby, wm.createddate, wm.modifiedby, wm.modifieddate, wm.ipaddress, wm.isdeleted
            FROM warehousemaster wm
            LEFT JOIN locationmaster lm ON lm.locationid = wm.locationid
            WHERE wm.isdeleted = 0
        `;

        const params = [];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "warehouse.model.js",
                    function: "getWarehouses"
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Apply filters with case-insensitive comparison
        const filterFields = ['warehousename'];
        filterFields.forEach(field => {
            const value = getFilterValue(field);
            if (value) {
                sql += ` AND LOWER(wm.${field}) LIKE LOWER(?)`;
                params.push(`%${value}%`);
            }
        });

        // Location filter with case-insensitive comparison
        const locationname = getFilterValue("locationname");
        if (locationname) {
            sql += ` AND LOWER(lm.locationname) LIKE LOWER(?)`;
            params.push(`%${locationname}%`);
        }

        // Default warehouse filter
        const isdefaultwarehouse = getFilterValue("isdefaultwarehouse");
        if (isdefaultwarehouse !== undefined) {
            sql += ` AND wm.isdefaultwarehouse = ?`;
            params.push(isdefaultwarehouse);
        }

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (LOWER(wm.warehousename) LIKE LOWER(?) OR LOWER(lm.locationname) LIKE LOWER(?))`;
            const g = `%${global}%`;
            params.push(g, g);
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

        // Count total records - need to join with locationmaster for location filters
        let countSql = `
            SELECT COUNT(*) as total 
            FROM warehousemaster wm
            LEFT JOIN locationmaster lm ON lm.locationid = wm.locationid
            WHERE wm.isdeleted = 0
        `;
        let countParams = [];

        // Apply same filters for count with case-insensitive comparison
        filterFields.forEach(field => {
            const value = getFilterValue(field);
            if (value) {
                countSql += ` AND LOWER(wm.${field}) LIKE LOWER(?)`;
                countParams.push(`%${value}%`);
            }
        });

        if (locationname) {
            countSql += ` AND LOWER(lm.locationname) LIKE LOWER(?)`;
            countParams.push(`%${locationname}%`);
        }

        if (isdefaultwarehouse !== undefined) {
            countSql += ` AND wm.isdefaultwarehouse = ?`;
            countParams.push(isdefaultwarehouse);
        }

        if (global) {
            countSql += ` AND (LOWER(wm.warehousename) LIKE LOWER(?) OR LOWER(lm.locationname) LIKE LOWER(?))`;
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
     * Get warehouse data by ID
     */
    getData: async (id) => {
        const sql = `
            SELECT warehouseid, warehousename, locationid, isdefaultwarehouse, 
                   createdby, createddate, modifiedby, modifieddate, ipaddress
            FROM warehousemaster 
            WHERE warehouseid = ? AND isdeleted = 0
        `;
        const results = await db.getResults(sql, [id]);

        if (results.length === 0) return [];

        return results;
    },

    /**
     * Create new warehouse
     */
    create: async (data) => {
        try {
            // Add timestamps
            data.createddate = moment().format("YYYY-MM-DD HH:mm:ss");
            data.modifieddate = moment().format("YYYY-MM-DD HH:mm:ss");
            
            // Set defaults
            data.isdeleted = 0;
            data.isdefaultwarehouse = data.isdefaultwarehouse || 0;
            
            const result = await db.insert('warehousemaster', data);
            if (!result.insertId) {
                return { status: 500, success: 0, msg: "Failed to create warehouse" };
            }
            
            return { 
                status: 201, 
                success: 1, 
                msg: "Warehouse created successfully",
                data: { warehouseid: result.insertId, ...data }
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { status: 409, success: 0, msg: "Warehouse with this name already exists" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Update warehouse
     */
    update: async (id, data) => {
        try {
            // Add modified timestamp
            data.modifieddate = moment().format("YYYY-MM-DD HH:mm:ss");
            
            const result = await db.update('warehousemaster', 
                Object.keys(data).map(key => ({ column: key, value: data[key] })),
                [{ column: 'warehouseid', value: id }, { column: 'isdeleted', value: 0 }]
            );
            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "Warehouse not found" };
            }
            
            return { 
                status: 200, 
                success: 1, 
                msg: "Warehouse updated successfully",
                data: { warehouseid: id, ...data }
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { status: 409, success: 0, msg: "Warehouse name already exists" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Soft delete warehouse
     */
    delete: async (id, data) => {
        try {
            const result = await db.update('warehousemaster', 
                Object.keys(data).map(key => ({ column: key, value: data[key] })),
                [{ column: 'warehouseid', value: id }]
            );
            if (!result.affectedRows) {
                return { status: 500, success: 0, msg: "Warehouse not found" };
            }
            return { status: 200, success: 1, msg: "Warehouse deleted successfully" };
        } catch (error) {
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Get all warehouses for dropdown/select
     */
    getAllWarehouses: async () => {
        try {
            const sql = `
                SELECT warehouseid, warehousename, locationid, isdefaultwarehouse 
                FROM warehousemaster 
                WHERE isdeleted = 0 
                ORDER BY warehousename ASC
            `;
            return await db.getResults(sql);
        } catch (error) {
            winston.error(`Error getting all warehouses: ${error.message}`, {
                source: "warehouse.model.js",
                function: "getAllWarehouses",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return [];
        }
    },

    /**
     * Get warehouses by location
     */
    getWarehousesByLocation: async (locationid) => {
        try {
            const sql = `
                SELECT warehouseid, warehousename, isdefaultwarehouse 
                FROM warehousemaster 
                WHERE locationid = ? AND isdeleted = 0 
                ORDER BY warehousename ASC
            `;
            return await db.getResults(sql, [locationid]);
        } catch (error) {
            winston.error(`Error getting warehouses by location: ${error.message}`, {
                source: "warehouse.model.js",
                function: "getWarehousesByLocation",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                locationid: locationid
            });
            return [];
        }
    },

    getDefaultWarehouseByLocId: async(locationId)=> {
			const sql = `SELECT warehouseid,warehousename 
                        from warehousemaster where locationid = ? and isdefaultwarehouse=1 and isdeleted=0`;

			return await db.getResults(sql, [locationId]);			
		}
};