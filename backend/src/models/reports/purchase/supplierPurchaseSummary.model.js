const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Supplier Purchase Summary Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns supplier purchase summary data with pagination info
     */
    getSupplierPurchaseSummary: async (req) => {
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

            // Supplier filter
            const supplierid = getFilterValue("supplierid");
            const smuniquekey = getFilterValue("smuniquekey");
            if (smuniquekey) {
                whereConditions.push("pom.smuniquekey = ?");
                queryParams.push(smuniquekey);
            } else if (supplierid) {
                whereConditions.push("pom.supplierid = ?");
                queryParams.push(supplierid);
            }

            const whereClause = whereConditions.join(" AND ");

            // Text field filters (LIKE match) - applied via HAVING
            let havingConditions = [];
            let havingParams = [];

            const textFilters = {
                suppliername: "sm.suppliername",
            };

            Object.entries(textFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value) {
                    havingConditions.push(`${dbField} LIKE ?`);
                    havingParams.push(`%${value}%`);
                }
            });

            // Numeric field filters (exact match) - applied via HAVING
            const numericFilters = {
                totalamount: "totalamount",
                discountamount: "discountamount",
                totaltaxableamount: "totaltaxableamount",
                totaltax: "totaltax",
                roundoff: "roundoff",
                grandtotal: "grandtotal",
            };

            Object.entries(numericFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value) {
                    havingConditions.push(`ROUND(CAST(${dbField} AS DECIMAL(18,2)), 2) = ?`);
                    havingParams.push(parseFloat(value));
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

            // Count total records
            const countQuery = `
                SELECT COUNT(*) as total
                FROM (
                    SELECT
                        sm.suppliername
                    FROM purchaseordermaster pom
                    LEFT JOIN suppliermaster sm ON sm.uniquekey = pom.smuniquekey AND sm.isdeleted = 0
                    WHERE ${whereClause}
                    GROUP BY pom.smuniquekey, sm.suppliername
                    ${havingClause}
                ) AS grouped_data
            `;

            const countResult = await db.getResults(countQuery, [...queryParams, ...havingParams]);
            const totalRecords = countResult[0]?.total || 0;

            // Sorting - Map frontend field names to database fields/aliases
            const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

            const sortFieldMap = {
                suppliername: "suppliername",
                suppliergst: "suppliergst",
                phone: "phone",
                contact_person: "contact_person",
                no_of_pos: "no_of_pos",
                netamount: "netamount",
                avg_po_value: "avg_po_value",
                outstanding: "outstanding",
                last_purchase_date: "last_purchase_date",
                totalamount: "totalamount",
                discountamount: "discountamount",
                totaltaxableamount: "totaltaxableamount",
                totaltax: "totaltax",
                roundoff: "roundoff",
                grandtotal: "grandtotal",
            };

            const mappedSortField =
                sortFieldMap[sortField?.toLowerCase()] || sortFieldMap["grandtotal"];

            // Main query for supplier purchase summary
            let dataQuery = `
                SELECT
                    sm.suppliername AS suppliername,

                    MAX(sm.gstno) AS suppliergst,
                    MAX(sm.phoneno) AS phone,
                    MAX(sm.contactperson) AS contact_person,

                    COUNT(*) AS no_of_pos,

                    ROUND(SUM(pom.totalamount), 2) AS totalamount,
                    ROUND(SUM(pom.discountpercentamt), 2) AS discountamount,

                    ROUND(SUM(pom.totalamount - pom.discountpercentamt), 2) AS netamount,

                    ROUND(SUM(pom.totaltaxableamount), 2) AS totaltaxableamount,
                    ROUND(SUM(pom.totaltax), 2) AS totaltax,
                    ROUND(SUM(pom.roundoffamount), 2) AS roundoff,
                    ROUND(SUM(pom.grandtotal), 2) AS grandtotal,

                    ROUND(
                        CASE 
                        WHEN COUNT(*) = 0 THEN 0
                        ELSE SUM(pom.grandtotal) / COUNT(*)
                        END, 
                    2) AS avg_po_value,

                    MAX(pom.purchaseorderdate) AS last_purchase_date,

                    MAX(csm.outstandingamt) AS outstanding

                    FROM purchaseordermaster pom

                    LEFT JOIN suppliermaster sm 
                    ON sm.uniquekey = pom.smuniquekey AND sm.isdeleted = 0

                    LEFT JOIN company_suppliermaster csm 
                        ON csm.supplierid = pom.supplierid 
                        AND csm.companyid = pom.companyid 
                        AND csm.isdeleted = 0

                    WHERE ${whereClause}

                    GROUP BY 
                    pom.smuniquekey,
                    sm.suppliername

                    ${havingClause}

                    ORDER BY ${mappedSortField} ${order}
            `;

            // Pagination using start and length
            const startNum = parseInt(start);
            const lengthNum = parseInt(length);

            if (lengthNum !== -1) {
                dataQuery += ` LIMIT ?, ?`;
                queryParams.push(...havingParams, startNum, lengthNum);
            } else {
                queryParams.push(...havingParams);
            }

            const supplierSummaryData = await db.getResults(dataQuery, queryParams);

            // Calculate total pages
            const totalPages = lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1;
            return {
                data: supplierSummaryData,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching supplier purchase summary report: ${error.message}`, {
                source: "supplierPurchaseSummary.model.js",
                function: "getSupplierPurchaseSummaryReport",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters
            });
            throw error;
        }
    },
};
