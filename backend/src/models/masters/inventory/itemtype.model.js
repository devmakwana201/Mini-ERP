const db = require("../../../config/db");
const moment = require("moment");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Check if item type exists by name
     */
    checkItemTypeExists: async (itemtypename, companyid, excludeId = null) => {
        try {
            let sql = `SELECT itemtypeid FROM itemtypemaster WHERE LOWER(itemtypename) = LOWER(?) AND companyid = ? AND isdeleted = 0`;
            const params = [itemtypename, companyid];
            
            if (excludeId) {
                sql += ` AND itemtypeid != ?`;
                params.push(excludeId);
            }
            
            const res = await db.getResults(sql, params);
            return res && res.length > 0;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get item types with pagination and filtering
     */
    getItemTypes: async (req) => {
        const { start = 1, length = 10, filters, sortField = 'itemtypeid', sortOrder = 'desc' } = req.query;

        let sql = `
            SELECT itemtypeid, itemtypename, itemtypedesc, companyid, createdby, createddate, 
                   modifiedby, modifieddate, ipaddress, isdeleted
            FROM itemtypemaster
            WHERE isdeleted = 0
        `;

        const params = [];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "itemtype.model.js",
                    function: "getItemTypes"
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Apply filters
        const filterFields = ['itemtypename', 'itemtypedesc'];
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
            sql += ` AND (itemtypename LIKE ? OR itemtypedesc LIKE ?)`;
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

        // Count total records
        let countSql = `SELECT COUNT(*) as total FROM itemtypemaster WHERE isdeleted = 0`;
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
            countSql += ` AND (itemtypename LIKE ? OR itemtypedesc LIKE ?)`;
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
     * Get item type data by ID
     */
    getData: async (id) => {
        const sql = `SELECT itemtypeid, itemtypename, itemtypedesc, companyid, createdby, createddate, 
                     modifiedby, modifieddate, ipaddress FROM itemtypemaster 
                     WHERE itemtypeid = ? AND isdeleted = 0`;
        const results = await db.getResults(sql, [id]);

        if (results.length === 0) return [];

        return results;
    },

    /**
     * Create new item type
     */
    create: async (data) => {
        try {
            // Add timestamps
            data.createddate = moment().format("YYYY-MM-DD HH:mm:ss");
            data.modifieddate = moment().format("YYYY-MM-DD HH:mm:ss");
            
            // Set defaults
            data.isdeleted = 0;
            
            const result = await db.insert('itemtypemaster', data);
            if (!result.insertId) {
                return { status: 500, success: 0, msg: "Failed to create item type" };
            }
            
            return { 
                status: 201, 
                success: 1, 
                msg: "Item type created successfully",
                data: { itemtypeid: result.insertId, ...data }
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { status: 409, success: 0, msg: "Item type with this name already exists" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Update item type
     */
    update: async (id, data) => {
        try {
            // Add modified timestamp
            data.modifieddate = moment().format("YYYY-MM-DD HH:mm:ss");
            
            const result = await db.update('itemtypemaster', 
                Object.keys(data).map(key => ({ column: key, value: data[key] })),
                [{ column: 'itemtypeid', value: id }, { column: 'isdeleted', value: 0 }]
            );
            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "Item type not found" };
            }
            
            return { 
                status: 200, 
                success: 1, 
                msg: "Item type updated successfully",
                data: { itemtypeid: id, ...data }
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { status: 409, success: 0, msg: "Item type name already exists" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Soft delete item type
     */
    delete: async (id, data) => {
        try {
            const result = await db.update('itemtypemaster', 
                Object.keys(data).map(key => ({ column: key, value: data[key] })),
                [{ column: 'itemtypeid', value: id }]
            );
            if (!result.affectedRows) {
                return { status: 500, success: 0, msg: "Item type not found" };
            }
            return { status: 200, success: 1, msg: "Item type deleted successfully" };
        } catch (error) {
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Get item types by company
     */
    getItemTypesByCompany: async (companyid) => {
        try {
            const sql = `SELECT itemtypeid, itemtypename, itemtypedesc 
                         FROM itemtypemaster WHERE companyid = ? AND isdeleted = 0 ORDER BY itemtypename ASC`;
            return await db.getResults(sql, [companyid]);
        } catch (error) {
            winston.error(`Error getting item types by company: ${error.message}`, {
                source: "itemtype.model.js",
                function: "getItemTypesByCompany",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                companyid: companyid
            });
            return [];
        }
    },
    getItemType: async() => {
        try{
            const sql = `SELECT itemtypeid as id, itemtypename as name
                         FROM itemtypemaster WHERE isdeleted = 0`;
            return  await db.getResults(sql)
        } catch(error){
            winston.error(`Error getting item types: ${error.message}`, {
                source: "itemtype.model.js",
                function: "getItemType",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return[];
        }
    }
};