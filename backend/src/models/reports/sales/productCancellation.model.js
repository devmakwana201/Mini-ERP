const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Get Product Cancellation Report with detailed fields
     * @param {Object} req - Request object with query parameters
     */
    getProductCancellation: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField = "cancellationdate",
                sortOrder = "desc",
                locationId,
            } = req.query;

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

            // Product cancellation/return entries are stored in return-sale tables
            let whereConditions = ["rsom.isdeleted = 0", "rsopd.isdeleted = 0"];
            let queryParams = [];

            const companyid = getFilterValue("companyid");
            if (companyid) {
                whereConditions.push("rsom.companyid = ?");
                queryParams.push(companyid);
            }

            const locationid = locationId || getFilterValue("locationid");
            if (locationid) {
                whereConditions.push("rsom.locationid = ?");
                queryParams.push(locationid);
            }

            const fromDate = getFilterValue("fromDate");
            const toDate = getFilterValue("toDate");
            if (fromDate && toDate) {
                whereConditions.push("DATE(rsom.returndate) BETWEEN ? AND ?");
                queryParams.push(fromDate, toDate);
            } else if (fromDate) {
                whereConditions.push("DATE(rsom.returndate) >= ?");
                queryParams.push(fromDate);
            } else if (toDate) {
                whereConditions.push("DATE(rsom.returndate) <= ?");
                queryParams.push(toDate);
            }

            const global = getFilterValue("global");
            if (global) {
                whereConditions.push("(om.billno LIKE ? OR im.itemname LIKE ? OR COALESCE(cm.name, cm2.name) LIKE ?)");
                queryParams.push(`%${global}%`, `%${global}%`, `%${global}%`);
            }

            const whereClause = whereConditions.join(" AND ");
            const order = sortOrder?.toLowerCase() === "asc" ? "ASC" : "DESC";
            const sortFieldMap = {
                billno: "om.billno",
                customername: "COALESCE(cm.name, cm2.name)",
                cancellationdate: "rsom.returndate",
                originalsaledate: "om.orderdate",
                product: "im.itemname",
                category: "mcm.itemcategoryname",
                brand: "bm.brandname",
                uom: "um.uomname",
                batchnumber: "rsopd.batchid",
                price: "rsopd.unitprice",
                quantity: "rsopd.returnquantity",
                discount: "rsopd.discountamount",
                netamount: "rsopd.totalamount",
                taxamount: "rsopd.taxamount",
                grandtotal: "rsopd.totaltaxamount",
                cancellationreason: "rsom.remarks",
                // return-to-stock flag is not available in all DB variants
                returntostock: "rsopd.id",
                cancelledby: "u.username",
            };
            const mappedSortField =
                sortFieldMap[sortField?.toLowerCase()] || "rsom.returndate";

            // Count Query
            const countQuery = `
                SELECT COUNT(rsopd.id) as total
                FROM returnsaleorderproductdetails rsopd
                INNER JOIN returnsaleordermaster rsom ON rsom.id = rsopd.serverreturnsaleorderid
                LEFT JOIN ordermaster om ON om.id = rsom.serverorderid AND om.isdeleted = 0
                LEFT JOIN (
                    SELECT
                        uniquekey,
                        MAX(itemname) AS itemname,
                        MAX(categoryid) AS categoryid,
                        MAX(brandid) AS brandid,
                        MAX(defaultuom) AS defaultuom
                    FROM itemmaster
                    WHERE isdeleted = 0
                    GROUP BY uniquekey
                ) im ON im.uniquekey = rsopd.pmuniquekey
                LEFT JOIN customermaster cm ON cm.uniquekey = om.customeruniquekey AND cm.isdeleted = 0
                LEFT JOIN customermaster cm2 ON cm2.customerid = rsom.customerid AND cm2.companyid = rsom.companyid AND cm2.isdeleted = 0
                WHERE ${whereClause}
            `;

            const countResult = await db.getResults(countQuery, queryParams);
            const totalRecords = countResult[0]?.total || 0;

            // Main Query with all requested fields
            let dataQuery = `
                SELECT
                    rsopd.id,
                    om.billno,
                    COALESCE(cm.name, cm2.name, '-') AS customername,
                    DATE_FORMAT(om.orderdate, '%d/%m/%Y') AS originalsaledate,
                    DATE_FORMAT(rsom.returndate, '%d/%m/%Y %H:%i') AS cancellationdate,
                    im.itemname AS product,
                    mcm.itemcategoryname AS category,
                    bm.brandname AS brand,
                    um.uomname AS uom,
                    rsopd.batchid AS batchnumber,
                    ROUND(CAST(rsopd.unitprice AS DECIMAL(18,2)), 2) AS price,
                    ROUND(rsopd.returnquantity, 2) AS quantity,
                    ROUND(CAST(rsopd.discountamount AS DECIMAL(18,2)), 2) AS discount,
                    ROUND(CAST(rsopd.totalamount AS DECIMAL(18,2)), 2) AS netamount,
                    ROUND(CAST(rsopd.taxamount AS DECIMAL(18,2)), 2) AS taxamount,
                    ROUND(CAST(rsopd.totaltaxamount AS DECIMAL(18,2)), 2) AS grandtotal,
                    rsom.remarks AS cancellationreason,
                    '-' AS returntostock,
                    u.username AS cancelledby
                FROM returnsaleorderproductdetails rsopd
                INNER JOIN returnsaleordermaster rsom ON rsom.id = rsopd.serverreturnsaleorderid
                LEFT JOIN ordermaster om ON om.id = rsom.serverorderid AND om.isdeleted = 0
                LEFT JOIN (
                    SELECT
                        uniquekey,
                        MAX(itemname) AS itemname,
                        MAX(categoryid) AS categoryid,
                        MAX(brandid) AS brandid,
                        MAX(defaultuom) AS defaultuom
                    FROM itemmaster
                    WHERE isdeleted = 0
                    GROUP BY uniquekey
                ) im ON im.uniquekey = rsopd.pmuniquekey
                LEFT JOIN customermaster cm ON cm.uniquekey = om.customeruniquekey AND cm.isdeleted = 0
                LEFT JOIN customermaster cm2 ON cm2.customerid = rsom.customerid AND cm2.companyid = rsom.companyid AND cm2.isdeleted = 0
                LEFT JOIN itemcategorymaster mcm ON mcm.itemcategoryid = im.categoryid
                LEFT JOIN brandmaster bm ON bm.brandid = im.brandid
                LEFT JOIN uommaster um ON um.uomid = im.defaultuom
                LEFT JOIN usermaster u ON u.userid = rsopd.modifiedby
                WHERE ${whereClause}
                ORDER BY ${mappedSortField} ${order}
            `;

            const startNum = parseInt(start);
            const lengthNum = parseInt(length);
            if (lengthNum !== -1) {
                dataQuery += ` LIMIT ?, ?`;
                queryParams.push(startNum, lengthNum);
            }

            const data = await db.getResults(dataQuery, queryParams);

            return {
                data,
                pagination: {
                    start: startNum,
                    length: lengthNum,
                    total: totalRecords,
                    totalPages: lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1,
                },
            };
        } catch (error) {
            winston.error(`Error in Product Cancellation Report: ${error.message}`);
            throw error;
        }
    },
};
