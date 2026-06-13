const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Category Sales Summary Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns category sales data with pagination info
     */
    getCategorySalesSummary: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField = "grandtotal",
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

            const round2 = (num) => Number((Number(num) || 0).toFixed(2));

            const quantityExpr = "SUM(opd.quantity)";
            const totalAmountExpr = "SUM(opd.totalamount)";
            const discountAmountExpr = "SUM(opd.discountamount)";
            const taxAmountExpr = "SUM(opd.taxamount)";
            const grandTotalExpr = "SUM(opd.totaltaxamount)";
            const noOfTransactionsExpr = "COUNT(DISTINCT om.id)";
            const noOfCustomersExpr = "COUNT(DISTINCT om.customerid)";
            const noOfProductsExpr = "COUNT(DISTINCT opd.pmuniquekey)";
            const taxableAmountExpr = "SUM(opd.taxableamount)";
            const netAmountExpr =
              "(SUM(opd.totalamount) - SUM(opd.discountamount))";
            const cgstExpr = "SUM(COALESCE(taxAgg.cgst_amount, 0))";
            const sgstExpr = "SUM(COALESCE(taxAgg.sgst_amount, 0))";
            const igstExpr = "SUM(COALESCE(taxAgg.igst_amount, 0))";
            const returnQtyExpr = "SUM(COALESCE(retAgg.return_qty, 0))";
            const returnAmountExpr = "SUM(COALESCE(retAgg.return_amount, 0))";
            const avgSalePriceExpr = `CASE WHEN ${quantityExpr} = 0 THEN 0 ELSE ${grandTotalExpr} / ${quantityExpr} END`;
            const netSalesExpr = `(${grandTotalExpr} - ${returnAmountExpr})`;

            // Base WHERE conditions
            let whereConditions = ["om.isdeleted = 0", "opd.isdeleted = 0"];
            let queryParams = [];

            // Company filter (required)
            const companyid = getFilterValue("companyid");
            if (hasValue(companyid)) {
                whereConditions.push("om.companyid = ?");
                queryParams.push(companyid);
            }

            // Location filter - Check direct param first, then filters object
            const locationid = locationId || getFilterValue("locationid");
            if (hasValue(locationid)) {
                whereConditions.push("om.locationid = ?");
                queryParams.push(locationid);
            }

            // Date range filter
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

            // Customer filter
            const customerid = getFilterValue("customerid");
            if (hasValue(customerid)) {
                whereConditions.push("om.customerid = ?");
                queryParams.push(customerid);
            }

            // Salesperson filter
            const salepersonid = getFilterValue("salepersonid");
            if (hasValue(salepersonid)) {
                whereConditions.push("om.salepersonid = ?");
                queryParams.push(salepersonid);
            }

            // Master Category filter
            const mastercategoryid = getFilterValue("mastercategoryid");
            if (hasValue(mastercategoryid)) {
                whereConditions.push("im.mastercategoryid = ?");
                queryParams.push(mastercategoryid);
            }

            // Category filter
            const categoryid = getFilterValue("categoryid");
            if (hasValue(categoryid)) {
                whereConditions.push("im.categoryid = ?");
                queryParams.push(categoryid);
            }

            // Sub Category filter
            const subcategoryid = getFilterValue("subcategoryid");
            if (hasValue(subcategoryid)) {
                whereConditions.push("im.subcategoryid = ?");
                queryParams.push(subcategoryid);
            }

            // Text field filters (LIKE match)
            const textFilters = {
                mastercategory: "mcm.itemcategoryname",
                productcategory: "cm.itemcategoryname",
                productsubcategory: "scm.itemcategoryname",
            };

            Object.entries(textFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (hasValue(value)) {
                    whereConditions.push(`${dbField} LIKE ?`);
                    queryParams.push(`%${value}%`);
                }
            });

            // Store filters for aggregated numeric fields (HAVING clause)
            const havingConditions = [];
            const havingParams = [];

            const getLikePatternByMode = (mode, value) => {
                const stringValue = String(value ?? "");
                if (mode === "startswith") return `${stringValue}%`;
                if (mode === "endswith") return `%${stringValue}`;
                return `%${stringValue}%`;
            };

            const addAggregatedFilter = ({ filterKey, expression, isInteger = false }) => {
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

            // Numeric field filters (aggregated - HAVING clause)
            addAggregatedFilter({ filterKey: "quantity", expression: quantityExpr });
            addAggregatedFilter({ filterKey: "totalamount", expression: totalAmountExpr });
            addAggregatedFilter({ filterKey: "discountamount", expression: discountAmountExpr });
            addAggregatedFilter({ filterKey: "taxamount", expression: taxAmountExpr });
            addAggregatedFilter({ filterKey: "grandtotal", expression: grandTotalExpr });
            addAggregatedFilter({
                filterKey: "no_of_transactions",
                expression: noOfTransactionsExpr,
                isInteger: true,
            });
            addAggregatedFilter({
                filterKey: "no_of_customers",
                expression: noOfCustomersExpr,
                isInteger: true,
            });
            addAggregatedFilter({
                filterKey: "no_of_products",
                expression: noOfProductsExpr,
                isInteger: true,
            });
            addAggregatedFilter({ filterKey: "taxableamount", expression: taxableAmountExpr });
            addAggregatedFilter({ filterKey: "netamount", expression: netAmountExpr });
            addAggregatedFilter({ filterKey: "cgst", expression: cgstExpr });
            addAggregatedFilter({ filterKey: "sgst", expression: sgstExpr });
            addAggregatedFilter({ filterKey: "igst", expression: igstExpr });
            addAggregatedFilter({ filterKey: "return_qty", expression: returnQtyExpr });
            addAggregatedFilter({ filterKey: "return_amount", expression: returnAmountExpr });
            addAggregatedFilter({ filterKey: "avg_sale_price", expression: avgSalePriceExpr });
            addAggregatedFilter({ filterKey: "net_sales", expression: netSalesExpr });

            // Global search filter
            const global = getFilterValue("global");
            if (hasValue(global)) {
                const globalWhereConditions = [];
                const globalHavingConditions = [];

                // Search in non-aggregated text fields (WHERE clause)
                globalWhereConditions.push(`mcm.itemcategoryname LIKE ?`);
                queryParams.push(`%${global}%`);
                globalWhereConditions.push(`cm.itemcategoryname LIKE ?`);
                queryParams.push(`%${global}%`);
                globalWhereConditions.push(`scm.itemcategoryname LIKE ?`);
                queryParams.push(`%${global}%`);

                // Search in aggregated numeric fields (HAVING clause)
                globalHavingConditions.push(`CAST(ROUND(SUM(opd.quantity), 2) AS CHAR) LIKE ?`);
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(SUM(opd.totalamount) AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(SUM(opd.discountamount) AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(SUM(opd.taxamount) AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(SUM(opd.totaltaxamount) AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(`CAST(COUNT(DISTINCT om.id) AS CHAR) LIKE ?`);
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(`CAST(COUNT(DISTINCT om.customerid) AS CHAR) LIKE ?`);
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(`CAST(COUNT(DISTINCT opd.pmuniquekey) AS CHAR) LIKE ?`);
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(${taxableAmountExpr} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(${netAmountExpr} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(${cgstExpr} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(${sgstExpr} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(${igstExpr} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(${returnQtyExpr} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(${returnAmountExpr} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(${avgSalePriceExpr} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);
                globalHavingConditions.push(
                    `CAST(ROUND(CAST(${netSalesExpr} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                );
                havingParams.push(`%${global}%`);

                // Add global WHERE conditions with OR
                if (globalWhereConditions.length > 0) {
                    whereConditions.push(`(${globalWhereConditions.join(" OR ")})`);
                }

                // Add global HAVING conditions with OR
                if (globalHavingConditions.length > 0) {
                    havingConditions.push(`(${globalHavingConditions.join(" OR ")})`);
                }
            }

            const whereClause = whereConditions.join(" AND ");
            const havingClause =
                havingConditions.length > 0 ? `HAVING ${havingConditions.join(" AND ")}` : "";
            const fromClause = `
                FROM ordermaster om
                INNER JOIN orderproductdetails opd ON opd.serverorderid = om.id AND opd.isdeleted = 0
                LEFT JOIN itemmaster im ON im.uniquekey = opd.pmuniquekey AND im.isdeleted = 0
                LEFT JOIN itemcategorymaster mcm ON mcm.itemcategoryid = im.mastercategoryid AND mcm.isdeleted = 0
                LEFT JOIN itemcategorymaster cm ON cm.itemcategoryid = im.categoryid AND cm.isdeleted = 0
                LEFT JOIN itemcategorymaster scm ON scm.itemcategoryid = im.subcategoryid AND scm.isdeleted = 0
                LEFT JOIN (
                    SELECT
                        optd.serverorderproductid,
                        SUM(CASE WHEN tm.isapplicableon = 2 THEN optd.taxamount / 2 ELSE 0 END) AS cgst_amount,
                        SUM(CASE WHEN tm.isapplicableon = 2 THEN optd.taxamount / 2 ELSE 0 END) AS sgst_amount,
                        SUM(CASE WHEN tm.isapplicableon = 1 THEN optd.taxamount ELSE 0 END) AS igst_amount
                    FROM orderproducttaxdetails optd
                    INNER JOIN taxmaster tm ON tm.taxid = optd.taxid AND tm.isdeleted = 0
                    WHERE optd.isdeleted = 0
                    GROUP BY optd.serverorderproductid
                ) taxAgg ON taxAgg.serverorderproductid = opd.id
                LEFT JOIN (
                    SELECT
                        rsom.serverorderid,
                        rspd.pmuniquekey,
                        SUM(rspd.returnquantity) AS return_qty,
                        SUM(rspd.totaltaxamount) AS return_amount
                    FROM returnsaleordermaster rsom
                    INNER JOIN returnsaleorderproductdetails rspd
                        ON rspd.serverreturnsaleorderid = rsom.id
                        AND rspd.isdeleted = 0
                    WHERE rsom.isdeleted = 0
                    GROUP BY rsom.serverorderid, rspd.pmuniquekey
                ) retAgg ON retAgg.serverorderid = om.id AND retAgg.pmuniquekey = opd.pmuniquekey
            `;

            // Build params for count and data queries
            const countQueryParams = [...queryParams, ...havingParams];
            const dataQueryParams = [...queryParams, ...havingParams];

            // Count total records
            const countQuery = `
                SELECT COUNT(*) as total
                FROM (
                    SELECT
                        im.mastercategoryid,
                        im.categoryid,
                        im.subcategoryid
                    ${fromClause}
                    WHERE ${whereClause}
                    GROUP BY im.mastercategoryid, im.categoryid, im.subcategoryid
                    ${havingClause}
                ) as subquery
            `;

            const countResult = await db.getResults(countQuery, countQueryParams);
            const totalRecords = countResult[0]?.total || 0;

            // Sorting - Map frontend field names to database fields/aliases
            const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

            // Map sortField to actual column/alias in query
            const sortFieldMap = {
                mastercategory: "mastercategory",
                productcategory: "productcategory",
                productsubcategory: "productsubcategory",
                quantity: "quantity",
                totalamount: "totalamount",
                discountamount: "discountamount",
                taxamount: "taxamount",
                grandtotal: "grandtotal",
                no_of_transactions: "no_of_transactions",
                no_of_customers: "no_of_customers",
                no_of_products: "no_of_products",
                taxableamount: "taxableamount",
                netamount: "netamount",
                cgst: "cgst",
                sgst: "sgst",
                igst: "igst",
                return_qty: "return_qty",
                return_amount: "return_amount",
                net_sales: "net_sales",
                avg_sale_price: "avg_sale_price",
                pct_of_sales: "pct_of_sales",
            };

            const mappedSortField =
                sortFieldMap[sortField?.toLowerCase()] || sortFieldMap["grandtotal"];

            const derivedSortFields = new Set([
              "pct_of_sales",
            ]);
            const usePostSort = derivedSortFields.has(mappedSortField);

            const pct_of_sales = getFilterValue("pct_of_sales");
            const pctOfSalesMatchMode = getFilterMatchMode("pct_of_sales");
            const hasDerivedFilters = hasValue(pct_of_sales);
            const shouldPostProcess = usePostSort || hasDerivedFilters;


            const totalGrandTotalQuery = `
                SELECT COALESCE(SUM(grandtotal), 0) AS totalGrandTotal
                FROM (
                    SELECT CAST(${grandTotalExpr} AS DECIMAL(18,2)) AS grandtotal
                    ${fromClause}
                    WHERE ${whereClause}
                    GROUP BY im.mastercategoryid, im.categoryid, im.subcategoryid
                    ${havingClause}
                ) t
            `;

            const totalGrandTotalResult = await db.getResults(
                totalGrandTotalQuery,
                [...queryParams, ...havingParams],
            );
            const totalGrandTotal =
                parseFloat(totalGrandTotalResult[0]?.totalGrandTotal) || 0;

            // Main query for category sales summary
            let dataQuery = `
                SELECT
                    CONCAT_WS('-',
                        COALESCE(im.mastercategoryid, 0),
                        COALESCE(im.categoryid, 0),
                        COALESCE(im.subcategoryid, 0)
                    ) as id,
                    mcm.itemcategoryname AS mastercategory,
                    cm.itemcategoryname AS productcategory,
                    scm.itemcategoryname AS productsubcategory,
                    ROUND(${quantityExpr}, 2) AS quantity,
                    ROUND(CAST(${totalAmountExpr} AS DECIMAL(18,2)), 2) AS totalamount,
                    ROUND(CAST(${discountAmountExpr} AS DECIMAL(18,2)), 2) AS discountamount,
                    ROUND(CAST(${taxAmountExpr} AS DECIMAL(18,2)), 2) AS taxamount,
                    ROUND(CAST(${grandTotalExpr} AS DECIMAL(18,2)), 2) AS grandtotal,
                    COUNT(DISTINCT om.id) AS no_of_transactions,
                    COUNT(DISTINCT om.customerid) AS no_of_customers,
                    COUNT(DISTINCT opd.pmuniquekey) AS no_of_products,
                    ROUND(CAST(${taxableAmountExpr} AS DECIMAL(18,2)), 2) AS taxableamount,
                    ROUND(CAST(${netAmountExpr} AS DECIMAL(18,2)), 2) AS netamount,
                    ROUND(CAST(${cgstExpr} AS DECIMAL(18,2)), 2) AS cgst,
                    ROUND(CAST(${sgstExpr} AS DECIMAL(18,2)), 2) AS sgst,
                    ROUND(CAST(${igstExpr} AS DECIMAL(18,2)), 2) AS igst,
                    ROUND(CAST(${returnQtyExpr} AS DECIMAL(18,2)), 2) AS return_qty,
                    ROUND(CAST(${returnAmountExpr} AS DECIMAL(18,2)), 2) AS return_amount,
                    ROUND(CAST(${avgSalePriceExpr} AS DECIMAL(18,2)), 2) AS avg_sale_price,
                    ROUND(CAST(${netSalesExpr} AS DECIMAL(18,2)), 2) AS net_sales
                ${fromClause}
                WHERE ${whereClause}
                GROUP BY im.mastercategoryid, im.categoryid, im.subcategoryid
                ${havingClause}
            `;
            if (!shouldPostProcess) {
                dataQuery += ` ORDER BY ${mappedSortField} ${order}`;
            }

            // Pagination using start and length
            const startNum = parseInt(start);
            const lengthNum = parseInt(length);

            if (!shouldPostProcess && lengthNum !== -1) {
              dataQuery += ` LIMIT ?, ?`;
              dataQueryParams.push(startNum, lengthNum);
            }

            let categorySalesData = await db.getResults(dataQuery, dataQueryParams);

            categorySalesData = categorySalesData.map((row) => {
              const grand = parseFloat(row.grandtotal) || 0;

              return {
                ...row,
                pct_of_sales: round2(
                  totalGrandTotal > 0 ? (grand / totalGrandTotal) * 100 : 0,
                ),
              };
            });

            if (hasDerivedFilters) {
                categorySalesData = categorySalesData.filter((row) => {
                if (!hasValue(pct_of_sales)) return true;

                const rowValue = String(round2(row.pct_of_sales));
                const filterValue = String(pct_of_sales);

                if (pctOfSalesMatchMode === "contains") {
                    return rowValue.includes(filterValue);
                }

                if (pctOfSalesMatchMode === "startswith") {
                    return rowValue.startsWith(filterValue);
                }

                if (pctOfSalesMatchMode === "endswith") {
                    return rowValue.endsWith(filterValue);
                }

                return round2(row.pct_of_sales) === round2(parseFloat(pct_of_sales));
              });
            }

            if (shouldPostProcess) {
              categorySalesData.sort((a, b) => {
                const aVal = parseFloat(a[mappedSortField]) || 0;
                const bVal = parseFloat(b[mappedSortField]) || 0;
                return order === "ASC" ? aVal - bVal : bVal - aVal;
              });

              const processedTotalRecords = categorySalesData.length;

              if (lengthNum !== -1) {
                categorySalesData = categorySalesData.slice(
                  startNum,
                  startNum + lengthNum,
                );
              }

              const totalPages = lengthNum !== -1 ? Math.ceil(processedTotalRecords / lengthNum) : 1;

              return {
                  data: categorySalesData,
                  pagination: {
                      start: startNum,
                      length: lengthNum,
                      total: processedTotalRecords,
                      totalPages,
                  },
              };
            }

            // Calculate total pages
            const totalPages = lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1;

            return {
                data: categorySalesData,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching category sales summary report: ${error.message}`, {
                source: "categorySalesSummary.model.js",
                function: "getCategorySalesSummaryReport",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters
            });
            throw error;
        }
    },
};
