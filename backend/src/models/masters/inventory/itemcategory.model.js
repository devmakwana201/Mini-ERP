const db = require("../../../config/db");
const moment = require("moment");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Check if item category exists by name
     */
    checkItemCategoryExists: async (itemcategoryname, excludeId = null) => {
        try {
            let sql = `SELECT itemcategoryid FROM itemcategorymaster WHERE LOWER(itemcategoryname) = LOWER(?) AND isdeleted = 0`;
            const params = [itemcategoryname, companyid];
            
            if (excludeId) {
                sql += ` AND itemcategoryid != ?`;
                params.push(excludeId);
            }
            
            const res = await db.getResults(sql, params);
            return res && res.length > 0;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get item categories with pagination and filtering
     */
    getItemCategories: async (req) => {
        const { start = 0, length = 10, filters, sortField = 'itemcategoryid', sortOrder = 'desc' } = req.query;

        let sql = `
            SELECT ic.itemcategoryid, ic.itemcategoryname, ic.gujratiname, ic.displayname, ic.parentcategoryid, 
                   ic.itemcategorydesc, ic.itemcategoryorder, ic.itemcategoryimage, ic.companyid, ic.createdby, ic.createddate, 
                   ic.modifiedby, ic.modifieddate, ic.ipaddress, ic.isdeleted,
                   parent.itemcategoryname as parentcategoryname
            FROM itemcategorymaster ic
            LEFT JOIN itemcategorymaster parent ON ic.parentcategoryid = parent.itemcategoryid 
                                                   AND ic.parentcategoryid IS NOT NULL 
                                                   AND ic.parentcategoryid != 0 
                                                   AND parent.isdeleted = 0
            WHERE ic.isdeleted = 0
        `;
        const params = [];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "itemcategory.model.js",
                    function: "getItemCategories"
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Apply filters
        const filterFields = ['itemcategoryname', 'displayname', 'itemcategoryorder'];
        filterFields.forEach(field => {
            const value = getFilterValue(field);
            if (value) {
                sql += ` AND ic.${field} LIKE ?`;
                params.push(`%${value}%`);
            }
        });

        // Parent category name filter
        const parentcategoryname = getFilterValue("parentcategoryname");
        if (parentcategoryname) {
            sql += ` AND parent.itemcategoryname LIKE ?`;
            params.push(`%${parentcategoryname}%`);
        }

        const itemcategoryorder = getFilterValue("itemcategoryorder");
        if (itemcategoryorder) {
            sql += ` AND ic.itemcategoryorder = ?`;
            params.push(itemcategoryorder);
        }

        // Parent category filter
        const parentcategoryid = getFilterValue("parentcategoryid");
        if (parentcategoryid) {
            sql += ` AND ic.parentcategoryid = ?`;
            params.push(parentcategoryid);
        }

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (ic.itemcategoryname LIKE ? OR ic.gujratiname LIKE ? OR ic.displayname LIKE ? OR ic.itemcategorydesc LIKE ? OR parent.itemcategoryname LIKE ?)`;
            const g = `%${global}%`;
            params.push(g, g, g, g, g);
        }

        // Sorting
        const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        if (sortField === 'parentcategoryname') {
            sql += ` ORDER BY parent.itemcategoryname ${order}`;
        } else {
            sql += ` ORDER BY ic.${sortField} ${order}`;
        }

        // Pagination using start and length
        const startNum = parseInt(start);
        const lengthNum = parseInt(length);
        
        if (lengthNum !== -1) {
            sql += ` LIMIT ?, ?`;
            params.push(startNum, lengthNum);
        }

        const data = await db.getResults(sql, params);

        // Count total records
        let countSql = `SELECT COUNT(*) as total FROM itemcategorymaster ic 
                        LEFT JOIN itemcategorymaster parent ON ic.parentcategoryid = parent.itemcategoryid 
                                                               AND ic.parentcategoryid IS NOT NULL 
                                                               AND ic.parentcategoryid != 0 
                                                               AND parent.isdeleted = 0
                        WHERE ic.isdeleted = 0`;
        let countParams = [];

        // Apply same filters for count
        filterFields.forEach(field => {
            const value = getFilterValue(field);
            if (value) {
                countSql += ` AND ic.${field} LIKE ?`;
                countParams.push(`%${value}%`);
            }
        });

        // Parent category name filter for count
        if (parentcategoryname) {
            countSql += ` AND parent.itemcategoryname LIKE ?`;
            countParams.push(`%${parentcategoryname}%`);
        }

        if (parentcategoryid) {
            countSql += ` AND ic.parentcategoryid = ?`;
            countParams.push(parentcategoryid);
        }

        if (global) {
            countSql += ` AND (ic.itemcategoryname LIKE ? OR ic.gujratiname LIKE ? OR ic.displayname LIKE ? OR ic.itemcategorydesc LIKE ? OR parent.itemcategoryname LIKE ?)`;
            const g = `%${global}%`;
            countParams.push(g, g, g, g, g);
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
     * Get item category data by ID
     */
    getData: async (id) => {
        const sql = `SELECT itemcategoryid, itemcategoryname, gujratiname, displayname, parentcategoryid, 
                     itemcategorydesc, itemcategoryorder, itemcategoryimage, companyid, createdby, createddate, 
                     modifiedby, modifieddate, ipaddress FROM itemcategorymaster 
                     WHERE itemcategoryid = ? AND isdeleted = 0`;
        const results = await db.getResults(sql, [id]);

        if (results.length === 0) return [];

        return results;
    },

    /**
     * Create new item category
     */
    create: async (data) => {
        try {
            // Add timestamps
            data.createddate = moment().format("YYYY-MM-DD HH:mm:ss");
            data.modifieddate = moment().format("YYYY-MM-DD HH:mm:ss");
            
            // Set defaults
            data.isdeleted = 0;
            
            const result = await db.insert('itemcategorymaster', data);
            if (!result.insertId) {
                return { status: 500, success: 0, msg: "Failed to create item category" };
            }
            
            return { 
                status: 201, 
                success: 1, 
                msg: "Item category created successfully",
                data: { itemcategoryid: result.insertId, ...data }
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { status: 409, success: 0, msg: "Item category with this name already exists" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Update item category
     */
    update: async (id, data) => {
        try {
            // Add modified timestamp
            data.modifieddate = moment().format("YYYY-MM-DD HH:mm:ss");
            
            const result = await db.update('itemcategorymaster', 
                Object.keys(data).map(key => ({ column: key, value: data[key] })),
                [{ column: 'itemcategoryid', value: id }, { column: 'isdeleted', value: 0 }]
            );
            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "Item category not found" };
            }
            
            return { 
                status: 200, 
                success: 1, 
                msg: "Item category updated successfully",
                data: { itemcategoryid: id, ...data }
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { status: 409, success: 0, msg: "Item category name already exists" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Soft delete item category
     */
    delete: async (id, data) => {
        try {
            const result = await db.update('itemcategorymaster', 
                Object.keys(data).map(key => ({ column: key, value: data[key] })),
                [{ column: 'itemcategoryid', value: id }]
            );
            if (!result.affectedRows) {
                return { status: 500, success: 0, msg: "Item category not found" };
            }
            return { status: 200, success: 1, msg: "Item category deleted successfully" };
        } catch (error) {
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Get item categories by company
     */
    getItemCategoriesByCompany: async (companyid) => {
        try {
            const sql = `SELECT itemcategoryid, itemcategoryname, gujratiname, displayname, parentcategoryid, itemcategorydesc, itemcategoryorder, itemcategoryimage
                         FROM itemcategorymaster WHERE companyid = ? AND isdeleted = 0 ORDER BY itemcategoryorder ASC, itemcategoryname ASC`;
            return await db.getResults(sql, [companyid]);
        } catch (error) {
            winston.error(`Error getting item categories by company: ${error.message}`, {
                source: "itemcategory.model.js",
                function: "getItemCategoriesByCompany",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                companyid: companyid
            });
            return [];
        }
    },

    /**
     * Get child categories by parent category
     */
    getChildCategories: async (parentcategoryid) => {
        try {
            const sql = `SELECT itemcategoryid, itemcategoryname, gujratiname, displayname, itemcategorydesc, itemcategoryorder, itemcategoryimage
                         FROM itemcategorymaster WHERE parentcategoryid = ? AND isdeleted = 0 ORDER BY itemcategoryorder ASC, itemcategoryname ASC`;
            return await db.getResults(sql, [parentcategoryid]);
        } catch (error) {
            winston.error(`Error getting child categories: ${error.message}`, {
                source: "itemcategory.model.js",
                function: "getChildCategories",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                parentcategoryid: parentcategoryid
            });
            return [];
        }
    },

    /**
     * Get parent categories (categories with parentcategoryid = null or 0)
     */
    getParentCategories: async (companyid) => {
        try {
            const sql = `SELECT itemcategoryid, itemcategoryname, gujratiname, displayname, itemcategorydesc, itemcategoryorder, itemcategoryimage
                         FROM itemcategorymaster WHERE (parentcategoryid IS NULL OR parentcategoryid = 0) 
                         AND companyid = ? AND isdeleted = 0 ORDER BY itemcategoryorder ASC, itemcategoryname ASC`;
            return await db.getResults(sql, [companyid]);
        } catch (error) {
            winston.error(`Error getting parent categories: ${error.message}`, {
                source: "itemcategory.model.js",
                function: "getParentCategories",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                companyid: companyid
            });
            return [];
        }
    },

    getSubCategory: async (parentCategoryId = null) => {
       try {
            let sql = `SELECT itemcategoryid, itemcategoryname FROM itemcategorymaster WHERE isdeleted = 0`;
            const params = [];

            if (parentCategoryId !== null && parentCategoryId !== undefined) {
                sql += ` AND parentcategoryid = ?`;
                params.push(parentCategoryId);
            }else {
                sql += ` AND parentcategoryid IS NULL`;
            }
            return await db.getResults(sql, params);
        } catch (error) {
            winston.error(`Error getting child categories: ${error.message}`, {
                source: "itemcategory.model.js",
                function: "getSubCategory",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                parentCategoryId: parentCategoryId
            });
            return [];
        }
    },

    getItemCategory:async() => {
        try {
            const sql = `SELECT itemcategoryid as id, itemcategoryname as name
                            FROM itemcategorymaster WHERE isdeleted = 0`;
            return await db.getResults(sql);
        } catch (error) {
            winston.error(`Error getting item category: ${error.message}`, {
                source: "itemcategory.model.js",
                function: "getItemCategory",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return [];
        }
    },

    /**
     * Get master categories (those with parentcategoryid IS NULL)
     */
    getMasterCategoriesDropdown: async () => {
        try {
            const sql = `SELECT itemcategoryid as id, itemcategoryname as name
                         FROM itemcategorymaster
                         WHERE (parentcategoryid IS NULL OR parentcategoryid = 0)
                         AND isdeleted = 0
                         ORDER BY itemcategoryorder ASC, itemcategoryname ASC`;
            return await db.getResults(sql);
        } catch (error) {
            winston.error("Error getting master categories:", error);
            return [];
        }
    },

    /**
     * Get categories (those whose parentcategoryid points to a master category)
     */
    getCategory: async () => {
        try {
            const sql = `SELECT c.itemcategoryid as id, c.itemcategoryname as name, c.parentcategoryid
                         FROM itemcategorymaster c
                         INNER JOIN itemcategorymaster p ON c.parentcategoryid = p.itemcategoryid
                         WHERE p.parentcategoryid IS NULL
                         AND c.isdeleted = 0
                         AND p.isdeleted = 0
                         ORDER BY c.itemcategoryorder ASC, c.itemcategoryname ASC`;
            return await db.getResults(sql);
        } catch (error) {
            winston.error("Error getting categories:", error);
            return [];
        }
    },

    /**
     * Create category with auto-detection of hierarchy level
     */
    createCategoryWithHierarchy: async (categoryName, parentCategoryId = null, additionalData = {}) => {
        try {
            const timestamp = Math.floor(Date.now() / 1000);
            const random = Math.floor(10000 + Math.random() * 90000);

            const data = {
                itemcategoryname: categoryName.toLowerCase(),
                displayname: categoryName,
                parentcategoryid: parentCategoryId,
                createddate: moment().format("YYYY-MM-DD HH:mm:ss"),
                modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
                isdeleted: 0,
                itemcategoryorder: 0,
                ...additionalData
            };

            const result = await db.insert('itemcategorymaster', data);
            if (!result.insertId) {
                return { success: false, msg: "Failed to create category" };
            }

            return {
                success: true,
                msg: "Category created successfully",
                data: { itemcategoryid: result.insertId, ...data }
            };
        } catch (error) {
            winston.error("Error creating category with hierarchy:", error);
            return { success: false, msg: error.message };
        }
    },

    /**
     * Find category by name and optional parent
     * Enhanced with hierarchy level validation:
     * - If parentCategoryId is null: finds master categories (parentcategoryid IS NULL)
     * - If parentCategoryId is provided: finds child categories and validates hierarchy level
     */
    findCategoryByName: async (categoryName, parentCategoryId = null) => {
        try {
            let sql = `SELECT c.itemcategoryid, c.itemcategoryname, c.parentcategoryid
                       FROM itemcategorymaster c
                       WHERE LOWER(c.itemcategoryname) = LOWER(?)
                       AND c.isdeleted = 0`;
            const params = [categoryName];

            if (parentCategoryId !== null) {
                // Find category with specific parent
                // Also validate that the parent exists and is not deleted
                sql += ` AND c.parentcategoryid = ?
                         AND EXISTS (
                             SELECT 1 FROM itemcategorymaster p
                             WHERE p.itemcategoryid = c.parentcategoryid
                             AND p.isdeleted = 0
                         )`;
                params.push(parentCategoryId);
            } else {
                // Find master category (parentcategoryid IS NULL or 0)
                sql += ` AND (c.parentcategoryid IS NULL OR c.parentcategoryid = 0)`;
            }

            const results = await db.getResults(sql, params);
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            winston.error("Error finding category by name:", error);
            return null;
        }
    }
};