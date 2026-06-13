const db = require("../../config/db");
const winston = require("../../config/winston");

function normalizeRows(rows) {
    if (!rows) return [];
    return rows.map((row) => {
        const normalized = {};
        for (const key in row) {
            const value = row[key];
            if (
                value === null ||
                value === undefined ||
                (typeof value === "string" && value.trim() === "")
            ) {
                normalized[key] = "";
            } else {
                normalized[key] = value;
            }
        }
        return normalized;
    });
}

module.exports = {
    async getBrandMaster(modifiedDate) {
        try {
            const query = `
                SELECT brandid, brandname, branddesc, brandcategory, brandicon, companyid, createdby, createddate, 
                       modifiedby, modifieddate, ipaddress, isdeleted, isapproved, 
                       approvalremark, replacewith, uniquekey, issync,
                       CASE 
                           WHEN modifieddate IS NULL THEN createddate 
                           WHEN createddate > modifieddate THEN createddate 
                           ELSE modifieddate 
                       END as maxdate
                FROM brandmaster
                WHERE isapproved = 1 
                  AND (createddate > ? OR modifieddate > ?)
            `;

            const rows = await db.getResults(query, [modifiedDate, modifiedDate]);
            return normalizeRows(rows);
        } catch (error) {
            winston.error(`Error in getBrandMaster: ${error.message}`, {
                source: "sync.model.js",
                function: "getBrandMaster",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            throw error;
        }
    },

    async getItemCategoryMaster(modifiedDate) {
        try {
            const query = `
                SELECT itemcategoryid, itemcategoryname, gujratiname, displayname, 
                       itemcategoryimage, parentcategoryid, itemcategorydesc, itemcategoryorder, companyid, 
                       createdby, createddate, modifiedby, modifieddate, ipaddress, isdeleted,
                       CASE 
                           WHEN modifieddate IS NULL THEN createddate 
                           WHEN createddate > modifieddate THEN createddate 
                           ELSE modifieddate 
                       END as maxdate
                FROM itemcategorymaster
                WHERE (createddate > ? OR modifieddate > ?)
                AND isdeleted = 0
            `;

            const rows = await db.getResults(query, [modifiedDate, modifiedDate]);
            return normalizeRows(rows);
        } catch (error) {
            winston.error(`Error in getItemCategoryMaster: ${error.message}`, {
                source: "sync.model.js",
                function: "getItemCategoryMaster",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            throw error;
        }
    },

    async getItemTypeMaster(modifiedDate) {
        try {
            const query = `
                SELECT itemtypeid, itemtypename, itemtypedesc, companyid, createdby, 
                       createddate, modifiedby, modifieddate, ipaddress, isdeleted,
                       CASE 
                           WHEN modifieddate IS NULL THEN createddate 
                           WHEN createddate > modifieddate THEN createddate 
                           ELSE modifieddate 
                       END as maxdate
                FROM itemtypemaster
                WHERE (createddate > ? OR modifieddate > ?)
                AND isdeleted = 0
            `;

            const rows = await db.getResults(query, [modifiedDate, modifiedDate]);
            return normalizeRows(rows);
        } catch (error) {
            winston.error(`Error in getItemTypeMaster: ${error.message}`, {
                source: "sync.model.js",
                function: "getItemTypeMaster",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            throw error;
        }
    },

    async getItemMaster(modifiedDate, companyId = null) {
        try {
            // Note: This method is for incremental sync based on modifiedDate
            // For company-specific data, use the company_itemmaster table
            // This returns global itemmaster data (approved items only)
            const query = `
                SELECT itemid, itemname, itemdisplayname, genericname, itembarcode, itemcode, price,
                       mastercategoryid, categoryid, subcategoryid, brandid, itemtypeid,
                       appearanceid, itemimage, safetyquantity, defaulttaxprofileid,
                       sellingitemas, hsnseccode, isanycess, cesspercentage, cessdesc,
                       pricetype, remarks,
                       ingredients, description, taxprofileid, defaultuom, companyid,
                       createdby, createddate, modifiedby, modifieddate, ipaddress,
                       isdeleted, baseunit, ismanufacturer, batchquantity, ispackingitem,
                       isfat, nutritioninfo, equivalentsellingitem, imgpath, blobimg,
                       packingqty, packageuom, wholesaleprice, isnegativesale, ignoretax, ignorediscount,
                       isglobal, isapproved, approvalremark, uniquekey,
                       CASE
                           WHEN modifieddate IS NULL THEN createddate
                           WHEN createddate > modifieddate THEN createddate
                           ELSE modifieddate
                       END as maxdate
                FROM itemmaster
                WHERE (createddate > ? OR modifieddate > ?)
                AND isdeleted = 0
                AND isapproved = 1
            `;

            const rows = await db.getResults(query, [modifiedDate, modifiedDate]);
            return normalizeRows(rows);
        } catch (error) {
            winston.error(`Error in getItemMaster: ${error.message}`, {
                source: "sync.model.js",
                function: "getItemMaster",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            throw error;
        }
    },

    async getCompanyItemMaster(modifiedDate, companyId) {
        try {
            // Get company-specific item overrides
            // This should be called after getItemMaster to apply company-specific changes
            const query = `
                SELECT ci.id, ci.companyid, ci.itemid, ci.uniquekey,
                       ci.sellingprice, ci.purchaseprice, ci.wholesaleprice, ci.netcost,
                       ci.safetyquantity, ci.currentstock, ci.minstock, ci.maxstock,
                       ci.isactive, ci.ignoretax, ci.ignorediscount,
                       ci.customname, ci.customdescription, ci.customcode, ci.custombarcode,
                       ci.issync, ci.lastsyncdate,
                       ci.createdby, ci.createddate, ci.modifiedby, ci.modifieddate,
                       ci.ipaddress, ci.isdeleted,
                       CASE
                           WHEN ci.modifieddate IS NULL THEN ci.createddate
                           WHEN ci.createddate > ci.modifieddate THEN ci.createddate
                           ELSE ci.modifieddate
                       END as maxdate
                FROM company_itemmaster ci
                WHERE ci.companyid = ?
                AND (ci.createddate > ? OR ci.modifieddate > ?)
                AND ci.isdeleted = 0
            `;

            const rows = await db.getResults(query, [companyId, modifiedDate, modifiedDate]);
            return normalizeRows(rows);
        } catch (error) {
            winston.error(`Error in getCompanyItemMaster: ${error.message}`, {
                source: "sync.model.js",
                function: "getCompanyItemMaster",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            throw error;
        }
    },

    async getSupplierMaster(modifiedDate) {
        try {
            const query = `
                SELECT supplierid, suppliername, address, gstno, panno, phoneno, email, 
                       pincode, contactperson, countryid, stateid, cityid, 
                       createdby, createddate, modifiedby, modifieddate, ipaddress, isdeleted,
                       vatno, supplierimage, outstandingamt, 
                       uniquekey, seedslicensenumber, seedslicensedate, fertilizerlicensenumber, 
                       fertilizerlicensedate, pesticideslicensenumber, pesticideslicensedate, 
                       isapproved, approvalremark, replacewith,isdeleted,
                       CASE 
                           WHEN modifieddate IS NULL THEN createddate 
                           WHEN createddate > modifieddate THEN createddate 
                           ELSE modifieddate 
                       END as maxdate
                FROM suppliermaster
                WHERE isapproved = 1
                  AND (createddate > ? OR modifieddate > ?)
                  AND isdeleted = 0
            `;

            const rows = await db.getResults(query, [modifiedDate, modifiedDate]);
            return normalizeRows(rows);
        } catch (error) {
            winston.error(`Error in getSupplierMaster: ${error.message}`, {
                source: "sync.model.js",
                function: "getSupplierMaster",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            throw error;
        }
    },

    async getUOMMaster(modifiedDate) {
        try {
            const query = `
                SELECT uomid, uomname, companyid, createdby, createddate, 
                       modifiedby, modifieddate, ipaddress, isdeleted,
                       CASE 
                           WHEN modifieddate IS NULL THEN createddate 
                           WHEN createddate > modifieddate THEN createddate 
                           ELSE modifieddate 
                       END as maxdate
                FROM uommaster
                WHERE (createddate > ? OR modifieddate > ?)
                AND isdeleted = 0
            `;
            const rows = await db.getResults(query, [modifiedDate, modifiedDate]);
            return normalizeRows(rows);
        } catch (error) {
            winston.error(`Error in getUOMMaster: ${error.message}`, {
                source: "sync.model.js",
                function: "getUOMMaster",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            throw error;
        }
    },

    async getTaxMaster(modifiedDate) {
        try {
            const query = `
                SELECT taxid, taxname, taxpercentage, isactive, createdby, createddate, 
                       modifiedby, modifieddate, ipaddress, isdeleted, companyid, isapplicableon,
                       CASE 
                           WHEN modifieddate IS NULL THEN createddate 
                           WHEN createddate > modifieddate THEN createddate 
                           ELSE modifieddate 
                       END as maxdate
                FROM taxmaster
                WHERE (createddate > ? OR modifieddate > ?)
                AND isdeleted = 0
            `;

            const rows = await db.getResults(query, [modifiedDate, modifiedDate]);
            return normalizeRows(rows);
        } catch (error) {
            winston.error(`Error in getTaxMaster: ${error.message}`, {
                source: "sync.model.js",
                function: "getTaxMaster",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            throw error;
        }
    },

    async getTaxProfileMaster(modifiedDate) {
        try {
            const query = `
                SELECT taxprofileid, taxprofilename, isdefault, createdby, createddate, 
                       modifiedby, modifieddate, ipaddress, isdeleted, taxpercentage, companyid,
                       CASE 
                           WHEN modifieddate IS NULL THEN createddate 
                           WHEN createddate > modifieddate THEN createddate 
                           ELSE modifieddate 
                       END as maxdate
                FROM taxprofilemaster
                WHERE (createddate > ? OR modifieddate > ?)
                AND isdeleted = 0
            `;

            const rows = await db.getResults(query, [modifiedDate, modifiedDate]);
            return normalizeRows(rows);
        } catch (error) {
            winston.error(`Error in getTaxProfileMaster: ${error.message}`, {
                source: "sync.model.js",
                function: "getTaxProfileMaster",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            throw error;
        }
    },

    async getTaxProfileDetails(modifiedDate) {
        try {
            const query = `
                SELECT taxprofiledetailsid, taxprofileid, taxid, taxpercentage, isapplicableon, 
                       createdby, createddate, modifiedby, modifieddate, ipaddress, isdeleted, 
                       locationid, issync, companyid,
                       CASE 
                           WHEN modifieddate IS NULL THEN createddate 
                           WHEN createddate > modifieddate THEN createddate 
                           ELSE modifieddate 
                       END as maxdate
                FROM taxprofiledetails
                WHERE (createddate > ? OR modifieddate > ?)
                AND isdeleted = 0
            `;

            const rows = await db.getResults(query, [modifiedDate, modifiedDate]);
            return normalizeRows(rows);
        } catch (error) {
            winston.error(`Error in getTaxProfileDetails: ${error.message}`, {
                source: "sync.model.js",
                function: "getTaxProfileDetails",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            throw error;
        }
    },

    async getReasonMaster(modifiedDate) {
        try {
            const query = `
                SELECT reasonid, reason, reasontypeid, companyid, createdby, createddate, 
                       modifiedby, modifieddate, ipaddress, isdeleted,
                       CASE 
                           WHEN modifieddate IS NULL THEN createddate 
                           WHEN createddate > modifieddate THEN createddate 
                           ELSE modifieddate 
                       END as maxdate
                FROM reasonmaster
                WHERE (createddate > ? OR modifieddate > ?)
                AND isdeleted = 0
            `;
            const rows = await db.getResults(query, [modifiedDate, modifiedDate]);
            return normalizeRows(rows);
        } catch (error) {
            winston.error(`Error in getReasonMaster: ${error.message}`, {
                source: "sync.model.js",
                function: "getReasonMaster",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            throw error;
        }
    },

    async getReasonTypeMaster(modifiedDate) {
        try {
            const query = `
                SELECT reasontypeid, reasontype, companyid, createdby, createddate, modifiedby, modifieddate, ipaddress, isdeleted,
                       CASE 
                           WHEN modifieddate IS NULL THEN createddate 
                           WHEN createddate > modifieddate THEN createddate 
                           ELSE modifieddate 
                       END as maxdate
                FROM reasontypemaster
                WHERE (createddate > ? OR modifieddate > ?)
                AND isdeleted = 0
            `;

            const rows = await db.getResults(query, [modifiedDate, modifiedDate]);
            return normalizeRows(rows);
        } catch (error) {
            winston.error(`Error in getReasonTypeMaster: ${error.message}`, {
                source: "sync.model.js",
                function: "getReasonTypeMaster",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            throw error;
        }
    },

    async getPaymentType(modifiedDate) {
        try {
            const query = `
                SELECT paymentid, paymentmodename, paymenticon, paymentparentid, isrefrence,
                       createdby, createddate, modifiedby, modifieddate, ipaddress, isdeleted,
                       companyid,
                       CASE
                           WHEN modifieddate IS NULL THEN createddate
                           WHEN createddate > modifieddate THEN createddate
                           ELSE modifieddate
                       END as maxdate
                FROM paymenttype
                WHERE (createddate > ? OR modifieddate > ?)
                AND isdeleted = 0
            `;

            const rows = await db.getResults(query, [modifiedDate, modifiedDate]);
            return normalizeRows(rows);
        } catch (error) {
            winston.error(`Error in getPaymentType: ${error.message}`, {
                source: "sync.model.js",
                function: "getPaymentType",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            throw error;
        }
    },

    async getPlanMaster(modifiedDate) {
        try {
            const query = `
                SELECT planid, planname, duration, description, price, isactive, startdate,
                       enddate, amc_charges, frequency, is_trial, created_at, updated_at,
                       CASE
                           WHEN updated_at IS NULL THEN created_at
                           WHEN created_at > updated_at THEN created_at
                           ELSE updated_at
                       END as maxdate
                FROM plan_master
                WHERE (created_at > ? OR updated_at > ?)
            `;

            const rows = await db.getResults(query, [modifiedDate, modifiedDate]);
            return normalizeRows(rows);
        } catch (error) {
            winston.error(`Error in getPlanMaster: ${error.message}`, {
                source: "sync.model.js",
                function: "getPlanMaster",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            throw error;
        }
    },

    async getPlanDetails(modifiedDate) {
        try {
            const query = `
                SELECT plandetailid, planid, particularid, limitation, description,
                       created_at, updated_at,
                       CASE
                           WHEN updated_at IS NULL THEN created_at
                           WHEN created_at > updated_at THEN created_at
                           ELSE updated_at
                       END as maxdate
                FROM plan_details
                WHERE (created_at > ? OR updated_at > ?)
            `;

            const rows = await db.getResults(query, [modifiedDate, modifiedDate]);
            return normalizeRows(rows);
        } catch (error) {
            winston.error(`Error in getPlanDetails: ${error.message}`, {
                source: "sync.model.js",
                function: "getPlanDetails",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            throw error;
        }
    },

    async getAddons(modifiedDate) {
        try {
            const query = `
                SELECT addonid, addonname, description, limitation, isactive, duration,
                       particularid, price, created_at, updated_at,
                       CASE
                           WHEN updated_at IS NULL THEN created_at
                           WHEN created_at > updated_at THEN created_at
                           ELSE updated_at
                       END as maxdate
                FROM addons
                WHERE (created_at > ? OR updated_at > ?)
            `;

            const rows = await db.getResults(query, [modifiedDate, modifiedDate]);
            return normalizeRows(rows);
        } catch (error) {
            winston.error(`Error in getAddons: ${error.message}`, {
                source: "sync.model.js",
                function: "getAddons",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            throw error;
        }
    },

    async getItems(params) {
        try {
            const result = {
                masterCategories: [],
                categories: [],
                subCategories: [],
                items: [],
                totalRecords: 0,
                totalPages: 0,
                currentPage: 1,
            };

            const {
                mastercategoryids = [],
                categoryids = [],
                subcategoryids = [],
                brandids = [],
                start = 0,
                length = 20,
                search = "",
            } = params;

            // Handle master category IDs - only get child categories if no specific categories are requested
            if (mastercategoryids.length > 0 && categoryids.length === 0) {
                const placeholders = mastercategoryids.map(() => "?").join(",");

                // Get direct child categories (categories that have mastercategoryid as parent)
                const catQuery = `
                    SELECT DISTINCT itemcategoryid, itemcategoryname, parentcategoryid, itemcategorydesc, 
                           itemcategoryimage, displayname, gujratiname, itemcategoryorder
                    FROM itemcategorymaster
                    WHERE isdeleted = 0
                      AND parentcategoryid IN (${placeholders})
                `;
                const masterCategories = await db.getResults(catQuery, mastercategoryids);
                result.categories = masterCategories || [];

                // Get subcategories (children of the categories found above)
                if (masterCategories && masterCategories.length > 0) {
                    const categoryIds = masterCategories.map((c) => c.itemcategoryid);
                    const catPlaceholders = categoryIds.map(() => "?").join(",");

                    const subCatQuery = `
                        SELECT DISTINCT itemcategoryid, itemcategoryname, parentcategoryid, itemcategorydesc,
                               itemcategoryimage, displayname, gujratiname, itemcategoryorder
                        FROM itemcategorymaster
                        WHERE isdeleted = 0
                          AND parentcategoryid IN (${catPlaceholders})
                    `;
                    const subCategories = await db.getResults(subCatQuery, categoryIds);
                    result.subCategories = subCategories || [];
                }
            }

            // Handle category IDs - only return the specific categories requested
            if (categoryids.length > 0) {
                const placeholders = categoryids.map(() => "?").join(",");

                // Return ONLY the selected categories themselves
                const catQuery = `
                    SELECT DISTINCT itemcategoryid, itemcategoryname, parentcategoryid, itemcategorydesc,
                           itemcategoryimage, displayname, gujratiname, itemcategoryorder
                    FROM itemcategorymaster
                    WHERE isdeleted = 0
                      AND itemcategoryid IN (${placeholders})
                `;
                const categories = await db.getResults(catQuery, categoryids);
                result.categories = categories || [];

                // Only get child subcategories if no specific subcategories are requested
                if (subcategoryids.length === 0) {
                    const subCatQuery = `
                        SELECT DISTINCT itemcategoryid, itemcategoryname, parentcategoryid, itemcategorydesc,
                               itemcategoryimage, displayname, gujratiname, itemcategoryorder
                        FROM itemcategorymaster
                        WHERE isdeleted = 0
                          AND parentcategoryid IN (${placeholders})
                    `;
                    const subCategories = await db.getResults(subCatQuery, categoryids);
                    result.subCategories = subCategories || [];
                }
            }

            // Handle subcategory IDs - return ONLY the specific subcategories requested
            if (subcategoryids.length > 0) {
                const placeholders = subcategoryids.map(() => "?").join(",");

                // Return ONLY the selected subcategories themselves
                const subCatQuery = `
                    SELECT DISTINCT itemcategoryid, itemcategoryname, parentcategoryid, itemcategorydesc,
                           itemcategoryimage, displayname, gujratiname, itemcategoryorder
                    FROM itemcategorymaster
                    WHERE isdeleted = 0
                      AND itemcategoryid IN (${placeholders})
                `;
                const subCategories = await db.getResults(subCatQuery, subcategoryids);
                result.subCategories = subCategories || [];
            }

            // Items are fetched for all scenarios

            let itemConditions = [];
            let itemParams = [];

            if (subcategoryids.length > 0) {
                itemConditions.push(
                    `im.subcategoryid IN (${subcategoryids.map(() => "?").join(",")})`
                );
                itemParams.push(...subcategoryids);
            } else if (categoryids.length > 0) {
                itemConditions.push(`im.categoryid IN (${categoryids.map(() => "?").join(",")})`);
                itemParams.push(...categoryids);
            } else if (mastercategoryids.length > 0) {
                itemConditions.push(
                    `im.mastercategoryid IN (${mastercategoryids.map(() => "?").join(",")})`
                );
                itemParams.push(...mastercategoryids);
            }

            // Additional filter for brandids - this is an AND condition, not OR like categories
            let brandCondition = "";
            if (brandids.length > 0) {
                brandCondition = `AND im.brandid IN (${brandids.map(() => "?").join(",")})`;
            }

            if (itemConditions.length > 0) {
                // Add brandids to parameters if provided
                if (brandids.length > 0) {
                    itemParams.push(...brandids);
                }

                // Build search condition
                let searchCondition = "";
                if (search) {
                    searchCondition = `
                        AND (im.itemname LIKE ? 
                        OR im.itemdisplayname LIKE ? 
                        OR im.itembarcode LIKE ?
                        OR im.genericname LIKE ?)
                    `;
                    itemParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
                }

                // Count total records for pagination
                const countQuery = `
                    SELECT COUNT(*) as total
                    FROM itemmaster AS im
                    WHERE im.isdeleted = 0
                      AND im.isapproved = 1
                      AND im.isglobal = 1
                      AND (${itemConditions.join(" OR ")})
                      ${brandCondition}
                      ${searchCondition}
                `;


                const countResult = await db.getResults(countQuery, itemParams);
                const totalRecords = countResult[0]?.total || 0;

                // Get paginated items
                const itemQuery = `
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
                      AND (${itemConditions.join(" OR ")})
                      ${brandCondition}
                      ${searchCondition}
                    ORDER BY im.itemname ASC
                `;

                // itemParams.push(start, length);
                const items = await db.getResults(itemQuery, itemParams);

                result.items = items || [];
                result.totalRecords = totalRecords;
                result.totalPages = Math.ceil(totalRecords / length);
                result.currentPage = Math.floor(start / length) + 1;
            }

            return result;
        } catch (error) {
            winston.error(`Error in getItemDetails: ${error.message}`, {
                source: "sync.model.js",
                function: "getItems",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            throw error;
        }
    },
};
