const db = require("../../config/db");
const winston = require("../../config/winston");

module.exports = {
    /**
     * Universal search for POS
     * Filter types and their expected parameters:
     * - product/brand: searchKeyword (itemname), mastercategoryId (optional)
     * - supplier/customer/company: mobile, gst
     */
    universalSearch: async (filterType, searchParams, companyId) => {
        try {
            winston.info(`Universal search called`, {
                source: "search.model.js",
                function: "universalSearch",
                filterType,
                searchParams,
                companyId,
            });

            let results = [];

            switch (filterType.toLowerCase()) {
                case "item":
                    // Expects: searchKeyword, mastercategoryId (optional)
                    if (!searchParams.searchKeyword) {
                        return {
                            success: 0,
                            msg: "searchKeyword is required for product search",
                        };
                    }
                    results = await module.exports.searchProducts(
                        searchParams.searchKeyword,
                        companyId,
                        searchParams.mastercategoryId
                    );
                    break;

                case "brand":
                    // Expects: searchKeyword, mastercategoryId (optional)
                    if (!searchParams.searchKeyword) {
                        return {
                            success: 0,
                            msg: "searchKeyword is required for brand search",
                        };
                    }
                    results = await module.exports.searchBrands(
                        searchParams.searchKeyword,
                        companyId,
                        searchParams.mastercategoryId
                    );
                    break;

                case "supplier":
                    // Expects: panno, gst
                    // Note: Suppliers are searched globally (no companyId filter)
                    if (!searchParams.panno && !searchParams.gst) {
                        return {
                            success: 0,
                            msg: "pan number or gst is required for supplier search",
                        };
                    }
                    results = await module.exports.searchSuppliers(
                        searchParams.panno,
                        searchParams.gst
                    );
                    break;

                case "customer":
                    // Expects: mobile, gst
                    if (!searchParams.mobile && !searchParams.gst) {
                        return {
                            success: 0,
                            msg: "mobile or gst is required for customer search",
                        };
                    }
                    results = await module.exports.searchCustomers(
                        searchParams.mobile,
                        searchParams.gst,
                        companyId
                    );
                    break;

                case "company":
                    // Expects: mobile, gst
                    // Note: Companies are searched globally (no companyId filter)
                    if (!searchParams.mobile && !searchParams.gst) {
                        return {
                            success: 0,
                            msg: "mobile or gst is required for company search",
                        };
                    }
                    results = await module.exports.searchCompanies(
                        searchParams.mobile,
                        searchParams.gst
                    );
                    break;

                default:
                    return {
                        success: 0,
                        msg: `Invalid filter type: ${filterType}. Valid types: product, brand, supplier, customer, company`,
                    };
            }

            return {
                success: 1,
                data: results,
                count: results.length,
                filterType,
                msg: `Found ${results.length} results`,
            };
        } catch (error) {
            winston.error(`Universal search failed: ${error.message}`, {
                source: "search.model.js",
                function: "universalSearch",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return {
                success: 0,
                msg: error.message || "Search failed",
            };
        }
    },

    /**
     * Search products (items) by itemname only
     * Optionally filter by mastercategoryId
     * Returns items with company-specific overrides from company_itemmaster
     */
    searchProducts: async (searchKeyword, companyId, mastercategoryId = null) => {
        try {
            const searchPattern = `%${searchKeyword}%`;

            let sql = `
                SELECT im.itemid, im.uniquekey, im.itemname, im.itemdisplayname, im.genericname, im.itemcode, im.imgpath, 
                           im.wholesaleprice, im.isactive, im.ignoretax, im.ignorediscount, im.isnegativesale,
                           im.price, im.mastercategoryid, im.categoryid, im.subcategoryid, im.brandid, 
                           im.itemtypeid, im.appearanceid, im.safetyquantity, 
                           im.defaulttaxprofileid, tpm.taxprofilename AS defaulttaxprofilename, 
                           im.sellingitemas, im.hsnseccode, im.isanycess, 
                           im.cesspercentage, im.cessdesc, im.pricetype, im.sellingprice, 
                           im.purchaseprice, im.netcost, im.remarks, im.ingredients, im.description, 
                           im.taxprofileid, tpm2.taxprofilename AS taxprofilename, im.packingqty, 
                           im.packageuom, im.baseunit,uom2.uomname AS baseunitname, im.ismanufacturer, im.batchquantity, 
                           im.ispackingitem, im.isfat, im.nutritioninfo, im.equivalentsellingitem,im.modifieddate,
                           uom.uomname AS packageuomname,
                           cat.itemcategoryname AS categoryname,
                           mastercat.itemcategoryname AS mastercategoryname,
                           subcat.itemcategoryname AS subcategoryname,
                           brand.brandname AS brandname,
                           itype.itemtypename AS itemtypename
                    FROM itemmaster AS im
                    LEFT JOIN uommaster AS uom ON im.packageuom = uom.uomid
                    LEFT JOIN uommaster AS uom2 ON im.baseunit = uom2.uomid
                    LEFT JOIN itemcategorymaster AS cat ON im.categoryid = cat.itemcategoryid
                    LEFT JOIN itemcategorymaster AS mastercat ON im.mastercategoryid = mastercat.itemcategoryid
                    LEFT JOIN itemcategorymaster AS subcat ON im.subcategoryid = subcat.itemcategoryid
                    LEFT JOIN brandmaster AS brand ON im.brandid = brand.brandid
                    LEFT JOIN itemtypemaster AS itype ON im.itemtypeid = itype.itemtypeid
                    LEFT JOIN taxprofilemaster AS tpm ON im.defaulttaxprofileid = tpm.taxprofileid
                    LEFT JOIN taxprofilemaster AS tpm2 ON im.taxprofileid = tpm2.taxprofileid
                    WHERE im.isdeleted = 0
                    AND im.isapproved = 1
                    AND im.isglobal = 1
                    AND im.itemname LIKE ?
            `;

            const params = [searchPattern];

            // Add mastercategoryid filter if provided
            if (mastercategoryId !== null && mastercategoryId !== undefined) {
                sql += ` AND im.mastercategoryid = ?`;
                params.push(mastercategoryId);
            }

            sql += ` ORDER BY im.itemname ASC`;
            const results = await db.getResults(sql, params);
            return results || [];
        } catch (error) {
            winston.error(`Product search failed: ${error.message}`, {
                source: "search.model.js",
                function: "searchProducts",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    /**
     * Search brands by brandname
     * Returns items under searched brands, optionally filtered by mastercategoryId
     */
    searchBrands: async (searchKeyword, companyId, mastercategoryId = null) => {
        try {
            const searchPattern = `%${searchKeyword}%`;

            let sql = `
                SELECT
                    bm.brandid,
                    bm.brandname,
                    bm.brandcategory,
                    bm.brandicon
                FROM brandmaster bm WHERE bm.isdeleted = 0 AND bm.brandname LIKE ?
            `;

            const params = [searchPattern];

            // Add mastercategoryid filter if provided
            if (mastercategoryId !== null && mastercategoryId !== undefined) {
                sql += ` AND bm.brandcategory = ?`;
                params.push(mastercategoryId);
            }

            sql += ` ORDER BY bm.brandname ASC`;

            const results = await db.getResults(sql, params);
            return results || [];
        } catch (error) {
            winston.error(`Brand search failed: ${error.message}`, {
                source: "search.model.js",
                function: "searchBrands",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    /**
     * Search suppliers by pan or GST
     */
    searchSuppliers: async (panno, gst) => {
        try {
            let sql = `
                SELECT
                    sm.supplierid,
                    sm.suppliername,
                    sm.address,
                    sm.gstno,
                    sm.panno,
                    sm.phoneno,
                    sm.email,
                    sm.pincode,
                    sm.contactperson,
                    sm.countryid,
                    sm.stateid,
                    sm.cityid,
                    sm.outstandingamt,
                    sm.seedslicensenumber,
                    sm.seedslicensedate,
                    sm.fertilizerlicensenumber,
                    sm.fertilizerlicensedate,
                    sm.pesticideslicensenumber,
                    sm.pesticideslicensedate,
                    sm.isapproved,
                    sm.approvalremark
                FROM suppliermaster sm
                WHERE sm.isdeleted = 0
            `;

            const params = [];
            const conditions = [];

            // Add panno search if provided
            if (panno) {
                conditions.push(`sm.panno LIKE ?`);
                params.push(`%${panno}%`);
            }

            // Add GST search if provided
            if (gst) {
                conditions.push(`sm.gstno LIKE ?`);
                params.push(`%${gst}%`);
            }

            // Combine conditions with OR
            if (conditions.length > 0) {
                sql += ` AND (${conditions.join(" OR ")})`;
            }

            sql += ` ORDER BY sm.suppliername ASC LIMIT 100`;

            const results = await db.getResults(sql, params);
            return results || [];
        } catch (error) {
            winston.error(`Supplier search failed: ${error.message}`, {
                source: "search.model.js",
                function: "searchSuppliers",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    /**
     * Search customers by mobile or GST
     */
    searchCustomers: async (mobile, gst, companyId) => {
        try {
            let sql = `
                SELECT
                    cm.id,
                    cm.customerid,
                    cm.name,
                    cm.customertypeid,
                    cm.phoneno,
                    cm.cardno,
                    cm.email,
                    cm.address,
                    cm.outstandingamt,
                    cm.birthdate,
                    cm.anniversarydate,
                    cm.panno,
                    cm.gstno,
                    cm.pincodeno,
                    cm.contactpersonname,
                    cm.depositamount,
                    cm.discountpercentage,
                    cm.rewardspoint,
                    cm.rewardsamount,
                    cm.stateid,
                    cm.cityid,
                    cm.countryid,
                    cm.villagename,
                    cm.aadharnum
                FROM customermaster cm
                WHERE cm.companyid = ?
                    AND cm.isdeleted = 0
            `;

            const params = [companyId];
            const conditions = [];

            // Add mobile search if provided
            if (mobile) {
                conditions.push(`cm.phoneno LIKE ?`);
                params.push(`%${mobile}%`);
            }

            // Add GST search if provided
            if (gst) {
                conditions.push(`cm.gstno LIKE ?`);
                params.push(`%${gst}%`);
            }

            // Combine conditions with OR
            if (conditions.length > 0) {
                sql += ` AND (${conditions.join(" OR ")})`;
            }

            sql += ` ORDER BY cm.name ASC LIMIT 100`;

            const results = await db.getResults(sql, params);
            return results || [];
        } catch (error) {
            winston.error(`Customer search failed: ${error.message}`, {
                source: "search.model.js",
                function: "searchCustomers",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    /**
     * Search companies by mobile or GST
     */
    searchCompanies: async (mobile, gst) => {
        try {
            let sql = `
                SELECT
                    cm.companyid,
                    cm.companyname,
                    cm.address,
                    cm.companyemailid,
                    cm.companycontactnumber,
                    cm.gstno,
                    cm.panno,
                    cm.countryid,
                    cm.stateid,
                    cm.cityid,
                    cm.postalcode,
                    cm.companylogopath
                FROM companymaster cm
                WHERE cm.isdeleted = 0
            `;

            const params = [];
            const conditions = [];

            // Add mobile search if provided
            if (mobile) {
                conditions.push(`cm.companycontactnumber LIKE ?`);
                params.push(`%${mobile}%`);
            }

            // Add GST search if provided
            if (gst) {
                conditions.push(`cm.gstno LIKE ?`);
                params.push(`%${gst}%`);
            }

            // Combine conditions with OR
            if (conditions.length > 0) {
                sql += ` AND (${conditions.join(" OR ")})`;
            }

            sql += ` ORDER BY cm.companyname ASC LIMIT 100`;

            const results = await db.getResults(sql, params);
            return results || [];
        } catch (error) {
            winston.error(`Company search failed: ${error.message}`, {
                source: "search.model.js",
                function: "searchCompanies",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },
};
