const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Daily Purchase Summary Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns daily purchase summary data with pagination info
     */
    getDailyPurchaseSummary: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField = "purchaseorderdate",
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

            const parseNumericFilter = (value) => {
                if (value === null || value === undefined || value === "") return null;
                const num = Number(value);
                return Number.isFinite(num) ? num : null;
            };

            // Base WHERE conditions
            let whereConditions = ["pom.isdeleted = 0"];
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

            const whereClause = whereConditions.join(" AND ");

            // Text field filters (LIKE match) - applied via HAVING
            let havingConditions = [];
            let havingParams = [];

            const textFilters = {
                purchaseorderdate: "purchaseorderdate",
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
                noofpos: "noofpos",
                noofsuppliers: "noofsuppliers",
                totalquantity: "totalquantity",
                totalamount: "totalamount",
                discountamount: "discountamount",
                netamount: "netamount",
                totaltaxableamount: "totaltaxableamount",
                cgst: "cgst",
                sgst: "sgst",
                igst: "igst",
                totaltax: "totaltax",
                additionalcharges: "additionalcharges",
                roundoff: "roundoff",
                grandtotal: "grandtotal",
                returnamount: "returnamount",
                netpurchase: "netpurchase",
                averagepovalue: "averagepovalue",
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

                havingConditions.push(`(${searchConditions.join(" OR ")})`);

                const searchTerm = `%${global}%`;
                const totalFields = textSearchFields.length + numericSearchFields.length;
                for (let i = 0; i < totalFields; i++) {
                    havingParams.push(searchTerm);
                }
            }

            const havingClause =
                havingConditions.length > 0 ? `HAVING ${havingConditions.join(" AND ")}` : "";

            // Build return master where clause with same filters
            let returnWhereConditions = ["prm.isdeleted = 0"];
            let returnQueryParams = [];

            if (companyid) {
                returnWhereConditions.push("prm.companyid = ?");
                returnQueryParams.push(companyid);
            }

            if (locationid) {
                returnWhereConditions.push("prm.locationid = ?");
                returnQueryParams.push(locationid);
            }

            if (fromDate && toDate) {
                returnWhereConditions.push("DATE(prm.purchaseorderreturndate) BETWEEN ? AND ?");
                returnQueryParams.push(fromDate, toDate);
            } else if (fromDate) {
                returnWhereConditions.push("DATE(prm.purchaseorderreturndate) >= ?");
                returnQueryParams.push(fromDate);
            } else if (toDate) {
                returnWhereConditions.push("DATE(prm.purchaseorderreturndate) <= ?");
                returnQueryParams.push(toDate);
            }

            const returnWhereClause = returnWhereConditions.join(" AND ");

            const baseParams = [...queryParams];
            const taxParams = [...queryParams];
            const returnParams = [...returnQueryParams];

            // Count total records
            const countQuery = `
                SELECT COUNT(*) as total
                FROM (
                    SELECT
                        DATE_FORMAT(bd.purchaseorderdate, '%d/%m/%Y') AS purchaseorderdate,
                        bd.noofpos,
                        bd.noofsuppliers,
                        bd.totalquantity,
                        bd.totalamount,
                        bd.discountamount,
                        ROUND((bd.totalamount - bd.discountamount), 2) AS netamount,
                        bd.totaltaxableamount,
                        IFNULL(td.cgst, 0) AS cgst,
                        IFNULL(td.sgst, 0) AS sgst,
                        IFNULL(td.igst, 0) AS igst,
                        bd.totaltax,
                        bd.additionalcharges,
                        bd.roundoff,
                        bd.grandtotal,
                        IFNULL(rd.returnamount, 0) AS returnamount,
                        ROUND((bd.grandtotal - IFNULL(rd.returnamount, 0)), 2) AS netpurchase,
                        ROUND((CASE WHEN bd.noofpos > 0 THEN bd.grandtotal / bd.noofpos ELSE 0 END), 2) AS averagepovalue
                    FROM (
                        SELECT
                            DATE(pom.purchaseorderdate) AS purchaseorderdate,
                            COUNT(DISTINCT pom.id) AS noofpos,
                            COUNT(DISTINCT NULLIF(COALESCE(pom.smuniquekey, pom.supplierid), 0)) AS noofsuppliers,
                            ROUND(SUM(
                                (SELECT COALESCE(SUM(poid.quantity), 0)
                                 FROM purchaseorderitemsdetails poid
                                 WHERE poid.serverorderid = pom.id AND poid.isdeleted = 0)
                            ), 2) AS totalquantity,
                            ROUND(CAST(SUM(pom.totalamount) AS DECIMAL(18,2)), 2) AS totalamount,
                            ROUND(CAST(SUM(pom.discountpercentamt) AS DECIMAL(18,2)), 2) AS discountamount,
                            ROUND(CAST(SUM(pom.totaltaxableamount) AS DECIMAL(18,2)), 2) AS totaltaxableamount,
                            ROUND(CAST(SUM(pom.totaltax) AS DECIMAL(18,2)), 2) AS totaltax,
                            ROUND(CAST(SUM(pom.additionalcharge) AS DECIMAL(18,2)), 2) AS additionalcharges,
                            ROUND(CAST(SUM(pom.roundoffamount) AS DECIMAL(18,2)), 2) AS roundoff,
                            ROUND(CAST(SUM(pom.grandtotal) AS DECIMAL(18,2)), 2) AS grandtotal
                        FROM purchaseordermaster pom
                        WHERE ${whereClause}
                        GROUP BY DATE(pom.purchaseorderdate)
                    ) bd
                    LEFT JOIN (
                        SELECT
                            DATE(pom.purchaseorderdate) AS purchaseorderdate,
                            ROUND(SUM(CASE WHEN tm.taxname = 'CGST' THEN potd.taxamount ELSE 0 END), 2) AS cgst,
                            ROUND(SUM(CASE WHEN tm.taxname = 'SGST' THEN potd.taxamount ELSE 0 END), 2) AS sgst,
                            ROUND(SUM(CASE WHEN tm.taxname = 'IGST' THEN potd.taxamount ELSE 0 END), 2) AS igst
                        FROM purchaseordermaster pom
                        INNER JOIN purchaseorderitemsdetails pod
                            ON pod.serverorderid = pom.id AND pod.isdeleted = 0
                        INNER JOIN purchaseorderitemstaxdetails potd
                            ON potd.orderitemsdetailsid = pod.orderitemsdetailsid AND potd.isdeleted = 0
                        INNER JOIN taxmaster tm
                            ON tm.taxid = potd.taxid AND tm.isdeleted = 0
                        WHERE ${whereClause}
                        GROUP BY DATE(pom.purchaseorderdate)
                    ) td ON td.purchaseorderdate = bd.purchaseorderdate
                    LEFT JOIN (
                        SELECT
                            DATE(prm.purchaseorderreturndate) AS purchaseorderdate,
                            ROUND(CAST(SUM(prm.grandtotal) AS DECIMAL(18,2)), 2) AS returnamount
                        FROM purchaseorderreturnmaster prm
                        WHERE ${returnWhereClause}
                        GROUP BY DATE(prm.purchaseorderreturndate)
                    ) rd ON rd.purchaseorderdate = bd.purchaseorderdate
                    ${havingClause}
                ) AS grouped_data
            `;

            const countParams = [...baseParams, ...taxParams, ...returnParams, ...havingParams];
            const countResult = await db.getResults(countQuery, countParams);
            const totalRecords = countResult[0]?.total || 0;

            // Sorting - Map frontend field names to database fields/aliases
            const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

            const sortFieldMap = {
                purchaseorderdate: "purchaseorderdate",
                noofpos: "noofpos",
                noofsuppliers: "noofsuppliers",
                totalquantity: "totalquantity",
                totalamount: "totalamount",
                discountamount: "discountamount",
                netamount: "netamount",
                totaltaxableamount: "totaltaxableamount",
                cgst: "cgst",
                sgst: "sgst",
                igst: "igst",
                totaltax: "totaltax",
                additionalcharges: "additionalcharges",
                roundoff: "roundoff",
                grandtotal: "grandtotal",
                returnamount: "returnamount",
                netpurchase: "netpurchase",
                averagepovalue: "averagepovalue",
            };

            const mappedSortField =
                sortFieldMap[sortField?.toLowerCase()] || sortFieldMap["purchaseorderdate"];

            // Main query for daily purchase summary
            let dataQuery = `
                SELECT
                    DATE_FORMAT(bd.purchaseorderdate, '%d/%m/%Y') AS purchaseorderdate,
                    bd.noofpos,
                    bd.noofsuppliers,
                    bd.totalquantity,
                    bd.totalamount,
                    bd.discountamount,
                    ROUND((bd.totalamount - bd.discountamount), 2) AS netamount,
                    bd.totaltaxableamount,
                    IFNULL(td.cgst, 0) AS cgst,
                    IFNULL(td.sgst, 0) AS sgst,
                    IFNULL(td.igst, 0) AS igst,
                    bd.totaltax,
                    bd.additionalcharges,
                    bd.roundoff,
                    bd.grandtotal,
                    IFNULL(rd.returnamount, 0) AS returnamount,
                    ROUND((bd.grandtotal - IFNULL(rd.returnamount, 0)), 2) AS netpurchase,
                    ROUND((CASE WHEN bd.noofpos > 0 THEN bd.grandtotal / bd.noofpos ELSE 0 END), 2) AS averagepovalue
                FROM (
                    SELECT
                        DATE(pom.purchaseorderdate) AS purchaseorderdate,
                        COUNT(DISTINCT pom.id) AS noofpos,
                        COUNT(DISTINCT NULLIF(COALESCE(pom.smuniquekey, pom.supplierid), 0)) AS noofsuppliers,
                        ROUND(SUM(
                            (SELECT COALESCE(SUM(poid.quantity), 0)
                             FROM purchaseorderitemsdetails poid
                             WHERE poid.serverorderid = pom.id AND poid.isdeleted = 0)
                        ), 2) AS totalquantity,
                        ROUND(CAST(SUM(pom.totalamount) AS DECIMAL(18,2)), 2) AS totalamount,
                        ROUND(CAST(SUM(pom.discountpercentamt) AS DECIMAL(18,2)), 2) AS discountamount,
                        ROUND(CAST(SUM(pom.totaltaxableamount) AS DECIMAL(18,2)), 2) AS totaltaxableamount,
                        ROUND(CAST(SUM(pom.totaltax) AS DECIMAL(18,2)), 2) AS totaltax,
                        ROUND(CAST(SUM(pom.additionalcharge) AS DECIMAL(18,2)), 2) AS additionalcharges,
                        ROUND(CAST(SUM(pom.roundoffamount) AS DECIMAL(18,2)), 2) AS roundoff,
                        ROUND(CAST(SUM(pom.grandtotal) AS DECIMAL(18,2)), 2) AS grandtotal
                    FROM purchaseordermaster pom
                    WHERE ${whereClause}
                    GROUP BY DATE(pom.purchaseorderdate)
                ) bd
                LEFT JOIN (
                    SELECT
                        DATE(pom.purchaseorderdate) AS purchaseorderdate,
                        ROUND(SUM(CASE WHEN tm.taxname = 'CGST' THEN potd.taxamount ELSE 0 END), 2) AS cgst,
                        ROUND(SUM(CASE WHEN tm.taxname = 'SGST' THEN potd.taxamount ELSE 0 END), 2) AS sgst,
                        ROUND(SUM(CASE WHEN tm.taxname = 'IGST' THEN potd.taxamount ELSE 0 END), 2) AS igst
                    FROM purchaseordermaster pom
                    INNER JOIN purchaseorderitemsdetails pod
                        ON pod.serverorderid = pom.id AND pod.isdeleted = 0
                    INNER JOIN purchaseorderitemstaxdetails potd
                        ON potd.orderitemsdetailsid = pod.orderitemsdetailsid AND potd.isdeleted = 0
                    INNER JOIN taxmaster tm
                        ON tm.taxid = potd.taxid AND tm.isdeleted = 0
                    WHERE ${whereClause}
                    GROUP BY DATE(pom.purchaseorderdate)
                ) td ON td.purchaseorderdate = bd.purchaseorderdate
                LEFT JOIN (
                    SELECT
                        DATE(prm.purchaseorderreturndate) AS purchaseorderdate,
                        ROUND(CAST(SUM(prm.grandtotal) AS DECIMAL(18,2)), 2) AS returnamount
                    FROM purchaseorderreturnmaster prm
                    WHERE ${returnWhereClause}
                    GROUP BY DATE(prm.purchaseorderreturndate)
                ) rd ON rd.purchaseorderdate = bd.purchaseorderdate
                ${havingClause}
                ORDER BY ${mappedSortField} ${order}
            `;

            // Pagination using start and length
            const startNum = parseInt(start);
            const lengthNum = parseInt(length);

            const dataParams = [...baseParams, ...taxParams, ...returnParams, ...havingParams];

            if (lengthNum !== -1) {
                dataQuery += ` LIMIT ?, ?`;
                dataParams.push(startNum, lengthNum);
            }

            const dailySummaryData = await db.getResults(dataQuery, dataParams);

            // Calculate total pages
            const totalPages = lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1;

            return {
                data: dailySummaryData,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching daily purchase summary report: ${error.message}`, {
                source: "dailyPurchaseSummary.model.js",
                function: "getDailyPurchaseSummaryReport",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters
            });
            throw error;
        }
    },
};
