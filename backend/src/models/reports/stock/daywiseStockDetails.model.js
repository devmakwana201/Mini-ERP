const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Daywise Stock Details Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns daywise stock details data with pagination info
     */
    getDaywiseStockDetails: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField = "date",
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
            let whereConditions = ["dwsd.isdeleted = 0"];
            let queryParams = [];

            // Company filter (required)
            const companyid = getFilterValue("companyid");
            if (companyid) {
                whereConditions.push("dwsd.companyid = ?");
                queryParams.push(companyid);
            }

            // Location filter
            const locationid = locationId || getFilterValue("locationid");
            if (locationid) {
                whereConditions.push("dwsd.locationid = ?");
                queryParams.push(locationid);
            }

            // Date range filter
            const fromDate = getFilterValue("fromDate");
            const toDate = getFilterValue("toDate");
            if (fromDate && toDate) {
                whereConditions.push("DATE(dwsd.stockdate) BETWEEN ? AND ?");
                queryParams.push(fromDate, toDate);
            } else if (fromDate) {
                whereConditions.push("DATE(dwsd.stockdate) >= ?");
                queryParams.push(fromDate);
            } else if (toDate) {
                whereConditions.push("DATE(dwsd.stockdate) <= ?");
                queryParams.push(toDate);
            }

            // Product filter
            const productid = getFilterValue("productid");
            const pmuniquekey = getFilterValue("pmuniquekey");
            if (pmuniquekey) {
                whereConditions.push("dwsd.pmuniquekey = ?");
                queryParams.push(pmuniquekey);
            } else if (productid) {
                // Filter by client-side itemid (POS ID)
                whereConditions.push("dwsd.itemid = ?");
                queryParams.push(productid);
            }

            // Master Category filter
            const mastercategoryid = getFilterValue("mastercategoryid");
            if (mastercategoryid) {
                whereConditions.push("im.mastercategoryid = ?");
                queryParams.push(mastercategoryid);
            }

            // Category filter
            const categoryid = getFilterValue("categoryid");
            if (categoryid) {
                whereConditions.push("im.categoryid = ?");
                queryParams.push(categoryid);
            }

            // Subcategory filter
            const subcategoryid = getFilterValue("subcategoryid");
            if (subcategoryid) {
                whereConditions.push("im.subcategoryid = ?");
                queryParams.push(subcategoryid);
            }

            // Brand filter
            const brandid = getFilterValue("brandid");
            if (brandid) {
                whereConditions.push("im.brandid = ?");
                queryParams.push(brandid);
            }

            const whereClause = whereConditions.join(" AND ");

            // Text field filters (LIKE match)
            const textFilters = {
                date: "DATE_FORMAT(dwsd.stockdate, '%d/%m/%Y')",
                mastercategory: "mcm.itemcategoryname",
                category: "cm.itemcategoryname",
                subcategory: "scm.itemcategoryname",
                product: "im.itemname",
                brand: "bm.brandname",
                batchlotnumber: "dwsd.batchid",
                batchdate: "DATE_FORMAT(dwsd.batchdate, '%d/%m/%Y')",
                uom: "uom.uomname",
            };

            // Numeric field filters (exact match)
            const numericFilters = {
                openingstock: "dwsd.openingstock",
                sales: "dwsd.totalsales",
                purchase: "dwsd.totalpurchase",
                salesreturn: "dwsd.salereturn",
                purchasereturn: "dwsd.purchasereturn",
                adjustin: "dwsd.adjustin",
                adjustout: "dwsd.adjustout",
                closingstock: "dwsd.closingstock",
            };

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

                whereConditions.push(`(${searchConditions.join(" OR ")})`);

                const searchTerm = `%${global}%`;
                const totalFields = textSearchFields.length + numericSearchFields.length;
                for (let i = 0; i < totalFields; i++) {
                    queryParams.push(searchTerm);
                }
            }

            // Individual field filters
            Object.entries(textFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value) {
                    whereConditions.push(`${dbField} LIKE ?`);
                    queryParams.push(`%${value}%`);
                }
            });

            Object.entries(numericFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value) {
                    whereConditions.push(`ROUND(CAST(${dbField} AS DECIMAL(18,2)), 2) = ?`);
                    queryParams.push(parseFloat(value));
                }
            });

            const finalWhereClause = whereConditions.join(" AND ");

            // Count total records
            const countQuery = `
                SELECT COUNT(*) as total
                FROM itemdaywisestockdetails dwsd
                -- Try to join through company_itemmaster first (for company-specific items)
                LEFT JOIN company_itemmaster cim ON cim.uniquekey = dwsd.pmuniquekey
                    AND cim.companyid = dwsd.companyid
                    AND cim.isdeleted = 0
                -- Join to itemmaster either through company mapping or direct uniquekey
                LEFT JOIN itemmaster im ON (
                    (cim.itemid IS NOT NULL AND im.itemid = cim.itemid)  -- Company-specific item
                    OR (cim.itemid IS NULL AND im.uniquekey = dwsd.pmuniquekey)  -- Global item
                ) AND im.isdeleted = 0
                LEFT JOIN itemcategorymaster mcm ON mcm.itemcategoryid = im.mastercategoryid AND mcm.isdeleted = 0
                LEFT JOIN itemcategorymaster cm ON cm.itemcategoryid = im.categoryid AND cm.isdeleted = 0
                LEFT JOIN itemcategorymaster scm ON scm.itemcategoryid = im.subcategoryid AND scm.isdeleted = 0
                LEFT JOIN brandmaster bm ON bm.brandid = im.brandid AND bm.isdeleted = 0
                LEFT JOIN uommaster uom ON uom.uomid = COALESCE(im.defaultuom, im.packageuom, im.baseunit) AND uom.isdeleted = 0
                WHERE ${finalWhereClause}
            `;

            const countResult = await db.getResults(countQuery, queryParams);
            const totalRecords = countResult[0]?.total || 0;

            // Sorting - Map frontend field names to database fields/aliases
            const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

            const sortFieldMap = {
                date: "dwsd.stockdate",
                mastercategory: "mcm.itemcategoryname",
                category: "cm.itemcategoryname",
                subcategory: "scm.itemcategoryname",
                product: "im.itemname",
                brand: "bm.brandname",
                batchlotnumber: "dwsd.batchid",
                batchdate: "dwsd.batchdate",
                openingstock: "dwsd.openingstock",
                sales: "dwsd.totalsales",
                purchase: "dwsd.totalpurchase",
                salesreturn: "dwsd.salereturn",
                purchasereturn: "dwsd.purchasereturn",
                adjustin: "dwsd.adjustin",
                adjustout: "dwsd.adjustout",
                closingstock: "dwsd.closingstock",
                uom: "uom.uomname",
            };

            const mappedSortField = sortFieldMap[sortField?.toLowerCase()] || sortFieldMap["date"];

            // Main query for daywise stock details report
            // NOTE: This query joins through company_itemmaster for company-specific items
            // The pmuniquekey field in itemdaywisestockdetails should contain the company-specific uniquekey
            // If pmuniquekey is NULL, items will show as "Unsynced POS Item #xxx"
            // To fix missing items: populate pmuniquekey with the corresponding company_itemmaster.uniquekey
            let dataQuery = `
                SELECT
                    DATE_FORMAT(dwsd.stockdate, '%d/%m/%Y') AS date,
                    COALESCE(mcm.itemcategoryname, '') AS mastercategory,
                    COALESCE(cm.itemcategoryname, '') AS category,
                    COALESCE(scm.itemcategoryname, '') AS subcategory,
                    COALESCE(cim.customname, im.itemname, CONCAT('Unsynced POS Item #', dwsd.itemid)) AS product,
                    COALESCE(bm.brandname, '') AS brand,
                    dwsd.batchid AS batchlotnumber,
                    DATE_FORMAT(dwsd.batchdate, '%d/%m/%Y') AS batchdate,
                    ROUND(CAST(dwsd.openingstock AS DECIMAL(18,2)), 2) AS openingstock,
                    ROUND(CAST(dwsd.totalsales AS DECIMAL(18,2)), 2) AS sales,
                    ROUND(CAST(dwsd.totalpurchase AS DECIMAL(18,2)), 2) AS purchase,
                    ROUND(CAST(dwsd.salereturn AS DECIMAL(18,2)), 2) AS salesreturn,
                    ROUND(CAST(dwsd.purchasereturn AS DECIMAL(18,2)), 2) AS purchasereturn,
                    ROUND(CAST(dwsd.adjustin AS DECIMAL(18,2)), 2) AS adjustin,
                    ROUND(CAST(dwsd.adjustout AS DECIMAL(18,2)), 2) AS adjustout,
                    ROUND(CAST(dwsd.closingstock AS DECIMAL(18,2)), 2) AS closingstock,
                    uom.uomname AS uom
                FROM itemdaywisestockdetails dwsd
                -- Try to join through company_itemmaster first (for company-specific items)
                LEFT JOIN company_itemmaster cim ON cim.uniquekey = dwsd.pmuniquekey
                    AND cim.companyid = dwsd.companyid
                    AND cim.isdeleted = 0
                -- Join to itemmaster either through company mapping or direct uniquekey
                LEFT JOIN itemmaster im ON (
                    (cim.itemid IS NOT NULL AND im.itemid = cim.itemid)  -- Company-specific item
                    OR (cim.itemid IS NULL AND im.uniquekey = dwsd.pmuniquekey)  -- Global item
                ) AND im.isdeleted = 0
                LEFT JOIN itemcategorymaster mcm ON mcm.itemcategoryid = im.mastercategoryid AND mcm.isdeleted = 0
                LEFT JOIN itemcategorymaster cm ON cm.itemcategoryid = im.categoryid AND cm.isdeleted = 0
                LEFT JOIN itemcategorymaster scm ON scm.itemcategoryid = im.subcategoryid AND scm.isdeleted = 0
                LEFT JOIN brandmaster bm ON bm.brandid = im.brandid AND bm.isdeleted = 0
                LEFT JOIN uommaster uom ON uom.uomid = COALESCE(im.defaultuom, im.packageuom, im.baseunit) AND uom.isdeleted = 0
                WHERE ${finalWhereClause}
                ORDER BY ${mappedSortField} ${order}
            `;

            // Pagination using start and length
            const startNum = parseInt(start);
            const lengthNum = parseInt(length);

            if (lengthNum !== -1) {
                dataQuery += ` LIMIT ?, ?`;
                queryParams.push(startNum, lengthNum);
            }

            const daywiseStockData = await db.getResults(dataQuery, queryParams);

            // Calculate total pages
            const totalPages = lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1;

            return {
                data: daywiseStockData,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching daywise stock details report: ${error.message}`, {
                source: "daywiseStockDetails.model.js",
                function: "getDaywiseStockDetailsReport",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters,
            });
            throw error;
        }
    },
};
