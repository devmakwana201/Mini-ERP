const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Stock Adjustment Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns stock adjustment data with pagination info
     */
    getStockAdjustmentReport: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField = "createddatetime",
                sortOrder = "desc",
                locationId,
            } = req.query;

            // Parse filters
            let parsedFilters = {};
            if (filters) {
                try {
                    parsedFilters = JSON.parse(filters);
                } catch (err) {
                    winston.warn("Invalid filters JSON received");
                }
            }

            // Helper function to get filter value
            const getFilterValue = (field) => {
                const val = parsedFilters[field];
                return typeof val === "object" ? val.value : val;
            };

            // Base WHERE conditions
            let whereConditions = ["sad.isdeleted = 0", "im.isdeleted = 0"];
            let queryParams = [];

            // Company filter (required)
            const companyid = getFilterValue("companyid");
            if (companyid) {
                whereConditions.push("sad.companyid = ?");
                queryParams.push(companyid);
            }

            // Location filter
            const locationid = locationId || getFilterValue("locationid");
            if (locationid) {
                whereConditions.push("sad.locationid = ?");
                queryParams.push(locationid);
            }

            // Date range filter
            const fromDate = getFilterValue("fromDate");
            const toDate = getFilterValue("toDate");
            if (fromDate && toDate) {
                whereConditions.push(
                    "DATE(CASE WHEN sad.clientcreateddate IS NOT NULL THEN sad.clientcreateddate ELSE sad.createddate END) BETWEEN ? AND ?"
                );
                queryParams.push(fromDate, toDate);
            } else if (fromDate) {
                whereConditions.push(
                    "DATE(CASE WHEN sad.clientcreateddate IS NOT NULL THEN sad.clientcreateddate ELSE sad.createddate END) >= ?"
                );
                queryParams.push(fromDate);
            } else if (toDate) {
                whereConditions.push(
                    "DATE(CASE WHEN sad.clientcreateddate IS NOT NULL THEN sad.clientcreateddate ELSE sad.createddate END) <= ?"
                );
                queryParams.push(toDate);
            }

            // Product filter
            const productid = getFilterValue("productid");
            const pmuniquekey = getFilterValue("pmuniquekey");
            if (pmuniquekey) {
                whereConditions.push("sad.pmuniquekey = ?");
                queryParams.push(pmuniquekey);
            } else if (productid) {
                whereConditions.push("sad.itemid = ?");
                queryParams.push(productid);
            }

            // Master Category filter
            const mastercategoryid = getFilterValue("mastercategoryid");
            if (mastercategoryid) {
                whereConditions.push("im.mastercategoryid = ?");
                queryParams.push(mastercategoryid);
            }

            // Category filter
            const categoryid = getFilterValue("categoryid");
            if (categoryid) {
                whereConditions.push("im.categoryid = ?");
                queryParams.push(categoryid);
            }

            // Sub Category filter
            const subcategoryid = getFilterValue("subcategoryid");
            if (subcategoryid) {
                whereConditions.push("im.subcategoryid = ?");
                queryParams.push(subcategoryid);
            }

            // Brand filter
            const brandid = getFilterValue("brandid");
            if (brandid) {
                whereConditions.push("im.brandid = ?");
                queryParams.push(brandid);
            }

            const whereClause = whereConditions.join(" AND ");

            // Text field filters (LIKE match)
            const textFilters = {
                createddatetime:
                    "CASE WHEN sad.clientcreateddate IS NOT NULL THEN DATE_FORMAT(sad.clientcreateddate, '%d/%m/%Y %h:%i:%s %p') ELSE DATE_FORMAT(sad.createddate, '%d/%m/%Y %h:%i:%s %p') END",
                productname: "im.itemname",
                brand: "bm.brandname",
                mastercategory: "mcm.itemcategoryname",
                category: "icm.itemcategoryname",
                subcategory: "scm.itemcategoryname",
                uom: "uom.uomname",
                remark: "sad.remarks",
                createdby:
                    "CASE WHEN sad.clientcreatedby IS NOT NULL THEN CONCAT(cum.firstname, ' ', cum.lastname) ELSE CONCAT(um.firstname, ' ', um.lastname) END",
            };

            // Numeric field filters (exact match)
            const numericFilters = {
                totalstock: "sad.quantity",
            };

            // Global search filter
            const global = getFilterValue("global");
            if (global) {
                const searchConditions = [];

                // Add text field searches
                const textSearchFields = Object.values(textFilters);
                textSearchFields.forEach((field) => {
                    searchConditions.push(`${field} LIKE ?`);
                });

                // Add numeric field searches (converted to text for LIKE search)
                const numericSearchFields = Object.values(numericFilters);
                numericSearchFields.forEach((field) => {
                    searchConditions.push(`CAST(${field} AS CHAR) LIKE ?`);
                });

                whereConditions.push(`(${searchConditions.join(" OR ")})`);

                const searchTerm = `%${global}%`;
                const totalFields = textSearchFields.length + numericSearchFields.length;
                for (let i = 0; i < totalFields; i++) {
                    queryParams.push(searchTerm);
                }
            }

            // Individual field filters
            Object.entries(textFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value) {
                    whereConditions.push(`${dbField} LIKE ?`);
                    queryParams.push(`%${value}%`);
                }
            });

            Object.entries(numericFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value) {
                    whereConditions.push(`ROUND(CAST(${dbField} AS DECIMAL(18,2)), 2) = ?`);
                    queryParams.push(parseFloat(value));
                }
            });

            const finalWhereClause = whereConditions.join(" AND ");

            // Count total records
            const countQuery = `
                SELECT COUNT(*) as total
                FROM stockadjustmentdetails sad
                LEFT JOIN itemmaster im ON im.uniquekey = sad.pmuniquekey AND im.isdeleted = 0
                LEFT JOIN itemcategorymaster mcm ON mcm.itemcategoryid = im.mastercategoryid AND mcm.isdeleted = 0
                LEFT JOIN itemcategorymaster icm ON icm.itemcategoryid = im.categoryid AND icm.isdeleted = 0
                LEFT JOIN itemcategorymaster scm ON scm.itemcategoryid = im.subcategoryid AND scm.isdeleted = 0
                LEFT JOIN brandmaster bm ON bm.brandid = im.brandid AND bm.isdeleted = 0
                LEFT JOIN uommaster uom ON uom.uomid = im.defaultuom AND uom.isdeleted = 0
                LEFT JOIN usermaster um ON um.userid = sad.createdby AND um.isdeleted = 0
                LEFT JOIN usermaster cum ON cum.userid = sad.clientcreatedby AND cum.isdeleted = 0
                WHERE ${finalWhereClause}
            `;

            const countResult = await db.getResults(countQuery, queryParams);
            const totalRecords = countResult[0]?.total || 0;

            // Sorting - Map frontend field names to database fields/aliases
            const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

            const sortFieldMap = {
                createddatetime:
                    "CASE WHEN sad.clientcreateddate IS NOT NULL THEN sad.clientcreateddate ELSE sad.createddate END",
                productname: "im.itemname",
                brand: "bm.brandname",
                mastercategory: "mcm.itemcategoryname",
                category: "icm.itemcategoryname",
                subcategory: "scm.itemcategoryname",
                uom: "uom.uomname",
                totalstock: "sad.quantity",
                remark: "sad.remarks",
                createdby: "um.firstname",
            };

            const mappedSortField =
                sortFieldMap[sortField?.toLowerCase()] || sortFieldMap["createddatetime"];

            // Main query for stock adjustment report
            let dataQuery = `
                SELECT
                    CASE
                        WHEN sad.clientcreateddate IS NOT NULL THEN DATE_FORMAT(sad.clientcreateddate, '%d/%m/%Y %h:%i:%s %p')
                        ELSE DATE_FORMAT(sad.createddate, '%d/%m/%Y %h:%i:%s %p')
                    END AS createddatetime,
                    im.itemname AS productname,
                    bm.brandname AS brand,
                    mcm.itemcategoryname AS mastercategory,
                    icm.itemcategoryname AS category,
                    scm.itemcategoryname AS subcategory,
                    uom.uomname AS uom,
                    ROUND(CAST(sad.quantity AS DECIMAL(18,2)), 2) AS totalstock,
                    sad.remarks AS remark,
                    CASE
                        WHEN sad.clientcreatedby IS NOT NULL THEN CONCAT(cum.firstname, ' ', cum.lastname)
                        ELSE CONCAT(um.firstname, ' ', um.lastname)
                    END AS createdby
                FROM stockadjustmentdetails sad
                LEFT JOIN itemmaster im ON im.uniquekey = sad.pmuniquekey AND im.isdeleted = 0
                LEFT JOIN itemcategorymaster mcm ON mcm.itemcategoryid = im.mastercategoryid AND mcm.isdeleted = 0
                LEFT JOIN itemcategorymaster icm ON icm.itemcategoryid = im.categoryid AND icm.isdeleted = 0
                LEFT JOIN itemcategorymaster scm ON scm.itemcategoryid = im.subcategoryid AND scm.isdeleted = 0
                LEFT JOIN brandmaster bm ON bm.brandid = im.brandid AND bm.isdeleted = 0
                LEFT JOIN uommaster uom ON uom.uomid = im.defaultuom AND uom.isdeleted = 0
                LEFT JOIN usermaster um ON um.userid = sad.createdby AND um.isdeleted = 0
                LEFT JOIN usermaster cum ON cum.userid = sad.clientcreatedby AND cum.isdeleted = 0
                WHERE ${finalWhereClause}
                ORDER BY ${mappedSortField} ${order}
            `;

            // Pagination using start and length
            const startNum = parseInt(start);
            const lengthNum = parseInt(length);

            if (lengthNum !== -1) {
                dataQuery += ` LIMIT ?, ?`;
                queryParams.push(startNum, lengthNum);
            }

            const stockAdjustmentData = await db.getResults(dataQuery, queryParams);

            // Calculate total pages
            const totalPages = lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1;

            return {
                data: stockAdjustmentData,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching stock adjustment report: ${error.message}`, {
                source: "stockAdjustmentReport.model.js",
                function: "getStockAdjustmentReport",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters,
            });
            throw error;
        }
    },
};
