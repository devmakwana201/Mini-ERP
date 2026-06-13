const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Product Category Wise Purchase Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns category-wise purchase summary data with pagination info
     */
    getProductCategoryWisePurchase: async (req) => {
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
                return typeof val === "object" ? val.value : val;
            };

            // Base WHERE conditions
            let whereConditions = ["pom.isdeleted = 0", "poid.isdeleted = 0"];
            let queryParams = [];

            // Company filter (required)
            const companyid = getFilterValue("companyid");
            if (companyid) {
                whereConditions.push("pom.companyid = ?");
                queryParams.push(companyid);
            }

            // Location filter
            const locationid = locationId || getFilterValue("locationid");
            if (locationid) {
                whereConditions.push("pom.locationid = ?");
                queryParams.push(locationid);
            }

            // Date range filter
            const fromDate = getFilterValue("fromDate");
            const toDate = getFilterValue("toDate");
            if (fromDate && toDate) {
                whereConditions.push("DATE(pom.purchaseorderdate) BETWEEN ? AND ?");
                queryParams.push(fromDate, toDate);
            } else if (fromDate) {
                whereConditions.push("DATE(pom.purchaseorderdate) >= ?");
                queryParams.push(fromDate);
            } else if (toDate) {
                whereConditions.push("DATE(pom.purchaseorderdate) <= ?");
                queryParams.push(toDate);
            }

            // Supplier filter
            const supplierid = getFilterValue("supplierid");
            if (supplierid) {
                whereConditions.push("pom.supplierid = ?");
                queryParams.push(supplierid);
            }

            // Category filter
            const categoryid = getFilterValue("categoryid");
            if (categoryid) {
                whereConditions.push("im.categoryid = ?");
                queryParams.push(categoryid);
            }

            // Store filters for aggregated fields (HAVING clause)
            const havingConditions = [];
            const havingParams = [];

            // Text field filter for category
            const productcategory = getFilterValue("productcategory");
            if (productcategory) {
                whereConditions.push("cm.itemcategoryname LIKE ?");
                queryParams.push(`%${productcategory}%`);
            }

            const exactNumericFilters = {
                quantity: "SUM(poid.quantity)",
                noofproducts: "COUNT(DISTINCT poid.productuniquekey)",
                noofpos: "COUNT(DISTINCT pom.id)",
                returnqty: "IFNULL(MAX(returndet.returnqty), 0)",
            };

            Object.entries(exactNumericFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value !== null && value !== undefined && value !== "") {
                    havingConditions.push(`ROUND(CAST(${dbField} AS DECIMAL(18,2)), 2) = ?`);
                    havingParams.push(parseFloat(value));
                }
            });

            const containsNumericFilters = {
                averageunitprice: "CASE WHEN SUM(poid.quantity) = 0 THEN 0 ELSE SUM(poid.totalamount) / SUM(poid.quantity) END",
                total: "SUM(poid.totalamount)",
                discount: "SUM(poid.discountamount)",
                netamount: "SUM(poid.totalamount) - SUM(poid.discountamount)",
                taxableamount: "SUM(poid.taxableamount)",
                cgst: "SUM(IFNULL(taxdet.cgst, 0))",
                sgst: "SUM(IFNULL(taxdet.sgst, 0))",
                igst: "SUM(IFNULL(taxdet.igst, 0))",
                taxamount: "SUM(poid.taxamount)",
                returnamount: "IFNULL(MAX(returndet.returnamount), 0)",
                netpurchase: "SUM(poid.totaltaxamount) - IFNULL(MAX(returndet.returnamount), 0)",
                grandtotal: "SUM(poid.totaltaxamount)",
            };

            Object.entries(containsNumericFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value !== null && value !== undefined && value !== "") {
                    havingConditions.push(
                        `CAST(ROUND(CAST(${dbField} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                    );
                    havingParams.push(`%${value}%`);
                }
            });

            // Global search filter
            const global = getFilterValue("global");
            if (global) {
                const globalHavingConditions = [];

                // Search in category name
                globalHavingConditions.push("cm.itemcategoryname LIKE ?");
                havingParams.push(`%${global}%`);

                // Search in aggregated numeric fields
                [...Object.values(exactNumericFilters), ...Object.values(containsNumericFilters)].forEach((field) => {
                    globalHavingConditions.push(
                        `CAST(ROUND(CAST(${field} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                    );
                    havingParams.push(`%${global}%`);
                });

                // Add global HAVING conditions with OR
                if (globalHavingConditions.length > 0) {
                    havingConditions.push(`(${globalHavingConditions.join(" OR ")})`);
                }
            }

            const whereClause = whereConditions.join(" AND ");
            const returnWhereConditions = ["porm.isdeleted = 0", "porid.isdeleted = 0"];
            const returnQueryParams = [];

            if (companyid) {
                returnWhereConditions.push("porm.companyid = ?");
                returnQueryParams.push(companyid);
            }

            if (locationid) {
                returnWhereConditions.push("porm.locationid = ?");
                returnQueryParams.push(locationid);
            }

            if (fromDate && toDate) {
                returnWhereConditions.push("DATE(porm.purchaseorderreturndate) BETWEEN ? AND ?");
                returnQueryParams.push(fromDate, toDate);
            } else if (fromDate) {
                returnWhereConditions.push("DATE(porm.purchaseorderreturndate) >= ?");
                returnQueryParams.push(fromDate);
            } else if (toDate) {
                returnWhereConditions.push("DATE(porm.purchaseorderreturndate) <= ?");
                returnQueryParams.push(toDate);
            }

            if (supplierid) {
                returnWhereConditions.push("porm.supplierid = ?");
                returnQueryParams.push(supplierid);
            }

            if (categoryid) {
                returnWhereConditions.push("imr.categoryid = ?");
                returnQueryParams.push(categoryid);
            }

            const returnWhereClause = returnWhereConditions.join(" AND ");
            const taxDetailsJoin = `
                LEFT JOIN (
                    SELECT
                        potd.serverorderitemsdetailsid,
                        SUM(CASE WHEN UPPER(tm.taxname) LIKE '%CGST%' THEN IFNULL(potd.taxamount, 0) ELSE 0 END) AS cgst,
                        SUM(CASE WHEN UPPER(tm.taxname) LIKE '%SGST%' THEN IFNULL(potd.taxamount, 0) ELSE 0 END) AS sgst,
                        SUM(CASE WHEN UPPER(tm.taxname) LIKE '%IGST%' THEN IFNULL(potd.taxamount, 0) ELSE 0 END) AS igst
                    FROM purchaseorderitemstaxdetails potd
                    INNER JOIN taxmaster tm ON tm.taxid = potd.taxid AND tm.isdeleted = 0
                    WHERE potd.isdeleted = 0
                    GROUP BY potd.serverorderitemsdetailsid
                ) taxdet ON taxdet.serverorderitemsdetailsid = poid.id
            `;
            const returnDetailsJoin = `
                LEFT JOIN (
                    SELECT
                        imr.categoryid,
                        SUM(IFNULL(porid.quantity, 0)) AS returnqty,
                        SUM(IFNULL(porid.totaltaxamount, 0)) AS returnamount
                    FROM purchaseorderreturnmaster porm
                    INNER JOIN purchaseorderreturnitemsdetails porid ON porid.serverreturnid = porm.id AND porid.isdeleted = 0
                    LEFT JOIN itemmaster imr ON imr.uniquekey = porid.productuniquekey AND imr.isdeleted = 0
                    WHERE ${returnWhereClause}
                    GROUP BY imr.categoryid
                ) returndet ON returndet.categoryid = im.categoryid
            `;
            const totalPurchaseQuery = `
                SELECT ROUND(CAST(SUM(poid.totaltaxamount) AS DECIMAL(18,2)), 2) AS totalpurchase
                FROM purchaseordermaster pom
                INNER JOIN purchaseorderitemsdetails poid ON poid.serverorderid = pom.id AND poid.isdeleted = 0
                LEFT JOIN itemmaster im ON im.uniquekey = poid.productuniquekey AND im.isdeleted = 0
                LEFT JOIN itemcategorymaster cm ON cm.itemcategoryid = im.categoryid AND cm.isdeleted = 0
                WHERE ${whereClause}
            `;
            const totalPurchaseResult = await db.getResults(totalPurchaseQuery, queryParams);
            const totalPurchaseValue = parseFloat(totalPurchaseResult[0]?.totalpurchase || 0);
            const percentOfTotalPurchaseField =
                totalPurchaseValue > 0
                    ? `((SUM(poid.totaltaxamount) / ${totalPurchaseValue}) * 100)`
                    : "0";

            const percentOfTotalPurchase = getFilterValue("percentoftotalpurchase");
            if (percentOfTotalPurchase) {
                havingConditions.push(
                    `ROUND(CAST(${percentOfTotalPurchaseField} AS DECIMAL(18,2)), 2) = ?`
                );
                havingParams.push(parseFloat(percentOfTotalPurchase));
            }

            const havingClause =
                havingConditions.length > 0 ? `HAVING ${havingConditions.join(" AND ")}` : "";

            // Build params for count and data queries
            const countQueryParams = [...returnQueryParams, ...queryParams, ...havingParams];
            const dataQueryParams = [...returnQueryParams, ...queryParams, ...havingParams];

            // Count total records
            const countQuery = `
                SELECT COUNT(*) as total
                FROM (
                    SELECT
                        im.categoryid
                    FROM purchaseordermaster pom
                    INNER JOIN purchaseorderitemsdetails poid ON poid.serverorderid = pom.id AND poid.isdeleted = 0
                    LEFT JOIN itemmaster im ON im.uniquekey = poid.productuniquekey AND im.isdeleted = 0
                    LEFT JOIN itemcategorymaster cm ON cm.itemcategoryid = im.categoryid AND cm.isdeleted = 0
                    ${taxDetailsJoin}
                    ${returnDetailsJoin}
                    WHERE ${whereClause}
                    GROUP BY im.categoryid
                    ${havingClause}
                ) as subquery
            `;

            const countResult = await db.getResults(countQuery, countQueryParams);
            const totalRecords = countResult[0]?.total || 0;

            // Sorting - Map frontend field names to database fields/aliases
            const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

            // Map sortField to actual column/alias in query
            const sortFieldMap = {
                productcategory: "cm.itemcategoryname",
                quantity: "quantity",
                noofproducts: "noofproducts",
                noofpos: "noofpos",
                averageunitprice: "averageunitprice",
                total: "total",
                discount: "discount",
                netamount: "netamount",
                taxableamount: "taxableamount",
                cgst: "cgst",
                sgst: "sgst",
                igst: "igst",
                taxamount: "taxamount",
                percentoftotalpurchase: percentOfTotalPurchaseField,
                returnqty: "returnqty",
                returnamount: "returnamount",
                netpurchase: "netpurchase",
                grandtotal: "grandtotal",
            };

            const mappedSortField =
                sortFieldMap[sortField?.toLowerCase()] || sortFieldMap["grandtotal"];

            // Main query for category-wise purchase summary
            let dataQuery = `
                SELECT
                    im.categoryid AS id,
                    cm.itemcategoryname AS productcategory,
                    ROUND(SUM(poid.quantity), 2) AS quantity,
                    COUNT(DISTINCT poid.productuniquekey) AS noofproducts,
                    COUNT(DISTINCT pom.id) AS noofpos,
                    ROUND(CAST(CASE WHEN SUM(poid.quantity) = 0 THEN 0 ELSE SUM(poid.totalamount) / SUM(poid.quantity) END AS DECIMAL(18,2)), 2) AS averageunitprice,
                    ROUND(CAST(SUM(poid.totalamount) AS DECIMAL(18,2)), 2) AS total,
                    ROUND(CAST(SUM(poid.discountamount) AS DECIMAL(18,2)), 2) AS discount,
                    ROUND(CAST(SUM(poid.totalamount) - SUM(poid.discountamount) AS DECIMAL(18,2)), 2) AS netamount,
                    ROUND(CAST(SUM(poid.taxableamount) AS DECIMAL(18,2)), 2) AS taxableamount,
                    ROUND(CAST(SUM(IFNULL(taxdet.cgst, 0)) AS DECIMAL(18,2)), 2) AS cgst,
                    ROUND(CAST(SUM(IFNULL(taxdet.sgst, 0)) AS DECIMAL(18,2)), 2) AS sgst,
                    ROUND(CAST(SUM(IFNULL(taxdet.igst, 0)) AS DECIMAL(18,2)), 2) AS igst,
                    ROUND(CAST(SUM(poid.taxamount) AS DECIMAL(18,2)), 2) AS taxamount,
                    ROUND(CAST(${percentOfTotalPurchaseField} AS DECIMAL(18,2)), 2) AS percentoftotalpurchase,
                    ROUND(CAST(IFNULL(MAX(returndet.returnqty), 0) AS DECIMAL(18,2)), 2) AS returnqty,
                    ROUND(CAST(IFNULL(MAX(returndet.returnamount), 0) AS DECIMAL(18,2)), 2) AS returnamount,
                    ROUND(CAST(SUM(poid.totaltaxamount) - IFNULL(MAX(returndet.returnamount), 0) AS DECIMAL(18,2)), 2) AS netpurchase,
                    ROUND(CAST(SUM(poid.totaltaxamount) AS DECIMAL(18,2)), 2) AS grandtotal
                FROM purchaseordermaster pom
                INNER JOIN purchaseorderitemsdetails poid ON poid.serverorderid = pom.id AND poid.isdeleted = 0
                LEFT JOIN itemmaster im ON im.uniquekey = poid.productuniquekey AND im.isdeleted = 0
                LEFT JOIN itemcategorymaster cm ON cm.itemcategoryid = im.categoryid AND cm.isdeleted = 0
                ${taxDetailsJoin}
                ${returnDetailsJoin}
                WHERE ${whereClause}
                GROUP BY im.categoryid
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

            const categoryWisePurchaseData = await db.getResults(dataQuery, dataQueryParams);

            // Calculate total pages
            const totalPages = lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1;

            return {
                data: categoryWisePurchaseData,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching product category-wise purchase report: ${error.message}`, {
                source: "productCategoryWisePurchase.model.js",
                function: "getProductCategoryWisePurchaseReport",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters
            });
            throw error;
        }
    },
};
