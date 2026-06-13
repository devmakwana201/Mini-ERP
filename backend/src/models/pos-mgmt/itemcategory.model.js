const db = require("../../config/db");
const winston = require("../../config/winston");

const itemCategoryModel = {
    /**
     * Get item categories for dropdown (master categories - where parentcategoryid is NULL)
     * @param {Object} params - Optional filters (companyid)
     * @returns {Array} List of master categories
     */
    async getMasterCategoriesDropdown(params = {}) {
        try {
            let sql = `
                SELECT
                    itemcategoryid as id,
                    itemcategoryname as name,
                    displayname,
                    itemcategoryimage as image,
                    itemcategorydesc as description
                FROM itemcategorymaster
                WHERE isdeleted = 0 AND parentcategoryid IS NULL
            `;

            const queryParams = [];

            // Filter by company if provided
            if (params.companyid) {
                sql += ` AND companyid = ?`;
                queryParams.push(params.companyid);
            }

            sql += ` ORDER BY itemcategoryorder ASC, itemcategoryname ASC`;

            const results = await db.getResults(sql, queryParams);
            return results || [];
        } catch (error) {
            winston.error(`Error fetching master categories dropdown: ${error.message}`, {
                source: "itemcategory.model.js",
                function: "getMasterCategoriesDropdown",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    /**
     * Get item categories for dropdown (categories - where parentcategoryid is NOT NULL)
     * @param {Object} params - Optional filters (companyid, parentcategoryid)
     * @returns {Array} List of categories
     */
    async getCategoriesDropdown(params = {}) {
        try {
            let sql = `
                SELECT
                    itemcategoryid as id,
                    itemcategoryname as name,
                    displayname,
                    parentcategoryid,
                    itemcategoryimage as image,
                    itemcategorydesc as description
                FROM itemcategorymaster
                WHERE isdeleted = 0 AND parentcategoryid IS NOT NULL
            `;

            const queryParams = [];

            // Filter by company if provided
            if (params.companyid) {
                sql += ` AND companyid = ?`;
                queryParams.push(params.companyid);
            }

            // Filter by parent category if provided
            if (params.parentcategoryid) {
                sql += ` AND parentcategoryid = ?`;
                queryParams.push(params.parentcategoryid);
            }

            sql += ` ORDER BY itemcategoryorder ASC, itemcategoryname ASC`;

            const results = await db.getResults(sql, queryParams);
            return results || [];
        } catch (error) {
            winston.error(`Error fetching categories dropdown: ${error.message}`, {
                source: "itemcategory.model.js",
                function: "getCategoriesDropdown",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    /**
     * Get all item categories (both master and sub) for dropdown
     * @param {Object} params - Optional filters (companyid)
     * @returns {Array} List of all categories
     */
    async getAllCategoriesDropdown(params = {}) {
        try {
            let sql = `
                SELECT
                    itemcategoryid as id,
                    itemcategoryname as name,
                    displayname,
                    parentcategoryid,
                    itemcategoryimage as image,
                    itemcategorydesc as description
                FROM itemcategorymaster
                WHERE isdeleted = 0
            `;

            const queryParams = [];

            // Filter by company if provided
            if (params.companyid) {
                sql += ` AND companyid = ?`;
                queryParams.push(params.companyid);
            }

            sql += ` ORDER BY itemcategoryorder ASC, itemcategoryname ASC`;

            const results = await db.getResults(sql, queryParams);
            return results || [];
        } catch (error) {
            winston.error(`Error fetching all categories dropdown: ${error.message}`, {
                source: "itemcategory.model.js",
                function: "getAllCategoriesDropdown",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    /**
     * Get item category by ID
     * @param {Number} id - Category ID
     * @returns {Object} Category details
     */
    async getCategoryById(id) {
        try {
            const sql = `
                SELECT
                    itemcategoryid,
                    itemcategoryname,
                    gujratiname,
                    displayname,
                    parentcategoryid,
                    itemcategoryimage,
                    itemcategorydesc,
                    itemcategoryorder,
                    companyid
                FROM itemcategorymaster
                WHERE itemcategoryid = ? AND isdeleted = 0
            `;

            const results = await db.getResults(sql, [id]);
            return results && results.length > 0 ? results[0] : null;
        } catch (error) {
            winston.error(`Error fetching category by ID: ${error.message}`, {
                source: "itemcategory.model.js",
                function: "getCategoryById",
                id,
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    }
};

module.exports = itemCategoryModel;
