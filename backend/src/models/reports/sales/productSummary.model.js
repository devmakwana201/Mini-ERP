const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Product Summary Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns product summary data with pagination info
     */
    getProductSummary: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField,
                sortOrder,
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
            let whereConditions = ["om.isdeleted = 0", "opd.isdeleted = 0"];
            let queryParams = [];

            // Company filter (required)
            const companyid = getFilterValue("companyid");
            if (companyid) {
                whereConditions.push("om.companyid = ?");
                queryParams.push(companyid);
            }

            // Location filter
            const locationid = locationId || getFilterValue("locationid");
            if (locationid) {
                whereConditions.push("om.locationid = ?");
                queryParams.push(locationid);
            }

            // Date range filter
            const fromDate = getFilterValue("fromDate");
            const toDate = getFilterValue("toDate");
            if (fromDate && toDate) {
                whereConditions.push("DATE(om.orderdate) BETWEEN ? AND ?");
                queryParams.push(fromDate, toDate);
            } else if (fromDate) {
                whereConditions.push("DATE(om.orderdate) >= ?");
                queryParams.push(fromDate);
            } else if (toDate) {
                whereConditions.push("DATE(om.orderdate) <= ?");
                queryParams.push(toDate);
            }

            // Product filter
            const productid = getFilterValue("productid");
            if (productid) {
                whereConditions.push("im.itemid = ?");
                queryParams.push(productid);
            }

            // Global search filter
            const global = getFilterValue("global");
            if (global) {
                whereConditions.push("(im.itemname LIKE ? OR om.billno LIKE ?)");
                queryParams.push(`%${global}%`, `%${global}%`);
            }

            const whereClause = whereConditions.join(" AND ");

            // Count total records
            const countQuery = `
                SELECT COUNT(*) as total
                FROM (
                    SELECT im.uniquekey
                    FROM ordermaster om
                    INNER JOIN orderproductdetails opd ON opd.serverorderid = om.id AND opd.isdeleted = 0
                    INNER JOIN itemmaster im ON im.uniquekey = opd.pmuniquekey AND im.isdeleted = 0
                    WHERE ${whereClause}
                    GROUP BY im.uniquekey
                ) as subquery
            `;

            const countResult = await db.getResults(countQuery, queryParams);
            const totalRecords = countResult[0]?.total || 0;

            // Sorting
            const order = sortOrder?.toLowerCase() === "asc" ? "ASC" : "DESC";
            const sortFieldMap = {
                product: "im.itemname",
                quantity: "SUM(opd.quantity)",
                totalamount: "SUM(opd.totalamount)",
                grandtotal: "SUM(opd.totaltaxamount)",
            };
            const mappedSortField = sortFieldMap[sortField?.toLowerCase()] || "im.itemname";

            // Main query
            let dataQuery = `
                SELECT
                    im.uniquekey as id,
                    im.itemname AS product,
                    mcm.itemcategoryname AS productmastercategory,
                    cm.itemcategoryname AS productcategory,
                    scm.itemcategoryname AS productsubcategory,
                    bm.brandname AS brand,
                    um.uomname AS uom,
                    ROUND(SUM(opd.quantity), 2) AS quantity,
                    ROUND(CAST(AVG(opd.price) AS DECIMAL(18,2)), 2) AS price,
                    ROUND(CAST(SUM(opd.totalamount) AS DECIMAL(18,2)), 2) AS totalamount,
                    ROUND(CAST(SUM(opd.discountamount) AS DECIMAL(18,2)), 2) AS discount,
                    ROUND(CAST(SUM(opd.taxableamount) AS DECIMAL(18,2)), 2) AS taxableamount,
                    ROUND(CAST(SUM(opd.taxamount) AS DECIMAL(18,2)), 2) AS taxamount,
                    ROUND(CAST(SUM(opd.totaltaxamount) AS DECIMAL(18,2)), 2) AS grandtotal
                FROM ordermaster om
                INNER JOIN orderproductdetails opd ON opd.serverorderid = om.id AND opd.isdeleted = 0
                INNER JOIN itemmaster im ON im.uniquekey = opd.pmuniquekey AND im.isdeleted = 0
                LEFT JOIN itemcategorymaster mcm ON mcm.itemcategoryid = im.mastercategoryid AND mcm.isdeleted = 0
                LEFT JOIN itemcategorymaster cm ON cm.itemcategoryid = im.categoryid AND cm.isdeleted = 0
                LEFT JOIN itemcategorymaster scm ON scm.itemcategoryid = im.subcategoryid AND scm.isdeleted = 0
                LEFT JOIN brandmaster bm ON bm.brandid = im.brandid AND bm.isdeleted = 0
                LEFT JOIN uommaster um ON um.uomid = im.defaultuom AND um.isdeleted = 0
                WHERE ${whereClause}
                GROUP BY im.uniquekey, im.itemname, mcm.itemcategoryname, cm.itemcategoryname, scm.itemcategoryname, bm.brandname, um.uomname
                ORDER BY ${mappedSortField} ${order}
            `;

            const startNum = parseInt(start);
            const lengthNum = parseInt(length);
            if (lengthNum !== -1) {
                dataQuery += ` LIMIT ?, ?`;
                queryParams.push(startNum, lengthNum);
            }

            const data = await db.getResults(dataQuery, queryParams);

            return {
                data,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages: lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1,
                },
            };
        } catch (error) {
            winston.error(`Error fetching product summary report: ${error.message}`, {
                source: "productSummary.model.js",
                function: "getProductSummary",
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    },
};
