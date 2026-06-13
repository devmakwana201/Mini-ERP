const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Price Deviation Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns price deviation data with pagination info
     */
    getPriceDeviation: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField = "lastpurchasedate",
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

            const getFilterValue = (field) => {
                const val = parsedFilters[field];
                return typeof val === "object" ? val.value : val;
            };

            // Base WHERE conditions
            let whereConditions = ["pom.isdeleted = 0", "poid.isdeleted = 0"];
            let subWhereConditions = ["pom2.isdeleted = 0", "poid2.isdeleted = 0"];
            let queryParams = [];

            // Company filter (required)
            const companyid = getFilterValue("companyid");
            if (companyid) {
                whereConditions.push("pom.companyid = ?");
                subWhereConditions.push("pom2.companyid = ?");
                queryParams.push(companyid);
            }

            // Location filter
            const locationid = locationId || getFilterValue("locationid");
            if (locationid) {
                whereConditions.push("pom.locationid = ?");
                subWhereConditions.push("pom2.locationid = ?");
                queryParams.push(locationid);
            }

            // Date range filter
            const fromDate = getFilterValue("fromDate");
            const toDate = getFilterValue("toDate");
            if (fromDate && toDate) {
                whereConditions.push("DATE(pom.purchaseorderdate) BETWEEN ? AND ?");
                subWhereConditions.push("DATE(pom2.purchaseorderdate) BETWEEN ? AND ?");
                queryParams.push(fromDate, toDate);
            } else if (fromDate) {
                whereConditions.push("DATE(pom.purchaseorderdate) >= ?");
                subWhereConditions.push("DATE(pom2.purchaseorderdate) >= ?");
                queryParams.push(fromDate);
            } else if (toDate) {
                whereConditions.push("DATE(pom.purchaseorderdate) <= ?");
                subWhereConditions.push("DATE(pom2.purchaseorderdate) <= ?");
                queryParams.push(toDate);
            }

            // Supplier filter
            const supplierid = getFilterValue("supplierid");
            if (supplierid) {
                whereConditions.push("sm.supplierid = ?");
                subWhereConditions.push("sm2.supplierid = ?");
                queryParams.push(supplierid);
            }

            // Product filter
            const productid = getFilterValue("productid");
            if (productid) {
                whereConditions.push("im.itemid = ?");
                subWhereConditions.push("im2.itemid = ?");
                queryParams.push(productid);
            }

            // Category filter
            const categoryid = getFilterValue("categoryid");
            if (categoryid) {
                whereConditions.push("mcm.itemcategoryid = ?");
                subWhereConditions.push("mcm2.itemcategoryid = ?");
                queryParams.push(categoryid);
            }

            // Brand filter
            const brandid = getFilterValue("brandid");
            if (brandid) {
                whereConditions.push("bm.brandid = ?");
                subWhereConditions.push("bm2.brandid = ?");
                queryParams.push(brandid);
            }

            // Text field filters (LIKE match) - applied via HAVING
            let havingConditions = [];
            let havingParams = [];

            const textFilters = {
                supplier: "supplier",
                product: "product",
                category: "category",
                brand: "brand",
                uom: "uom",
                hsncode: "hsncode",
                firstpurchasedate: "firstpurchasedate",
                lastpurchasedate: "lastpurchasedate",
            };

            Object.entries(textFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value) {
                    havingConditions.push(`${dbField} LIKE ?`);
                    havingParams.push(`%${value}%`);
                }
            });

            // Numeric field filters (contains match with LIKE) - applied via HAVING
            const numericFilters = {
                minimumprice: "minimumprice",
                maximumprice: "maximumprice",
                averageprice: "averageprice",
                lastpurchaseprice: "lastpurchaseprice",
                deviationpercent: "deviationpercent",
                totalquantity: "totalquantity",
                purchasecount: "purchasecount",
            };

            Object.entries(numericFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value) {
                    havingConditions.push(`CAST(${dbField} AS CHAR) LIKE ?`);
                    havingParams.push(`%${value}%`);
                }
            });

            // Global search filter
            const global = getFilterValue("global");
            if (global) {
                const searchConditions = [];
                const textSearchFields = Object.values(textFilters);
                textSearchFields.forEach((field) => {
                    searchConditions.push(`${field} LIKE ?`);
                });

                const numericSearchFields = Object.values(numericFilters);
                numericSearchFields.forEach((field) => {
                    searchConditions.push(`CAST(${field} AS CHAR) LIKE ?`);
                });

                havingConditions.push(`(${searchConditions.join(" OR ")})`);

                const searchTerm = `%${global}%`;
                const totalFields = textSearchFields.length + numericSearchFields.length;
                for (let i = 0; i < totalFields; i++) {
                    havingParams.push(searchTerm);
                }
            }

            const whereClause = whereConditions.join(" AND ");
            const subWhereClause = subWhereConditions.join(" AND ");
            const havingClause =
                havingConditions.length > 0 ? `HAVING ${havingConditions.join(" AND ")}` : "";

            // Ignore zero-quantity rows in rate calculations so they do not distort min/max/avg.
            const unitPriceExpr =
                "CASE WHEN poid.quantity > 0 THEN (poid.totalamount / poid.quantity) ELSE NULL END";
            const subUnitPriceExpr =
                "CASE WHEN poid2.quantity > 0 THEN (poid2.totalamount / poid2.quantity) ELSE NULL END";

            // Base select (reused in count and data)
            const baseSelect = `
                SELECT
                    sm.suppliername AS supplier,
                    im.itemname AS product,
                    mcm.itemcategoryname AS category,
                    bm.brandname AS brand,
                    uom.uomname AS uom,
                    im.hsnseccode AS hsncode,
                    ROUND(MIN(${unitPriceExpr}), 2) AS minimumprice,
                    ROUND(MAX(${unitPriceExpr}), 2) AS maximumprice,
                    ROUND(AVG(${unitPriceExpr}), 2) AS averageprice,
                    ROUND((
                        SELECT
                          ${subUnitPriceExpr}
                        FROM purchaseorderitemsdetails poid2
                        INNER JOIN purchaseordermaster pom2
                            ON poid2.serverorderid = pom2.id
                        LEFT JOIN suppliermaster sm2
                            ON sm2.uniquekey = pom2.smuniquekey AND sm2.isdeleted = 0
                        LEFT JOIN itemmaster im2
                            ON im2.uniquekey = poid2.productuniquekey AND im2.isdeleted = 0
                        LEFT JOIN itemcategorymaster mcm2
                            ON mcm2.itemcategoryid = im2.mastercategoryid AND mcm2.isdeleted = 0
                        LEFT JOIN brandmaster bm2
                            ON bm2.brandid = im2.brandid AND bm2.isdeleted = 0
                        WHERE ${subWhereClause}
                          AND poid2.productuniquekey = poid.productuniquekey
                          AND pom2.smuniquekey = pom.smuniquekey
                          AND poid2.quantity > 0
                        ORDER BY pom2.purchaseorderdate DESC, poid2.orderitemsdetailsid DESC
                        LIMIT 1
                    ), 2) AS lastpurchaseprice,
                    ROUND(
                        CASE
                            WHEN AVG(${unitPriceExpr}) > 0
                            THEN (
                                (MAX(${unitPriceExpr})
                                 - MIN(${unitPriceExpr}))
                                / AVG(${unitPriceExpr})
                              ) * 100
                            ELSE 0
                        END,
                        2
                    ) AS deviationpercent,
                    ROUND(SUM(poid.quantity), 2) AS totalquantity,
                    COUNT(DISTINCT pom.id) AS purchasecount,
                    DATE_FORMAT(MIN(pom.purchaseorderdate), '%d/%m/%Y') AS firstpurchasedate,
                    DATE_FORMAT(MAX(pom.purchaseorderdate), '%d/%m/%Y') AS lastpurchasedate
                FROM purchaseordermaster pom
                INNER JOIN purchaseorderitemsdetails poid
                    ON poid.serverorderid = pom.id AND poid.isdeleted = 0
                LEFT JOIN suppliermaster sm
                    ON sm.uniquekey = pom.smuniquekey AND sm.isdeleted = 0
                LEFT JOIN itemmaster im
                    ON im.uniquekey = poid.productuniquekey AND im.isdeleted = 0
                LEFT JOIN itemcategorymaster mcm
                    ON mcm.itemcategoryid = im.mastercategoryid AND mcm.isdeleted = 0
                LEFT JOIN brandmaster bm
                    ON bm.brandid = im.brandid AND bm.isdeleted = 0
                LEFT JOIN uommaster uom
                    ON uom.uomid = poid.uomid AND uom.isdeleted = 0
                WHERE ${whereClause}
                GROUP BY
                    pom.smuniquekey,
                    poid.productuniquekey,
                    sm.suppliername,
                    im.itemname,
                    mcm.itemcategoryname,
                    bm.brandname,
                    uom.uomname,
                    im.hsnseccode
                ${havingClause}
            `;

            const subParams = [...queryParams];
            const baseParams = [...queryParams];

            // Count total records
            const countQuery = `
                SELECT COUNT(*) as total
                FROM (
                    ${baseSelect}
                ) AS grouped_data
            `;

            const countParams = [...subParams, ...baseParams, ...havingParams];
            const countResult = await db.getResults(countQuery, countParams);
            const totalRecords = countResult[0]?.total || 0;

            // Sorting
            const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";
            const sortFieldMap = {
                supplier: "supplier",
                product: "product",
                category: "category",
                brand: "brand",
                uom: "uom",
                hsncode: "hsncode",
                minimumprice: "minimumprice",
                maximumprice: "maximumprice",
                averageprice: "averageprice",
                lastpurchaseprice: "lastpurchaseprice",
                deviationpercent: "deviationpercent",
                totalquantity: "totalquantity",
                purchasecount: "purchasecount",
                firstpurchasedate: "firstpurchasedate",
                lastpurchasedate: "lastpurchasedate",
            };

            const mappedSortField =
                sortFieldMap[sortField?.toLowerCase()] || sortFieldMap["lastpurchasedate"];

            // Data query
            let dataQuery = `
                ${baseSelect}
                ORDER BY ${mappedSortField} ${order}
            `;

            const startNum = parseInt(start);
            const lengthNum = parseInt(length);
            const dataParams = [...subParams, ...baseParams, ...havingParams];

            if (lengthNum !== -1) {
                dataQuery += ` LIMIT ?, ?`;
                dataParams.push(startNum, lengthNum);
            }

            const data = await db.getResults(dataQuery, dataParams);

            const totalPages = lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1;
            return {
                data,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching price deviation report: ${error.message}`, {
                source: "priceDeviation.model.js",
                function: "getPriceDeviation",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters
            });
            throw error;
        }
    },
};
