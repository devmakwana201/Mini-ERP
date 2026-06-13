const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Product Wise Purchase Report with pagination and filters
     * @param {Object} req - Request object with query parameters
     * @returns {Promise<Object>} - Returns product-wise purchase data with pagination info
     */
    getProductWisePurchase: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField = "podate",
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
                whereConditions.push("sm.supplierid = ?");
                queryParams.push(supplierid);
            }

            // Product filter
            const productid = getFilterValue("productid");
            if (productid) {
                whereConditions.push("im.itemid = ?");
                queryParams.push(productid);
            }

            // Product Category filter
            const productcategoryid = getFilterValue("productcategoryid");
            if (productcategoryid) {
                whereConditions.push("im.mastercategoryid = ?");
                queryParams.push(productcategoryid);
            }

            // Text field filters (LIKE match)
            const textFilters = {
                supplier: "sm.suppliername",
                suppliergst: "sm.gstno",
                ordernumber: "pom.ordernumber",
                createdby: "CONCAT(um.firstname, ' ', um.lastname)",
                referencebillnumber: "pom.referencebillnumber",
                podate: "DATE_FORMAT(pom.purchaseorderdate, '%d/%m/%Y')",
                productcategory: "mcm.itemcategoryname",
                brand: "bm.brandname",
                hsnsaccode: "im.hsnseccode",
                product: "im.itemname",
                uom: "uom.uomname",
                batchnumber: "poid.batchid",
                warehouse: "wm.warehousename",
                remarks: "pom.remarks",
            };

            Object.entries(textFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value) {
                    whereConditions.push(`${dbField} LIKE ?`);
                    queryParams.push(`%${value}%`);
                }
            });

            const exactNumericFilters = {
                quantity: "poid.quantity",
            };

            Object.entries(exactNumericFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value !== null && value !== undefined && value !== "") {
                    whereConditions.push(`ROUND(CAST(${dbField} AS DECIMAL(18,2)), 2) = ?`);
                    queryParams.push(parseFloat(value));
                }
            });

            const containsNumericFilters = {
                price: "poid.unitprice",
                total: "poid.totalamount",
                discountpercent: "poid.discountpercent",
                discount: "poid.discountamount",
                netamount: "(IFNULL(poid.totalamount, 0) - IFNULL(poid.discountamount, 0))",
                taxableamount: "poid.taxableamount",
                taxpercent: "IFNULL(taxdet.taxpercent, 0)",
                taxamount: "poid.taxamount",
                cgst: "IFNULL(taxdet.cgst, 0)",
                sgst: "IFNULL(taxdet.sgst, 0)",
                igst: "IFNULL(taxdet.igst, 0)",
                mrp: "im.sellingprice",
                lastpurchaseprice: "poid.lastprice",
                grandtotal: "poid.totaltaxamount",
            };

            Object.entries(containsNumericFilters).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(filterKey);
                if (value !== null && value !== undefined && value !== "") {
                    whereConditions.push(
                        `CAST(ROUND(CAST(${dbField} AS DECIMAL(18,2)), 2) AS CHAR) LIKE ?`
                    );
                    queryParams.push(`%${value}%`);
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
                const numericSearchFields = [
                    ...Object.values(exactNumericFilters),
                    ...Object.values(containsNumericFilters),
                ];
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
            const taxDetailsJoin = `
                LEFT JOIN (
                    SELECT
                        potd.serverorderitemsdetailsid,
                        SUM(IFNULL(potd.taxpercentage, 0)) AS taxpercent,
                        SUM(CASE WHEN UPPER(tm.taxname) LIKE '%CGST%' THEN IFNULL(potd.taxamount, 0) ELSE 0 END) AS cgst,
                        SUM(CASE WHEN UPPER(tm.taxname) LIKE '%SGST%' THEN IFNULL(potd.taxamount, 0) ELSE 0 END) AS sgst,
                        SUM(CASE WHEN UPPER(tm.taxname) LIKE '%IGST%' THEN IFNULL(potd.taxamount, 0) ELSE 0 END) AS igst
                    FROM purchaseorderitemstaxdetails potd
                    INNER JOIN taxmaster tm ON tm.taxid = potd.taxid AND tm.isdeleted = 0
                    WHERE potd.isdeleted = 0
                    GROUP BY potd.serverorderitemsdetailsid
                ) taxdet ON taxdet.serverorderitemsdetailsid = poid.id
            `;

            // Count total records
            const countQuery = `
                SELECT COUNT(DISTINCT poid.id) as total
                FROM purchaseordermaster pom
                INNER JOIN purchaseorderitemsdetails poid ON poid.serverorderid = pom.id AND poid.isdeleted = 0
                LEFT JOIN suppliermaster sm ON sm.uniquekey = pom.smuniquekey AND sm.isdeleted = 0
                LEFT JOIN itemmaster im ON im.uniquekey = poid.productuniquekey AND im.isdeleted = 0
                LEFT JOIN itemcategorymaster mcm ON mcm.itemcategoryid = im.mastercategoryid AND mcm.isdeleted = 0
                LEFT JOIN brandmaster bm ON bm.brandid = im.brandid AND bm.isdeleted = 0
                LEFT JOIN uommaster uom ON uom.uomid = poid.uomid AND uom.isdeleted = 0
                LEFT JOIN warehousemaster wm ON wm.locationid = pom.locationid AND wm.isdefaultwarehouse = 1 AND wm.isdeleted = 0
                LEFT JOIN usermaster um ON um.userid = pom.createdby AND um.isdeleted = 0
                ${taxDetailsJoin}
                WHERE ${whereClause}
            `;

            const countResult = await db.getResults(countQuery, queryParams);
            const totalRecords = countResult[0]?.total || 0;

            // Sorting - Map frontend field names to database fields/aliases
            const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

            // Map sortField to actual column/alias in query
            const sortFieldMap = {
                id: "poid.id",
                supplier: "sm.suppliername",
                suppliergst: "sm.gstno",
                ordernumber: "pom.ordernumber",
                createdby: "um.firstname",
                referencebillnumber: "pom.referencebillnumber",
                podate: "pom.purchaseorderdate",
                productcategory: "mcm.itemcategoryname",
                brand: "bm.brandname",
                hsnsaccode: "im.hsnseccode",
                product: "im.itemname",
                uom: "uom.uomname",
                batchnumber: "poid.batchid",
                warehouseid: "wm.warehouseid",
                warehouse: "wm.warehousename",
                remarks: "pom.remarks",
                quantity: "poid.quantity",
                price: "poid.unitprice",
                total: "poid.totalamount",
                discountpercent: "poid.discountpercent",
                discount: "poid.discountamount",
                netamount: "netamount",
                taxableamount: "poid.taxableamount",
                taxpercent: "taxpercent",
                taxamount: "taxamount",
                cgst: "cgst",
                sgst: "sgst",
                igst: "igst",
                mrp: "mrp",
                lastpurchaseprice: "lastpurchaseprice",
                grandtotal: "grandtotal",
            };

            const mappedSortField =
                sortFieldMap[sortField?.toLowerCase()] || sortFieldMap["podate"];

            // Main query for product-wise purchase details
            let dataQuery = `
                SELECT
                    poid.id,
                    sm.suppliername AS supplier,
                    sm.gstno AS suppliergst,
                    pom.ordernumber AS ordernumber,
                    CONCAT(um.firstname, ' ', um.lastname) AS createdby,
                    pom.referencebillnumber AS referencebillnumber,
                    DATE_FORMAT(pom.purchaseorderdate, '%d/%m/%Y') AS podate,
                    mcm.itemcategoryname AS productcategory,
                    bm.brandname AS brand,
                    im.hsnseccode AS hsnsaccode,
                    im.itemname AS product,
                    uom.uomname AS uom,
                    poid.batchid AS batchnumber,
                    wm.warehouseid AS warehouseid,
                    wm.warehousename AS warehouse,
                    pom.remarks AS remarks,
                    ROUND(poid.quantity, 2) AS quantity,
                    ROUND(CAST(poid.unitprice AS DECIMAL(18,2)), 2) AS price,
                    ROUND(CAST(poid.totalamount AS DECIMAL(18,2)), 2) AS total,
                    ROUND(CAST(IFNULL(poid.discountpercent, 0) AS DECIMAL(18,2)), 2) AS discountpercent,
                    ROUND(CAST(poid.discountamount AS DECIMAL(18,2)), 2) AS discount,
                    ROUND(CAST((IFNULL(poid.totalamount, 0) - IFNULL(poid.discountamount, 0)) AS DECIMAL(18,2)), 2) AS netamount,
                    ROUND(CAST(poid.taxableamount AS DECIMAL(18,2)), 2) AS taxableamount,
                    ROUND(CAST(IFNULL(taxdet.taxpercent, 0) AS DECIMAL(18,2)), 2) AS taxpercent,
                    ROUND(CAST(poid.taxamount AS DECIMAL(18,2)), 2) AS taxamount,
                    ROUND(CAST(IFNULL(taxdet.cgst, 0) AS DECIMAL(18,2)), 2) AS cgst,
                    ROUND(CAST(IFNULL(taxdet.sgst, 0) AS DECIMAL(18,2)), 2) AS sgst,
                    ROUND(CAST(IFNULL(taxdet.igst, 0) AS DECIMAL(18,2)), 2) AS igst,
                    ROUND(CAST(IFNULL(im.sellingprice, 0) AS DECIMAL(18,2)), 2) AS mrp,
                    ROUND(CAST(IFNULL(poid.lastprice, 0) AS DECIMAL(18,2)), 2) AS lastpurchaseprice,
                    ROUND(CAST(poid.totaltaxamount AS DECIMAL(18,2)), 2) AS grandtotal
                FROM purchaseordermaster pom
                INNER JOIN purchaseorderitemsdetails poid ON poid.serverorderid = pom.id AND poid.isdeleted = 0
                LEFT JOIN suppliermaster sm ON sm.uniquekey = pom.smuniquekey AND sm.isdeleted = 0
                LEFT JOIN itemmaster im ON im.uniquekey = poid.productuniquekey AND im.isdeleted = 0
                LEFT JOIN itemcategorymaster mcm ON mcm.itemcategoryid = im.mastercategoryid AND mcm.isdeleted = 0
                LEFT JOIN brandmaster bm ON bm.brandid = im.brandid AND bm.isdeleted = 0
                LEFT JOIN uommaster uom ON uom.uomid = poid.uomid AND uom.isdeleted = 0
                LEFT JOIN warehousemaster wm ON wm.locationid = pom.locationid AND wm.isdefaultwarehouse = 1 AND wm.isdeleted = 0
                LEFT JOIN usermaster um ON um.userid = pom.createdby AND um.isdeleted = 0
                ${taxDetailsJoin}
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

            const productWisePurchaseData = await db.getResults(dataQuery, queryParams);

            // Calculate total pages
            const totalPages = lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1;

            return {
                data: productWisePurchaseData,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages,
                },
            };
        } catch (error) {
            winston.error(`Error fetching product-wise purchase report: ${error.message}`, {
                source: "productWisePurchase.model.js",
                function: "getProductWisePurchaseReport",
                error: error.message,
                stack: error.stack,
                filters: req.query.filters
            });
            throw error;
        }
    },
};
