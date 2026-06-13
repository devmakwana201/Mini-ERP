const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Product Sales Summary Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns product sales data with pagination info
     */
    getProductSalesSummary: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField = "id",
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

            // Brand filter
            const brandid = getFilterValue("brandid");
            if (brandid) {
                whereConditions.push("im.brandid = ?");
                queryParams.push(brandid);
            }

            // Category filters
            const mastercategoryid = getFilterValue("mastercategoryid");
            if (mastercategoryid) {
                whereConditions.push("im.mastercategoryid = ?");
                queryParams.push(mastercategoryid);
            }

            const categoryid = getFilterValue("categoryid");
            if (categoryid) {
                whereConditions.push("im.categoryid = ?");
                queryParams.push(categoryid);
            }

            const subcategoryid = getFilterValue("subcategoryid");
            if (subcategoryid) {
                whereConditions.push("im.subcategoryid = ?");
                queryParams.push(subcategoryid);
            }

            // Text field filters (LIKE match)
            const textFilters = {
                billno: "om.billno",
                orderdate: "DATE_FORMAT(om.orderdate, '%d/%m/%Y')",
                customer: "custm.name",
                product: "im.itemname",
                productmastercategory: "mcm.itemcategoryname",
                productcategory: "cm.itemcategoryname",
                productsubcategory: "scm.itemcategoryname",
                brand: "bm.brandname",
                uom: "um.uomname",
                tax: "GROUP_CONCAT(DISTINCT CONCAT(optd.taxpercentage, '%') ORDER BY optd.taxpercentage SEPARATOR ', ')",
            };

            Object.entries(textFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value && filterKey !== "tax") {
                    whereConditions.push(`${dbField} LIKE ?`);
                    queryParams.push(`%${value}%`);
                }
            });

            // Numeric field filters (exact match)
            const numericFilters = {
                quantity: "opd.quantity",
                price: "opd.price",
                totalamount: "opd.totalamount",
                discount: "opd.discountamount",
                taxableamount: "opd.taxableamount",
                grandtotal: "opd.totaltaxamount",
            };

            Object.entries(numericFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value) {
                    whereConditions.push(`ROUND(CAST(${dbField} AS DECIMAL(18,2)), 2) = ?`);
                    queryParams.push(parseFloat(value));
                }
            });

            // Tax filter (text match in HAVING clause)
            const havingConditions = [];
            const havingParams = [];

            const tax = getFilterValue("tax");
            if (tax) {
                havingConditions.push(
                    `GROUP_CONCAT(DISTINCT CONCAT(optd.taxpercentage, '%') ORDER BY optd.taxpercentage SEPARATOR ', ') LIKE ?`
                );
                havingParams.push(`%${tax}%`);
            }

            // Global search filter
            const global = getFilterValue("global");
            if (global) {
                const searchConditions = [];

                Object.entries(textFilters).forEach(([key, field]) => {
                    if (key !== "tax") {
                        searchConditions.push(`${field} LIKE ?`);
                    }
                });

                const numericSearchFields = Object.values(numericFilters);
                numericSearchFields.forEach((field) => {
                    searchConditions.push(`CAST(${field} AS CHAR) LIKE ?`);
                });

                whereConditions.push(`(${searchConditions.join(" OR ")})`);

                const searchTerm = `%${global}%`;
                const totalFields = Object.keys(textFilters).length - 1 + numericSearchFields.length;
                for (let i = 0; i < totalFields; i++) {
                    queryParams.push(searchTerm);
                }

                havingConditions.push(
                    `(GROUP_CONCAT(DISTINCT CONCAT(optd.taxpercentage, '%') ORDER BY optd.taxpercentage SEPARATOR ', ') LIKE ?)`
                );
                havingParams.push(`%${global}%`);
            }

            const whereClause = whereConditions.join(" AND ");
            const havingClause = havingConditions.length > 0 ? `HAVING ${havingConditions.join(" OR ")}` : "";

            const countQueryParams = [...queryParams, ...havingParams];
            const dataQueryParams = [...queryParams, ...havingParams];

            // Count total records
            const countQuery = `
                SELECT COUNT(*) as total
                FROM (
                    SELECT opd.id
                    FROM ordermaster om
                    INNER JOIN orderproductdetails opd ON opd.serverorderid = om.id AND opd.isdeleted = 0
                    INNER JOIN itemmaster im ON im.uniquekey = opd.pmuniquekey AND im.isdeleted = 0
                    LEFT JOIN itemcategorymaster mcm ON mcm.itemcategoryid = im.mastercategoryid AND mcm.isdeleted = 0
                    LEFT JOIN itemcategorymaster cm ON cm.itemcategoryid = im.categoryid AND cm.isdeleted = 0
                    LEFT JOIN itemcategorymaster scm ON scm.itemcategoryid = im.subcategoryid AND scm.isdeleted = 0
                    LEFT JOIN brandmaster bm ON bm.brandid = im.brandid AND bm.isdeleted = 0
                    LEFT JOIN uommaster um ON um.uomid = im.defaultuom AND um.isdeleted = 0
                    LEFT JOIN customermaster custm ON custm.uniquekey = om.customeruniquekey AND custm.isdeleted = 0
                    LEFT JOIN orderproducttaxdetails optd ON optd.serverorderproductid = opd.id AND optd.isdeleted = 0
                    WHERE ${whereClause}
                    GROUP BY opd.id
                    ${havingClause}
                ) as subquery
            `;

            const countResult = await db.getResults(countQuery, countQueryParams);
            const totalRecords = countResult[0]?.total || 0;

            // Sorting
            const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

            const sortFieldMap = {
                id: "opd.id",
                billno: "om.billno",
                orderdate: "om.orderdate",
                customer: "custm.name",
                product: "im.itemname",
                productmastercategory: "mcm.itemcategoryname",
                productcategory: "cm.itemcategoryname",
                productsubcategory: "scm.itemcategoryname",
                brand: "bm.brandname",
                uom: "um.uomname",
                quantity: "opd.quantity",
                price: "opd.price",
                totalamount: "opd.totalamount",
                discount: "opd.discountamount",
                tax: "tax",
                taxableamount: "opd.taxableamount",
                taxamount: "opd.taxamount",
                grandtotal: "grandtotal",
            };

            const mappedSortField = sortFieldMap[sortField?.toLowerCase()] || sortFieldMap["id"];

            // Main query for product sales summary
            let dataQuery = `
                SELECT
                    opd.id,
                    om.billno AS billno,
                    DATE_FORMAT(om.orderdate, '%d/%m/%Y') AS orderdate,
                    custm.name AS customer,
                    im.itemname AS product,
                    mcm.itemcategoryname AS productmastercategory,
                    cm.itemcategoryname AS productcategory,
                    scm.itemcategoryname AS productsubcategory,
                    bm.brandname AS brand,
                    um.uomname AS uom,
                    ROUND(opd.quantity, 2) AS quantity,
                    ROUND(CAST(opd.price AS DECIMAL(18,2)), 2) AS price,
                    ROUND(CAST(opd.totalamount AS DECIMAL(18,2)), 2) AS totalamount,
                    ROUND(CAST(opd.discountamount AS DECIMAL(18,2)), 2) AS discount,
                    GROUP_CONCAT(DISTINCT CONCAT(optd.taxpercentage, '%') ORDER BY optd.taxpercentage SEPARATOR ', ') AS tax,
                    ROUND(CAST(opd.taxableamount AS DECIMAL(18,2)), 2) AS taxableamount,
                    ROUND(CAST(opd.taxamount AS DECIMAL(18,2)), 2) AS taxamount,
                    ROUND(CAST(opd.totaltaxamount AS DECIMAL(18,2)), 2) AS grandtotal
                FROM ordermaster om
                INNER JOIN orderproductdetails opd ON opd.serverorderid = om.id AND opd.isdeleted = 0
                INNER JOIN itemmaster im ON im.uniquekey = opd.pmuniquekey AND im.isdeleted = 0
                LEFT JOIN itemcategorymaster mcm ON mcm.itemcategoryid = im.mastercategoryid AND mcm.isdeleted = 0
                LEFT JOIN itemcategorymaster cm ON cm.itemcategoryid = im.categoryid AND cm.isdeleted = 0
                LEFT JOIN itemcategorymaster scm ON scm.itemcategoryid = im.subcategoryid AND scm.isdeleted = 0
                LEFT JOIN brandmaster bm ON bm.brandid = im.brandid AND bm.isdeleted = 0
                LEFT JOIN uommaster um ON um.uomid = im.defaultuom AND um.isdeleted = 0
                LEFT JOIN customermaster custm ON custm.uniquekey = om.customeruniquekey AND custm.isdeleted = 0
                LEFT JOIN orderproducttaxdetails optd ON optd.serverorderproductid = opd.id AND optd.isdeleted = 0
                WHERE ${whereClause}
                GROUP BY opd.id, om.billno, om.orderdate, custm.name, im.itemname, mcm.itemcategoryname, cm.itemcategoryname, scm.itemcategoryname, bm.brandname, um.uomname, opd.quantity, opd.price, opd.totalamount, opd.discountamount, opd.taxableamount, opd.taxamount, opd.totaltaxamount
                ${havingClause}
                ORDER BY ${mappedSortField} ${order}
            `;

            const startNum = parseInt(start);
            const lengthNum = parseInt(length);

            if (lengthNum !== -1) {
                dataQuery += ` LIMIT ?, ?`;
                dataQueryParams.push(startNum, lengthNum);
            }

            const productSalesData = await db.getResults(dataQuery, dataQueryParams);

            const totalPages = lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1;

            return {
                data: productSalesData,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching product sales summary report: ${error.message}`, {
                source: "productSalesSummary.model.js",
                function: "getProductSalesSummaryReport",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters
            });
            throw error;
        }
    },
};
