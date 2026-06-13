const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Daily Sales Summary Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns daily sales data with pagination info
     */
    getDailySalesSummary: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField = "orderdate",
                sortOrder = "desc",
                locationId,
            } = req.query;

            let parsedFilters = {};
            if (filters) {
                try {
                    parsedFilters = JSON.parse(filters);
                } catch (err) {
                    winston.warn("Invalid filters JSON received");
                }
            }

            const getFilterValue = (field) => {
                const val = parsedFilters[field];
                if (val && typeof val === "object") {
                    if (Object.prototype.hasOwnProperty.call(val, "value")) {
                        return val.value;
                    }

                    if (Array.isArray(val.constraints)) {
                        const firstConstraintWithValue = val.constraints.find(
                            (constraint) =>
                                constraint &&
                                Object.prototype.hasOwnProperty.call(constraint, "value") &&
                                constraint.value !== undefined &&
                                constraint.value !== null &&
                                constraint.value !== ""
                        );
                        return firstConstraintWithValue ? firstConstraintWithValue.value : null;
                    }
                }

                return val;
            };
            const getFilterMatchMode = (field) => {
                const val = parsedFilters[field];
                if (val && typeof val === "object") {
                    if (typeof val.matchMode === "string" && val.matchMode) {
                        return val.matchMode.toLowerCase();
                    }

                    if (Array.isArray(val.constraints)) {
                        const firstConstraintWithMode = val.constraints.find(
                            (constraint) =>
                                constraint &&
                                typeof constraint.matchMode === "string" &&
                                constraint.matchMode
                        );
                        if (firstConstraintWithMode) {
                            return String(firstConstraintWithMode.matchMode).toLowerCase();
                        }
                    }
                }

                return "equals";
            };
            const hasValue = (value) => value !== undefined && value !== null && value !== "";
            const getLikePatternByMode = (mode, value) => {
                const stringValue = String(value ?? "");
                if (mode === "startswith") return `${stringValue}%`;
                if (mode === "endswith") return `%${stringValue}`;
                return `%${stringValue}%`;
            };

            const whereConditions = ["om.isdeleted = 0"];
            const queryParams = [];

            const companyid = getFilterValue("companyid");
            if (hasValue(companyid)) {
                whereConditions.push("om.companyid = ?");
                queryParams.push(companyid);
            }

            const locationid = locationId || getFilterValue("locationid");
            if (hasValue(locationid)) {
                whereConditions.push("om.locationid = ?");
                queryParams.push(locationid);
            }

            const fromDate = getFilterValue("fromDate");
            const toDate = getFilterValue("toDate");
            if (hasValue(fromDate) && hasValue(toDate)) {
                whereConditions.push("DATE(om.orderdate) BETWEEN ? AND ?");
                queryParams.push(fromDate, toDate);
            } else if (hasValue(fromDate)) {
                whereConditions.push("DATE(om.orderdate) >= ?");
                queryParams.push(fromDate);
            } else if (hasValue(toDate)) {
                whereConditions.push("DATE(om.orderdate) <= ?");
                queryParams.push(toDate);
            }

            const baseWhereClause = whereConditions.join(" AND ");

            const fromClause = `
                FROM (
                    SELECT
                        DATE(om.orderdate) AS orderdate,
                        COUNT(DISTINCT om.id) AS no_of_orders,
                        COUNT(DISTINCT om.customerid) AS no_of_customers,
                        SUM(COALESCE(om.discountamount, 0)) AS discount_amount,
                        SUM(COALESCE(om.taxableamount, 0)) AS taxable_amount,
                        SUM(COALESCE(om.roundoff, 0)) AS round_off,
                        SUM(COALESCE(om.grandtotal, 0)) AS grand_total,
                        SUM(COALESCE(om.totalcharges, 0)) AS additional_charges
                    FROM ordermaster om
                    WHERE ${baseWhereClause}
                    GROUP BY DATE(om.orderdate)
                ) oa
                LEFT JOIN (
                    SELECT
                        DATE(om.orderdate) AS orderdate,
                        SUM(CASE
                            WHEN pttm.paymodeid = 1
                                OR LOWER(COALESCE(pt.paymentmodename, '')) LIKE '%cash%'
                            THEN COALESCE(pttm.creditamount, 0)
                            ELSE 0
                        END) AS cash,
                        SUM(CASE
                            WHEN pttm.paymodeid IN (4, 5, 6, 7)
                                OR LOWER(COALESCE(pt.paymentmodename, '')) LIKE '%upi%'
                                OR LOWER(COALESCE(pt.paymentmodename, '')) LIKE '%online%'
                                OR LOWER(COALESCE(pt.paymentmodename, '')) LIKE '%paytm%'
                                OR LOWER(COALESCE(pt.paymentmodename, '')) LIKE '%phone pay%'
                                OR LOWER(COALESCE(pt.paymentmodename, '')) LIKE '%google pay%'
                                OR LOWER(COALESCE(pt.paymentmodename, '')) LIKE '%amazon pay%'
                            THEN COALESCE(pttm.creditamount, 0)
                            ELSE 0
                        END) AS upi_online_amount,
                        SUM(CASE
                            WHEN pttm.paymodeid = 3
                                OR LOWER(COALESCE(pt.paymentmodename, '')) LIKE '%card%'
                            THEN COALESCE(pttm.creditamount, 0)
                            ELSE 0
                        END) AS card_amount,
                        SUM(CASE
                            WHEN pttm.paymodeid = 9
                                OR LOWER(COALESCE(pt.paymentmodename, '')) LIKE '%credit%'
                                OR LOWER(COALESCE(pt.paymentmodename, '')) LIKE '%account%'
                            THEN COALESCE(pttm.creditamount, 0)
                            ELSE 0
                        END) AS credit_amount,
                        SUM(CASE
                            WHEN LOWER(COALESCE(pt.paymentmodename, '')) LIKE '%cheque%'
                                OR LOWER(COALESCE(pt.paymentmodename, '')) LIKE '%check%'
                            THEN COALESCE(pttm.creditamount, 0)
                            ELSE 0
                        END) AS cheque_amount
                    FROM ordermaster om
                    LEFT JOIN paymentmaster pm ON pm.serverorderid = om.id AND pm.isdeleted = 0
                    LEFT JOIN paymenttransactionmaster pttm ON pttm.serverpaymentid = pm.id AND pttm.isdeleted = 0
                    LEFT JOIN paymenttype pt ON pt.paymentid = pttm.paymodeid AND pt.isdeleted = 0
                    WHERE ${baseWhereClause}
                    GROUP BY DATE(om.orderdate)
                ) pa ON pa.orderdate = oa.orderdate
                LEFT JOIN (
                    SELECT
                        DATE(om.orderdate) AS orderdate,
                        SUM(COALESCE(opd.discountamount, 0)) AS line_discount_amount
                    FROM ordermaster om
                    LEFT JOIN orderproductdetails opd ON opd.serverorderid = om.id AND opd.isdeleted = 0
                    WHERE ${baseWhereClause}
                    GROUP BY DATE(om.orderdate)
                ) da ON da.orderdate = oa.orderdate
                LEFT JOIN (
                    SELECT
                        DATE(om.orderdate) AS orderdate,
                        SUM(COALESCE(optd.taxamount, 0)) AS tax_amount,
                        SUM(CASE WHEN tm.isapplicableon = 2 THEN COALESCE(optd.taxamount, 0) / 2 ELSE 0 END) AS cgst,
                        SUM(CASE WHEN tm.isapplicableon = 2 THEN COALESCE(optd.taxamount, 0) / 2 ELSE 0 END) AS sgst,
                        SUM(CASE WHEN tm.isapplicableon = 1 THEN COALESCE(optd.taxamount, 0) ELSE 0 END) AS igst
                    FROM ordermaster om
                    LEFT JOIN orderproductdetails opd ON opd.serverorderid = om.id AND opd.isdeleted = 0
                    LEFT JOIN orderproducttaxdetails optd ON optd.serverorderproductid = opd.id AND optd.isdeleted = 0
                    LEFT JOIN taxmaster tm ON tm.taxid = optd.taxid AND tm.isdeleted = 0
                    WHERE ${baseWhereClause}
                    GROUP BY DATE(om.orderdate)
                ) ta ON ta.orderdate = oa.orderdate
                LEFT JOIN (
                    SELECT
                        DATE(om.orderdate) AS orderdate,
                        SUM(COALESCE(rspd.totaltaxamount, 0)) AS return_amount
                    FROM ordermaster om
                    LEFT JOIN returnsaleordermaster rsom ON rsom.serverorderid = om.id AND rsom.isdeleted = 0
                    LEFT JOIN returnsaleorderproductdetails rspd ON rspd.serverreturnsaleorderid = rsom.id AND rspd.isdeleted = 0
                    WHERE ${baseWhereClause}
                    GROUP BY DATE(om.orderdate)
                ) ra ON ra.orderdate = oa.orderdate
            `;

            const selectClause = `
                SELECT
                    DATE_FORMAT(oa.orderdate, '%Y-%m-%d') AS orderdate,
                    ROUND(CAST(COALESCE(pa.cash, 0) AS DECIMAL(18,2)), 2) AS cash,
                    oa.no_of_orders,
                    oa.no_of_customers,
                    ROUND(CAST(COALESCE(pa.upi_online_amount, 0) AS DECIMAL(18,2)), 2) AS upi_online_amount,
                    ROUND(CAST(COALESCE(pa.card_amount, 0) AS DECIMAL(18,2)), 2) AS card_amount,
                    ROUND(CAST(COALESCE(pa.credit_amount, 0) AS DECIMAL(18,2)), 2) AS credit_amount,
                    ROUND(CAST(COALESCE(pa.cheque_amount, 0) AS DECIMAL(18,2)), 2) AS cheque_amount,
                    ROUND(
                        CAST(
                            COALESCE(
                                NULLIF(oa.discount_amount, 0),
                                da.line_discount_amount,
                                0
                            ) AS DECIMAL(18,2)
                        ),
                        2
                    ) AS discount_amount,
                    ROUND(CAST(COALESCE(oa.taxable_amount, 0) AS DECIMAL(18,2)), 2) AS taxable_amount,
                    ROUND(CAST(COALESCE(ta.tax_amount, 0) AS DECIMAL(18,2)), 2) AS tax_amount,
                    ROUND(CAST(COALESCE(ta.cgst, 0) AS DECIMAL(18,2)), 2) AS cgst,
                    ROUND(CAST(COALESCE(ta.sgst, 0) AS DECIMAL(18,2)), 2) AS sgst,
                    ROUND(CAST(COALESCE(ta.igst, 0) AS DECIMAL(18,2)), 2) AS igst,
                    ROUND(CAST(COALESCE(oa.round_off, 0) AS DECIMAL(18,2)), 2) AS round_off,
                    ROUND(CAST(COALESCE(oa.grand_total, 0) AS DECIMAL(18,2)), 2) AS grand_total,
                    ROUND(CAST(COALESCE(ra.return_amount, 0) AS DECIMAL(18,2)), 2) AS return_amount,
                    ROUND(CAST((COALESCE(oa.grand_total, 0) - COALESCE(ra.return_amount, 0)) AS DECIMAL(18,2)), 2) AS net_sales,
                    ROUND(CAST(CASE WHEN oa.no_of_orders = 0 THEN 0 ELSE COALESCE(oa.grand_total, 0) / oa.no_of_orders END AS DECIMAL(18,2)), 2) AS average_order_value,
                    ROUND(CAST(COALESCE(oa.additional_charges, 0) AS DECIMAL(18,2)), 2) AS additional_charges,
                    ROUND(CAST(COALESCE(oa.grand_total, 0) AS DECIMAL(18,2)), 2) AS total
            `;

            const outerWhereConditions = [];
            const outerWhereParams = [];

            const addOuterFilter = ({ field, isInteger = false, isText = false }) => {
                const value = getFilterValue(field);
                if (!hasValue(value)) return;

                const matchMode = getFilterMatchMode(field);

                if (isText) {
                    outerWhereConditions.push(`ds.${field} LIKE ?`);
                    outerWhereParams.push(getLikePatternByMode(matchMode, value));
                    return;
                }

                const numericExpr = isInteger
                    ? `CAST(ds.${field} AS CHAR)`
                    : `CAST(ROUND(CAST(ds.${field} AS DECIMAL(18,2)), 2) AS CHAR)`;

                if (["contains", "startswith", "endswith"].includes(matchMode)) {
                    outerWhereConditions.push(`${numericExpr} LIKE ?`);
                    outerWhereParams.push(getLikePatternByMode(matchMode, value));
                    return;
                }

                if (isInteger) {
                    outerWhereConditions.push(`ds.${field} = ?`);
                    outerWhereParams.push(parseInt(value, 10));
                    return;
                }

                outerWhereConditions.push(`ROUND(CAST(ds.${field} AS DECIMAL(18,2)), 2) = ?`);
                outerWhereParams.push(parseFloat(value));
            };

            addOuterFilter({ field: "orderdate", isText: true });
            addOuterFilter({ field: "no_of_orders", isInteger: true });
            addOuterFilter({ field: "no_of_customers", isInteger: true });
            [
                "cash",
                "total",
                "upi_online_amount",
                "card_amount",
                "credit_amount",
                "cheque_amount",
                "discount_amount",
                "taxable_amount",
                "tax_amount",
                "cgst",
                "sgst",
                "igst",
                "round_off",
                "grand_total",
                "return_amount",
                "net_sales",
                "average_order_value",
                "additional_charges",
            ].forEach((field) => addOuterFilter({ field }));

            const global = getFilterValue("global");
            if (hasValue(global)) {
                const globalConditions = [
                    "ds.orderdate LIKE ?",
                    "CAST(ds.cash AS CHAR) LIKE ?",
                    "CAST(ds.total AS CHAR) LIKE ?",
                    "CAST(ds.no_of_orders AS CHAR) LIKE ?",
                    "CAST(ds.no_of_customers AS CHAR) LIKE ?",
                    "CAST(ds.upi_online_amount AS CHAR) LIKE ?",
                    "CAST(ds.card_amount AS CHAR) LIKE ?",
                    "CAST(ds.credit_amount AS CHAR) LIKE ?",
                    "CAST(ds.cheque_amount AS CHAR) LIKE ?",
                    "CAST(ds.discount_amount AS CHAR) LIKE ?",
                    "CAST(ds.taxable_amount AS CHAR) LIKE ?",
                    "CAST(ds.tax_amount AS CHAR) LIKE ?",
                    "CAST(ds.cgst AS CHAR) LIKE ?",
                    "CAST(ds.sgst AS CHAR) LIKE ?",
                    "CAST(ds.igst AS CHAR) LIKE ?",
                    "CAST(ds.round_off AS CHAR) LIKE ?",
                    "CAST(ds.grand_total AS CHAR) LIKE ?",
                    "CAST(ds.return_amount AS CHAR) LIKE ?",
                    "CAST(ds.net_sales AS CHAR) LIKE ?",
                    "CAST(ds.average_order_value AS CHAR) LIKE ?",
                    "CAST(ds.additional_charges AS CHAR) LIKE ?",
                ];
                outerWhereConditions.push(`(${globalConditions.join(" OR ")})`);
                globalConditions.forEach(() => {
                    outerWhereParams.push(`%${global}%`);
                });
            }

            const outerWhereClause =
                outerWhereConditions.length > 0 ? `WHERE ${outerWhereConditions.join(" AND ")}` : "";

            const sortFieldMap = {
                orderdate: "orderdate",
                cash: "cash",
                total: "total",
                no_of_orders: "no_of_orders",
                no_of_customers: "no_of_customers",
                upi_online_amount: "upi_online_amount",
                card_amount: "card_amount",
                credit_amount: "credit_amount",
                cheque_amount: "cheque_amount",
                discount_amount: "discount_amount",
                taxable_amount: "taxable_amount",
                tax_amount: "tax_amount",
                cgst: "cgst",
                sgst: "sgst",
                igst: "igst",
                round_off: "round_off",
                grand_total: "grand_total",
                return_amount: "return_amount",
                net_sales: "net_sales",
                average_order_value: "average_order_value",
                additional_charges: "additional_charges",
            };

            const mappedSortField =
                sortFieldMap[String(sortField || "").toLowerCase()] || sortFieldMap.orderdate;
            const order = String(sortOrder).toLowerCase() === "asc" ? "ASC" : "DESC";

            const startNum = parseInt(start, 10);
            const lengthNum = parseInt(length, 10);

            const repeatedBaseParams = [
                ...queryParams,
                ...queryParams,
                ...queryParams,
                ...queryParams,
                ...queryParams,
            ];

            const countQuery = `
                SELECT COUNT(*) AS total
                FROM (
                    ${selectClause}
                    ${fromClause}
                ) ds
                ${outerWhereClause}
            `;

            const countQueryParams = [...repeatedBaseParams, ...outerWhereParams];
            const countResult = await db.getResults(countQuery, countQueryParams);
            const totalRecords = countResult[0]?.total || 0;

            let dataQuery = `
                SELECT *
                FROM (
                    ${selectClause}
                    ${fromClause}
                ) ds
                ${outerWhereClause}
                ORDER BY ${mappedSortField} ${order}
            `;

            const dataQueryParams = [...repeatedBaseParams, ...outerWhereParams];
            if (lengthNum !== -1) {
                dataQuery += " LIMIT ?, ?";
                dataQueryParams.push(startNum, lengthNum);
            }

            const dailySalesData = await db.getResults(dataQuery, dataQueryParams);
            const totalPages = lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1;

            return {
                data: dailySalesData,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching daily sales summary report: ${error.message}`, {
                source: "dailySalesSummary.model.js",
                function: "getDailySalesSummaryReport",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters,
            });
            throw error;
        }
    },
};
