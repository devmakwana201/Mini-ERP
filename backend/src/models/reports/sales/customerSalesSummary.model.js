const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Customer Sales Summary Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns customer sales data with pagination info
     */
    getCustomerSalesSummary: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField = "customername",
                sortOrder = "asc",
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

            const customerTypeSelectExpr = `
                CASE
                    WHEN MAX(COALESCE(cm.iscompany, 0)) = 1 THEN 'Dealer'
                    ELSE 'Farmer'
                END
            `;
            const customerTypeWhereExpr = `
                CASE
                    WHEN COALESCE(cm.iscompany, 0) = 1 THEN 'Dealer'
                    ELSE 'Farmer'
                END
            `;

            const totalOrdersExpr = "COUNT(DISTINCT om.id)";
            const totalAmountExpr = "SUM(COALESCE(om.grandtotal, 0))";
            const totalDiscountExpr = "SUM(COALESCE(om.discountamount, 0))";
            const totalTaxCollectedExpr =
                "SUM(COALESCE(om.totaltaxamount, 0) - COALESCE(om.taxableamount, 0))";
            const netAmountExpr = `(${totalAmountExpr} - ${totalDiscountExpr})`;
            const avgOrderValueExpr = `CASE WHEN ${totalOrdersExpr} = 0 THEN 0 ELSE ${totalAmountExpr} / ${totalOrdersExpr} END`;
            const outstandingAmountExpr = "MAX(COALESCE(cm.outstandingamt, 0))";
            const creditLimitExpr = "MAX(COALESCE(cm.overduelimit, 0))";
            const returnCountExpr = "SUM(COALESCE(retAgg.return_count, 0))";
            const returnAmountExpr = "SUM(COALESCE(retAgg.return_amount, 0))";
            const netSalesExpr = `(${totalAmountExpr} - ${returnAmountExpr})`;
            const customerSinceDaysExpr = "DATEDIFF(CURDATE(), MIN(DATE(om.orderdate)))";
            const preferredPaymentModeExpr = "COALESCE(MAX(payPrefAgg.preferred_payment_mode), '')";

            let whereConditions = ["om.isdeleted = 0", "cm.isdeleted = 0"];
            let queryParams = [];

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

            const customerid = getFilterValue("customerid");
            if (hasValue(customerid)) {
                whereConditions.push("cm.customerid = ?");
                queryParams.push(customerid);
            }

            const customername = getFilterValue("customername");
            if (hasValue(customername)) {
                whereConditions.push("cm.name LIKE ?");
                queryParams.push(`%${customername}%`);
            }

            const phonenumber = getFilterValue("phonenumber");
            if (hasValue(phonenumber)) {
                whereConditions.push("cm.phoneno LIKE ?");
                queryParams.push(`%${phonenumber}%`);
            }

            const customer_type = getFilterValue("customer_type");
            if (hasValue(customer_type)) {
                whereConditions.push(`${customerTypeWhereExpr} LIKE ?`);
                queryParams.push(`%${customer_type}%`);
            }

            const gstid = getFilterValue("gstid");
            if (hasValue(gstid)) {
                whereConditions.push("cm.gstno LIKE ?");
                queryParams.push(`%${gstid}%`);
            }

            const address_city = getFilterValue("address_city");
            if (hasValue(address_city)) {
                whereConditions.push("CONCAT_WS(', ', cm.address, city.cityname) LIKE ?");
                queryParams.push(`%${address_city}%`);
            }

            const havingConditions = [];
            const havingParams = [];
            const addHavingFilter = ({ filterKey, expression, isInteger = false }) => {
                const value = getFilterValue(filterKey);
                if (!hasValue(value)) return;

                const matchMode = getFilterMatchMode(filterKey);
                const stringCastExpr = isInteger
                    ? `CAST(${expression} AS CHAR)`
                    : `CAST(ROUND(CAST(${expression} AS DECIMAL(18,2)), 2) AS CHAR)`;

                if (["contains", "startswith", "endswith"].includes(matchMode)) {
                    havingConditions.push(`${stringCastExpr} LIKE ?`);
                    havingParams.push(getLikePatternByMode(matchMode, value));
                    return;
                }

                if (isInteger) {
                    havingConditions.push(`${expression} = ?`);
                    havingParams.push(parseInt(value, 10));
                    return;
                }

                havingConditions.push(`ROUND(CAST(${expression} AS DECIMAL(18,2)), 2) = ?`);
                havingParams.push(parseFloat(value));
            };

            const firstvisit = getFilterValue("firstvisit");
            if (hasValue(firstvisit)) {
                havingConditions.push(`DATE_FORMAT(MIN(om.orderdate), '%Y-%m-%d') LIKE ?`);
                havingParams.push(`%${firstvisit}%`);
            }

            const lastvisit = getFilterValue("lastvisit");
            if (hasValue(lastvisit)) {
                havingConditions.push(`DATE_FORMAT(MAX(om.orderdate), '%Y-%m-%d') LIKE ?`);
                havingParams.push(`%${lastvisit}%`);
            }

            addHavingFilter({ filterKey: "totalorders", expression: totalOrdersExpr, isInteger: true });
            addHavingFilter({ filterKey: "totalamount", expression: totalAmountExpr });
            addHavingFilter({ filterKey: "total_discount_given", expression: totalDiscountExpr });
            addHavingFilter({ filterKey: "total_tax_collected", expression: totalTaxCollectedExpr });
            addHavingFilter({ filterKey: "netamount", expression: netAmountExpr });
            addHavingFilter({ filterKey: "average_order_value", expression: avgOrderValueExpr });
            addHavingFilter({ filterKey: "outstanding_amount", expression: outstandingAmountExpr });
            addHavingFilter({ filterKey: "credit_limit", expression: creditLimitExpr });
            addHavingFilter({ filterKey: "return_count", expression: returnCountExpr, isInteger: true });
            addHavingFilter({ filterKey: "return_amount", expression: returnAmountExpr });
            addHavingFilter({ filterKey: "net_sales", expression: netSalesExpr });
            addHavingFilter({
                filterKey: "customer_since_days",
                expression: customerSinceDaysExpr,
                isInteger: true,
            });

            const preferred_payment_mode = getFilterValue("preferred_payment_mode");
            if (hasValue(preferred_payment_mode)) {
                havingConditions.push(`${preferredPaymentModeExpr} LIKE ?`);
                havingParams.push(`%${preferred_payment_mode}%`);
            }

            const global = getFilterValue("global");
            if (hasValue(global)) {
                const globalWhereConditions = [];
                const globalHavingConditions = [];

                globalWhereConditions.push("cm.name LIKE ?");
                queryParams.push(`%${global}%`);
                globalWhereConditions.push("cm.phoneno LIKE ?");
                queryParams.push(`%${global}%`);
                globalWhereConditions.push(`${customerTypeWhereExpr} LIKE ?`);
                queryParams.push(`%${global}%`);
                globalWhereConditions.push("cm.gstno LIKE ?");
                queryParams.push(`%${global}%`);
                globalWhereConditions.push("CONCAT_WS(', ', cm.address, city.cityname) LIKE ?");
                queryParams.push(`%${global}%`);

                globalHavingConditions.push(
                    `CAST(DATE_FORMAT(MIN(om.orderdate), '%Y-%m-%d') AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(DATE_FORMAT(MAX(om.orderdate), '%Y-%m-%d') AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(`CAST(${totalOrdersExpr} AS CHAR) LIKE ?`);
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(${totalAmountExpr} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(${totalDiscountExpr} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(${totalTaxCollectedExpr} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(${netAmountExpr} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(${avgOrderValueExpr} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(${outstandingAmountExpr} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(${creditLimitExpr} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(`CAST(${returnCountExpr} AS CHAR) LIKE ?`);
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(${returnAmountExpr} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(${netSalesExpr} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(`CAST(${customerSinceDaysExpr} AS CHAR) LIKE ?`);
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(`${preferredPaymentModeExpr} LIKE ?`);
                havingParams.push(`%${global}%`);

                if (globalWhereConditions.length > 0) {
                    whereConditions.push(`(${globalWhereConditions.join(" OR ")})`);
                }

                if (globalHavingConditions.length > 0) {
                    havingConditions.push(`(${globalHavingConditions.join(" OR ")})`);
                }
            }

            const whereClause = whereConditions.join(" AND ");
            const havingClause =
                havingConditions.length > 0 ? `HAVING ${havingConditions.join(" AND ")}` : "";

            const fromClause = `
                FROM ordermaster om
                INNER JOIN customermaster cm ON cm.uniquekey = om.customeruniquekey AND cm.isdeleted = 0
                LEFT JOIN citymaster city ON city.cityid = cm.cityid AND city.isdeleted = 0
                LEFT JOIN (
                    SELECT
                        pref.customeruniquekey,
                        SUBSTRING_INDEX(
                            GROUP_CONCAT(
                                pref.payment_mode
                                ORDER BY pref.mode_count DESC, pref.payment_mode ASC
                                SEPARATOR '||'
                            ),
                            '||',
                            1
                        ) AS preferred_payment_mode
                    FROM (
                        SELECT
                            om2.customeruniquekey,
                            COALESCE(pt2.paymentmodename, '') AS payment_mode,
                            COUNT(*) AS mode_count
                        FROM ordermaster om2
                        INNER JOIN paymentmaster pm2
                            ON pm2.serverorderid = om2.id
                            AND pm2.isdeleted = 0
                        INNER JOIN paymenttransactionmaster pttm2
                            ON pttm2.serverpaymentid = pm2.id
                            AND pttm2.isdeleted = 0
                        LEFT JOIN paymenttype pt2
                            ON pt2.paymentid = pttm2.paymodeid
                            AND pt2.isdeleted = 0
                        WHERE om2.isdeleted = 0
                        GROUP BY om2.customeruniquekey, COALESCE(pt2.paymentmodename, '')
                    ) pref
                    GROUP BY pref.customeruniquekey
                ) payPrefAgg ON payPrefAgg.customeruniquekey = cm.uniquekey
                LEFT JOIN (
                    SELECT
                        rsom.serverorderid,
                        COUNT(DISTINCT rsom.id) AS return_count,
                        SUM(COALESCE(rspd.totaltaxamount, 0)) AS return_amount
                    FROM returnsaleordermaster rsom
                    LEFT JOIN returnsaleorderproductdetails rspd
                        ON rspd.serverreturnsaleorderid = rsom.id
                        AND rspd.isdeleted = 0
                    WHERE rsom.isdeleted = 0
                    GROUP BY rsom.serverorderid
                ) retAgg ON retAgg.serverorderid = om.id
            `;

            const countQueryParams = [...queryParams, ...havingParams];
            const dataQueryParams = [...queryParams, ...havingParams];

            const countQuery = `
                SELECT COUNT(*) as total
                FROM (
                    SELECT
                        cm.customerid
                    ${fromClause}
                    WHERE ${whereClause}
                    GROUP BY cm.customerid, cm.name, cm.phoneno
                    ${havingClause}
                ) as subquery
            `;

            const countResult = await db.getResults(countQuery, countQueryParams);
            const totalRecords = countResult[0]?.total || 0;

            const order = String(sortOrder).toLowerCase() === "asc" ? "ASC" : "DESC";

            const sortFieldMap = {
                customername: "customername",
                phonenumber: "phonenumber",
                customer_type: "customer_type",
                gstid: "gstid",
                address_city: "address_city",
                firstvisit: "firstvisit",
                lastvisit: "lastvisit",
                total_discount_given: "total_discount_given",
                total_tax_collected: "total_tax_collected",
                netamount: "netamount",
                average_order_value: "average_order_value",
                outstanding_amount: "outstanding_amount",
                credit_limit: "credit_limit",
                totalorders: "totalorders",
                return_count: "return_count",
                return_amount: "return_amount",
                net_sales: "net_sales",
                customer_since_days: "customer_since_days",
                preferred_payment_mode: "preferred_payment_mode",
                totalamount: "totalamount",
            };

            const mappedSortField =
                sortFieldMap[String(sortField || "").toLowerCase()] || sortFieldMap.customername;

            let dataQuery = `
                SELECT
                    cm.customerid AS id,
                    cm.name AS customername,
                    cm.phoneno AS phonenumber,
                    ${customerTypeSelectExpr} AS customer_type,
                    MAX(cm.gstno) AS gstid,
                    CONCAT_WS(', ', MAX(cm.address), MAX(city.cityname)) AS address_city,
                    DATE_FORMAT(MIN(om.orderdate), '%Y-%m-%d') AS firstvisit,
                    DATE_FORMAT(MAX(om.orderdate), '%Y-%m-%d') AS lastvisit,
                    ROUND(CAST(${totalDiscountExpr} AS DECIMAL(18,2)), 2) AS total_discount_given,
                    ROUND(CAST(${totalTaxCollectedExpr} AS DECIMAL(18,2)), 2) AS total_tax_collected,
                    ROUND(CAST(${netAmountExpr} AS DECIMAL(18,2)), 2) AS netamount,
                    ROUND(CAST(${avgOrderValueExpr} AS DECIMAL(18,2)), 2) AS average_order_value,
                    ROUND(CAST(${outstandingAmountExpr} AS DECIMAL(18,2)), 2) AS outstanding_amount,
                    ROUND(CAST(${creditLimitExpr} AS DECIMAL(18,2)), 2) AS credit_limit,
                    ${totalOrdersExpr} AS totalorders,
                    ${returnCountExpr} AS return_count,
                    ROUND(CAST(${returnAmountExpr} AS DECIMAL(18,2)), 2) AS return_amount,
                    ROUND(CAST(${netSalesExpr} AS DECIMAL(18,2)), 2) AS net_sales,
                    ${customerSinceDaysExpr} AS customer_since_days,
                    ${preferredPaymentModeExpr} AS preferred_payment_mode,
                    ROUND(CAST(${totalAmountExpr} AS DECIMAL(18,2)), 2) AS totalamount
                ${fromClause}
                WHERE ${whereClause}
                GROUP BY cm.customerid, cm.name, cm.phoneno
                ${havingClause}
                ORDER BY ${mappedSortField} ${order}
            `;

            const startNum = parseInt(start, 10);
            const lengthNum = parseInt(length, 10);

            if (lengthNum !== -1) {
                dataQuery += " LIMIT ?, ?";
                dataQueryParams.push(startNum, lengthNum);
            }

            const customerSalesData = await db.getResults(dataQuery, dataQueryParams);
            const totalPages = lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1;

            return {
                data: customerSalesData,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching customer sales summary report: ${error.message}`, {
                source: "customerSalesSummary.model.js",
                function: "getCustomerSalesSummaryReport",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters,
            });
            throw error;
        }
    },
};
