const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Product Wise Order Details Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns product-wise order details with pagination info
     */
    getProductWiseOrderDetails: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField = "orderdate",
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
            let whereConditions = ["om.isdeleted = 0", "opd.isdeleted = 0"];
            let queryParams = [];

            // Company filter (required)
            const companyid = getFilterValue("companyid");
            if (companyid) {
                whereConditions.push("om.companyid = ?");
                queryParams.push(companyid);
            }

            // Location filter
            const locationid = locationId || getFilterValue("locationid");
            if (locationid) {
                whereConditions.push("om.locationid = ?");
                queryParams.push(locationid);
            }

            // Date range filter
            const fromDate = getFilterValue("fromDate");
            const toDate = getFilterValue("toDate");
            if (fromDate && toDate) {
                whereConditions.push("DATE(om.orderdate) BETWEEN ? AND ?");
                queryParams.push(fromDate, toDate);
            } else if (fromDate) {
                whereConditions.push("DATE(om.orderdate) >= ?");
                queryParams.push(fromDate);
            } else if (toDate) {
                whereConditions.push("DATE(om.orderdate) <= ?");
                queryParams.push(toDate);
            }

            // Product filter
            const productid = getFilterValue("productid");
            if (productid) {
                whereConditions.push("im.itemid = ?");
                queryParams.push(productid);
            }

            // Customer filter
            const customerid = getFilterValue("customerid");
            if (customerid) {
                whereConditions.push("custm.customerid = ?");
                queryParams.push(customerid);
            }

            // Brand filter
            const brandid = getFilterValue("brandid");
            if (brandid) {
                whereConditions.push("im.brandid = ?");
                queryParams.push(brandid);
            }

            // Category filters
            const mastercategoryid = getFilterValue("mastercategoryid");
            if (mastercategoryid) {
                whereConditions.push("im.mastercategoryid = ?");
                queryParams.push(mastercategoryid);
            }

            const categoryid = getFilterValue("categoryid");
            if (categoryid) {
                whereConditions.push("im.categoryid = ?");
                queryParams.push(categoryid);
            }

            const subcategoryid = getFilterValue("subcategoryid");
            if (subcategoryid) {
                whereConditions.push("im.subcategoryid = ?");
                queryParams.push(subcategoryid);
            }

            // Text field filters (LIKE match)
            const textFilters = {
                product: "im.itemname",
                productmastercategory: "mcm.itemcategoryname",
                productcategory: "cm.itemcategoryname",
                productsubcategory: "scm.itemcategoryname",
                brand: "bm.brandname",
                uom: "um.uomname",
                batchnumber: "opd.batchid",
                batchdate: "DATE_FORMAT(opd.batchdate, '%d/%m/%Y')",
                billno: "om.billno",
                customer: "custm.name",
                saleperson: "CONCAT(um2.firstname, ' ', um2.lastname)",
                orderdate: "DATE_FORMAT(om.orderdate, '%d/%m/%Y')",
                orderdatetime: "DATE_FORMAT(om.orderdate, '%d/%m/%Y %h:%i %p')",
                ordertype: "om.ordertype",
                channel: "CAST(om.channel AS CHAR)",
                transaction: "pt.paymentmodename",
                orderremark: "om.remarks",
                paymentref: "pttm.payref",
                paymentremark: "pttm.remarks",
                reprintremark: "om.reprintremark",
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
                price: "opd.price",
                purchase: "im.purchaseprice",
                purchaseatsale: "opd.purchaseprice",
                profitloss: "((opd.price - COALESCE(opd.purchaseprice, 0)) * opd.quantity)",
                quantity: "opd.quantity",
                totalamount: "opd.totalamount",
                discount: "opd.discountamount",
                taxamount: "opd.taxamount",
                totaltaxamount: "opd.totaltaxamount",
                roundoff: "om.roundoff",
                grandtotal: "opd.totaltaxamount",
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

                searchConditions.push(
                    `EXISTS (
                        SELECT 1
                        FROM orderproducttaxdetails optd_global
                        WHERE optd_global.serverorderproductid = opd.id
                          AND optd_global.isdeleted = 0
                          AND CAST(optd_global.taxpercentage AS CHAR) LIKE ?
                    )`
                );
                queryParams.push(searchTerm);
            }

            const tax = getFilterValue("tax");
            if (tax) {
                const taxLike = `%${String(tax).replace("%", "")}%`;
                whereConditions.push(
                    `EXISTS (
                        SELECT 1
                        FROM orderproducttaxdetails optd_filter
                        WHERE optd_filter.serverorderproductid = opd.id
                          AND optd_filter.isdeleted = 0
                          AND CAST(optd_filter.taxpercentage AS CHAR) LIKE ?
                    )`
                );
                queryParams.push(taxLike);
            }

            const whereClause = whereConditions.join(" AND ");

            // Count total records
            const countQuery = `
                SELECT COUNT(DISTINCT opd.id) as total
                FROM ordermaster om
                INNER JOIN orderproductdetails opd ON opd.serverorderid = om.id AND opd.isdeleted = 0
                LEFT JOIN itemmaster im ON im.uniquekey = opd.pmuniquekey AND im.isdeleted = 0
                LEFT JOIN locationmaster lm ON lm.locationid = om.locationid
                LEFT JOIN itemcategorymaster mcm ON mcm.itemcategoryid = im.mastercategoryid AND mcm.isdeleted = 0
                LEFT JOIN itemcategorymaster cm ON cm.itemcategoryid = im.categoryid AND cm.isdeleted = 0
                LEFT JOIN itemcategorymaster scm ON scm.itemcategoryid = im.subcategoryid AND scm.isdeleted = 0
                LEFT JOIN brandmaster bm ON bm.brandid = im.brandid AND bm.isdeleted = 0
                LEFT JOIN uommaster um ON um.uomid = im.defaultuom AND um.isdeleted = 0
                LEFT JOIN customermaster custm ON custm.uniquekey = om.customeruniquekey AND custm.isdeleted = 0
                LEFT JOIN usermaster um2 ON um2.userid = om.salepersonid AND um2.isdeleted = 0
                LEFT JOIN paymentmaster pm ON pm.serverorderid = om.id AND pm.isdeleted = 0
                LEFT JOIN paymenttransactionmaster pttm ON pttm.serverpaymentid = pm.id AND pttm.isdeleted = 0
                LEFT JOIN paymenttype pt ON pt.paymentid = pttm.paymodeid AND pt.isdeleted = 0
                WHERE ${whereClause}
            `;

            const countResult = await db.getResults(countQuery, queryParams);
            const totalRecords = countResult[0]?.total || 0;

            // Sorting - Map frontend field names to database fields/aliases
            const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

            // Map sortField to actual column/alias in query
            const sortFieldMap = {
                id: "opd.id",
                product: "im.itemname",
                productmastercategory: "mcm.itemcategoryname",
                productcategory: "cm.itemcategoryname",
                productsubcategory: "scm.itemcategoryname",
                brand: "bm.brandname",
                uom: "um.uomname",
                batchnumber: "opd.batchid",
                batchdate: "opd.batchdate",
                price: "opd.price",
                purchase: "im.purchaseprice",
                purchaseatsale: "opd.purchaseprice",
                profitloss: "profitloss",
                billno: "om.billno",
                customer: "custm.name",
                saleperson: "saleperson",
                orderdate: "om.orderdate",
                orderdatetime: "om.orderdate",
                ordertype: "om.ordertype",
                channel: "om.channel",
                transaction: "transaction",
                tax: "tax",
                orderremark: "om.remarks",
                paymentref: "paymentref",
                paymentremark: "paymentremark",
                reprintremark: "om.reprintremark",
                quantity: "opd.quantity",
                totalamount: "opd.totalamount",
                discount: "opd.discountamount",
                taxamount: "opd.taxamount",
                totaltaxamount: "opd.totaltaxamount",
                roundoff: "om.roundoff",
                grandtotal: "grandtotal",
            };

            const mappedSortField =
                sortFieldMap[sortField?.toLowerCase()] || sortFieldMap["orderdate"];

            // Main query for product-wise order details
            let dataQuery = `
                SELECT
                    opd.id,
                    im.itemname AS product,
                    mcm.itemcategoryname AS productmastercategory,
                    cm.itemcategoryname AS productcategory,
                    scm.itemcategoryname AS productsubcategory,
                    bm.brandname AS brand,
                    um.uomname AS uom,
                    opd.batchid AS batchnumber,
                    DATE_FORMAT(opd.batchdate, '%d/%m/%Y') AS batchdate,
                    ROUND(CAST(opd.price AS DECIMAL(18,2)), 2) AS price,
                    ROUND(CAST(COALESCE(im.purchaseprice, 0) AS DECIMAL(18,2)), 2) AS purchase,
                    ROUND(CAST(COALESCE(opd.purchaseprice, 0) AS DECIMAL(18,2)), 2) AS purchaseatsale,
                    ROUND(CAST(((opd.price - COALESCE(opd.purchaseprice, 0)) * opd.quantity) AS DECIMAL(18,2)), 2) AS profitloss,
                    om.billno AS billno,
                    custm.name AS customer,
                    CONCAT(um2.firstname, ' ', um2.lastname) AS saleperson,
                    DATE_FORMAT(om.orderdate, '%d/%m/%Y') AS orderdate,
                    DATE_FORMAT(om.orderdate, '%d/%m/%Y %h:%i %p') AS orderdatetime,
                    om.ordertype AS ordertype,
                    CASE
                        WHEN om.channel = 1 THEN 'POS'
                        WHEN om.channel = 2 THEN 'Online'
                        ELSE COALESCE(CAST(om.channel AS CHAR), '-')
                    END AS channel,
                    GROUP_CONCAT(DISTINCT pt.paymentmodename SEPARATOR ', ') AS transaction,
                    GROUP_CONCAT(DISTINCT CONCAT(optd.taxpercentage, '%') ORDER BY optd.taxpercentage SEPARATOR ', ') AS tax,
                    om.remarks AS orderremark,
                    GROUP_CONCAT(DISTINCT pttm.payref SEPARATOR ', ') AS paymentref,
                    GROUP_CONCAT(DISTINCT pttm.remarks SEPARATOR ', ') AS paymentremark,
                    om.reprintremark AS reprintremark,
                    ROUND(opd.quantity, 2) AS quantity,
                    ROUND(CAST(opd.totalamount AS DECIMAL(18,2)), 2) AS totalamount,
                    ROUND(CAST(opd.discountamount AS DECIMAL(18,2)), 2) AS discount,
                    ROUND(CAST(opd.taxamount AS DECIMAL(18,2)), 2) AS taxamount,
                    ROUND(CAST(opd.totaltaxamount AS DECIMAL(18,2)), 2) AS totaltaxamount,
                    ROUND(CAST(om.roundoff AS DECIMAL(18,2)), 2) AS roundoff,
                    ROUND(CAST(opd.totaltaxamount AS DECIMAL(18,2)), 2) AS grandtotal,
                    lm.locationname
                    FROM ordermaster om
                    LEFT JOIN orderproductdetails opd ON opd.serverorderid = om.id AND opd.isdeleted = 0
                    LEFT JOIN itemmaster im ON im.uniquekey = opd.pmuniquekey AND im.isdeleted = 0
                    LEFT JOIN locationmaster lm ON lm.locationid = om.locationid
                    LEFT JOIN itemcategorymaster mcm ON mcm.itemcategoryid = im.mastercategoryid AND mcm.isdeleted = 0
                    LEFT JOIN itemcategorymaster cm ON cm.itemcategoryid = im.categoryid AND cm.isdeleted = 0
                    LEFT JOIN itemcategorymaster scm ON scm.itemcategoryid = im.subcategoryid AND scm.isdeleted = 0
                LEFT JOIN brandmaster bm ON bm.brandid = im.brandid AND bm.isdeleted = 0
                LEFT JOIN uommaster um ON um.uomid = im.defaultuom AND um.isdeleted = 0
                LEFT JOIN customermaster custm ON custm.uniquekey = om.customeruniquekey AND custm.isdeleted = 0
                LEFT JOIN usermaster um2 ON um2.userid = om.salepersonid AND um2.isdeleted = 0
                LEFT JOIN paymentmaster pm ON pm.serverorderid = om.id AND pm.isdeleted = 0
                LEFT JOIN paymenttransactionmaster pttm ON pttm.serverpaymentid = pm.id AND pttm.isdeleted = 0
                LEFT JOIN paymenttype pt ON pt.paymentid = pttm.paymodeid AND pt.isdeleted = 0
                LEFT JOIN orderproducttaxdetails optd ON optd.serverorderproductid = opd.id AND optd.isdeleted = 0
                WHERE ${whereClause}
                GROUP BY opd.id, im.itemname, mcm.itemcategoryname, cm.itemcategoryname, scm.itemcategoryname, lm.locationname, bm.brandname,
                         um.uomname, opd.batchid, opd.batchdate, opd.price, im.purchaseprice, opd.purchaseprice, om.billno, custm.name,
                         um2.firstname, um2.lastname, om.orderdate, om.ordertype, om.channel, om.remarks, om.reprintremark, opd.quantity, opd.totalamount,
                         opd.discountamount, opd.taxamount, opd.totaltaxamount, om.roundoff
                ORDER BY ${mappedSortField} ${order}
            `;

            // Pagination using start and length
            const startNum = parseInt(start);
            const lengthNum = parseInt(length);

            if (lengthNum !== -1) {
                dataQuery += ` LIMIT ?, ?`;
                queryParams.push(startNum, lengthNum);
            }

            const productWiseData = await db.getResults(dataQuery, queryParams);

            // Calculate total pages
            const totalPages = lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1;

            return {
                data: productWiseData,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching product-wise order details report: ${error.message}`, {
                source: "productWiseOrderDetails.model.js",
                function: "getProductWiseOrderDetailsReport",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters,
            });
            throw error;
        }
    },
};
