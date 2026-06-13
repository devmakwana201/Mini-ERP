const db = require("../../../config/db");
const moment = require("moment");
const winston = require("../../../config/winston");

// Static rejection reasons for items
const REJECTION_REASONS = [
    { id: 1, reason: 'Duplicate Item' },
    { id: 2, reason: 'Invalid/Incorrect Data' },
    { id: 3, reason: 'Wrong Category/Classification' },
    { id: 4, reason: 'Incomplete Information' },
    { id: 5, reason: 'Pricing Issue' },
    { id: 6, reason: 'Barcode Already Exists' },
    { id: 7, reason: 'Poor Image Quality' },
    { id: 8, reason: 'Not Relevant for Business' },
    { id: 9, reason: 'Other' }
];

module.exports = {
    /**
     * Get static rejection reasons
     */
    getRejectionReasons: () => {
        return REJECTION_REASONS;
    },
    /**
     * Get items with pagination and filtering
     */
    getItems: async (req) => {
        const { start = 0, length = 10, filters, sortField = 'itemid', sortOrder = 'desc' } = req.query;

        let sql = `
            SELECT i.itemid, i.itemname, i.itemdisplayname, i.genericname, i.itemcode,
                   i.sellingprice, i.purchaseprice, i.netcost, i.wholesaleprice,
                   i.mastercategoryid, mc.itemcategoryname as mastercatname,
                   i.categoryid, c.itemcategoryname as catname,
                   i.subcategoryid, sc.itemcategoryname as subcatname,
                   i.brandid, b.brandname,
                   i.baseunit, i.packageuom, i.safetyquantity, i.packingqty,
                   i.defaulttaxprofileid, i.sellingitemas, i.hsnseccode,
                   i.pricetype, i.ingredients, i.description,
                   tp.taxprofilename as taxprofilename,
                   i.ignoretax, i.ignorediscount, i.isnegativesale,
                   i.imgpath,
                   i.companyid, i.createdby, i.createddate, i.modifiedby, i.modifieddate,
                   i.ipaddress, i.isdeleted
            FROM itemmaster i
            LEFT JOIN itemcategorymaster mc ON i.mastercategoryid = mc.itemcategoryid AND mc.isdeleted = 0
            LEFT JOIN itemcategorymaster c ON i.categoryid = c.itemcategoryid AND c.isdeleted = 0
            LEFT JOIN itemcategorymaster sc ON i.subcategoryid = sc.itemcategoryid AND sc.isdeleted = 0
            LEFT JOIN brandmaster b ON i.brandid = b.brandid AND b.isdeleted = 0
            LEFT JOIN taxprofilemaster tp ON i.defaulttaxprofileid = tp.taxprofileid AND tp.isdeleted = 0
            WHERE i.isdeleted = 0 AND i.isapproved = 1
        `;

        const params = [];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "item.model.js",
                    function: "getItems"
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Apply filters
        const filterFields = ['itemname', 'itemdisplayname', 'genericname', 'itemcode', 'hsnseccode'];
        filterFields.forEach(field => {
            const value = getFilterValue(field);
            if (value) {
                sql += ` AND i.${field} LIKE ?`;
                params.push(`%${value}%`);
            }
        });

        // Apply category and tax profile name filters
        const categoryFields = {
            'mastercatname': 'mc.itemcategoryname',
            'catname': 'c.itemcategoryname',
            'subcatname': 'sc.itemcategoryname',
            'taxprofilename': 'tp.taxprofilename',
            'brandname': 'b.brandname'
        };
        
        Object.entries(categoryFields).forEach(([filterKey, dbField]) => {
            const value = getFilterValue(filterKey);
            if (value) {
                sql += ` AND ${dbField} LIKE ?`;
                params.push(`%${value}%`);
            }
        });


        // Global search
        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (i.itemname COLLATE utf8mb4_unicode_ci LIKE ? OR i.itemdisplayname COLLATE utf8mb4_unicode_ci LIKE ? OR i.genericname COLLATE utf8mb4_unicode_ci LIKE ? OR i.itemcode COLLATE utf8mb4_unicode_ci LIKE ? OR i.hsnseccode COLLATE utf8mb4_unicode_ci LIKE ? OR mc.itemcategoryname COLLATE utf8mb4_unicode_ci LIKE ? OR c.itemcategoryname COLLATE utf8mb4_unicode_ci LIKE ? OR sc.itemcategoryname COLLATE utf8mb4_unicode_ci LIKE ? OR tp.taxprofilename COLLATE utf8mb4_unicode_ci LIKE ? OR b.brandname COLLATE utf8mb4_unicode_ci LIKE ?)`;
            const g = `%${global}%`;
            params.push(g, g, g, g, g, g, g, g, g, g);
        }

        // Sorting - handle fields from different tables
        const sortFieldMapping = {
            'mastercatname': 'mc.itemcategoryname',
            'catname': 'c.itemcategoryname', 
            'subcatname': 'sc.itemcategoryname',
            'taxprofilename': 'tp.taxprofilename',
            'brandname': 'b.brandname'
        };
        
        const actualSortField = sortFieldMapping[sortField] || `i.${sortField}`;
        const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ${actualSortField} ${order}`;

        // Pagination using start and length
        const startNum = parseInt(start);
        const lengthNum = parseInt(length);
        
        if (lengthNum !== -1) {
            sql += ` LIMIT ?, ?`;
            params.push(startNum, lengthNum);
        }

        const data = await db.getResults(sql, params);

        // Count total records
        let countSql = `
            SELECT COUNT(*) as total 
            FROM itemmaster i
            LEFT JOIN itemcategorymaster mc ON i.mastercategoryid = mc.itemcategoryid AND mc.isdeleted = 0
            LEFT JOIN itemcategorymaster c ON i.categoryid = c.itemcategoryid AND c.isdeleted = 0
            LEFT JOIN itemcategorymaster sc ON i.subcategoryid = sc.itemcategoryid AND sc.isdeleted = 0
            LEFT JOIN brandmaster b ON i.brandid = b.brandid AND b.isdeleted = 0
            LEFT JOIN taxprofilemaster tp ON i.defaulttaxprofileid = tp.taxprofileid AND tp.isdeleted = 0
            WHERE i.isdeleted = 0 AND i.isapproved = 1
        `;
        let countParams = [];

        // Apply same filters for count
        filterFields.forEach(field => {
            const value = getFilterValue(field);
            if (value) {
                countSql += ` AND i.${field} LIKE ?`;
                countParams.push(`%${value}%`);
            }
        });

        // Apply category and tax profile name filters for count
        Object.entries(categoryFields).forEach(([filterKey, dbField]) => {
            const value = getFilterValue(filterKey);
            if (value) {
                countSql += ` AND ${dbField} LIKE ?`;
                countParams.push(`%${value}%`);
            }
        });

        if (getFilterValue('mastercategoryid')) {
            countSql += ` AND i.mastercategoryid = ?`;
            countParams.push(getFilterValue('mastercategoryid'));
        }
        if (getFilterValue('categoryid')) {
            countSql += ` AND i.categoryid = ?`;
            countParams.push(getFilterValue('categoryid'));
        }
        if (getFilterValue('subcategoryid')) {
            countSql += ` AND i.subcategoryid = ?`;
            countParams.push(getFilterValue('subcategoryid'));
        }
        if (getFilterValue('brandid')) {
            countSql += ` AND i.brandid = ?`;
            countParams.push(getFilterValue('brandid'));
        }
        if (getFilterValue('minPrice')) {
            countSql += ` AND i.price >= ?`;
            countParams.push(getFilterValue('minPrice'));
        }
        if (getFilterValue('maxPrice')) {
            countSql += ` AND i.price <= ?`;
            countParams.push(getFilterValue('maxPrice'));
        }

        if (global) {
            countSql += ` AND (i.itemname COLLATE utf8mb4_unicode_ci LIKE ? OR i.itemdisplayname COLLATE utf8mb4_unicode_ci LIKE ? OR i.genericname COLLATE utf8mb4_unicode_ci LIKE ? OR i.itemcode COLLATE utf8mb4_unicode_ci LIKE ? OR i.hsnseccode COLLATE utf8mb4_unicode_ci LIKE ? OR mc.itemcategoryname COLLATE utf8mb4_unicode_ci LIKE ? OR c.itemcategoryname COLLATE utf8mb4_unicode_ci LIKE ? OR sc.itemcategoryname COLLATE utf8mb4_unicode_ci LIKE ? OR tp.taxprofilename COLLATE utf8mb4_unicode_ci LIKE ? OR b.brandname COLLATE utf8mb4_unicode_ci LIKE ?)`;
            const g = `%${global}%`;
            countParams.push(g, g, g, g, g, g, g, g, g, g);
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
     * Get item data by ID
     */
    getData: async (id) => {
        const sql = `
            SELECT i.itemid, i.itemname, i.itemdisplayname, i.genericname, i.itemcode,
                   i.sellingprice, i.purchaseprice, i.netcost, i.wholesaleprice,
                   i.mastercategoryid,
                   i.categoryid,
                   i.subcategoryid,
                   i.brandid, b.brandname,
                   i.baseunit, i.packageuom, i.safetyquantity, i.packingqty,
                   i.defaulttaxprofileid, i.sellingitemas, i.hsnseccode,
                   i.pricetype, i.ingredients, i.description,
                   i.ignoretax, i.ignorediscount, i.isnegativesale,
                   i.imgpath,
                   i.companyid, i.createdby, i.createddate, i.modifiedby, i.modifieddate,
                   i.ipaddress, i.isdeleted
            FROM itemmaster i
            LEFT JOIN itemcategorymaster mc ON i.mastercategoryid = mc.itemcategoryid AND mc.isdeleted = 0
            LEFT JOIN itemcategorymaster c ON i.categoryid = c.itemcategoryid AND c.isdeleted = 0
            LEFT JOIN itemcategorymaster sc ON i.subcategoryid = sc.itemcategoryid AND sc.isdeleted = 0
            LEFT JOIN brandmaster b ON i.brandid = b.brandid AND b.isdeleted = 0
            WHERE i.itemid = ? AND i.isdeleted = 0
        `;

        const results = await db.getResults(sql, [id]);
        return results.length > 0 ? results : [];
    },

    /**
     * Check if item exists by code
     */
    checkItemCodeExists: async (itemcode) => {
        try {
            const res = await db.getResults(
                `SELECT itemid FROM itemmaster WHERE itemcode = ? AND isdeleted = 0`,
                [itemcode]
            );
            return res && res.length > 0;
        } catch (error) {
            return false;
        }
    },

    /**
     * Check if item name exists
     */
    checkItemNameExists: async (itemname, excludeId = null) => {
        try {
            let sql = `SELECT itemid FROM itemmaster WHERE LOWER(itemname) = LOWER(?) AND isdeleted = 0`;
            const params = [itemname];
            
            if (excludeId) {
                sql += ` AND itemid != ?`;
                params.push(excludeId);
            }
            
            const res = await db.getResults(sql, params);
            return res && res.length > 0;
        } catch (error) {
            return false;
        }
    },

    /**
     * Create new item
     */
    create: async (data) => {
        try {
            // Add timestamps
            data.createddate = moment().format("YYYY-MM-DD HH:mm:ss");
            data.modifieddate = moment().format("YYYY-MM-DD HH:mm:ss");

            // Set isapproved = 1 for items created via admin panel
            data.isapproved = 1;
            data.approvalremark = data.approvalremark || 'Added by admin panel';

            const result = await db.insert('itemmaster', data);
            if (!result.insertId) {
                return { status: 500, success: 0, msg: "Failed to create item" };
            }

            return {
                status: 201,
                success: 1,
                msg: "Item created successfully",
                data: { itemId: result.insertId, ...data }
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { status: 409, success: 0, msg: "Item with this barcode already exists" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Update item
     */
    update: async (id, data) => {
        try {
            // Add modified timestamp
            data.modifieddate = moment().format("YYYY-MM-DD HH:mm:ss");
            
            const result = await db.update('itemmaster', 
                Object.keys(data).map(key => ({ column: key, value: data[key] && data[key] !== '' ? data[key] : null })),
                [{ column: 'itemid', value: id }, { column: 'isdeleted', value: 0 }]
            );
            
            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "Item not found" };
            }
            
            return { 
                status: 200, 
                success: 1, 
                msg: "Item updated successfully",
                data: { itemId: id, ...data }
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { status: 409, success: 0, msg: "Item with this barcode already exists" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Soft delete item
     */
    delete: async (id, data) => {
        try {
            const result = await db.update('itemmaster', 
                Object.keys(data).map(key => ({ column: key, value: data[key] })),
                [{ column: 'itemid', value: id }]
            );
            
            if (!result.affectedRows) {
                return { status: 500, success: 0, msg: "Item not found" };
            }
            
            return { status: 200, success: 1, msg: "Item deleted successfully" };
        } catch (error) {
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Get items by category
     */
    getItemsByCategory: async (categoryId, type = 'master') => {
        let sql = `
            SELECT itemid, itemname, itemdisplayname, itemcode, sellingprice
            FROM itemmaster
            WHERE isdeleted = 0
        `;
        
        if (type === 'master') {
            sql += ` AND mastercategoryid = ?`;
        } else if (type === 'category') {
            sql += ` AND categoryid = ?`;
        } else if (type === 'subcategory') {
            sql += ` AND subcategoryid = ?`;
        }
        
        sql += ` ORDER BY itemname ASC`;
        
        return await db.getResults(sql, [categoryId]);
    },

    /**
     * Get items by brand
     */
    getItemsByBrand: async (brandId) => {
        const sql = `
            SELECT itemid, itemname, itemdisplayname, itemcode, sellingprice
            FROM itemmaster
            WHERE brandid = ? AND isdeleted = 0
            ORDER BY itemname ASC
        `;
        
        return await db.getResults(sql, [brandId]);
    },

    /**
     * Search items
     */
    searchItems: async (searchTerm) => {
        const sql = `
            SELECT i.itemid, i.itemname, i.itemdisplayname, i.itemcode, i.sellingprice,
                   mc.itemcategoryname as mastercatname, c.itemcategoryname as catname,
                   sc.itemcategoryname as subcatname, tp.taxprofilename, b.brandname
            FROM itemmaster i
            LEFT JOIN itemcategorymaster mc ON i.mastercategoryid = mc.itemcategoryid AND mc.isdeleted = 0
            LEFT JOIN itemcategorymaster c ON i.categoryid = c.itemcategoryid AND c.isdeleted = 0
            LEFT JOIN itemcategorymaster sc ON i.subcategoryid = sc.itemcategoryid AND sc.isdeleted = 0
            LEFT JOIN brandmaster b ON i.brandid = b.brandid AND b.isdeleted = 0
            LEFT JOIN taxprofilemaster tp ON i.defaulttaxprofileid = tp.taxprofileid AND tp.isdeleted = 0
            WHERE i.isdeleted = 0
            AND (i.itemname COLLATE utf8mb4_unicode_ci LIKE ? OR i.itemdisplayname COLLATE utf8mb4_unicode_ci LIKE ? OR i.itemcode COLLATE utf8mb4_unicode_ci LIKE ? OR i.genericname COLLATE utf8mb4_unicode_ci LIKE ?
                 OR mc.itemcategoryname COLLATE utf8mb4_unicode_ci LIKE ? OR c.itemcategoryname COLLATE utf8mb4_unicode_ci LIKE ? OR sc.itemcategoryname COLLATE utf8mb4_unicode_ci LIKE ? OR tp.taxprofilename COLLATE utf8mb4_unicode_ci LIKE ? OR b.brandname COLLATE utf8mb4_unicode_ci LIKE ?)
            ORDER BY i.itemname ASC
            LIMIT 50
        `;

        const searchPattern = `%${searchTerm}%`;
        return await db.getResults(sql, [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern]);
    },

    /**
     * Update item stock
     */
    updateStock: async (itemId, quantity, operation = 'add') => {
        try {
            const operator = operation === 'add' ? '+' : '-';
            const sql = `
                UPDATE itemmaster 
                SET safetyquantity = safetyquantity ${operator} ?,
                    modifieddate = ?
                WHERE itemid = ? AND isdeleted = 0
            `;
            
            const result = await db.getResults(sql, [
                Math.abs(quantity),
                moment().format("YYYY-MM-DD HH:mm:ss"),
                itemId
            ]);
            
            return { success: result.affectedRows > 0 };
        } catch (error) {
            return { success: false, msg: error.message };
        }
    },

    /**
     * Get low stock items
     */
    getLowStockItems: async (threshold = 10) => {
        const sql = `
            SELECT itemid, itemname, itemdisplayname, itembarcode, safetyquantity
            FROM itemmaster
            WHERE safetyquantity <= ? AND isdeleted = 0
            ORDER BY safetyquantity ASC
        `;

        return await db.getResults(sql, [threshold]);
    },

    /**
     * Get unapproved items with optional company filter
     * Joins with related tables to get names instead of IDs
     * Now includes expanded similar items in the response
     */
    getUnapprovedItems: async (req) => {
        const { start = 0, length = 10, filters, sortField = 'createddate', sortOrder = 'desc', companyid } = req.query;

        let sql = `
            SELECT i.itemid, i.itemname, i.itemdisplayname, i.genericname, i.itemcode, i.itembarcode,
                   i.sellingprice, i.purchaseprice, i.wholesaleprice, i.netcost,
                   i.mastercategoryid, mc.itemcategoryname as mastercatname,
                   i.categoryid, c.itemcategoryname as catname,
                   i.subcategoryid, sc.itemcategoryname as subcatname,
                   i.brandid, b.brandname,
                   i.defaulttaxprofileid, tp.taxprofilename,
                   i.baseunit, i.packingqty, i.safetyquantity,
                   i.hsnseccode, i.description, i.ingredients,
                   i.imgpath, i.companyid, i.uniquekey, i.isglobal,
                   i.isapproved, i.approvalremark, i.rejectionreason,
                   i.createdby, i.createddate, i.modifiedby, i.modifieddate, i.ipaddress,
                   comp.companyname
            FROM itemmaster i
            LEFT JOIN itemcategorymaster mc ON i.mastercategoryid = mc.itemcategoryid AND mc.isdeleted = 0
            LEFT JOIN itemcategorymaster c ON i.categoryid = c.itemcategoryid AND c.isdeleted = 0
            LEFT JOIN itemcategorymaster sc ON i.subcategoryid = sc.itemcategoryid AND sc.isdeleted = 0
            LEFT JOIN brandmaster b ON i.brandid = b.brandid AND b.isdeleted = 0
            LEFT JOIN taxprofilemaster tp ON i.defaulttaxprofileid = tp.taxprofileid AND tp.isdeleted = 0
            LEFT JOIN companymaster comp ON i.companyid = comp.companyid AND comp.isdeleted = 0
            WHERE i.isdeleted = 0 AND i.isapproved = 0
        `;

        const params = [];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "item.model.js",
                    function: "getUnapprovedItems"
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Company filter
        if (companyid) {
            sql += ` AND i.companyid = ?`;
            params.push(companyid);
        }

        // Apply filters
        const filterFields = ['itemname', 'itemdisplayname', 'itemcode'];
        filterFields.forEach(field => {
            const value = getFilterValue(field);
            if (value) {
                sql += ` AND i.${field} LIKE ?`;
                params.push(`%${value}%`);
            }
        });

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (i.itemname LIKE ? OR i.itemdisplayname LIKE ? OR i.itemcode LIKE ?)`;
            const g = `%${global}%`;
            params.push(g, g, g);
        }

        // Sorting
        const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY i.${sortField} ${order}`;

        // Pagination
        const startNum = parseInt(start);
        const lengthNum = parseInt(length);

        if (lengthNum !== -1) {
            sql += ` LIMIT ?, ?`;
            params.push(startNum, lengthNum);
        }

        const data = await db.getResults(sql, params);

        // For each unapproved item, fetch similar items
        for (let item of data) {
            const similarItemsSql = `
                SELECT similar.itemid, similar.itemname, similar.itemdisplayname, similar.itembarcode,
                       similar.itemcode, similar.sellingprice, similar.purchaseprice,
                       similar.companyid, comp.companyname,
                       similar.isapproved, similar.isglobal,
                       mc.itemcategoryname as mastercatname,
                       c.itemcategoryname as catname,
                       sc.itemcategoryname as subcatname,
                       b.brandname,
                       CASE
                           WHEN similar.itembarcode = ? AND ? IS NOT NULL AND ? != '' THEN 'barcode'
                           WHEN similar.itemname LIKE CONCAT('%', ?, '%') OR ? LIKE CONCAT('%', similar.itemname, '%') THEN 'name'
                           ELSE 'other'
                       END AS match_type
                FROM itemmaster similar
                LEFT JOIN companymaster comp ON similar.companyid = comp.companyid AND comp.isdeleted = 0
                LEFT JOIN itemcategorymaster mc ON similar.mastercategoryid = mc.itemcategoryid AND mc.isdeleted = 0
                LEFT JOIN itemcategorymaster c ON similar.categoryid = c.itemcategoryid AND c.isdeleted = 0
                LEFT JOIN itemcategorymaster sc ON similar.subcategoryid = sc.itemcategoryid AND sc.isdeleted = 0
                LEFT JOIN brandmaster b ON similar.brandid = b.brandid AND b.isdeleted = 0
                WHERE similar.isdeleted = 0 AND similar.isapproved = 1
                AND similar.itemid != ?
                AND (
                    (similar.itembarcode = ? AND ? IS NOT NULL AND ? != '')
                    OR similar.itemname LIKE CONCAT('%', ?, '%')
                    OR ? LIKE CONCAT('%', similar.itemname, '%')
                )
                ORDER BY match_type ASC, similar.isapproved DESC, similar.createddate DESC
                LIMIT 10
            `;

            const similarParams = [
                item.itembarcode, item.itembarcode, item.itembarcode,  // For CASE WHEN
                item.itemname, item.itemname,  // For CASE WHEN
                item.itemid,  // For != condition
                item.itembarcode, item.itembarcode, item.itembarcode,  // For WHERE barcode condition
                item.itemname, item.itemname  // For WHERE name conditions
            ];

            const similarItems = await db.getResults(similarItemsSql, similarParams);
            item.similar_items = similarItems || [];
            item.similar_items_count = similarItems?.length || 0;
        }

        // Count total records
        let countSql = `SELECT COUNT(DISTINCT i.itemid) as total FROM itemmaster i WHERE i.isdeleted = 0 AND i.isapproved = 0`;
        let countParams = [];

        if (companyid) {
            countSql += ` AND i.companyid = ?`;
            countParams.push(companyid);
        }

        filterFields.forEach(field => {
            const value = getFilterValue(field);
            if (value) {
                countSql += ` AND i.${field} LIKE ?`;
                countParams.push(`%${value}%`);
            }
        });

        if (global) {
            countSql += ` AND (i.itemname LIKE ? OR i.itemdisplayname LIKE ? OR i.itemcode LIKE ?)`;
            const g = `%${global}%`;
            countParams.push(g, g, g);
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
     * Get similar items for duplicate detection
     * Finds items with same barcode or similar names
     */
    getSimilarItems: async (itemid) => {
        try {
            const sql = `
                SELECT similar.itemid, similar.itemname, similar.itemdisplayname, similar.itembarcode,
                       similar.itemcode, similar.sellingprice, similar.purchaseprice,
                       similar.companyid, comp.companyname,
                       similar.isapproved, similar.isglobal,
                       mc.itemcategoryname as mastercatname,
                       c.itemcategoryname as catname,
                       sc.itemcategoryname as subcatname,
                       b.brandname,
                       CASE
                           WHEN similar.itembarcode = i.itembarcode AND i.itembarcode IS NOT NULL AND i.itembarcode != '' THEN 'barcode'
                           WHEN similar.itemname LIKE CONCAT('%', i.itemname, '%') OR i.itemname LIKE CONCAT('%', similar.itemname, '%') THEN 'name'
                           ELSE 'other'
                       END AS match_type
                FROM itemmaster i
                CROSS JOIN itemmaster similar
                LEFT JOIN companymaster comp ON similar.companyid = comp.companyid AND comp.isdeleted = 0
                LEFT JOIN itemcategorymaster mc ON similar.mastercategoryid = mc.itemcategoryid AND mc.isdeleted = 0
                LEFT JOIN itemcategorymaster c ON similar.categoryid = c.itemcategoryid AND c.isdeleted = 0
                LEFT JOIN itemcategorymaster sc ON similar.subcategoryid = sc.itemcategoryid AND sc.isdeleted = 0
                LEFT JOIN brandmaster b ON similar.brandid = b.brandid AND b.isdeleted = 0
                WHERE i.itemid = ?
                AND similar.isdeleted = 0
                AND similar.itemid != i.itemid
                AND (
                    (similar.itembarcode = i.itembarcode AND i.itembarcode IS NOT NULL AND i.itembarcode != '')
                    OR similar.itemname LIKE CONCAT('%', i.itemname, '%')
                    OR i.itemname LIKE CONCAT('%', similar.itemname, '%')
                )
                ORDER BY match_type ASC, similar.isapproved DESC, similar.createddate DESC
                LIMIT 50
            `;

            const results = await db.getResults(sql, [itemid]);
            return {
                status: 200,
                success: 1,
                data: results || [],
                count: results?.length || 0
            };
        } catch (error) {
            winston.error(`Error getting similar items: ${error.message}`, {
                source: "item.model.js",
                function: "getSimilarItems",
                error: error.message,
                itemid
            });
            return { status: 500, success: 0, msg: error.message, data: [] };
        }
    },

    /**
     * Approve a single item - sets isglobal=1 to make item globally available
     * Also creates company_itemmaster mapping for the originating company
     */
    approveItem: async (itemid, approvalData) => {
        try {
            const { approvedby, approvalremark } = approvalData;

            // First, get item details to know which company created it
            const itemDetails = await db.getResults(
                `SELECT itemid, companyid, uniquekey, sellingprice, purchaseprice,
                        wholesaleprice, netcost, safetyquantity, ignoretax, ignorediscount,
                        itemcode, defaulttaxprofileid
                 FROM itemmaster
                 WHERE itemid = ? AND isdeleted = 0`,
                [itemid]
            );

            if (!itemDetails || itemDetails.length === 0) {
                return { status: 404, success: 0, msg: "Item not found" };
            }

            const item = itemDetails[0];

            // Update itemmaster to approve
            const result = await db.update('itemmaster',
                [
                    { column: 'isapproved', value: 1 },
                    { column: 'isglobal', value: 1 },
                    { column: 'approvalremark', value: approvalremark || 'Approved' },
                    { column: 'modifiedby', value: approvedby },
                    { column: 'modifieddate', value: moment().format("YYYY-MM-DD HH:mm:ss") }
                ],
                [{ column: 'itemid', value: itemid }, { column: 'isdeleted', value: 0 }]
            );

            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "Item not found" };
            }

            // Create company_itemmaster mapping for the originating company
            // Check if mapping already exists
            const existingMapping = await db.getResults(
                `SELECT id FROM company_itemmaster
                 WHERE companyid = ? AND itemid = ? AND isdeleted = 0`,
                [item.companyid, itemid]
            );

            const currDate = moment().format("YYYY-MM-DD HH:mm:ss");

            if (existingMapping && existingMapping.length > 0) {
                // Update existing mapping
                await db.update('company_itemmaster',
                    [
                        { column: 'isactive', value: 1 },
                        { column: 'modifiedby', value: approvedby },
                        { column: 'modifieddate', value: currDate }
                    ],
                    [
                        { column: 'companyid', value: item.companyid },
                        { column: 'itemid', value: itemid }
                    ]
                );
            } else {
                // Create new mapping
                await db.insert('company_itemmaster', [
                    { column: 'companyid', value: item.companyid },
                    { column: 'itemid', value: itemid },
                    { column: 'uniquekey', value: item.uniquekey },
                    { column: 'sellingprice', value: item.sellingprice || 0 },
                    { column: 'purchaseprice', value: item.purchaseprice || 0 },
                    { column: 'wholesaleprice', value: item.wholesaleprice || 0 },
                    { column: 'netcost', value: item.netcost || 0 },
                    { column: 'safetyquantity', value: item.safetyquantity },
                    { column: 'ignoretax', value: item.ignoretax || 0 },
                    { column: 'ignorediscount', value: item.ignorediscount || 0 },
                    { column: 'itemcode', value: item.itemcode },
                    { column: 'defaulttaxprofileid', value: item.defaulttaxprofileid },
                    { column: 'isactive', value: 1 },
                    { column: 'issync', value: 1 },
                    { column: 'lastsyncdate', value: currDate },
                    { column: 'createdby', value: approvedby },
                    { column: 'createddate', value: currDate },
                    { column: 'modifiedby', value: approvedby },
                    { column: 'modifieddate', value: currDate },
                    { column: 'isdeleted', value: 0 }
                ]);
            }

            winston.info("Item approved and mapped to company", {
                source: "item.model.js",
                function: "approveItem",
                itemid,
                companyid: item.companyid
            });

            return {
                status: 200,
                success: 1,
                msg: "Item approved successfully and mapped to company",
                data: { itemid, companyid: item.companyid }
            };
        } catch (error) {
            winston.error(`Error approving item: ${error.message}`, {
                source: "item.model.js",
                function: "approveItem",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                itemid: itemid
            });
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Reject a single item
     * - "Duplicate Item" → Soft delete item and map original item to company_itemmaster
     * - Other reasons → Keep as company-specific and map to company_itemmaster
     */
    rejectItem: async (itemid, rejectionData) => {
        try {
            const { rejectedby, rejectionreason, rejectionremark, replacewith } = rejectionData;

            // Validate rejection reason against static list
            const validReasons = REJECTION_REASONS.map(r => r.reason);
            if (rejectionreason && !validReasons.includes(rejectionreason)) {
                return {
                    status: 400,
                    success: 0,
                    msg: `Invalid rejection reason. Must be one of: ${validReasons.join(', ')}`
                };
            }

            // Get item details first
            const itemDetails = await db.getResults(
                `SELECT itemid, companyid, uniquekey, sellingprice, purchaseprice,
                        wholesaleprice, netcost, safetyquantity, ignoretax, ignorediscount,
                        itemcode, defaulttaxprofileid, itemname, itembarcode
                 FROM itemmaster
                 WHERE itemid = ?`,
                [itemid]
            );

            if (!itemDetails || itemDetails.length === 0) {
                return { status: 404, success: 0, msg: "Item not found" };
            }

            const item = itemDetails[0];
            const isDuplicate = rejectionreason === 'Duplicate Item';
            const currDate = moment().format("YYYY-MM-DD HH:mm:ss");

            let result;
            let originalItem = null;

            if (isDuplicate) {
                // For duplicates: Use the selected master item (replacewith) or find original/similar item
                if (replacewith) {
                    // Use the item ID selected by support team
                    const selectedItem = await db.getResults(
                        `SELECT itemid, itemname, itemdisplayname, itemcode, itembarcode,
                                categoryid, brandid, sellingprice, purchaseprice, wholesaleprice,
                                netcost, safetyquantity, ignoretax, ignorediscount, defaulttaxprofileid
                         FROM itemmaster
                         WHERE itemid = ? AND isdeleted = 0 AND isapproved = 1`,
                        [replacewith]
                    );

                    if (selectedItem && selectedItem.length > 0) {
                        originalItem = selectedItem[0];
                    }
                } else {
                    // Fallback: Auto-find the original/similar item to map instead
                    const similarItemSql = `
                        SELECT itemid, itemname, itemdisplayname, itemcode, itembarcode,
                               categoryid, brandid, sellingprice, purchaseprice, wholesaleprice,
                               netcost, safetyquantity, ignoretax, ignorediscount, defaulttaxprofileid
                        FROM itemmaster
                        WHERE isdeleted = 0
                          AND isapproved = 1
                          AND isglobal = 1
                          AND itemid != ?
                          AND (
                              (itembarcode = ? AND ? IS NOT NULL AND ? != '')
                              OR itemname LIKE CONCAT('%', ?, '%')
                          )
                        ORDER BY isapproved DESC, createddate ASC
                        LIMIT 1
                    `;

                    const similarItems = await db.getResults(similarItemSql, [
                        itemid,
                        item.itembarcode, item.itembarcode, item.itembarcode,
                        item.itemname
                    ]);

                    if (similarItems && similarItems.length > 0) {
                        originalItem = similarItems[0];
                    }
                }

                // Soft delete the duplicate item
                result = await db.update('itemmaster',
                    [
                        { column: 'isdeleted', value: 1 },
                        { column: 'rejectionreason', value: rejectionreason },
                        { column: 'approvalremark', value: rejectionremark || 'Rejected as duplicate' },
                        { column: 'modifiedby', value: rejectedby },
                        { column: 'modifieddate', value: currDate }
                    ],
                    [{ column: 'itemid', value: itemid }]
                );

                // Map the ORIGINAL item to company_itemmaster if found
                if (originalItem) {
                    // Check if mapping already exists
                    const existingMapping = await db.getResults(
                        `SELECT id FROM company_itemmaster
                         WHERE companyid = ? AND itemid = ? AND isdeleted = 0`,
                        [item.companyid, originalItem.itemid]
                    );

                    if (existingMapping && existingMapping.length > 0) {
                        // Update existing mapping
                        await db.update('company_itemmaster',
                            [
                                { column: 'isactive', value: 1 },
                                { column: 'modifiedby', value: rejectedby },
                                { column: 'modifieddate', value: currDate }
                            ],
                            [
                                { column: 'companyid', value: item.companyid },
                                { column: 'itemid', value: originalItem.itemid }
                            ]
                        );
                    } else {
                        // Create new mapping with original item
                        await db.insert('company_itemmaster', [
                            { column: 'companyid', value: item.companyid },
                            { column: 'itemid', value: originalItem.itemid },
                            { column: 'uniquekey', value: item.uniquekey }, // Keep the POS uniquekey for sync
                            { column: 'sellingprice', value: originalItem.sellingprice || 0 },
                            { column: 'purchaseprice', value: originalItem.purchaseprice || 0 },
                            { column: 'wholesaleprice', value: originalItem.wholesaleprice || 0 },
                            { column: 'netcost', value: originalItem.netcost || 0 },
                            { column: 'safetyquantity', value: originalItem.safetyquantity },
                            { column: 'ignoretax', value: originalItem.ignoretax || 0 },
                            { column: 'ignorediscount', value: originalItem.ignorediscount || 0 },
                            { column: 'itemcode', value: originalItem.itemcode },
                            { column: 'defaulttaxprofileid', value: originalItem.defaulttaxprofileid },
                            { column: 'isactive', value: 1 },
                            { column: 'issync', value: 1 },
                            { column: 'lastsyncdate', value: currDate },
                            { column: 'createdby', value: rejectedby },
                            { column: 'createddate', value: currDate },
                            { column: 'modifiedby', value: rejectedby },
                            { column: 'modifieddate', value: currDate },
                            { column: 'isdeleted', value: 0 }
                        ]);
                    }

                    winston.info("Duplicate item rejected and original item mapped to company", {
                        source: "item.model.js",
                        function: "rejectItem",
                        duplicateItemid: itemid,
                        originalItemid: originalItem.itemid,
                        companyid: item.companyid
                    });
                }
            } else {
                // For other reasons: Keep as company-specific (not global)
                result = await db.update('itemmaster',
                    [
                        { column: 'isapproved', value: 0 }, // Keep unapproved
                        { column: 'isglobal', value: 0 },   // Make company-specific only
                        { column: 'rejectionreason', value: rejectionreason },
                        { column: 'approvalremark', value: rejectionremark || 'Kept as company-specific' },
                        { column: 'modifiedby', value: rejectedby },
                        { column: 'modifieddate', value: currDate }
                    ],
                    [{ column: 'itemid', value: itemid }]
                );

                // Map the rejected item to company_itemmaster (company-specific)
                const existingMapping = await db.getResults(
                    `SELECT id FROM company_itemmaster
                     WHERE companyid = ? AND itemid = ? AND isdeleted = 0`,
                    [item.companyid, itemid]
                );

                if (existingMapping && existingMapping.length > 0) {
                    // Update existing mapping
                    await db.update('company_itemmaster',
                        [
                            { column: 'isactive', value: 1 },
                            { column: 'modifiedby', value: rejectedby },
                            { column: 'modifieddate', value: currDate }
                        ],
                        [
                            { column: 'companyid', value: item.companyid },
                            { column: 'itemid', value: itemid }
                        ]
                    );
                } else {
                    // Create new mapping
                    await db.insert('company_itemmaster', [
                        { column: 'companyid', value: item.companyid },
                        { column: 'itemid', value: itemid },
                        { column: 'uniquekey', value: item.uniquekey },
                        { column: 'sellingprice', value: item.sellingprice || 0 },
                        { column: 'purchaseprice', value: item.purchaseprice || 0 },
                        { column: 'wholesaleprice', value: item.wholesaleprice || 0 },
                        { column: 'netcost', value: item.netcost || 0 },
                        { column: 'safetyquantity', value: item.safetyquantity },
                        { column: 'ignoretax', value: item.ignoretax || 0 },
                        { column: 'ignorediscount', value: item.ignorediscount || 0 },
                        { column: 'itemcode', value: item.itemcode },
                        { column: 'defaulttaxprofileid', value: item.defaulttaxprofileid },
                        { column: 'isactive', value: 1 },
                        { column: 'issync', value: 1 },
                        { column: 'lastsyncdate', value: currDate },
                        { column: 'createdby', value: rejectedby },
                        { column: 'createddate', value: currDate },
                        { column: 'modifiedby', value: rejectedby },
                        { column: 'modifieddate', value: currDate },
                        { column: 'isdeleted', value: 0 }
                    ]);
                }

                winston.info("Item kept as company-specific and mapped to company", {
                    source: "item.model.js",
                    function: "rejectItem",
                    itemid,
                    companyid: item.companyid
                });
            }

            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "Item not found" };
            }

            return {
                status: 200,
                success: 1,
                msg: isDuplicate
                    ? "Item rejected as duplicate and original item mapped"
                    : "Item kept as company-specific and mapped",
                data: {
                    itemid,
                    isDuplicate,
                    action: isDuplicate ? 'deleted' : 'company_specific',
                    originalItem: originalItem ? {
                        itemid: originalItem.itemid,
                        itemname: originalItem.itemname,
                        itemcode: originalItem.itemcode,
                        itembarcode: originalItem.itembarcode
                    } : null,
                    companyid: item.companyid
                }
            };
        } catch (error) {
            winston.error(`Error rejecting item: ${error.message}`, {
                source: "item.model.js",
                function: "rejectItem",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                itemid: itemid
            });
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Bulk approve items and create company_itemmaster mappings
     */
    bulkApproveItems: async (itemids, approvalData) => {
        try {
            const { approvedby, approvalremark } = approvalData;
            const currDate = moment().format("YYYY-MM-DD HH:mm:ss");

            // Get item details for all items to be approved
            const placeholders = itemids.map(() => '?').join(',');
            const itemDetails = await db.getResults(
                `SELECT itemid, companyid, uniquekey, sellingprice, purchaseprice,
                        wholesaleprice, netcost, safetyquantity, ignoretax, ignorediscount,
                        itemcode, defaulttaxprofileid
                 FROM itemmaster
                 WHERE itemid IN (${placeholders}) AND isdeleted = 0`,
                itemids
            );

            if (!itemDetails || itemDetails.length === 0) {
                return { status: 404, success: 0, msg: "No items found to approve" };
            }

            // Update itemmaster for all items
            const sql = `
                UPDATE itemmaster
                SET isapproved = 1,
                    isglobal = 1,
                    approvalremark = ?,
                    modifiedby = ?,
                    modifieddate = ?
                WHERE itemid IN (${placeholders}) AND isdeleted = 0
            `;

            const params = [
                approvalremark || 'Bulk approved',
                approvedby,
                currDate,
                ...itemids
            ];

            const result = await db.executeQuery(sql, params);

            // Create company_itemmaster mappings for each item
            let mappedCount = 0;
            for (const item of itemDetails) {
                try {
                    // Check if mapping already exists
                    const existingMapping = await db.getResults(
                        `SELECT id FROM company_itemmaster
                         WHERE companyid = ? AND itemid = ? AND isdeleted = 0`,
                        [item.companyid, item.itemid]
                    );

                    if (existingMapping && existingMapping.length > 0) {
                        // Update existing mapping
                        await db.update('company_itemmaster',
                            [
                                { column: 'isactive', value: 1 },
                                { column: 'modifiedby', value: approvedby },
                                { column: 'modifieddate', value: currDate }
                            ],
                            [
                                { column: 'companyid', value: item.companyid },
                                { column: 'itemid', value: item.itemid }
                            ]
                        );
                    } else {
                        // Create new mapping
                        await db.insert('company_itemmaster', [
                            { column: 'companyid', value: item.companyid },
                            { column: 'itemid', value: item.itemid },
                            { column: 'uniquekey', value: item.uniquekey },
                            { column: 'sellingprice', value: item.sellingprice || 0 },
                            { column: 'purchaseprice', value: item.purchaseprice || 0 },
                            { column: 'wholesaleprice', value: item.wholesaleprice || 0 },
                            { column: 'netcost', value: item.netcost || 0 },
                            { column: 'safetyquantity', value: item.safetyquantity },
                            { column: 'ignoretax', value: item.ignoretax || 0 },
                            { column: 'ignorediscount', value: item.ignorediscount || 0 },
                            { column: 'itemcode', value: item.itemcode },
                            { column: 'defaulttaxprofileid', value: item.defaulttaxprofileid },
                            { column: 'isactive', value: 1 },
                            { column: 'issync', value: 1 },
                            { column: 'lastsyncdate', value: currDate },
                            { column: 'createdby', value: approvedby },
                            { column: 'createddate', value: currDate },
                            { column: 'modifiedby', value: approvedby },
                            { column: 'modifieddate', value: currDate },
                            { column: 'isdeleted', value: 0 }
                        ]);
                    }
                    mappedCount++;
                } catch (mappingError) {
                    winston.error(`Error mapping item ${item.itemid} to company ${item.companyid}`, {
                        source: "item.model.js",
                        function: "bulkApproveItems",
                        error: mappingError.message,
                        itemid: item.itemid,
                        companyid: item.companyid
                    });
                }
            }

            winston.info("Bulk items approved and mapped to companies", {
                source: "item.model.js",
                function: "bulkApproveItems",
                approvedCount: result.affectedRows,
                mappedCount
            });

            return {
                status: 200,
                success: 1,
                msg: `${result.affectedRows} item(s) approved and ${mappedCount} mapped successfully`,
                data: { approved: result.affectedRows, mapped: mappedCount }
            };
        } catch (error) {
            winston.error(`Error bulk approving items: ${error.message}`, {
                source: "item.model.js",
                function: "bulkApproveItems",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                itemids: itemids
            });
            return { status: 500, success: 0, msg: error.message };
        }
    },

    bulkRejectItems: async (itemids, rejectionData) => {
        try {
            const { rejectedby, rejectionreason, rejectionremark } = rejectionData;

            // Validate rejection reason against static list
            const validReasons = REJECTION_REASONS.map(r => r.reason);
            if (rejectionreason && !validReasons.includes(rejectionreason)) {
                return {
                    status: 400,
                    success: 0,
                    msg: `Invalid rejection reason. Must be one of: ${validReasons.join(', ')}`
                };
            }

            const currDate = moment().format("YYYY-MM-DD HH:mm:ss");
            const isDuplicate = rejectionreason === 'Duplicate Item';

            // Get item details for all items to be rejected
            const placeholders = itemids.map(() => '?').join(',');
            const itemDetails = await db.getResults(
                `SELECT itemid, companyid, uniquekey, sellingprice, purchaseprice,
                        wholesaleprice, netcost, safetyquantity, ignoretax, ignorediscount,
                        itemcode, defaulttaxprofileid, itemname, itembarcode
                 FROM itemmaster
                 WHERE itemid IN (${placeholders})`,
                itemids
            );

            if (!itemDetails || itemDetails.length === 0) {
                return { status: 404, success: 0, msg: "No items found to reject" };
            }

            // Update itemmaster based on rejection type
            let sql, params;
            if (isDuplicate) {
                // For duplicates: Soft delete
                sql = `
                    UPDATE itemmaster
                    SET isdeleted = 1,
                        rejectionreason = ?,
                        approvalremark = ?,
                        modifiedby = ?,
                        modifieddate = ?
                    WHERE itemid IN (${placeholders})
                `;
                params = [
                    rejectionreason,
                    rejectionremark || 'Bulk rejected as duplicate',
                    rejectedby,
                    currDate,
                    ...itemids
                ];
            } else {
                // For other reasons: Keep as company-specific
                sql = `
                    UPDATE itemmaster
                    SET isapproved = 0,
                        isglobal = 0,
                        rejectionreason = ?,
                        approvalremark = ?,
                        modifiedby = ?,
                        modifieddate = ?
                    WHERE itemid IN (${placeholders})
                `;
                params = [
                    rejectionreason,
                    rejectionremark || 'Kept as company-specific',
                    rejectedby,
                    currDate,
                    ...itemids
                ];
            }

            const result = await db.executeQuery(sql, params);

            // Create company_itemmaster mappings
            let mappedCount = 0;
            for (const item of itemDetails) {
                try {
                    if (isDuplicate) {
                        // Find and map original item for duplicates
                        const similarItemSql = `
                            SELECT itemid, itemname, itemdisplayname, itemcode, itembarcode,
                                   categoryid, brandid, sellingprice, purchaseprice, wholesaleprice,
                                   netcost, safetyquantity, ignoretax, ignorediscount, defaulttaxprofileid
                            FROM itemmaster
                            WHERE isdeleted = 0
                              AND isapproved = 1
                              AND isglobal = 1
                              AND itemid != ?
                              AND (
                                  (itembarcode = ? AND ? IS NOT NULL AND ? != '')
                                  OR itemname LIKE CONCAT('%', ?, '%')
                              )
                            ORDER BY isapproved DESC, createddate ASC
                            LIMIT 1
                        `;

                        const similarItems = await db.getResults(similarItemSql, [
                            item.itemid,
                            item.itembarcode, item.itembarcode, item.itembarcode,
                            item.itemname
                        ]);

                        if (similarItems && similarItems.length > 0) {
                            const originalItem = similarItems[0];

                            // Check if mapping already exists
                            const existingMapping = await db.getResults(
                                `SELECT id FROM company_itemmaster
                                 WHERE companyid = ? AND itemid = ? AND isdeleted = 0`,
                                [item.companyid, originalItem.itemid]
                            );

                            if (existingMapping && existingMapping.length > 0) {
                                // Update existing mapping
                                await db.update('company_itemmaster',
                                    [
                                        { column: 'isactive', value: 1 },
                                        { column: 'modifiedby', value: rejectedby },
                                        { column: 'modifieddate', value: currDate }
                                    ],
                                    [
                                        { column: 'companyid', value: item.companyid },
                                        { column: 'itemid', value: originalItem.itemid }
                                    ]
                                );
                            } else {
                                // Create new mapping with original item
                                await db.insert('company_itemmaster', [
                                    { column: 'companyid', value: item.companyid },
                                    { column: 'itemid', value: originalItem.itemid },
                                    { column: 'uniquekey', value: item.uniquekey },
                                    { column: 'sellingprice', value: originalItem.sellingprice || 0 },
                                    { column: 'purchaseprice', value: originalItem.purchaseprice || 0 },
                                    { column: 'wholesaleprice', value: originalItem.wholesaleprice || 0 },
                                    { column: 'netcost', value: originalItem.netcost || 0 },
                                    { column: 'safetyquantity', value: originalItem.safetyquantity },
                                    { column: 'ignoretax', value: originalItem.ignoretax || 0 },
                                    { column: 'ignorediscount', value: originalItem.ignorediscount || 0 },
                                    { column: 'itemcode', value: originalItem.itemcode },
                                    { column: 'defaulttaxprofileid', value: originalItem.defaulttaxprofileid },
                                    { column: 'isactive', value: 1 },
                                    { column: 'issync', value: 1 },
                                    { column: 'lastsyncdate', value: currDate },
                                    { column: 'createdby', value: rejectedby },
                                    { column: 'createddate', value: currDate },
                                    { column: 'modifiedby', value: rejectedby },
                                    { column: 'modifieddate', value: currDate },
                                    { column: 'isdeleted', value: 0 }
                                ]);
                            }
                            mappedCount++;
                        }
                    } else {
                        // Map the rejected item itself for company-specific items
                        const existingMapping = await db.getResults(
                            `SELECT id FROM company_itemmaster
                             WHERE companyid = ? AND itemid = ? AND isdeleted = 0`,
                            [item.companyid, item.itemid]
                        );

                        if (existingMapping && existingMapping.length > 0) {
                            // Update existing mapping
                            await db.update('company_itemmaster',
                                [
                                    { column: 'isactive', value: 1 },
                                    { column: 'modifiedby', value: rejectedby },
                                    { column: 'modifieddate', value: currDate }
                                ],
                                [
                                    { column: 'companyid', value: item.companyid },
                                    { column: 'itemid', value: item.itemid }
                                ]
                            );
                        } else {
                            // Create new mapping
                            await db.insert('company_itemmaster', [
                                { column: 'companyid', value: item.companyid },
                                { column: 'itemid', value: item.itemid },
                                { column: 'uniquekey', value: item.uniquekey },
                                { column: 'sellingprice', value: item.sellingprice || 0 },
                                { column: 'purchaseprice', value: item.purchaseprice || 0 },
                                { column: 'wholesaleprice', value: item.wholesaleprice || 0 },
                                { column: 'netcost', value: item.netcost || 0 },
                                { column: 'safetyquantity', value: item.safetyquantity },
                                { column: 'ignoretax', value: item.ignoretax || 0 },
                                { column: 'ignorediscount', value: item.ignorediscount || 0 },
                                { column: 'itemcode', value: item.itemcode },
                                { column: 'defaulttaxprofileid', value: item.defaulttaxprofileid },
                                { column: 'isactive', value: 1 },
                                { column: 'issync', value: 1 },
                                { column: 'lastsyncdate', value: currDate },
                                { column: 'createdby', value: rejectedby },
                                { column: 'createddate', value: currDate },
                                { column: 'modifiedby', value: rejectedby },
                                { column: 'modifieddate', value: currDate },
                                { column: 'isdeleted', value: 0 }
                            ]);
                        }
                        mappedCount++;
                    }
                } catch (mappingError) {
                    winston.error(`Error mapping item ${item.itemid} to company ${item.companyid}`, {
                        source: "item.model.js",
                        function: "bulkRejectItems",
                        error: mappingError.message,
                        itemid: item.itemid,
                        companyid: item.companyid
                    });
                }
            }

            winston.info("Bulk items rejected and mapped to companies", {
                source: "item.model.js",
                function: "bulkRejectItems",
                rejectedCount: result.affectedRows,
                mappedCount,
                isDuplicate
            });

            return {
                status: 200,
                success: 1,
                msg: isDuplicate
                    ? `${result.affectedRows} item(s) rejected as duplicate and ${mappedCount} original items mapped`
                    : `${result.affectedRows} item(s) kept as company-specific and ${mappedCount} mapped`,
                data: {
                    affected: result.affectedRows,
                    mapped: mappedCount,
                    isDuplicate,
                    action: isDuplicate ? 'deleted' : 'company_specific'
                }
            };
        } catch (error) {
            winston.error(`Error bulk rejecting items: ${error.message}`, {
                source: "item.model.js",
                function: "bulkRejectItems",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                itemids: itemids
            });
            return { status: 500, success: 0, msg: error.message };
        }
    },
};