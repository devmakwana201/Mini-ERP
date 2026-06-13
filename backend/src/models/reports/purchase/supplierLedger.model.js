const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Supplier Ledger Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns supplier ledger data with pagination info
     */
    getSupplierLedger: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField = "transactiondate",
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

            // Base WHERE conditions for filtering transactions
            let whereConditions = [];
            let queryParams = [];

            // Company filter (required)
            const companyid = getFilterValue("companyid");
            if (companyid) {
                whereConditions.push("companyid = ?");
                queryParams.push(companyid);
            }

            // Location filter
            const locationid = locationId || getFilterValue("locationid");
            if (locationid) {
                whereConditions.push("locationid = ?");
                queryParams.push(locationid);
            }

            // Supplier filter (required for meaningful ledger)
            const supplierid = getFilterValue("supplierid");
            const smuniquekey = getFilterValue("smuniquekey");

            if (smuniquekey) {
                whereConditions.push("smuniquekey = ?");
                queryParams.push(smuniquekey);
            } else if (supplierid) {
                whereConditions.push("supplierid = ?");
                queryParams.push(supplierid);
            }

            // Date range filter
            const fromDate = getFilterValue("fromDate");
            const toDate = getFilterValue("toDate");
            if (fromDate && toDate) {
                whereConditions.push("DATE(transactiondate) BETWEEN ? AND ?");
                queryParams.push(fromDate, toDate);
            } else if (fromDate) {
                whereConditions.push("DATE(transactiondate) >= ?");
                queryParams.push(fromDate);
            } else if (toDate) {
                whereConditions.push("DATE(transactiondate) <= ?");
                queryParams.push(toDate);
            }

            const whereClause =
                whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

            // Build the main query to get all transactions
            // Using UNION to combine different transaction types
            const transactionsQuery = `
                SELECT
                    id,
                    transactiondate,
                    transactiontype,
                    description,
                    referencenumber,
                    credit,
                    debit,
                    companyid,
                    locationid,
                    supplierid,
                    smuniquekey,
                    sortdate
                FROM (
                    -- Purchase Orders (Credit - increases payable)
                    SELECT
                        pom.id,
                        pom.purchaseorderdate AS transactiondate,
                        'Purchase Order' AS transactiontype,
                        CONCAT('Purchase Order ', pom.ordernumber,
                            CASE WHEN pom.referencebillnumber != '0' AND pom.referencebillnumber != ''
                                THEN CONCAT(' - Ref: ', pom.referencebillnumber)
                                ELSE ''
                            END,
                            CASE WHEN pom.remarks != '0' AND pom.remarks != ''
                                THEN CONCAT(' - ', pom.remarks)
                                ELSE ''
                            END
                        ) AS description,
                        pom.ordernumber AS referencenumber,
                        ROUND(CAST(pom.grandtotal AS DECIMAL(18,2)), 2) AS credit,
                        0.00 AS debit,
                        pom.companyid,
                        pom.locationid,
                        pom.supplierid,
                        pom.smuniquekey,
                        CASE
                            WHEN pom.clientcreateddate IS NOT NULL THEN pom.clientcreateddate
                            ELSE pom.createddate
                        END AS sortdate
                    FROM purchaseordermaster pom
                    WHERE pom.isdeleted = 0

                    UNION ALL

                    -- Purchase Returns (Debit - decreases payable)
                    SELECT
                        porm.id,
                        porm.purchaseorderreturndate AS transactiondate,
                        'Purchase Return' AS transactiontype,
                        CONCAT('Purchase Return ', porm.returnnumber,
                            CASE WHEN porm.debitnotenumber != '0' AND porm.debitnotenumber != ''
                                THEN CONCAT(' - Debit Note: ', porm.debitnotenumber)
                                ELSE ''
                            END,
                            CASE WHEN porm.remarks != '0' AND porm.remarks != ''
                                THEN CONCAT(' - ', porm.remarks)
                                ELSE ''
                            END
                        ) AS description,
                        porm.returnnumber AS referencenumber,
                        0.00 AS credit,
                        ROUND(CAST(porm.grandtotal AS DECIMAL(18,2)), 2) AS debit,
                        porm.companyid,
                        porm.locationid,
                        porm.supplierid,
                        porm.smuniquekey,
                        CASE
                            WHEN porm.clientcreateddate IS NOT NULL THEN porm.clientcreateddate
                            ELSE porm.createddate
                        END AS sortdate
                    FROM purchaseorderreturnmaster porm
                    WHERE porm.isdeleted = 0

                    -- TODO: Add Supplier Payments when payment table is created
                    -- Payment transactions will be DEBIT (decreases payable)

                    -- TODO: Add Advance Payments when advance payment table is created
                    -- Advance payments will be DEBIT (decreases payable)

                    -- TODO: Add other transaction types as needed:
                    -- - Interest charges (Credit)
                    -- - Adjustments (Credit or Debit based on type)
                    -- - Discounts (Debit)

                ) AS all_transactions
                ${whereClause}
            `;

            // Count total transactions
            const countQuery = `
                SELECT COUNT(*) as total
                FROM (${transactionsQuery}) AS counted_transactions
            `;

            const countResult = await db.getResults(countQuery, queryParams);
            const totalRecords = countResult[0]?.total || 0;

            // Text field filters (LIKE match) - apply after getting base transactions
            let havingConditions = [];
            let havingParams = [...queryParams]; // Copy params for having clause

            const textFilters = {
                date: "DATE_FORMAT(transactiondate, '%d/%m/%Y')",
                description: "description",
                transactiontype: "transactiontype",
                referencenumber: "referencenumber",
            };

            Object.entries(textFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value) {
                    havingConditions.push(`${dbField} LIKE ?`);
                    havingParams.push(`%${value}%`);
                }
            });

            // Numeric field filters (exact match)
            const numericFilters = {
                credit: "credit",
                debit: "debit",
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

                // Text fields
                Object.values(textFilters).forEach((field) => {
                    searchConditions.push(`${field} LIKE ?`);
                });

                // Numeric fields
                Object.values(numericFilters).forEach((field) => {
                    searchConditions.push(`CAST(${field} AS CHAR) LIKE ?`);
                });

                havingConditions.push(`(${searchConditions.join(" OR ")})`);

                const searchTerm = `%${global}%`;
                const totalFields =
                    Object.keys(textFilters).length + Object.keys(numericFilters).length;
                for (let i = 0; i < totalFields; i++) {
                    havingParams.push(searchTerm);
                }
            }

            const havingClause =
                havingConditions.length > 0 ? `HAVING ${havingConditions.join(" AND ")}` : "";

            // Sorting
            const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

            const sortFieldMap = {
                id: "id",
                date: "transactiondate",
                transactiontype: "transactiontype",
                description: "description",
                referencenumber: "referencenumber",
                credit: "credit",
                debit: "debit",
                balance: "balance",
            };

            const mappedSortField = sortFieldMap[sortField?.toLowerCase()] || "transactiondate";

            // Main query with running balance calculation
            let dataQuery = `
                SELECT
                    DATE_FORMAT(transactiondate, '%d/%m/%Y') AS date,
                    description,
                    credit,
                    debit,
                    @balance := @balance + credit - debit AS balance
                FROM (${transactionsQuery}) AS transactions
                CROSS JOIN (SELECT @balance := 0) AS init
                ${havingClause}
                ORDER BY transactiondate ASC, sortdate ASC, id ASC
            `;

            // Get all transactions with running balance first
            const allTransactions = await db.getResults(dataQuery, havingParams);

            // Apply sorting if different from default
            if (mappedSortField !== "transactiondate" || order !== "ASC") {
                if (mappedSortField === "balance") {
                    allTransactions.sort((a, b) => {
                        const comparison = a.balance - b.balance;
                        return order === "ASC" ? comparison : -comparison;
                    });
                } else if (mappedSortField === "credit" || mappedSortField === "debit") {
                    allTransactions.sort((a, b) => {
                        const comparison = a[mappedSortField] - b[mappedSortField];
                        return order === "ASC" ? comparison : -comparison;
                    });
                } else if (mappedSortField === "date") {
                    allTransactions.sort((a, b) => {
                        const dateA = new Date(a.date.split("/").reverse().join("-"));
                        const dateB = new Date(b.date.split("/").reverse().join("-"));
                        const comparison = dateA - dateB;
                        return order === "ASC" ? comparison : -comparison;
                    });
                } else {
                    allTransactions.sort((a, b) => {
                        const comparison = String(a[mappedSortField]).localeCompare(
                            String(b[mappedSortField])
                        );
                        return order === "ASC" ? comparison : -comparison;
                    });
                }
            }

            // Apply pagination
            const startNum = parseInt(start);
            const lengthNum = parseInt(length);

            let paginatedData = allTransactions;
            if (lengthNum !== -1) {
                paginatedData = allTransactions.slice(startNum, startNum + lengthNum);
            }

            // Calculate total pages
            const totalFilteredRecords = allTransactions.length;
            const totalPages = lengthNum !== -1 ? Math.ceil(totalFilteredRecords / lengthNum) : 1;

            return {
                data: paginatedData,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalFilteredRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching supplier ledger report: ${error.message}`, {
                source: "supplierLedger.model.js",
                function: "getSupplierLedgerReport",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters
            });
            throw error;
        }
    },
};
