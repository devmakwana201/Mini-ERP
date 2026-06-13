const db = require("../../../config/db");
const moment = require("moment");
const winston = require("../../../config/winston");

// Static rejection reasons for brands
const REJECTION_REASONS = [
    { id: 1, reason: "Duplicate Brand" },
    { id: 2, reason: "Invalid/Incorrect Data" },
    { id: 3, reason: "Incomplete Information" },
    { id: 4, reason: "Not Relevant for Business" },
    { id: 5, reason: "Other" },
];

module.exports = {
    /**
     * Get static rejection reasons for brands
     */
    getRejectionReasons: async () => {
        return {
            status: 200,
            success: 1,
            data: REJECTION_REASONS,
        };
    },
    /**
     * Check if brand exists by name
     */
    checkBrandExists: async (brandname, excludeId = null) => {
        try {
            let sql = `SELECT brandid FROM brandmaster WHERE LOWER(brandname) = LOWER(?) AND isdeleted = 0`;
            const params = [brandname];

            if (excludeId) {
                sql += ` AND brandid != ?`;
                params.push(excludeId);
            }

            const res = await db.getResults(sql, params);
            return res && res.length > 0;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get brands with pagination and filtering
     */
    getBrands: async (req) => {
        const {
            start = 0,
            length = 10,
            filters,
            sortField = "brandid",
            sortOrder = "desc",
        } = req.query;

        let sql = `
            SELECT brandid, brandname, branddesc, brandcategory, brandicon, companyid, isapproved, approvalremark, replacewith, createdby, createddate, modifiedby, modifieddate, isdeleted, ipaddress, uniquekey, issync
            FROM brandmaster
            WHERE isdeleted = 0 AND isapproved = 1
        `;

        const params = [];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "brand.model.js",
                    function: "getBrands",
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Apply filters
        const filterFields = ["brandname", "branddesc"];
        filterFields.forEach((field) => {
            const value = getFilterValue(field);
            if (value) {
                sql += ` AND ${field} LIKE ?`;
                params.push(`%${value}%`);
            }
        });

        // Company filter
        const companyid = getFilterValue("companyid");
        if (companyid) {
            sql += ` AND companyid = ?`;
            params.push(companyid);
        }

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (brandname LIKE ? OR branddesc LIKE ?)`;
            const g = `%${global}%`;
            params.push(g, g);
        }

        // Sorting
        const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";
        sql += ` ORDER BY ${sortField} ${order}`;

        // Pagination using start and length
        const startNum = parseInt(start);
        const lengthNum = parseInt(length);

        if (lengthNum !== -1) {
            sql += ` LIMIT ?, ?`;
            params.push(startNum, lengthNum);
        }

        const data = await db.getResults(sql, params);

        // Count total records
        let countSql = `SELECT COUNT(*) as total FROM brandmaster WHERE isdeleted = 0`;
        let countParams = [];

        // Apply same filters for count
        filterFields.forEach((field) => {
            const value = getFilterValue(field);
            if (value) {
                countSql += ` AND ${field} LIKE ?`;
                countParams.push(`%${value}%`);
            }
        });

        if (companyid) {
            countSql += ` AND companyid = ?`;
            countParams.push(companyid);
        }

        if (global) {
            countSql += ` AND (brandname LIKE ? OR branddesc LIKE ?)`;
            const g = `%${global}%`;
            countParams.push(g, g);
        }

        const totalResult = await db.getResults(countSql, countParams);
        const totalRecords = totalResult[0]?.total || 0;
        const totalPages = Math.ceil(totalRecords / lengthNum);

        return {
            data,
            pagination: {
                start: startNum,
                length: lengthNum,
                total: totalRecords,
                totalPages,
            },
        };
    },

    /**
     * Get brand data by ID
     */
    getData: async (id) => {
        const sql = `SELECT brandid, brandname, branddesc, brandcategory, brandicon, companyid, isapproved, approvalremark, replacewith, createdby, createddate, modifiedby, modifieddate, ipaddress, uniquekey, issync FROM brandmaster WHERE brandid = ? AND isdeleted = 0`;
        const results = await db.getResults(sql, [id]);

        if (results.length === 0) return [];

        return results;
    },

    /**
     * Create new brand
     */
    create: async (data) => {
        try {
            // Generate unique key (10 digit unix timestamp + 5 digit random)
            const timestamp = Math.floor(Date.now() / 1000);
            const random = Math.floor(10000 + Math.random() * 90000);
            data.uniquekey = parseInt(`${timestamp}${random}`);

            // Add timestamps
            data.createddate = moment().format("YYYY-MM-DD HH:mm:ss");
            data.modifieddate = moment().format("YYYY-MM-DD HH:mm:ss");

            // Set defaults
            data.isdeleted = 0;
            data.issync = 0;
            data.isapproved = data.isapproved || 1;

            const result = await db.insert("brandmaster", data);
            if (!result.insertId) {
                return { status: 500, success: 0, msg: "Failed to create brand" };
            }

            return {
                status: 201,
                success: 1,
                msg: "Brand created successfully",
                data: { brandid: result.insertId, ...data },
            };
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY") {
                return { status: 409, success: 0, msg: "Brand with this name already exists" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Update brand
     */
    update: async (id, data) => {
        try {
            // Add modified timestamp
            data.modifieddate = moment().format("YYYY-MM-DD HH:mm:ss");

            const result = await db.update(
                "brandmaster",
                Object.keys(data).map((key) => ({ column: key, value: data[key] })),
                [
                    { column: "brandid", value: id },
                    { column: "isdeleted", value: 0 },
                ]
            );
            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "Brand not found" };
            }

            return {
                status: 200,
                success: 1,
                msg: "Brand updated successfully",
                data: { brandid: id, ...data },
            };
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY") {
                return { status: 409, success: 0, msg: "Brand name already exists" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Soft delete brand
     */
    delete: async (id, data) => {
        try {
            const result = await db.update(
                "brandmaster",
                Object.keys(data).map((key) => ({ column: key, value: data[key] })),
                [{ column: "brandid", value: id }]
            );
            if (!result.affectedRows) {
                return { status: 500, success: 0, msg: "Brand not found" };
            }
            return { status: 200, success: 1, msg: "Brand deleted successfully" };
        } catch (error) {
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Get brands by company
     */
    getBrandsByCompany: async (companyid) => {
        try {
            const sql = `SELECT brandid, brandname, branddesc, brandicon, isapproved FROM brandmaster WHERE companyid = ? AND isdeleted = 0 ORDER BY brandname ASC`;
            return await db.getResults(sql, [companyid]);
        } catch (error) {
            winston.error(`Error getting brands by company: ${error.message}`, {
                source: "brand.model.js",
                function: "getBrandsByCompany",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                companyid: companyid,
            });
            return [];
        }
    },

    getBrand: async (companyid) => {
        try {
            const sql = `SELECT brandid as id, brandname as name FROM brandmaster WHERE isdeleted = 0 ORDER BY brandname ASC`;
            return await db.getResults(sql);
        } catch (error) {
            winston.error(`Error getting brands: ${error.message}`, {
                source: "brand.model.js",
                function: "getBrand",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            return [];
        }
    },

    /**
     * Get unapproved brands with optional company filter
     * Joins with itemcategorymaster to get category names
     */
    getUnapprovedBrands: async (req) => {
        const {
            start = 0,
            length = 10,
            filters,
            sortField = "createddate",
            sortOrder = "desc",
            companyid,
        } = req.query;

        // Helper function to get category names from IDs
        const getCategoryNames = (categoryIds) => {
            if (!categoryIds) return null;
            const ids = categoryIds
                .split(",")
                .map((id) => id.trim())
                .filter((id) => id);
            if (ids.length === 0) return null;

            const placeholders = ids.map(() => "?").join(",");
            return { ids, placeholders };
        };

        let sql = `
            SELECT b.brandid, b.brandname, b.branddesc, b.brandcategory, b.brandicon, b.companyid,
                   b.isapproved, b.approvalremark, b.replacewith, b.createdby, b.createddate,
                   b.modifiedby, b.modifieddate, b.isdeleted, b.ipaddress, b.uniquekey, b.issync,
                   GROUP_CONCAT(DISTINCT ic.itemcategoryname ORDER BY ic.itemcategoryid SEPARATOR ', ') as categorynames
            FROM brandmaster b
            LEFT JOIN itemcategorymaster ic ON FIND_IN_SET(ic.itemcategoryid, REPLACE(b.brandcategory, ' ', ''))
            WHERE b.isdeleted = 0 AND b.isapproved = 0 AND b.issync = 1
        `;

        const params = [];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "brand.model.js",
                    function: "getUnapprovedBrands",
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Company filter
        if (companyid) {
            sql += ` AND b.companyid = ?`;
            params.push(companyid);
        }

        // Apply filters - add table alias 'b.' for brand fields
        const filterFields = ["brandname", "branddesc"];
        filterFields.forEach((field) => {
            const value = getFilterValue(field);
            if (value) {
                sql += ` AND b.${field} LIKE ?`;
                params.push(`%${value}%`);
            }
        });

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (b.brandname LIKE ? OR b.branddesc LIKE ?)`;
            const g = `%${global}%`;
            params.push(g, g);
        }

        // Group by for GROUP_CONCAT
        sql += ` GROUP BY b.brandid`;

        // Sorting - add table alias 'b.'
        const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";
        sql += ` ORDER BY b.${sortField} ${order}`;

        // Pagination using start and length
        const startNum = parseInt(start);
        const lengthNum = parseInt(length);

        if (lengthNum !== -1) {
            sql += ` LIMIT ?, ?`;
            params.push(startNum, lengthNum);
        }

        const data = await db.getResults(sql, params);

        // For each unapproved brand, fetch similar brands
        for (let brand of data) {
            const similarBrandsSql = `
                SELECT similar.brandid, similar.brandname, similar.branddesc, similar.brandicon,
                       similar.companyid, comp.companyname,
                       similar.isapproved,
                       GROUP_CONCAT(DISTINCT ic.itemcategoryname ORDER BY ic.itemcategoryid SEPARATOR ', ') as categorynames,
                       CASE
                           WHEN LOWER(similar.brandname) = LOWER(?) THEN 'exact'
                           WHEN LOWER(similar.brandname) LIKE CONCAT('%', LOWER(?), '%') OR LOWER(?) LIKE CONCAT('%', LOWER(similar.brandname), '%') THEN 'partial'
                           ELSE 'other'
                       END AS match_type
                FROM brandmaster similar
                LEFT JOIN companymaster comp ON similar.companyid = comp.companyid AND comp.isdeleted = 0
                LEFT JOIN itemcategorymaster ic ON FIND_IN_SET(ic.itemcategoryid, REPLACE(similar.brandcategory, ' ', ''))
                WHERE similar.isdeleted = 0 AND similar.isapproved = 1
                AND similar.brandid != ?
                AND (
                    LOWER(similar.brandname) = LOWER(?)
                    OR LOWER(similar.brandname) LIKE CONCAT('%', LOWER(?), '%')
                    OR LOWER(?) LIKE CONCAT('%', LOWER(similar.brandname), '%')
                )
                GROUP BY similar.brandid
                ORDER BY match_type ASC, similar.isapproved DESC, similar.createddate DESC
                LIMIT 10
            `;

            const similarParams = [
                brand.brandname, // For CASE WHEN exact match
                brand.brandname,
                brand.brandname, // For CASE WHEN partial match
                brand.brandid, // For != condition
                brand.brandname, // For WHERE exact match
                brand.brandname,
                brand.brandname, // For WHERE partial matches
            ];

            const similarBrands = await db.getResults(similarBrandsSql, similarParams);
            brand.similar_brands = similarBrands || [];
            brand.similar_brands_count = similarBrands?.length || 0;
        }

        // Count total records
        let countSql = `SELECT COUNT(DISTINCT b.brandid) as total FROM brandmaster b WHERE b.isdeleted = 0 AND b.isapproved = 0 AND b.issync = 1`;
        let countParams = [];

        if (companyid) {
            countSql += ` AND b.companyid = ?`;
            countParams.push(companyid);
        }

        // Apply same filters for count
        filterFields.forEach((field) => {
            const value = getFilterValue(field);
            if (value) {
                countSql += ` AND b.${field} LIKE ?`;
                countParams.push(`%${value}%`);
            }
        });

        if (global) {
            countSql += ` AND (b.brandname LIKE ? OR b.branddesc LIKE ?)`;
            const g = `%${global}%`;
            countParams.push(g, g);
        }

        const totalResult = await db.getResults(countSql, countParams);
        const totalRecords = totalResult[0]?.total || 0;
        const totalPages = Math.ceil(totalRecords / lengthNum);

        return {
            data,
            pagination: {
                start: startNum,
                length: lengthNum,
                total: totalRecords,
                totalPages,
            },
        };
    },

    /**
     * Approve a single brand - creates company_brandmaster mapping
     */
    approveBrand: async (brandid, approvalData) => {
        try {
            const { approvedby, approvalremark } = approvalData;

            // First, get brand details to know which company created it
            const brandDetails = await db.getResults(
                `SELECT brandid, companyid, uniquekey FROM brandmaster WHERE brandid = ? AND isdeleted = 0`,
                [brandid]
            );

            if (!brandDetails || brandDetails.length === 0) {
                return { status: 404, success: 0, msg: "Brand not found" };
            }

            const brand = brandDetails[0];

            // Update brandmaster to approve
            const result = await db.update(
                "brandmaster",
                [
                    { column: "isapproved", value: 1 },
                    { column: "approvalremark", value: approvalremark || "Approved" },
                    { column: "modifiedby", value: approvedby },
                    { column: "modifieddate", value: moment().format("YYYY-MM-DD HH:mm:ss") },
                ],
                [
                    { column: "brandid", value: brandid },
                    { column: "isdeleted", value: 0 },
                ]
            );

            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "Brand not found" };
            }

            // Create company_brandmaster mapping for the originating company
            const existingMapping = await db.getResults(
                `SELECT id FROM company_brandmaster WHERE companyid = ? AND brandid = ? AND isdeleted = 0`,
                [brand.companyid, brandid]
            );

            const currDate = moment().format("YYYY-MM-DD HH:mm:ss");

            if (existingMapping && existingMapping.length > 0) {
                // Update existing mapping
                await db.update(
                    "company_brandmaster",
                    [
                        { column: "isactive", value: 1 },
                        { column: "modifiedby", value: approvedby },
                        { column: "modifieddate", value: currDate },
                    ],
                    [
                        { column: "companyid", value: brand.companyid },
                        { column: "brandid", value: brandid },
                    ]
                );
            } else {
                // Create new mapping
                await db.insert("company_brandmaster", [
                    { column: "companyid", value: brand.companyid },
                    { column: "brandid", value: brandid },
                    { column: "uniquekey", value: brand.uniquekey },
                    { column: "isactive", value: 1 },
                    { column: "issync", value: 1 },
                    { column: "lastsyncdate", value: currDate },
                    { column: "createdby", value: approvedby },
                    { column: "createddate", value: currDate },
                    { column: "modifiedby", value: approvedby },
                    { column: "modifieddate", value: currDate },
                    { column: "isdeleted", value: 0 },
                ]);
            }

            winston.info("Brand approved and mapped to company", {
                source: "brand.model.js",
                function: "approveBrand",
                brandid,
                companyid: brand.companyid,
            });

            return {
                status: 200,
                success: 1,
                msg: "Brand approved successfully and mapped to company",
                data: { brandid, companyid: brand.companyid },
            };
        } catch (error) {
            winston.error(`Error approving brand: ${error.message}`, {
                source: "brand.model.js",
                function: "approveBrand",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                brandid: brandid,
            });
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Reject a single brand
     * - "Duplicate Brand" → Soft delete brand and map original brand to company_brandmaster
     * - Other reasons → Keep as company-specific and map to company_brandmaster
     */
    rejectBrand: async (brandid, rejectionData) => {
        try {
            const { rejectedby, rejectionreason, rejectionremark, replacewith } = rejectionData;

            // Validate rejection reason against static list
            const validReasons = REJECTION_REASONS.map((r) => r.reason);
            if (rejectionreason && !validReasons.includes(rejectionreason)) {
                return {
                    status: 400,
                    success: 0,
                    msg: `Invalid rejection reason. Must be one of: ${validReasons.join(", ")}`,
                };
            }

            // Get brand details
            const brandDetails = await db.getResults(
                `SELECT brandid, companyid, uniquekey, brandname FROM brandmaster WHERE brandid = ?`,
                [brandid]
            );

            if (!brandDetails || brandDetails.length === 0) {
                return { status: 404, success: 0, msg: "Brand not found" };
            }

            const brand = brandDetails[0];
            const isDuplicate = rejectionreason === "Duplicate Brand";
            const currDate = moment().format("YYYY-MM-DD HH:mm:ss");

            let result;
            let originalBrand = null;

            if (isDuplicate) {
                // For duplicates: Use the selected master brand (replacewith) or find original/similar brand
                if (replacewith) {
                    // Use the brand ID selected by support team
                    const selectedBrand = await db.getResults(
                        `SELECT brandid, brandname, uniquekey FROM brandmaster WHERE brandid = ? AND isdeleted = 0 AND isapproved = 1`,
                        [replacewith]
                    );

                    if (selectedBrand && selectedBrand.length > 0) {
                        originalBrand = selectedBrand[0];
                    }
                } else {
                    // Fallback: Auto-find the original/similar brand to map instead
                    const similarBrandSql = `
                        SELECT brandid, brandname, uniquekey
                        FROM brandmaster
                        WHERE isdeleted = 0
                          AND isapproved = 1
                          AND brandid != ?
                          AND LOWER(brandname) = LOWER(?)
                        ORDER BY createddate ASC
                        LIMIT 1
                    `;

                    const similarBrands = await db.getResults(similarBrandSql, [
                        brandid,
                        brand.brandname,
                    ]);

                    if (similarBrands && similarBrands.length > 0) {
                        originalBrand = similarBrands[0];
                    }
                }

                // Soft delete the duplicate brand
                result = await db.update(
                    "brandmaster",
                    [
                        { column: "isdeleted", value: 1 },
                        { column: "rejectionreason", value: rejectionreason },
                        {
                            column: "approvalremark",
                            value: rejectionremark || "Rejected as duplicate",
                        },
                        { column: "modifiedby", value: rejectedby },
                        { column: "modifieddate", value: currDate },
                    ],
                    [{ column: "brandid", value: brandid }]
                );

                // Map the ORIGINAL brand to company_brandmaster if found
                if (originalBrand) {
                    const existingMapping = await db.getResults(
                        `SELECT id FROM company_brandmaster WHERE companyid = ? AND brandid = ? AND isdeleted = 0`,
                        [brand.companyid, originalBrand.brandid]
                    );

                    if (existingMapping && existingMapping.length > 0) {
                        await db.update(
                            "company_brandmaster",
                            [
                                { column: "isactive", value: 1 },
                                { column: "modifiedby", value: rejectedby },
                                { column: "modifieddate", value: currDate },
                            ],
                            [
                                { column: "companyid", value: brand.companyid },
                                { column: "brandid", value: originalBrand.brandid },
                            ]
                        );
                    } else {
                        await db.insert("company_brandmaster", [
                            { column: "companyid", value: brand.companyid },
                            { column: "brandid", value: originalBrand.brandid },
                            { column: "uniquekey", value: brand.uniquekey }, // Keep POS uniquekey for sync
                            { column: "isactive", value: 1 },
                            { column: "issync", value: 1 },
                            { column: "lastsyncdate", value: currDate },
                            { column: "createdby", value: rejectedby },
                            { column: "createddate", value: currDate },
                            { column: "modifiedby", value: rejectedby },
                            { column: "modifieddate", value: currDate },
                            { column: "isdeleted", value: 0 },
                        ]);
                    }

                    winston.info("Duplicate brand rejected and original brand mapped to company", {
                        source: "brand.model.js",
                        function: "rejectBrand",
                        duplicateBrandid: brandid,
                        originalBrandid: originalBrand.brandid,
                        companyid: brand.companyid,
                    });
                }
            } else {
                // For other reasons: Keep as company-specific (not global)
                result = await db.update(
                    "brandmaster",
                    [
                        { column: "isapproved", value: 0 }, // Keep unapproved
                        { column: "rejectionreason", value: rejectionreason },
                        {
                            column: "approvalremark",
                            value: rejectionremark || "Kept as company-specific",
                        },
                        { column: "modifiedby", value: rejectedby },
                        { column: "modifieddate", value: currDate },
                    ],
                    [{ column: "brandid", value: brandid }]
                );

                // Map the rejected brand to company_brandmaster (company-specific)
                const existingMapping = await db.getResults(
                    `SELECT id FROM company_brandmaster WHERE companyid = ? AND brandid = ? AND isdeleted = 0`,
                    [brand.companyid, brandid]
                );

                if (existingMapping && existingMapping.length > 0) {
                    await db.update(
                        "company_brandmaster",
                        [
                            { column: "isactive", value: 1 },
                            { column: "modifiedby", value: rejectedby },
                            { column: "modifieddate", value: currDate },
                        ],
                        [
                            { column: "companyid", value: brand.companyid },
                            { column: "brandid", value: brandid },
                        ]
                    );
                } else {
                    await db.insert("company_brandmaster", [
                        { column: "companyid", value: brand.companyid },
                        { column: "brandid", value: brandid },
                        { column: "uniquekey", value: brand.uniquekey },
                        { column: "isactive", value: 1 },
                        { column: "issync", value: 1 },
                        { column: "lastsyncdate", value: currDate },
                        { column: "createdby", value: rejectedby },
                        { column: "createddate", value: currDate },
                        { column: "modifiedby", value: rejectedby },
                        { column: "modifieddate", value: currDate },
                        { column: "isdeleted", value: 0 },
                    ]);
                }

                winston.info("Brand kept as company-specific and mapped to company", {
                    source: "brand.model.js",
                    function: "rejectBrand",
                    brandid,
                    companyid: brand.companyid,
                });
            }

            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "Brand not found" };
            }

            return {
                status: 200,
                success: 1,
                msg: isDuplicate
                    ? "Brand rejected as duplicate and original brand mapped"
                    : "Brand kept as company-specific and mapped",
                data: {
                    brandid,
                    isDuplicate,
                    action: isDuplicate ? "deleted" : "company_specific",
                    originalBrand: originalBrand
                        ? {
                              brandid: originalBrand.brandid,
                              brandname: originalBrand.brandname,
                          }
                        : null,
                    companyid: brand.companyid,
                },
            };
        } catch (error) {
            winston.error(`Error rejecting brand: ${error.message}`, {
                source: "brand.model.js",
                function: "rejectBrand",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                brandid: brandid,
            });
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Bulk approve brands and create company_brandmaster mappings
     */
    bulkApproveBrands: async (brandids, approvalData) => {
        try {
            const { approvedby, approvalremark } = approvalData;
            const currDate = moment().format("YYYY-MM-DD HH:mm:ss");

            // Get brand details for all brands to be approved
            const placeholders = brandids.map(() => "?").join(",");
            const brandDetails = await db.getResults(
                `SELECT brandid, companyid, uniquekey FROM brandmaster WHERE brandid IN (${placeholders}) AND isdeleted = 0`,
                brandids
            );

            if (!brandDetails || brandDetails.length === 0) {
                return { status: 404, success: 0, msg: "No brands found to approve" };
            }

            // Update brandmaster for all brands
            const sql = `
                UPDATE brandmaster
                SET isapproved = 1,
                    approvalremark = ?,
                    modifiedby = ?,
                    modifieddate = ?
                WHERE brandid IN (${placeholders}) AND isdeleted = 0
            `;

            const params = [approvalremark || "Bulk approved", approvedby, currDate, ...brandids];

            const result = await db.executeQuery(sql, params);

            // Create company_brandmaster mappings for each brand
            let mappedCount = 0;
            for (const brand of brandDetails) {
                try {
                    const existingMapping = await db.getResults(
                        `SELECT id FROM company_brandmaster WHERE companyid = ? AND brandid = ? AND isdeleted = 0`,
                        [brand.companyid, brand.brandid]
                    );

                    if (existingMapping && existingMapping.length > 0) {
                        await db.update(
                            "company_brandmaster",
                            [
                                { column: "isactive", value: 1 },
                                { column: "modifiedby", value: approvedby },
                                { column: "modifieddate", value: currDate },
                            ],
                            [
                                { column: "companyid", value: brand.companyid },
                                { column: "brandid", value: brand.brandid },
                            ]
                        );
                    } else {
                        await db.insert("company_brandmaster", [
                            { column: "companyid", value: brand.companyid },
                            { column: "brandid", value: brand.brandid },
                            { column: "uniquekey", value: brand.uniquekey },
                            { column: "isactive", value: 1 },
                            { column: "issync", value: 1 },
                            { column: "lastsyncdate", value: currDate },
                            { column: "createdby", value: approvedby },
                            { column: "createddate", value: currDate },
                            { column: "modifiedby", value: approvedby },
                            { column: "modifieddate", value: currDate },
                            { column: "isdeleted", value: 0 },
                        ]);
                    }
                    mappedCount++;
                } catch (mappingError) {
                    winston.error(
                        `Error mapping brand ${brand.brandid} to company ${brand.companyid}`,
                        {
                            source: "brand.model.js",
                            function: "bulkApproveBrands",
                            error: mappingError.message,
                        }
                    );
                }
            }

            winston.info("Bulk brands approved and mapped to companies", {
                source: "brand.model.js",
                function: "bulkApproveBrands",
                approvedCount: result.affectedRows,
                mappedCount,
            });

            return {
                status: 200,
                success: 1,
                msg: `${result.affectedRows} brand(s) approved and ${mappedCount} mapped successfully`,
                data: { approved: result.affectedRows, mapped: mappedCount },
            };
        } catch (error) {
            winston.error(`Error bulk approving brands: ${error.message}`, {
                source: "brand.model.js",
                function: "bulkApproveBrands",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                brandids: brandids,
            });
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Bulk reject brands - handles both duplicate and company-specific flows
     */
    bulkRejectBrands: async (brandids, rejectionData) => {
        try {
            const { rejectedby, rejectionreason, rejectionremark } = rejectionData;

            // Validate rejection reason against static list
            const validReasons = REJECTION_REASONS.map((r) => r.reason);
            if (rejectionreason && !validReasons.includes(rejectionreason)) {
                return {
                    status: 400,
                    success: 0,
                    msg: `Invalid rejection reason. Must be one of: ${validReasons.join(", ")}`,
                };
            }

            const currDate = moment().format("YYYY-MM-DD HH:mm:ss");
            const isDuplicate = rejectionreason === "Duplicate Brand";

            // Get brand details for all brands to be rejected
            const placeholders = brandids.map(() => "?").join(",");
            const brandDetails = await db.getResults(
                `SELECT brandid, companyid, uniquekey, brandname
                 FROM brandmaster
                 WHERE brandid IN (${placeholders})`,
                brandids
            );

            if (!brandDetails || brandDetails.length === 0) {
                return { status: 404, success: 0, msg: "No brands found to reject" };
            }

            // Update brandmaster based on rejection type
            let sql, params;
            if (isDuplicate) {
                // For duplicates: Soft delete
                sql = `
                    UPDATE brandmaster
                    SET isdeleted = 1,
                        rejectionreason = ?,
                        approvalremark = ?,
                        modifiedby = ?,
                        modifieddate = ?
                    WHERE brandid IN (${placeholders})
                `;
                params = [
                    rejectionreason,
                    rejectionremark || "Bulk rejected as duplicate",
                    rejectedby,
                    currDate,
                    ...brandids,
                ];
            } else {
                // For other reasons: Keep as company-specific
                sql = `
                    UPDATE brandmaster
                    SET isapproved = 0,
                        rejectionreason = ?,
                        approvalremark = ?,
                        modifiedby = ?,
                        modifieddate = ?
                    WHERE brandid IN (${placeholders})
                `;
                params = [
                    rejectionreason,
                    rejectionremark || "Kept as company-specific",
                    rejectedby,
                    currDate,
                    ...brandids,
                ];
            }

            const result = await db.executeQuery(sql, params);

            // Create company_brandmaster mappings
            let mappedCount = 0;
            for (const brand of brandDetails) {
                try {
                    if (isDuplicate) {
                        // Find and map original brand for duplicates
                        const similarBrandSql = `
                            SELECT brandid, brandname, uniquekey
                            FROM brandmaster
                            WHERE isdeleted = 0
                              AND isapproved = 1
                              AND brandid != ?
                              AND LOWER(brandname) = LOWER(?)
                            ORDER BY createddate ASC
                            LIMIT 1
                        `;

                        const similarBrands = await db.getResults(similarBrandSql, [
                            brand.brandid,
                            brand.brandname,
                        ]);

                        if (similarBrands && similarBrands.length > 0) {
                            const originalBrand = similarBrands[0];

                            // Check if mapping already exists
                            const existingMapping = await db.getResults(
                                `SELECT id FROM company_brandmaster
                                 WHERE companyid = ? AND brandid = ? AND isdeleted = 0`,
                                [brand.companyid, originalBrand.brandid]
                            );

                            if (existingMapping && existingMapping.length > 0) {
                                // Update existing mapping
                                await db.update(
                                    "company_brandmaster",
                                    [
                                        { column: "isactive", value: 1 },
                                        { column: "modifiedby", value: rejectedby },
                                        { column: "modifieddate", value: currDate },
                                    ],
                                    [
                                        { column: "companyid", value: brand.companyid },
                                        { column: "brandid", value: originalBrand.brandid },
                                    ]
                                );
                            } else {
                                // Create new mapping with original brand
                                await db.insert("company_brandmaster", [
                                    { column: "companyid", value: brand.companyid },
                                    { column: "brandid", value: originalBrand.brandid },
                                    { column: "uniquekey", value: brand.uniquekey },
                                    { column: "isactive", value: 1 },
                                    { column: "issync", value: 1 },
                                    { column: "lastsyncdate", value: currDate },
                                    { column: "createdby", value: rejectedby },
                                    { column: "createddate", value: currDate },
                                    { column: "modifiedby", value: rejectedby },
                                    { column: "modifieddate", value: currDate },
                                    { column: "isdeleted", value: 0 },
                                ]);
                            }
                            mappedCount++;
                        }
                    } else {
                        // Map the rejected brand itself for company-specific brands
                        const existingMapping = await db.getResults(
                            `SELECT id FROM company_brandmaster
                             WHERE companyid = ? AND brandid = ? AND isdeleted = 0`,
                            [brand.companyid, brand.brandid]
                        );

                        if (existingMapping && existingMapping.length > 0) {
                            // Update existing mapping
                            await db.update(
                                "company_brandmaster",
                                [
                                    { column: "isactive", value: 1 },
                                    { column: "modifiedby", value: rejectedby },
                                    { column: "modifieddate", value: currDate },
                                ],
                                [
                                    { column: "companyid", value: brand.companyid },
                                    { column: "brandid", value: brand.brandid },
                                ]
                            );
                        } else {
                            // Create new mapping
                            await db.insert("company_brandmaster", [
                                { column: "companyid", value: brand.companyid },
                                { column: "brandid", value: brand.brandid },
                                { column: "uniquekey", value: brand.uniquekey },
                                { column: "isactive", value: 1 },
                                { column: "issync", value: 1 },
                                { column: "lastsyncdate", value: currDate },
                                { column: "createdby", value: rejectedby },
                                { column: "createddate", value: currDate },
                                { column: "modifiedby", value: rejectedby },
                                { column: "modifieddate", value: currDate },
                                { column: "isdeleted", value: 0 },
                            ]);
                        }
                        mappedCount++;
                    }
                } catch (mappingError) {
                    winston.error(
                        `Error mapping brand ${brand.brandid} to company ${brand.companyid}`,
                        {
                            source: "brand.model.js",
                            function: "bulkRejectBrands",
                            error: mappingError.message,
                            brandid: brand.brandid,
                            companyid: brand.companyid,
                        }
                    );
                }
            }

            winston.info("Bulk brands rejected and mapped to companies", {
                source: "brand.model.js",
                function: "bulkRejectBrands",
                rejectedCount: result.affectedRows,
                mappedCount,
                isDuplicate,
            });

            return {
                status: 200,
                success: 1,
                msg: `${result.affectedRows} brand(s) rejected and ${mappedCount} mapped successfully`,
                data: { rejected: result.affectedRows, mapped: mappedCount },
            };
        } catch (error) {
            winston.error(`Error bulk rejecting brands: ${error.message}`, {
                source: "brand.model.js",
                function: "bulkRejectBrands",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                brandids: brandids,
            });
            return { status: 500, success: 0, msg: error.message };
        }
    },
};
