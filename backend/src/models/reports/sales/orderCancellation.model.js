const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Order Cancellation Report with pagination and filters.
     *
     * Notes:
     * - Cancelled orders are inferred from records soft-deleted in ordermaster.
     * - A few UI-requested fields do not have dedicated schema columns right now.
     *   For those, we return safe fallbacks so the report remains usable.
     */
    getOrderCancellation: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField = "cancellationdatetime",
                sortOrder = "desc",
                locationId,
            } = req.query;

            let parsedFilters = {};
            if (filters) {
                try {
                    parsedFilters = JSON.parse(filters);
                } catch (err) {
                    winston.warn("Invalid filters JSON received for order cancellation report");
                }
            }

            const getFilterValue = (field) => {
                const val = parsedFilters[field];
                return typeof val === "object" ? val.value : val;
            };

            const whereConditions = [
                "(om.isdeleted = 1 OR (om.status IS NOT NULL AND om.status NOT IN (0, 1)))",
            ];
            const queryParams = [];

            const companyid = getFilterValue("companyid");
            if (companyid) {
                whereConditions.push("om.companyid = ?");
                queryParams.push(companyid);
            }

            const locationid = locationId || getFilterValue("locationid");
            if (locationid) {
                whereConditions.push("om.locationid = ?");
                queryParams.push(locationid);
            }

            const fromDate = getFilterValue("fromDate");
            const toDate = getFilterValue("toDate");
            if (fromDate && toDate) {
                whereConditions.push("DATE(om.modifieddate) BETWEEN ? AND ?");
                queryParams.push(fromDate, toDate);
            } else if (fromDate) {
                whereConditions.push("DATE(om.modifieddate) >= ?");
                queryParams.push(fromDate);
            } else if (toDate) {
                whereConditions.push("DATE(om.modifieddate) <= ?");
                queryParams.push(toDate);
            }

            const customerid = getFilterValue("customerid");
            if (customerid) {
                whereConditions.push("cm.customerid = ?");
                queryParams.push(customerid);
            }

            const textFilters = {
                billno: "om.billno",
                ordertype: `CASE
                    WHEN CAST(om.ordertype AS CHAR) = '1' THEN 'Counter'
                    WHEN CAST(om.ordertype AS CHAR) = '2' THEN 'Delivery'
                    ELSE COALESCE(om.ordertype, '')
                END`,
                orderdate: "DATE_FORMAT(om.orderdate, '%d/%m/%Y %h:%i %p')",
                cancellationdatetime: "DATE_FORMAT(om.modifieddate, '%d/%m/%Y %h:%i %p')",
                cancelledby: "TRIM(CONCAT(COALESCE(cancel_user.firstname, ''), ' ', COALESCE(cancel_user.lastname, '')))",
                approvedby: "''",
                customername: "cm.name",
                customerphone: "cm.phoneno",
                cancellationreason: "COALESCE(NULLIF(om.remarks, ''), '')",
                remarks: "COALESCE(om.remarks, '')",
                originalpaymentmode: "COALESCE(payment_summary.originalpaymentmode, '')",
                transaction: "COALESCE(payment_summary.originalpaymentmode, '')",
                refundstatus: `CASE
                    WHEN COALESCE(payment_summary.paidamount, 0) > 0 THEN 'Pending'
                    ELSE 'Not Applicable'
                END`,
            };

            Object.entries(textFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value) {
                    whereConditions.push(`${dbField} LIKE ?`);
                    queryParams.push(`%${value}%`);
                }
            });

            const numericFilters = {
                noofitems: "COALESCE(item_summary.noofitems, 0)",
                ordertotal: "COALESCE(om.amount, 0)",
                discount: "COALESCE(om.discountamount, 0)",
                netamount: "(COALESCE(om.amount, 0) - COALESCE(om.discountamount, 0))",
                taxableamount: "COALESCE(om.taxableamount, 0)",
                taxamount: "COALESCE(om.totaltaxamount, 0)",
                cgst: "COALESCE(tax_summary.cgst, 0)",
                sgst: "COALESCE(tax_summary.sgst, 0)",
                igst: "COALESCE(tax_summary.igst, 0)",
                roundoff: "COALESCE(om.roundoff, 0)",
                grandtotal: "COALESCE(om.grandtotal, 0)",
                refundamount: "0",
            };

            Object.entries(numericFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value !== undefined && value !== null && value !== "") {
                    whereConditions.push(`CAST(ROUND(CAST(${dbField} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`);
                    queryParams.push(`%${value}%`);
                }
            });

            const global = getFilterValue("global");
            if (global) {
                const searchConditions = [];
                const textSearchFields = Object.values(textFilters);
                const numericSearchFields = Object.values(numericFilters);

                textSearchFields.forEach((field) => {
                    searchConditions.push(`${field} LIKE ?`);
                });

                numericSearchFields.forEach((field) => {
                    searchConditions.push(`CAST(${field} AS CHAR) LIKE ?`);
                });

                whereConditions.push(`(${searchConditions.join(" OR ")})`);

                const searchTerm = `%${global}%`;
                for (let i = 0; i < textSearchFields.length + numericSearchFields.length; i++) {
                    queryParams.push(searchTerm);
                }
            }

            const whereClause = whereConditions.join(" AND ");

            const countQuery = `
                SELECT COUNT(DISTINCT om.id) AS total
                FROM ordermaster om
                LEFT JOIN customermaster cm ON cm.uniquekey = om.customeruniquekey
                LEFT JOIN usermaster cancel_user ON cancel_user.userid = om.modifiedby
                LEFT JOIN (
                    SELECT
                        opd.serverorderid,
                        SUM(COALESCE(opd.quantity, 0)) AS noofitems
                    FROM orderproductdetails opd
                    GROUP BY opd.serverorderid
                ) item_summary ON item_summary.serverorderid = om.id
                LEFT JOIN (
                    SELECT
                        pm.serverorderid,
                        SUM(COALESCE(pttm.creditamount, 0)) AS paidamount,
                        MAX(pttm.paymentdate) AS paymentdate,
                        GROUP_CONCAT(DISTINCT pt.paymentmodename ORDER BY pt.paymentmodename SEPARATOR ', ') AS originalpaymentmode
                    FROM paymentmaster pm
                    LEFT JOIN paymenttransactionmaster pttm ON pttm.serverpaymentid = pm.id
                    LEFT JOIN paymenttype pt ON pt.paymentid = pttm.paymodeid AND pt.isdeleted = 0
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
                    GROUP BY optd.orderid
                ) tax_summary ON tax_summary.orderid = om.orderid
                WHERE ${whereClause}
            `;

            const countResult = await db.getResults(countQuery, queryParams);
            const totalRecords = countResult[0]?.total || 0;

            const order = sortOrder?.toLowerCase() === "asc" ? "ASC" : "DESC";
            const sortFieldMap = {
                billno: "om.billno",
                ordertype: "ordertype",
                orderdate: "om.orderdate",
                cancellationdatetime: "om.modifieddate",
                cancelledby: "cancelledby",
                approvedby: "approvedby",
                customername: "cm.name",
                customerphone: "cm.phoneno",
                cancellationreason: "cancellationreason",
                remarks: "remarks",
                noofitems: "noofitems",
                ordertotal: "ordertotal",
                discount: "discount",
                netamount: "netamount",
                taxableamount: "taxableamount",
                taxamount: "taxamount",
                cgst: "cgst",
                sgst: "sgst",
                igst: "igst",
                roundoff: "roundoff",
                grandtotal: "grandtotal",
                originalpaymentmode: "originalpaymentmode",
                transaction: "transaction",
                refundstatus: "refundstatus",
                refundamount: "refundamount",
            };
            const mappedSortField =
                sortFieldMap[sortField?.toLowerCase()] || sortFieldMap.cancellationdatetime;

            let dataQuery = `
                SELECT
                    om.id,
                    om.billno AS billno,
                    CASE
                        WHEN CAST(om.ordertype AS CHAR) = '1' THEN 'Counter'
                        WHEN CAST(om.ordertype AS CHAR) = '2' THEN 'Delivery'
                        ELSE COALESCE(om.ordertype, '')
                    END AS ordertype,
                    DATE_FORMAT(om.orderdate, '%d/%m/%Y %h:%i %p') AS orderdate,
                    DATE_FORMAT(om.modifieddate, '%d/%m/%Y %h:%i %p') AS cancellationdatetime,
                    TRIM(CONCAT(COALESCE(cancel_user.firstname, ''), ' ', COALESCE(cancel_user.lastname, ''))) AS cancelledby,
                    '' AS approvedby,
                    cm.name AS customername,
                    cm.phoneno AS customerphone,
                    COALESCE(NULLIF(om.remarks, ''), '') AS cancellationreason,
                    COALESCE(om.remarks, '') AS remarks,
                    ROUND(CAST(COALESCE(item_summary.noofitems, 0) AS DECIMAL(18,2)), 2) AS noofitems,
                    ROUND(CAST(COALESCE(om.amount, 0) AS DECIMAL(18,2)), 2) AS ordertotal,
                    ROUND(CAST(COALESCE(om.discountamount, 0) AS DECIMAL(18,2)), 2) AS discount,
                    ROUND(CAST((COALESCE(om.amount, 0) - COALESCE(om.discountamount, 0)) AS DECIMAL(18,2)), 2) AS netamount,
                    ROUND(CAST(COALESCE(om.taxableamount, 0) AS DECIMAL(18,2)), 2) AS taxableamount,
                    ROUND(CAST(COALESCE(om.totaltaxamount, 0) AS DECIMAL(18,2)), 2) AS taxamount,
                    ROUND(CAST(COALESCE(tax_summary.cgst, 0) AS DECIMAL(18,2)), 2) AS cgst,
                    ROUND(CAST(COALESCE(tax_summary.sgst, 0) AS DECIMAL(18,2)), 2) AS sgst,
                    ROUND(CAST(COALESCE(tax_summary.igst, 0) AS DECIMAL(18,2)), 2) AS igst,
                    ROUND(CAST(COALESCE(om.roundoff, 0) AS DECIMAL(18,2)), 2) AS roundoff,
                    ROUND(CAST(COALESCE(om.grandtotal, 0) AS DECIMAL(18,2)), 2) AS grandtotal,
                    COALESCE(payment_summary.originalpaymentmode, '') AS originalpaymentmode,
                    COALESCE(payment_summary.originalpaymentmode, '') AS transaction,
                    CASE
                        WHEN COALESCE(payment_summary.paidamount, 0) > 0 THEN 'Pending'
                        ELSE 'Not Applicable'
                    END AS refundstatus,
                    ROUND(CAST(0 AS DECIMAL(18,2)), 2) AS refundamount
                FROM ordermaster om
                LEFT JOIN customermaster cm ON cm.uniquekey = om.customeruniquekey
                LEFT JOIN usermaster cancel_user ON cancel_user.userid = om.modifiedby
                LEFT JOIN (
                    SELECT
                        opd.serverorderid,
                        SUM(COALESCE(opd.quantity, 0)) AS noofitems
                    FROM orderproductdetails opd
                    GROUP BY opd.serverorderid
                ) item_summary ON item_summary.serverorderid = om.id
                LEFT JOIN (
                    SELECT
                        pm.serverorderid,
                        SUM(COALESCE(pttm.creditamount, 0)) AS paidamount,
                        MAX(pttm.paymentdate) AS paymentdate,
                        GROUP_CONCAT(DISTINCT pt.paymentmodename ORDER BY pt.paymentmodename SEPARATOR ', ') AS originalpaymentmode
                    FROM paymentmaster pm
                    LEFT JOIN paymenttransactionmaster pttm ON pttm.serverpaymentid = pm.id
                    LEFT JOIN paymenttype pt ON pt.paymentid = pttm.paymodeid AND pt.isdeleted = 0
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
                    GROUP BY optd.orderid
                ) tax_summary ON tax_summary.orderid = om.orderid
                WHERE ${whereClause}
                ORDER BY ${mappedSortField} ${order}
            `;

            const startNum = parseInt(start, 10);
            const lengthNum = parseInt(length, 10);

            const dataQueryParams = [...queryParams];
            if (lengthNum !== -1) {
                dataQuery += " LIMIT ?, ?";
                dataQueryParams.push(startNum, lengthNum);
            }

            const orderCancellationData = await db.getResults(dataQuery, dataQueryParams);
            const totalPages = lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1;

            return {
                data: orderCancellationData,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching order cancellation report: ${error.message}`, {
                source: "orderCancellation.model.js",
                function: "getOrderCancellation",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters,
            });
            throw error;
        }
    },
};
