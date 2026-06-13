const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Sales Summary Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns aggregated sales summary data with pagination info
     */
    getSalesSummary: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField = "totalbills",
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
            let whereConditions = ["om.isdeleted = 0"];
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

            // Store filters for aggregated fields (HAVING clause)
            const havingConditions = [];
            const havingParams = [];

            // Numeric field filters (aggregated - HAVING clause)
            const totalbills = getFilterValue("totalbills");
            if (totalbills) {
                havingConditions.push(`COUNT(DISTINCT om.id) = ?`);
                havingParams.push(parseInt(totalbills));
            }

            const products = getFilterValue("products");
            if (products) {
                havingConditions.push(`COUNT(DISTINCT opd.productid) = ?`);
                havingParams.push(parseInt(products));
            }
            const customers = getFilterValue("customers");
            if (customers) {
                havingConditions.push(`COUNT(DISTINCT om.customeruniquekey) = ?`);
                havingParams.push(parseInt(customers));
            }
            const totalquantity = getFilterValue("totalquantity");
            if (totalquantity) {
                havingConditions.push(`ROUND(CAST(SUM(opd.quantity) AS DECIMAL(18,2)), 2) = ?`);
                havingParams.push(parseFloat(totalquantity));
            }

            const amount = getFilterValue("amount");
            if (amount) {
                havingConditions.push(`ROUND(CAST(SUM(om.amount) AS DECIMAL(18,2)), 2) = ?`);
                havingParams.push(parseFloat(amount));
            }

            const discount = getFilterValue("discount");
            if (discount) {
                havingConditions.push(
                    `ROUND(CAST(SUM(om.discountamount) AS DECIMAL(18,2)), 2) = ?`
                );
                havingParams.push(parseFloat(discount));
            }

            const taxableamount = getFilterValue("taxableamount");
            if (taxableamount) {
                havingConditions.push(`ROUND(CAST(SUM(om.taxableamount) AS DECIMAL(18,2)), 2) = ?`);
                havingParams.push(parseFloat(taxableamount));
            }

            const totaltaxamount = getFilterValue("totaltaxamount");
            if (totaltaxamount) {
                havingConditions.push(
                    `ROUND(CAST(SUM(om.totaltaxamount) AS DECIMAL(18,2)), 2) = ?`
                );
                havingParams.push(parseFloat(totaltaxamount));
            }

            const roundoff = getFilterValue("roundoff");
            if (roundoff) {
                havingConditions.push(`ROUND(CAST(SUM(om.roundoff) AS DECIMAL(18,2)), 2) = ?`);
                havingParams.push(parseFloat(roundoff));
            }

            const grandtotal = getFilterValue("grandtotal");
            if (grandtotal) {
                havingConditions.push(`ROUND(CAST(SUM(om.grandtotal) AS DECIMAL(18,2)), 2) = ?`);
                havingParams.push(parseFloat(grandtotal));
            }
            const avgbillvalue = getFilterValue("avgbillvalue");
            if (avgbillvalue) {
                havingConditions.push(
                    `ROUND(CAST((SUM(om.grandtotal) / NULLIF(COUNT(DISTINCT om.id), 0)) AS DECIMAL(18,2)), 2) = ?`
                );
                havingParams.push(parseFloat(avgbillvalue));
            }
            const discountpercent = getFilterValue("discountpercent");
            if (discountpercent) {
                havingConditions.push(
                    `ROUND(CAST((CASE WHEN SUM(om.amount) = 0 THEN 0 ELSE (SUM(om.discountamount) / SUM(om.amount)) * 100 END) AS DECIMAL(18,2)), 2) = ?`
                );
                havingParams.push(parseFloat(discountpercent));
            }
            const taxpercent = getFilterValue("taxpercent");
            if (taxpercent) {
                havingConditions.push(
                    `ROUND(CAST((CASE WHEN SUM(om.taxableamount) = 0 THEN 0 ELSE (SUM(om.totaltaxamount) / SUM(om.taxableamount)) * 100 END) AS DECIMAL(18,2)), 2) = ?`
                );
                havingParams.push(parseFloat(taxpercent));
            }
            const netsales = getFilterValue("netsales");
            if (netsales) {
                havingConditions.push(
                    `ROUND(CAST((SUM(om.grandtotal) - SUM(om.discountamount)) AS DECIMAL(18,2)), 2) = ?`
                );
                havingParams.push(parseFloat(netsales));
            }

            // Global search filter
            const global = getFilterValue("global");
            if (global) {
                const globalHavingConditions = [];

                // Search in aggregated numeric fields (HAVING clause)
                globalHavingConditions.push(`CAST(COUNT(DISTINCT om.id) AS CHAR) LIKE ?`);
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(`CAST(COUNT(DISTINCT opd.productid) AS CHAR) LIKE ?`);
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(`CAST(COUNT(DISTINCT om.customeruniquekey) AS CHAR) LIKE ?`);
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(SUM(opd.quantity) AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(SUM(om.amount) AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(SUM(om.discountamount) AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(SUM(om.taxableamount) AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(SUM(om.totaltaxamount) AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(SUM(om.roundoff) AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(SUM(om.grandtotal) AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST((SUM(om.grandtotal) / NULLIF(COUNT(DISTINCT om.id), 0)) AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST((CASE WHEN SUM(om.amount) = 0 THEN 0 ELSE (SUM(om.discountamount) / SUM(om.amount)) * 100 END) AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST((CASE WHEN SUM(om.taxableamount) = 0 THEN 0 ELSE (SUM(om.totaltaxamount) / SUM(om.taxableamount)) * 100 END) AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST((SUM(om.grandtotal) - SUM(om.discountamount)) AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);

                // Add global HAVING conditions with OR
                if (globalHavingConditions.length > 0) {
                    havingConditions.push(`(${globalHavingConditions.join(" OR ")})`);
                }
            }

            const whereClause = whereConditions.join(" AND ");
            const havingClause =
                havingConditions.length > 0 ? `HAVING ${havingConditions.join(" AND ")}` : "";

            // Build params for count and data queries
            const countQueryParams = [...queryParams, ...havingParams];
            const dataQueryParams = [...queryParams, ...havingParams];

            // Count total records
            const countQuery = `
                SELECT COUNT(*) as total
                FROM (
                    SELECT
                        DATE(om.orderdate) as order_date
                    FROM ordermaster om
                    LEFT JOIN orderproductdetails opd ON opd.serverorderid = om.id AND opd.isdeleted = 0
                    WHERE ${whereClause}
                    GROUP BY DATE(om.orderdate)
                    ${havingClause}
                ) as subquery
            `;

            const countResult = await db.getResults(countQuery, countQueryParams);
            const totalRecords = countResult[0]?.total || 0;

            // Sorting
            const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";
            const sortFieldMap = {
                date: "DATE(om.orderdate)",
                totalbills: "totalbills",
                products: "products",
                customers: "customers",
                totalquantity: "totalquantity",
                amount: "amount",
                discount: "discount",
                taxableamount: "taxableamount",
                totaltaxamount: "totaltaxamount",
                roundoff: "roundoff",
                grandtotal: "grandtotal",
                avgbillvalue: "avgbillvalue",
                discountpercent: "discountpercent",
                taxpercent: "taxpercent",
                netsales: "netsales",
            };
            const mappedSortField = sortFieldMap[sortField?.toLowerCase()] || "DATE(om.orderdate)";

            // Main query for sales summary
            let dataQuery = `
                SELECT
                    DATE_FORMAT(om.orderdate, '%d/%m/%Y') AS date,
                    COUNT(DISTINCT om.id) AS totalbills,
                    COUNT(DISTINCT opd.productid) AS products,
                    COUNT(DISTINCT om.customeruniquekey) AS customers,
                    ROUND(CAST(SUM(opd.quantity) AS DECIMAL(18,2)), 2) AS totalquantity,
                    ROUND(CAST(SUM(om.amount) AS DECIMAL(18,2)), 2) AS amount,
                    ROUND(CAST(SUM(om.discountamount) AS DECIMAL(18,2)), 2) AS discount,
                    ROUND(CAST(SUM(om.taxableamount) AS DECIMAL(18,2)), 2) AS taxableamount,
                    ROUND(CAST(SUM(om.totaltaxamount) AS DECIMAL(18,2)), 2) AS totaltaxamount,
                    ROUND(CAST(SUM(om.roundoff) AS DECIMAL(18,2)), 2) AS roundoff,
                    ROUND(CAST(SUM(om.grandtotal) AS DECIMAL(18,2)), 2) AS grandtotal,
                    ROUND(CAST((SUM(om.grandtotal) / NULLIF(COUNT(DISTINCT om.id), 0)) AS DECIMAL(18,2)), 2) AS avgbillvalue,
                    ROUND(CAST((CASE WHEN SUM(om.amount) = 0 THEN 0 ELSE (SUM(om.discountamount) / SUM(om.amount)) * 100 END) AS DECIMAL(18,2)), 2) AS discountpercent,
                    ROUND(CAST((CASE WHEN SUM(om.taxableamount) = 0 THEN 0 ELSE (SUM(om.totaltaxamount) / SUM(om.taxableamount)) * 100 END) AS DECIMAL(18,2)), 2) AS taxpercent,
                    ROUND(CAST((SUM(om.grandtotal) - SUM(om.discountamount)) AS DECIMAL(18,2)), 2) AS netsales
                FROM ordermaster om
                LEFT JOIN orderproductdetails opd ON opd.serverorderid = om.id AND opd.isdeleted = 0
                WHERE ${whereClause}
                GROUP BY DATE(om.orderdate)
                ${havingClause}
                ORDER BY ${mappedSortField} ${order}
            `;

            // Pagination using start and length
            const startNum = parseInt(start);
            const lengthNum = parseInt(length);

            if (lengthNum !== -1) {
                dataQuery += ` LIMIT ?, ?`;
                dataQueryParams.push(startNum, lengthNum);
            }

            const salesSummaryData = await db.getResults(dataQuery, dataQueryParams);

            // Calculate total pages
            const totalPages = lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1;

            return {
                data: salesSummaryData,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching sales summary report: ${error.message}`, {
                source: "salesSummary.model.js",
                function: "getSalesSummaryReport",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters
            });
            throw error;
        }
    },
};
