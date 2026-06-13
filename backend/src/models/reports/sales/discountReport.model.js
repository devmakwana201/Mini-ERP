const db = require("../../../config/db");
const winston = require("../../../config/winston");

module.exports = {
  /**
   * Get Discount Report with pagination and filters
   * @param {Object} req - Request object with query parameters
   * @returns {Promise<Object>} - Returns discount report data with pagination info
   */
  getDiscountReport: async (req) => {
    try {
      const {
        start = 0,
        length = 10,
        filters,
        sortField = "om.orderdate",
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

      const discountTypeExpression = `CASE
        WHEN COALESCE(om.discountamount, 0) = 0 THEN 'No Discount'
        ELSE COALESCE(
          (
            SELECT GROUP_CONCAT(
              DISTINCT CASE
                WHEN opd_sub.discounttype = 1 THEN 'Percentage'
                WHEN opd_sub.discounttype = 2 THEN 'Flat'
                ELSE 'Unknown'
              END
              ORDER BY opd_sub.discounttype
              SEPARATOR ', '
            )
            FROM orderproductdetails opd_sub
            WHERE opd_sub.orderid = om.orderid
              AND opd_sub.isdeleted = 0
              AND COALESCE(opd_sub.discountamount, 0) > 0
          ),
          'Unknown'
        )
      END`;

      // Helper function to get filter value
      const getFilterValue = (field) => {
        const val = parsedFilters[field];
        return typeof val === "object" ? val.value : val;
      };

      // Base WHERE conditions
      let whereConditions = ["om.isdeleted = 0"];
      let queryParams = [];

      // Company filter (required)
      const companyid = getFilterValue("companyid");
      if (companyid) {
        whereConditions.push("om.companyid = ?");
        queryParams.push(companyid);
      }

      // Location filter - Check direct param first, then filters object
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

      // Customer filter
      const customerid = getFilterValue("customerid");
      if (customerid) {
        whereConditions.push("cm.customerid = ?");
        queryParams.push(customerid);
      }

      // Text field filters (LIKE match)
      const textFilters = {
        billno: "om.billno",
        customer: "cm.name",
        date: "DATE_FORMAT(om.orderdate, '%Y-%m-%d')",
        createdby: "CONCAT(um.firstname, ' ', um.lastname)",
        discount_type: discountTypeExpression,
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
        ordertotal: "om.amount",
        discount: "om.discountamount",
        net_amount: "om.taxableamount",
        taxamount: "om.totaltaxamount",
        roundoff: "om.roundoff",
        grandtotal: "om.grandtotal",
      };

      Object.entries(numericFilters).forEach(([filterKey, dbField]) => {
        const value = getFilterValue(filterKey);
        if (value) {
          const parsedValue = parseFloat(value);
          if (!Number.isNaN(parsedValue)) {
            whereConditions.push(
              `ROUND(CAST(${dbField} AS DECIMAL(18,2)), 2) = ?`,
            );
            queryParams.push(parsedValue);
          } else {
            // Force an empty result for invalid numeric filter input.
            whereConditions.push("1 = 0");
          }
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
        const totalFields =
          textSearchFields.length + numericSearchFields.length;
        for (let i = 0; i < totalFields; i++) {
          queryParams.push(searchTerm);
        }
      }

      const whereClause = whereConditions.join(" AND ");

      // Count total records
      const countQuery = `
                SELECT COUNT(*) as total
                FROM ordermaster om
                LEFT JOIN customermaster cm ON cm.uniquekey = om.customeruniquekey AND cm.isdeleted = 0
                LEFT JOIN usermaster um ON um.userid = om.createdby AND um.isdeleted = 0
                WHERE ${whereClause}
            `;

      const countResult = await db.getResults(countQuery, queryParams);
      const totalRecords = countResult[0]?.total || 0;

      // Sorting
      const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";
      const sortFieldMap = {
        billno: "om.billno",
        customer: "cm.name",
        date: "om.orderdate",
        phoneno: "cm.phoneno",
        ordertotal: "om.amount",
        discount: "om.discountamount",
        discount_type: "discount_type",
        discount_percentage: "discount_percentage",
        net_amount: "om.taxableamount",
        total_items: "total_items",
        taxamount: "om.totaltaxamount",
        total_sgst: "total_sgst",
        total_cgst: "total_cgst",
        total_igst: "total_igst",
        roundoff: "om.roundoff",
        grandtotal: "om.grandtotal",
        payment_type: "payment_type",
        createdby: "createdby",
      };
      const mappedSortField =
        sortFieldMap[sortField] || sortFieldMap.date;

      // Main query for discount report
      let dataQuery = `
SELECT
    om.id,
    om.billno AS billno,
    cm.name AS customer,
    om.orderid,
    COALESCE(NULLIF(CONCAT(um.firstname, ' ', um.lastname), ' '), um.username, CAST(om.createdby AS CHAR), '-') AS createdby,
    DATE_FORMAT(om.orderdate, '%Y-%m-%d') AS date,

    ROUND(om.amount, 2) AS ordertotal,
    ROUND(om.discountamount, 2) AS discount,
    ${discountTypeExpression} AS discount_type,

    ROUND(
        CASE 
            WHEN om.amount = 0 THEN 0
            ELSE (om.discountamount / om.amount) * 100
        END, 2
    ) AS discount_percentage,

    ROUND(om.taxableamount, 2) AS net_amount,
    ROUND(om.totaltaxamount, 2) AS taxamount,
    ROUND(om.roundoff, 2) AS roundoff,
    ROUND(om.grandtotal, 2) AS grandtotal,

    cm.phoneno,

    -- ✅ TOTAL ITEMS
    SUM(opd.quantity) AS total_items,

    -- ✅ SGST
    SUM(CASE 
        WHEN tm.taxname = 'SGST' THEN opt.taxamount 
        ELSE 0 
    END) AS total_sgst,

    -- ✅ CGST
    SUM(CASE 
        WHEN tm.taxname = 'CGST' THEN opt.taxamount 
        ELSE 0 
    END) AS total_cgst,

    -- ✅ IGST
    SUM(CASE 
        WHEN tm.taxname = 'IGST' THEN opt.taxamount 
        ELSE 0 
    END) AS total_igst,

    -- ✅ PAYMENT MODE (handles multiple)
    GROUP_CONCAT(DISTINCT pm.paymentmodename) AS payment_type

        FROM ordermaster om

        LEFT JOIN customermaster cm 
            ON cm.uniquekey = om.customeruniquekey 
            AND cm.isdeleted = 0

        LEFT JOIN usermaster um
            ON um.userid = om.createdby
            AND um.isdeleted = 0

        LEFT JOIN orderproductdetails opd 
            ON opd.orderid = om.orderid

        LEFT JOIN orderproducttaxdetails opt 
            ON opt.orderid = om.orderid

        LEFT JOIN taxmaster tm 
            ON opt.taxid = tm.taxid

        LEFT JOIN paymentmaster o 
            ON o.orderid = om.orderid

        LEFT JOIN paymenttransactionmaster pt 
            ON o.paymentid = pt.paymentid

        LEFT JOIN paymenttype pm 
            ON pt.paymodeid = pm.paymentid

        WHERE ${whereClause}

        GROUP BY om.orderid

        ORDER BY ${mappedSortField} ${order}
        `;

      // Pagination using start and length
      const startNum = parseInt(start);
      const lengthNum = parseInt(length);

      if (lengthNum !== -1) {
        dataQuery += ` LIMIT ?, ?`;
        queryParams.push(startNum, lengthNum);
      }

      const discountData = await db.getResults(dataQuery, queryParams);

      // Calculate total pages
      const totalPages =
        lengthNum !== -1 ? Math.ceil(totalRecords / lengthNum) : 1;
      return {
        data: discountData,
        pagination: {
          start: startNum,
          length: lengthNum,
          total: totalRecords,
          totalPages,
        },
      };
    } catch (error) {
      winston.error(`Error fetching discount report: ${error.message}`, {
        source: "discountReport.model.js",
        function: "getDiscountReport",
        error: error.message,
        stack: error.stack,
        filters: req.query.filters,
      });
      throw error;
    }
  },
};
