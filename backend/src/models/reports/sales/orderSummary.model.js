const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Order Summary Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns order summary data with pagination info
     * Added additional fields for order summary report:
     * phone, noofitems, discount, netamount, taxableamount, taxamount, cgst, sgst,
     * igst, roundoff, grandtotal, paidamount, balanceamount, createdby, customertype,
     * deliverytype, paymentdate
     */
    getOrderSummary: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField = "orderdatetime",
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

            // Text field filters (LIKE match)
            // Added additional field filters for order summary report
            const textFilters = {
                receipt: "om.billno",
                orderdatetime: "DATE_FORMAT(om.orderdate, '%d/%m/%Y %h:%i %p')",
                guestname: "cm.name",
                phone: "cm.phoneno",
                paymode: "COALESCE(payment_summary.originalpaymentmode, '')",
                status: "CASE WHEN om.status = 1 THEN 'Completed' WHEN om.status = 0 THEN 'Pending' ELSE 'Cancelled' END",
                createdby: "CONCAT(COALESCE(um.firstname, ''), ' ', COALESCE(um.lastname, ''))",
                customertype:
                    "CASE WHEN cm.iscompany = 1 THEN 'Dealer' WHEN om.customeruniquekey IS NOT NULL THEN 'Registered' ELSE 'Walk-in' END",
                deliverytype: `CASE
                    WHEN CAST(om.ordertype AS CHAR) = '1' THEN 'Counter'
                    WHEN CAST(om.ordertype AS CHAR) = '2' THEN 'Delivery'
                    ELSE COALESCE(om.ordertype, '')
                END`,
                paymentdate: "DATE_FORMAT(payment_summary.paymentdate, '%d/%m/%Y %h:%i %p')",
            };

            Object.entries(textFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value) {
                    whereConditions.push(`${dbField} LIKE ?`);
                    queryParams.push(`%${value}%`);
                }
            });

            // Numeric field filters (partial match)
            // Added additional amount-based filters for order summary report
            const numericFilters = {
                amount: "om.grandtotal",
                due: "(om.grandtotal - COALESCE(payment_summary.paidamount, 0))",
                noofitems: "COALESCE(item_summary.noofitems, 0)",
                discount: "om.discountamount",
                netamount: "(om.amount - COALESCE(om.discountamount, 0))",
                taxableamount: "om.taxableamount",
                taxamount: "om.totaltaxamount",
                cgst: "COALESCE(tax_summary.cgst, 0)",
                sgst: "COALESCE(tax_summary.sgst, 0)",
                igst: "COALESCE(tax_summary.igst, 0)",
                roundoff: "om.roundoff",
                grandtotal: "om.grandtotal",
                paidamount: "COALESCE(payment_summary.paidamount, 0)",
                balanceamount: "(om.grandtotal - COALESCE(payment_summary.paidamount, 0))",
            };

            Object.entries(numericFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value !== undefined && value !== null && value !== "") {
                    whereConditions.push(`CAST(ROUND(CAST(${dbField} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`);
                    queryParams.push(`%${value}%`);
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
                LEFT JOIN usermaster um ON um.userid = om.createdby AND um.isdeleted = 0
                LEFT JOIN (
                    SELECT
                        opd.serverorderid,
                        SUM(COALESCE(opd.quantity, 0)) AS noofitems
                    FROM orderproductdetails opd
                    WHERE opd.isdeleted = 0
                    GROUP BY opd.serverorderid
                ) item_summary ON item_summary.serverorderid = om.id
                LEFT JOIN (
                    SELECT
                        pm.serverorderid,
                        SUM(COALESCE(pttm.creditamount, 0)) AS paidamount,
                        MAX(pttm.paymentdate) AS paymentdate,
                        GROUP_CONCAT(DISTINCT pt.paymentmodename ORDER BY pt.paymentmodename SEPARATOR ', ') AS originalpaymentmode
                    FROM paymentmaster pm
                    LEFT JOIN paymenttransactionmaster pttm
                        ON pttm.serverpaymentid = pm.id AND pttm.isdeleted = 0
                    LEFT JOIN paymenttype pt
                        ON pt.paymentid = pttm.paymodeid AND pt.isdeleted = 0
                    WHERE pm.isdeleted = 0
                    GROUP BY pm.serverorderid
                ) payment_summary ON payment_summary.serverorderid = om.id
                LEFT JOIN (
                    SELECT
                        optd.orderid,
                        SUM(CASE WHEN UPPER(tm.taxname) LIKE '%CGST%' THEN COALESCE(optd.taxamount, 0) ELSE 0 END) AS cgst,
                        SUM(CASE WHEN UPPER(tm.taxname) LIKE '%SGST%' THEN COALESCE(optd.taxamount, 0) ELSE 0 END) AS sgst,
                        SUM(CASE WHEN UPPER(tm.taxname) LIKE '%IGST%' THEN COALESCE(optd.taxamount, 0) ELSE 0 END) AS igst
                    FROM orderproducttaxdetails optd
                    LEFT JOIN taxmaster tm ON tm.taxid = optd.taxid AND tm.isdeleted = 0
                    WHERE optd.isdeleted = 0
                    GROUP BY optd.orderid
                ) tax_summary ON tax_summary.orderid = om.orderid
                WHERE ${whereClause}
            `;

            const countResult = await db.getResults(countQuery, queryParams);
            const totalRecords = countResult[0]?.total || 0;

            // Sorting
            const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";
            const sortFieldMap = {
                id: "om.id",
                receipt: "om.billno",
                orderdatetime: "om.orderdate",
                guestname: "cm.name",
                phone: "cm.phoneno",
                amount: "amount",
                due: "due",
                noofitems: "noofitems",
                discount: "discount",
                netamount: "netamount",
                taxableamount: "taxableamount",
                taxamount: "taxamount",
                cgst: "cgst",
                sgst: "sgst",
                igst: "igst",
                roundoff: "roundoff",
                grandtotal: "grandtotal",
                paidamount: "paidamount",
                balanceamount: "balanceamount",
                paymode: "paymode",
                status: "status",
                createdby: "createdby",
                customertype: "customertype",
                deliverytype: "deliverytype",
                paymentdate: "paymentdate",
            };
            const mappedSortField =
                sortFieldMap[sortField?.toLowerCase()] || sortFieldMap.orderdatetime;

            // Main query for order summary
            let dataQuery = `
                SELECT
                    om.id,
                    om.uniquekey,
                    om.billno AS receipt,
                    DATE_FORMAT(om.orderdate, '%d/%m/%Y %h:%i %p') AS orderdatetime,
                    cm.name AS guestname,
                    cm.phoneno AS phone,
                    -- Added additional fields for order summary report
                    ROUND(CAST(COALESCE(item_summary.noofitems, 0) AS DECIMAL(18,2)), 2) AS noofitems,
                    ROUND(CAST(COALESCE(om.discountamount, 0) AS DECIMAL(18,2)), 2) AS discount,
                    ROUND(CAST((COALESCE(om.amount, 0) - COALESCE(om.discountamount, 0)) AS DECIMAL(18,2)), 2) AS netamount,
                    ROUND(CAST(COALESCE(om.taxableamount, 0) AS DECIMAL(18,2)), 2) AS taxableamount,
                    ROUND(CAST(COALESCE(om.totaltaxamount, 0) AS DECIMAL(18,2)), 2) AS taxamount,
                    ROUND(CAST(COALESCE(tax_summary.cgst, 0) AS DECIMAL(18,2)), 2) AS cgst,
                    ROUND(CAST(COALESCE(tax_summary.sgst, 0) AS DECIMAL(18,2)), 2) AS sgst,
                    ROUND(CAST(COALESCE(tax_summary.igst, 0) AS DECIMAL(18,2)), 2) AS igst,
                    ROUND(CAST(COALESCE(om.roundoff, 0) AS DECIMAL(18,2)), 2) AS roundoff,
                    ROUND(CAST(COALESCE(om.grandtotal, 0) AS DECIMAL(18,2)), 2) AS grandtotal,
                    ROUND(CAST(COALESCE(payment_summary.paidamount, 0) AS DECIMAL(18,2)), 2) AS paidamount,
                    ROUND(CAST((COALESCE(om.grandtotal, 0) - COALESCE(payment_summary.paidamount, 0)) AS DECIMAL(18,2)), 2) AS balanceamount,
                    TRIM(CONCAT(COALESCE(um.firstname, ''), ' ', COALESCE(um.lastname, ''))) AS createdby,
                    CASE
                        WHEN cm.iscompany = 1 THEN 'Dealer'
                        WHEN om.customeruniquekey IS NOT NULL THEN 'Registered'
                        ELSE 'Walk-in'
                    END AS customertype,
                    CASE
                        WHEN CAST(om.ordertype AS CHAR) = '1' THEN 'Counter'
                        WHEN CAST(om.ordertype AS CHAR) = '2' THEN 'Delivery'
                        ELSE COALESCE(om.ordertype, '')
                    END AS deliverytype,
                    DATE_FORMAT(payment_summary.paymentdate, '%d/%m/%Y %h:%i %p') AS paymentdate,
                    ROUND(CAST(om.grandtotal AS DECIMAL(18,2)), 2) AS amount,
                    ROUND(CAST((om.grandtotal - COALESCE(payment_summary.paidamount, 0)) AS DECIMAL(18,2)), 2) AS due,
                    COALESCE(payment_summary.originalpaymentmode, '') AS paymode,
                    CASE
                        WHEN om.status = 1 THEN 'Completed'
                        WHEN om.status = 0 THEN 'Pending'
                        ELSE 'Cancelled'
                    END AS status
                FROM ordermaster om
                LEFT JOIN customermaster cm ON cm.uniquekey = om.customeruniquekey AND cm.isdeleted = 0
                LEFT JOIN usermaster um ON um.userid = om.createdby AND um.isdeleted = 0
                LEFT JOIN (
                    SELECT
                        opd.serverorderid,
                        SUM(COALESCE(opd.quantity, 0)) AS noofitems
                    FROM orderproductdetails opd
                    WHERE opd.isdeleted = 0
                    GROUP BY opd.serverorderid
                ) item_summary ON item_summary.serverorderid = om.id
                LEFT JOIN (
                    SELECT
                        pm.serverorderid,
                        SUM(COALESCE(pttm.creditamount, 0)) AS paidamount,
                        MAX(pttm.paymentdate) AS paymentdate,
                        GROUP_CONCAT(DISTINCT pt.paymentmodename ORDER BY pt.paymentmodename SEPARATOR ', ') AS originalpaymentmode
                    FROM paymentmaster pm
                    LEFT JOIN paymenttransactionmaster pttm
                        ON pttm.serverpaymentid = pm.id AND pttm.isdeleted = 0
                    LEFT JOIN paymenttype pt
                        ON pt.paymentid = pttm.paymodeid AND pt.isdeleted = 0
                    WHERE pm.isdeleted = 0
                    GROUP BY pm.serverorderid
                ) payment_summary ON payment_summary.serverorderid = om.id
                LEFT JOIN (
                    SELECT
                        optd.orderid,
                        SUM(CASE WHEN UPPER(tm.taxname) LIKE '%CGST%' THEN COALESCE(optd.taxamount, 0) ELSE 0 END) AS cgst,
                        SUM(CASE WHEN UPPER(tm.taxname) LIKE '%SGST%' THEN COALESCE(optd.taxamount, 0) ELSE 0 END) AS sgst,
                        SUM(CASE WHEN UPPER(tm.taxname) LIKE '%IGST%' THEN COALESCE(optd.taxamount, 0) ELSE 0 END) AS igst
                    FROM orderproducttaxdetails optd
                    LEFT JOIN taxmaster tm ON tm.taxid = optd.taxid AND tm.isdeleted = 0
                    WHERE optd.isdeleted = 0
                    GROUP BY optd.orderid
                ) tax_summary ON tax_summary.orderid = om.orderid
                WHERE ${whereClause}
                ORDER BY ${mappedSortField} ${order}
            `;

            // Pagination using start and length
            const startNum = parseInt(start);
            const lengthNum = parseInt(length);

            if (lengthNum !== -1) {
                dataQuery += ` LIMIT ?, ?`;
                queryParams.push(startNum, lengthNum);
            }

            const orderSummaryData = await db.getResults(dataQuery, queryParams);

            // Calculate total pages
            const totalPages = lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1;

            return {
                data: orderSummaryData,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching order summary report: ${error.message}`, {
                source: "orderSummary.model.js",
                function: "getOrderSummaryReport",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters
            });
            throw error;
        }
    },
};
