const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Current Stock Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns current stock data with pagination info
     */
    getCurrentStockReport: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField = "productname",
                sortOrder = "asc",
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
            let whereConditions = ["csm.isdeleted = 0", "im.isdeleted = 0"];
            let queryParams = [];

            // Company filter (required)
            const companyid = getFilterValue("companyid");
            if (companyid) {
                whereConditions.push("csm.companyid = ?");
                queryParams.push(companyid);
            }

            // Location filter
            const locationid = locationId || getFilterValue("locationid");
            if (locationid) {
                whereConditions.push("csm.locationid = ?");
                queryParams.push(locationid);
            }

            // Product filter
            const productid = getFilterValue("productid");
            const pmuniquekey = getFilterValue("pmuniquekey");
            if (pmuniquekey) {
                whereConditions.push("csm.pmuniquekey = ?");
                queryParams.push(pmuniquekey);
            } else if (productid) {
                whereConditions.push("csm.productid = ?");
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

            // Brand filter
            const brandid = getFilterValue("brandid");
            if (brandid) {
                whereConditions.push("im.brandid = ?");
                queryParams.push(brandid);
            }

            const whereClause = whereConditions.join(" AND ");

            // Text field filters (LIKE match)
            const textFilters = {
                mastercategory: "mcm.itemcategoryname",
                category: "icm.itemcategoryname",
                productname: "im.itemname",
                brand: "bm.brandname",
                batchlotnumber: "csm.batchid",
                batchdate: "DATE_FORMAT(csm.batchdate, '%d/%m/%Y')",
                expirydate: "DATE_FORMAT(csm.expirydate, '%d/%m/%Y')",
                uom: "uom.uomname",
            };

            // Numeric field filters (exact match)
            const numericFilters = {
                safetyquantity: "im.safetyquantity",
                stock: "csm.quantity",
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
                    whereConditions.push(`CAST(${dbField} AS DECIMAL(18,2)) = ?`);
                    queryParams.push(parseFloat(value));
                }
            });

            const finalWhereClause = whereConditions.join(" AND ");

            // Count total records
            const countQuery = `
                SELECT COUNT(*) as total
                FROM currentstockmaster csm
                LEFT JOIN itemmaster im ON im.uniquekey = csm.pmuniquekey AND im.isdeleted = 0
                LEFT JOIN itemcategorymaster mcm ON mcm.itemcategoryid = im.mastercategoryid AND mcm.isdeleted = 0
                LEFT JOIN itemcategorymaster icm ON icm.itemcategoryid = im.categoryid AND icm.isdeleted = 0
                LEFT JOIN brandmaster bm ON bm.brandid = im.brandid AND bm.isdeleted = 0
                LEFT JOIN uommaster uom ON uom.uomid = im.defaultuom AND uom.isdeleted = 0
                WHERE ${finalWhereClause}
            `;

            const countResult = await db.getResults(countQuery, queryParams);
            const totalRecords = countResult[0]?.total || 0;

            // Sorting - Map frontend field names to database fields/aliases
            const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

            const sortFieldMap = {
                mastercategory: "mcm.itemcategoryname",
                category: "icm.itemcategoryname",
                productname: "im.itemname",
                brand: "bm.brandname",
                safetyquantity: "im.safetyquantity",
                batchlotnumber: "csm.batchid",
                batchdate: "csm.batchdate",
                expirydate: "csm.expirydate",
                stock: "csm.quantity",
                uom: "uom.uomname",
            };

            const mappedSortField =
                sortFieldMap[sortField?.toLowerCase()] || sortFieldMap["productname"];

            // Main query for current stock report
            let dataQuery = `
                SELECT
                    mcm.itemcategoryname AS mastercategory,
                    icm.itemcategoryname AS category,
                    im.itemname AS productname,
                    bm.brandname AS brand,
                    im.safetyquantity AS safetyquantity,
                    csm.batchid AS batchlotnumber,
                    DATE_FORMAT(csm.batchdate, '%d/%m/%Y') AS batchdate,
                    DATE_FORMAT(csm.expirydate, '%d/%m/%Y') AS expirydate,
                    ROUND(CAST(csm.quantity AS DECIMAL(18,2)), 2) AS stock,
                    uom.uomname AS uom
                FROM currentstockmaster csm
                LEFT JOIN itemmaster im ON im.uniquekey = csm.pmuniquekey AND im.isdeleted = 0
                LEFT JOIN itemcategorymaster mcm ON mcm.itemcategoryid = im.mastercategoryid AND mcm.isdeleted = 0
                LEFT JOIN itemcategorymaster icm ON icm.itemcategoryid = im.categoryid AND icm.isdeleted = 0
                LEFT JOIN brandmaster bm ON bm.brandid = im.brandid AND bm.isdeleted = 0
                LEFT JOIN uommaster uom ON uom.uomid = im.defaultuom AND uom.isdeleted = 0
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

            const currentStockData = await db.getResults(dataQuery, queryParams);

            // Calculate total pages
            const totalPages = lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1;

            return {
                data: currentStockData,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching current stock report: ${error.message}`, {
                source: "currentStockReport.model.js",
                function: "getCurrentStockReport",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters
            });
            throw error;
        }
    },
};
