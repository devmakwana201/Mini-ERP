const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Sales Receipt Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns receipts data with pagination info
     */
    getSalesReceiptReport: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField = "om.orderdate",
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

            // Customer filter
            const customerid = getFilterValue("customerid");
            if (customerid) {
                whereConditions.push("cm.customerid = ?");
                queryParams.push(customerid);
            }

            // Salesperson filter
            const salepersonid = getFilterValue("salepersonid");
            if (salepersonid) {
                whereConditions.push("om.salepersonid = ?");
                queryParams.push(salepersonid);
            }

            // Payment mode filter
            const paymodeid = getFilterValue("paymodeid");
            if (paymodeid) {
                whereConditions.push("pttm.paymodeid = ?");
                queryParams.push(paymodeid);
            }

            // Text field filters (LIKE match) - easy to add new ones
            const textFilters = {
                billno: "om.billno",
                customer: "cm.name",
                saleperson: 'CONCAT(um.firstname, " ", um.lastname)',
                transaction: "pt.paymentmodename",
                orderremark: "om.remarks",
                paymentref: "pttm.payref",
                paymentremark: "pttm.remarks",
                reprintremark: "om.reprintremark",
            };

            Object.entries(textFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value) {
                    whereConditions.push(`${dbField} LIKE ?`);
                    queryParams.push(`%${value}%`);
                }
            });

            // Numeric field filters (exact match) - easy to add new ones
            const numericFilters = {
                ordertotal: "om.amount",
                discount: "om.discountamount",
                taxableamount: "om.taxableamount",
                taxamount: "om.totaltaxamount",
                roundoff: "om.roundoff",
                grandtotal: "om.grandtotal",
            };

            Object.entries(numericFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value) {
                    whereConditions.push(`ROUND(CAST(${dbField} AS DECIMAL(18,2)), 2) = ?`);
                    queryParams.push(parseFloat(value));
                }
            });

            // Global search filter (searches across text and numeric fields)
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
                // Push search term for each field (text + numeric)
                const totalFields = textSearchFields.length + numericSearchFields.length;
                for (let i = 0; i < totalFields; i++) {
                    queryParams.push(searchTerm);
                }
            }

            const whereClause = whereConditions.join(" AND ");

            // Count total records
            const countQuery = `
                SELECT COUNT(DISTINCT om.id) as total
                FROM ordermaster om
                LEFT JOIN customermaster cm ON cm.uniquekey = om.customeruniquekey AND cm.isdeleted = 0
                LEFT JOIN usermaster um ON um.userid = om.salepersonid AND um.isdeleted = 0
                LEFT JOIN paymentmaster pm ON pm.serverorderid = om.id AND pm.isdeleted = 0
                LEFT JOIN paymenttransactionmaster pttm ON pttm.serverpaymentid = pm.id AND pttm.isdeleted = 0
                LEFT JOIN paymenttype pt ON pt.paymentid = pttm.paymodeid AND pt.isdeleted = 0
                WHERE ${whereClause}
            `;

            const countResult = await db.getResults(countQuery, queryParams);
            const totalRecords = countResult[0]?.total || 0;

            // Sorting
            const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

            // Main query for sales receipts
            let dataQuery = `
                SELECT
                    om.id,
                    om.uniquekey,
                    om.billno,
                    cm.name AS customer,
                    CONCAT(um.firstname, ' ', um.lastname) AS saleperson,
                    DATE_FORMAT(om.orderdate, '%d/%m/%Y %h:%i %p') AS date,
                    ROUND(CAST(om.amount AS DECIMAL(18,2)), 2) AS ordertotal,
                    ROUND(CAST(om.discountamount AS DECIMAL(18,2)), 2) AS discount,
                    ROUND(CAST(om.taxableamount AS DECIMAL(18,2)), 2) AS taxableamount,
                    ROUND(CAST(om.totaltaxamount AS DECIMAL(18,2)), 2) AS taxamount,
                    ROUND(CAST(om.roundoff AS DECIMAL(18,2)), 2) AS roundoff,
                    ROUND(CAST(om.grandtotal AS DECIMAL(18,2)), 2) AS grandtotal,
                    GROUP_CONCAT(DISTINCT pt.paymentmodename ORDER BY pt.paymentmodename SEPARATOR ', ') AS transaction,
                    om.remarks AS orderremark,
                    GROUP_CONCAT(DISTINCT pttm.payref ORDER BY pttm.payref SEPARATOR ', ') AS paymentref,
                    GROUP_CONCAT(DISTINCT pttm.remarks ORDER BY pttm.remarks SEPARATOR ', ') AS paymentremark,
                    om.reprintremark AS reprintremark
                FROM ordermaster om
                LEFT JOIN customermaster cm ON cm.uniquekey = om.customeruniquekey AND cm.isdeleted = 0
                LEFT JOIN usermaster um ON um.userid = om.salepersonid AND um.isdeleted = 0
                LEFT JOIN paymentmaster pm ON pm.serverorderid = om.id AND pm.isdeleted = 0
                LEFT JOIN paymenttransactionmaster pttm ON pttm.serverpaymentid = pm.id AND pttm.isdeleted = 0
                LEFT JOIN paymenttype pt ON pt.paymentid = pttm.paymodeid AND pt.isdeleted = 0
                WHERE ${whereClause}
                GROUP BY om.id, om.uniquekey, om.billno, cm.name, um.firstname, um.lastname, om.orderdate,
                         om.amount, om.discountamount, om.taxableamount, om.totaltaxamount, om.roundoff,
                         om.grandtotal, om.remarks, om.reprintremark
                ORDER BY ${sortField} ${order}
            `;

            // Pagination using start and length
            const startNum = parseInt(start);
            const lengthNum = parseInt(length);

            if (lengthNum !== -1) {
                dataQuery += ` LIMIT ?, ?`;
                queryParams.push(startNum, lengthNum);
            }

            const receipts = await db.getResults(dataQuery, queryParams);

            // Get category bills for each receipt (only if we have receipts)
            if (receipts.length > 0) {
                const uniquekeys = receipts.map((r) => r.uniquekey);
                const placeholders = uniquekeys.map(() => "?").join(",");

                const categoryQuery = `
                    SELECT
                        oi.serverorderid,
                        om.uniquekey AS orderuniquekey,
                        oi.uniquekey,
                        oi.invoicenumber AS billno,
                        bnf.format AS category,
                        oi.formatid,
                        bnf.format_type,
                        ROUND(CAST(oi.taxableamt AS DECIMAL(18,2)), 2) AS taxableamount,
                        ROUND(CAST(oi.taxamt AS DECIMAL(18,2)), 2) AS taxamount,
                        ROUND(CAST(oi.grandtotal AS DECIMAL(18,2)), 2) AS totalamount
                    FROM orderinvoice oi
                    INNER JOIN ordermaster om ON om.id = oi.serverorderid AND om.isdeleted = 0
                    INNER JOIN billnumformat bnf ON oi.formatid = bnf.formatid AND bnf.isdeleted = 0
                    WHERE om.uniquekey IN (${placeholders})
                        AND oi.isdeleted = 0
                        AND bnf.format_type IN (1, 2, 3)
                    ORDER BY om.uniquekey, bnf.format_type
                `;

                const categoryBills = await db.getResults(categoryQuery, uniquekeys);

                // Group category bills by receipt
                const categoryMap = {};
                categoryBills.forEach((bill) => {
                    if (!categoryMap[bill.orderuniquekey]) {
                        categoryMap[bill.orderuniquekey] = [];
                    }
                    categoryMap[bill.orderuniquekey].push({
                        id: `${bill.serverorderid}-${bill.formatid}-${bill.billno}`,
                        uniquekey: bill.uniquekey,
                        billno: bill.billno,
                        category: bill.category,
                        formatid: bill.formatid,
                        format_type: bill.format_type,
                        taxableamount: bill.taxableamount,
                        taxamount: bill.taxamount,
                        totalamount: bill.totalamount,
                    });
                });

                // Attach children to receipts
                receipts.forEach((receipt) => {
                    receipt.children = categoryMap[receipt.uniquekey] || [];
                });
            }

            // Calculate total pages
            const totalPages = Math.ceil(totalRecords / lengthNum);

            return {
                data: receipts,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching sales receipt report: ${error.message}`, {
                source: "salesReceiptReport.model.js",
                function: "getSalesReceiptReport",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters
            });
            throw error;
        }
    },
};
