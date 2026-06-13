const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Purchase Orders Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns purchase orders data with pagination info
     */
    getPurchaseOrders: async (req) => {
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
            if (supplierid) {
                whereConditions.push("sm.supplierid = ?");
                queryParams.push(supplierid);
            }

            // Text field filters (LIKE match)
            const textFilters = {
                supplier: "sm.suppliername",
                suppliergst: "sm.gstno",
                ordernumber: "pom.ordernumber",
                referencebillnumber: "pom.referencebillnumber",
                purchaseorderdate: "DATE_FORMAT(pom.purchaseorderdate, '%d/%m/%Y')",
                remarks: "pom.remarks",
                createdby:
                    "CASE WHEN pom.clientcreatedby IS NOT NULL THEN CONCAT(cum.firstname, ' ', cum.lastname) ELSE CONCAT(um.firstname, ' ', um.lastname) END",
                createddatetime:
                    "CASE WHEN pom.clientcreateddate IS NOT NULL THEN DATE_FORMAT(pom.clientcreateddate, '%d/%m/%Y %h:%i:%s %p') ELSE DATE_FORMAT(pom.createddate, '%d/%m/%Y %h:%i:%s %p') END",
            };

            Object.entries(textFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value) {
                    whereConditions.push(`${dbField} LIKE ?`);
                    queryParams.push(`%${value}%`);
                }
            });

            // Numeric field filters (exact match)
            const numericFilters = {
                nooflabels:
                    "(SELECT COUNT(*) FROM purchaseorderitemsdetails WHERE serverorderid = pom.id AND isdeleted = 0 AND islabelprinted = 1)",
                total: "pom.totalamount",
                discount: "pom.discountpercentamt",
                additionalcharge: "pom.additionalcharge",
                roundoff: "pom.roundoffamount",
                grandtotal: "pom.grandtotal",
            };

            Object.entries(numericFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value) {
                    whereConditions.push(`ROUND(CAST(${dbField} AS DECIMAL(18,2)), 2) = ?`);
                    queryParams.push(parseFloat(value));
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
                SELECT COUNT(*) as total
                FROM purchaseordermaster pom
                LEFT JOIN suppliermaster sm ON sm.uniquekey = pom.smuniquekey AND sm.isdeleted = 0
                LEFT JOIN usermaster um ON um.userid = pom.createdby AND um.isdeleted = 0
                LEFT JOIN usermaster cum ON cum.userid = pom.clientcreatedby AND cum.isdeleted = 0
                WHERE ${whereClause}
            `;

            const countResult = await db.getResults(countQuery, queryParams);
            const totalRecords = countResult[0]?.total || 0;

            // Sorting - Map frontend field names to database fields/aliases
            const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

            // Map sortField to actual column/alias in query
            const sortFieldMap = {
                id: "pom.id",
                supplier: "sm.suppliername",
                suppliergst: "sm.gstno",
                ordernumber: "pom.ordernumber",
                referencebillnumber: "pom.referencebillnumber",
                purchaseorderdate: "pom.purchaseorderdate",
                nooflabels: "nooflabels",
                remarks: "pom.remarks",
                createdby: "um.firstname",
                createddatetime: "pom.createddate",
                total: "pom.totalamount",
                discount: "pom.discountpercentamt",
                additionalcharge: "pom.additionalcharge",
                roundoff: "pom.roundoffamount",
                grandtotal: "pom.grandtotal",
            };

            const mappedSortField =
                sortFieldMap[sortField?.toLowerCase()] || sortFieldMap["purchaseorderdate"];

            // Main query for purchase orders
            let dataQuery = `
                SELECT
                    pom.id,
                    sm.suppliername AS supplier,
                    sm.gstno AS suppliergst,
                    pom.ordernumber AS ordernumber,
                    pom.referencebillnumber AS referencebillnumber,
                    DATE_FORMAT(pom.purchaseorderdate, '%d/%m/%Y') AS purchaseorderdate,
                    (SELECT COUNT(*) FROM purchaseorderitemsdetails WHERE serverorderid = pom.id AND isdeleted = 0 AND islabelprinted = 1) AS nooflabels,
                    pom.remarks AS remarks,
                    CASE
                        WHEN pom.clientcreatedby IS NOT NULL THEN CONCAT(cum.firstname, ' ', cum.lastname)
                        ELSE CONCAT(um.firstname, ' ', um.lastname)
                    END AS createdby,
                    CASE
                        WHEN pom.clientcreateddate IS NOT NULL THEN DATE_FORMAT(pom.clientcreateddate, '%d/%m/%Y %h:%i:%s %p')
                        ELSE DATE_FORMAT(pom.createddate, '%d/%m/%Y %h:%i:%s %p')
                    END AS createddatetime,
                    ROUND(CAST(pom.totalamount AS DECIMAL(18,2)), 2) AS total,
                    ROUND(CAST(pom.discountpercentamt AS DECIMAL(18,2)), 2) AS discount,
                    ROUND(CAST(pom.additionalcharge AS DECIMAL(18,2)), 2) AS additionalcharge,
                    ROUND(CAST(pom.roundoffamount AS DECIMAL(18,2)), 2) AS roundoff,
                    ROUND(CAST(pom.grandtotal AS DECIMAL(18,2)), 2) AS grandtotal
                FROM purchaseordermaster pom
                LEFT JOIN suppliermaster sm ON sm.uniquekey = pom.smuniquekey AND sm.isdeleted = 0
                LEFT JOIN usermaster um ON um.userid = pom.createdby AND um.isdeleted = 0
                LEFT JOIN usermaster cum ON cum.userid = pom.clientcreatedby AND cum.isdeleted = 0
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

            const purchaseOrdersData = await db.getResults(dataQuery, queryParams);

            // Calculate total pages
            const totalPages = lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1;

            return {
                data: purchaseOrdersData,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching purchase orders report: ${error.message}`, {
                source: "purchaseOrders.model.js",
                function: "getPurchaseOrdersReport",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters
            });
            throw error;
        }
    },
};
