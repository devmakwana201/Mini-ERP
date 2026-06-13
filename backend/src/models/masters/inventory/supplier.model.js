const db = require("../../../config/db");
const moment = require("moment");
const winston = require("../../../config/winston");

// Static rejection reasons for supplier approval flow
const REJECTION_REASONS = [
    { id: 1, reason: 'Duplicate Supplier' },
    { id: 2, reason: 'Invalid/Incorrect Data' },
    { id: 3, reason: 'Incomplete Information' },
    { id: 4, reason: 'Not Relevant for Business' },
    { id: 5, reason: 'Other' }
];

module.exports = {
    /**
     * Check if supplier exists by name
     */
    checkSupplierExists: async (gstno, excludeId = null) => {
        try {
            let sql = `SELECT id FROM suppliermaster WHERE LOWER(gstno) = LOWER(?) AND isdeleted = 0`;
            const params = [gstno];

            if (excludeId) {
                sql += ` AND id != ?`;
                params.push(excludeId);
            }

            const res = await db.getResults(sql, params);

            return res && res.length > 0;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get suppliers with pagination and filtering
     */
    getSuppliers: async (req) => {
        const { start = 1, length = 10, filters, sortField = "id", sortOrder = "desc" } = req.query;

        let sql = `
            SELECT s.id, s.supplierid, s.suppliername, s.address, s.gstno, s.panno, s.phoneno, s.email, s.pincode, s.contactperson, 
                   s.countryid, co.countryname, s.stateid, st.statename, s.cityid, ci.cityname, s.vatno, s.supplierimage, 
                   s.outstandingamt, s.uniquekey, s.seedslicensenumber, s.seedslicensedate, s.fertilizerlicensenumber, 
                   s.fertilizerlicensedate, s.pesticideslicensenumber, s.pesticideslicensedate, s.isapproved, 
                   s.approvalremark, s.replacewith, s.createdby, s.createddate, s.modifiedby, s.modifieddate, s.ipaddress, s.isdeleted
            FROM suppliermaster s
            LEFT JOIN countrymst co ON s.countryid = co.countryid AND co.isdeleted = 0
            LEFT JOIN statemaster st ON s.stateid = st.stateid AND st.isdeleted = 0
            LEFT JOIN citymaster ci ON s.cityid = ci.cityid AND ci.isdeleted = 0
            WHERE s.isdeleted = 0 AND s.isapproved = 1
        `;

        const params = [];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "supplier.model.js",
                    function: "getSuppliers"
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Apply filters
        const filterFields = [
            "suppliername",
            "address",
            "email",
            "phoneno",
            "contactperson",
            "gstno",
            "panno",
        ];
        filterFields.forEach((field) => {
            const value = getFilterValue(field);
            if (value) {
                sql += ` AND s.${field} LIKE ?`;
                params.push(`%${value}%`);
            }
        });

        // Apply location name filters
        const locationFields = {
            countryname: "co.countryname",
            statename: "st.statename",
            cityname: "ci.cityname",
        };

        Object.entries(locationFields).forEach(([filterKey, dbField]) => {
            const value = getFilterValue(filterKey);
            if (value) {
                sql += ` AND ${dbField} LIKE ?`;
                params.push(`%${value}%`);
            }
        });

        // Approval filter
        const isapproved = getFilterValue("isapproved");
        if (isapproved !== undefined) {
            sql += ` AND s.isapproved = ?`;
            params.push(isapproved);
        }

        // Global search
        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (s.suppliername LIKE ? OR s.address LIKE ? OR s.email LIKE ? OR s.contactperson LIKE ? OR co.countryname LIKE ? OR st.statename LIKE ? OR ci.cityname LIKE ?)`;
            const g = `%${global}%`;
            params.push(g, g, g, g, g, g, g);
        }

        // Sorting - handle fields from different tables
        const sortFieldMapping = {
            countryname: "co.countryname",
            statename: "st.statename",
            cityname: "ci.cityname",
        };

        const actualSortField = sortFieldMapping[sortField] || `s.${sortField}`;
        const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";
        sql += ` ORDER BY ${actualSortField} ${order}`;

        // Pagination using start and length
        const startNum = parseInt(start);
        const lengthNum = parseInt(length);

        if (lengthNum !== -1) {
            sql += ` LIMIT ?, ?`;
            params.push(startNum, lengthNum);
        }

        const data = await db.getResults(sql, params);

        // Count total records
        let countSql = `
            SELECT COUNT(*) as total 
            FROM suppliermaster s
            LEFT JOIN countrymst co ON s.countryid = co.countryid AND co.isdeleted = 0
            LEFT JOIN statemaster st ON s.stateid = st.stateid AND st.isdeleted = 0
            LEFT JOIN citymaster ci ON s.cityid = ci.cityid AND ci.isdeleted = 0
            WHERE s.isdeleted = 0 AND s.isapproved = 1
        `;
        let countParams = [];

        // Apply same filters for count
        filterFields.forEach((field) => {
            const value = getFilterValue(field);
            if (value) {
                countSql += ` AND s.${field} LIKE ?`;
                countParams.push(`%${value}%`);
            }
        });

        // Apply location name filters for count
        Object.entries(locationFields).forEach(([filterKey, dbField]) => {
            const value = getFilterValue(filterKey);
            if (value) {
                countSql += ` AND ${dbField} LIKE ?`;
                countParams.push(`%${value}%`);
            }
        });

        if (isapproved !== undefined) {
            countSql += ` AND s.isapproved = ?`;
            countParams.push(isapproved);
        }

        if (global) {
            countSql += ` AND (s.suppliername LIKE ? OR s.address LIKE ? OR s.email LIKE ? OR s.contactperson LIKE ? OR co.countryname LIKE ? OR st.statename LIKE ? OR ci.cityname LIKE ?)`;
            const g = `%${global}%`;
            countParams.push(g, g, g, g, g, g, g);
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
     * Get supplier data by ID
     */
    getData: async (id) => {
        const sql = `
            SELECT id, supplierid, suppliername, address, gstno, panno, phoneno, email, pincode, contactperson, 
                   countryid, stateid, cityid, vatno, supplierimage, 
                   outstandingamt, uniquekey, seedslicensenumber, seedslicensedate, fertilizerlicensenumber, 
                   fertilizerlicensedate, pesticideslicensenumber, pesticideslicensedate, isapproved, 
                   approvalremark, replacewith, createdby, createddate, modifiedby, modifieddate, ipaddress
            FROM suppliermaster 
            WHERE id = ? AND isdeleted = 0
        `;
        const results = await db.getResults(sql, [id]);

        if (results.length === 0) return [];

        return results;
    },

    /**
     * Create new supplier
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
            data.isapproved = data.isapproved || 1;
            data.outstandingamt = data.outstandingamt || 0.0;

            const result = await db.insert("suppliermaster", data);
            if (!result.insertId) {
                return { status: 500, success: 0, msg: "Failed to create supplier" };
            }

            return {
                status: 201,
                success: 1,
                msg: "Supplier created successfully",
                data: { id: result.insertId, ...data }, // changed supplierid → id
            };
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY") {
                return { status: 409, success: 0, msg: "Supplier with this name already exists" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Update supplier
     */
    update: async (id, data) => {
        try {
            // Add modified timestamp
            data.modifieddate = moment().format("YYYY-MM-DD HH:mm:ss");

            const result = await db.update(
                "suppliermaster",
                Object.keys(data).map((key) => ({ column: key, value: data[key] })),
                [
                    { column: "id", value: id },
                    { column: "isdeleted", value: 0 },
                ]
            );
            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "Supplier not found" };
            }

            return {
                status: 200,
                success: 1,
                msg: "Supplier updated successfully",
                data: { id: id, ...data },
            };
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY") {
                return { status: 409, success: 0, msg: "Supplier name already exists" };
            }
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Soft delete supplier
     */
    delete: async (id, data) => {
        try {
            const result = await db.update(
                "suppliermaster",
                Object.keys(data).map((key) => ({ column: key, value: data[key] })),
                [{ column: "id", value: id }]
            );
            if (!result.affectedRows) {
                return { status: 500, success: 0, msg: "Supplier not found" };
            }
            return { status: 200, success: 1, msg: "Supplier deleted successfully" };
        } catch (error) {
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Get unapproved suppliers with optional company filter
     */
    getUnapprovedSuppliers: async (req) => {
        const { start = 0, length = 10, filters, sortField = 'createddate', sortOrder = 'desc', companyid } = req.query;

        let sql = `
            SELECT s.id, s.supplierid, s.suppliername, s.address, s.gstno, s.panno, s.phoneno,
                   s.email, s.pincode, s.contactperson, s.countryid, co.countryname,
                   s.stateid, st.statename, s.cityid, ci.cityname, s.supplierimage,
                   s.seedslicensenumber, s.fertilizerlicensenumber, s.pesticideslicensenumber,
                   s.licensetype, s.companyid, s.uniquekey, s.issync,
                   s.isapproved, s.approvalremark,
                   s.createdby, s.createddate, s.modifiedby, s.modifieddate, s.ipaddress,
                   comp.companyname
            FROM suppliermaster s
            LEFT JOIN countrymst co ON s.countryid = co.countryid AND co.isdeleted = 0
            LEFT JOIN statemaster st ON s.stateid = st.stateid AND st.isdeleted = 0
            LEFT JOIN citymaster ci ON s.cityid = ci.cityid AND ci.isdeleted = 0
            LEFT JOIN companymaster comp ON s.companyid = comp.companyid AND comp.isdeleted = 0
            WHERE s.isdeleted = 0 AND s.isapproved = 0 AND s.issync = 1
        `;

        const params = [];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "supplier.model.js",
                    function: "getUnapprovedSuppliers"
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Company filter
        if (companyid) {
            sql += ` AND s.companyid = ?`;
            params.push(companyid);
        }

        // Apply filters
        const filterFields = ['suppliername', 'address', 'email', 'gstno'];
        filterFields.forEach(field => {
            const value = getFilterValue(field);
            if (value) {
                sql += ` AND s.${field} LIKE ?`;
                params.push(`%${value}%`);
            }
        });

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (s.suppliername LIKE ? OR s.address LIKE ? OR s.email LIKE ? OR s.gstno LIKE ?)`;
            const g = `%${global}%`;
            params.push(g, g, g, g);
        }

        // Sorting
        const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY s.${sortField} ${order}`;

        // Pagination
        const startNum = parseInt(start);
        const lengthNum = parseInt(length);

        if (lengthNum !== -1) {
            sql += ` LIMIT ?, ?`;
            params.push(startNum, lengthNum);
        }

        const data = await db.getResults(sql, params);

        // For each unapproved supplier, fetch similar suppliers
        for (let supplier of data) {
            const similarSuppliersSql = `
                SELECT similar.id, similar.supplierid, similar.suppliername, similar.address, similar.gstno,
                       similar.panno, similar.phoneno, similar.email,
                       similar.companyid, comp.companyname,
                       similar.isapproved,
                       co.countryname, st.statename, ci.cityname,
                       CASE
                           WHEN similar.gstno = ? AND ? IS NOT NULL AND ? != '' THEN 'gst'
                           WHEN LOWER(similar.suppliername) = LOWER(?) THEN 'exact'
                           WHEN LOWER(similar.suppliername) LIKE CONCAT('%', LOWER(?), '%') OR LOWER(?) LIKE CONCAT('%', LOWER(similar.suppliername), '%') THEN 'partial'
                           ELSE 'other'
                       END AS match_type
                FROM suppliermaster similar
                LEFT JOIN companymaster comp ON similar.companyid = comp.companyid AND comp.isdeleted = 0
                LEFT JOIN countrymst co ON similar.countryid = co.countryid AND co.isdeleted = 0
                LEFT JOIN statemaster st ON similar.stateid = st.stateid AND st.isdeleted = 0
                LEFT JOIN citymaster ci ON similar.cityid = ci.cityid AND ci.isdeleted = 0
                WHERE similar.isdeleted = 0 AND similar.isapproved = 1
                AND similar.id != ?
                AND (
                    (similar.gstno = ? AND ? IS NOT NULL AND ? != '')
                    OR LOWER(similar.suppliername) = LOWER(?)
                    OR LOWER(similar.suppliername) LIKE CONCAT('%', LOWER(?), '%')
                    OR LOWER(?) LIKE CONCAT('%', LOWER(similar.suppliername), '%')
                )
                ORDER BY match_type ASC, similar.isapproved DESC, similar.createddate DESC
                LIMIT 10
            `;

            const similarParams = [
                supplier.gstno, supplier.gstno, supplier.gstno,  // For CASE WHEN gst match
                supplier.suppliername,  // For CASE WHEN exact match
                supplier.suppliername, supplier.suppliername,  // For CASE WHEN partial match
                supplier.id,  // For != condition
                supplier.gstno, supplier.gstno, supplier.gstno,  // For WHERE gst condition
                supplier.suppliername,  // For WHERE exact match
                supplier.suppliername, supplier.suppliername  // For WHERE partial matches
            ];

            const similarSuppliers = await db.getResults(similarSuppliersSql, similarParams);
            supplier.similar_suppliers = similarSuppliers || [];
            supplier.similar_suppliers_count = similarSuppliers?.length || 0;
        }

        // Count total records
        let countSql = `SELECT COUNT(*) as total FROM suppliermaster s WHERE s.isdeleted = 0 AND s.isapproved = 0 AND s.issync = 1`;
        let countParams = [];

        if (companyid) {
            countSql += ` AND s.companyid = ?`;
            countParams.push(companyid);
        }

        filterFields.forEach(field => {
            const value = getFilterValue(field);
            if (value) {
                countSql += ` AND s.${field} LIKE ?`;
                countParams.push(`%${value}%`);
            }
        });

        if (global) {
            countSql += ` AND (s.suppliername LIKE ? OR s.address LIKE ? OR s.email LIKE ? OR s.gstno LIKE ?)`;
            const g = `%${global}%`;
            countParams.push(g, g, g, g);
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
                totalPages
            }
        };
    },

    /**
     * Get list of rejection reasons for supplier approval
     */
    getRejectionReasons: async () => {
        return {
            status: 200,
            success: 1,
            data: REJECTION_REASONS
        };
    },

    /**
     * Approve a single supplier - creates company_suppliermaster mapping
     */
    approveSupplier: async (id, approvalData) => {
        try {
            const { approvedby, approvalremark } = approvalData;

            // First, get supplier details to know which company created it
            const supplierDetails = await db.getResults(
                `SELECT id, companyid, uniquekey FROM suppliermaster WHERE id = ? AND isdeleted = 0`,
                [id]
            );

            if (!supplierDetails || supplierDetails.length === 0) {
                return { status: 404, success: 0, msg: "Supplier not found" };
            }

            const supplier = supplierDetails[0];

            // Update suppliermaster to approve
            const result = await db.update('suppliermaster',
                [
                    { column: 'isapproved', value: 1 },
                    { column: 'approvalremark', value: approvalremark || 'Approved' },
                    { column: 'modifiedby', value: approvedby },
                    { column: 'modifieddate', value: moment().format("YYYY-MM-DD HH:mm:ss") }
                ],
                [{ column: 'id', value: id }, { column: 'isdeleted', value: 0 }]
            );

            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "Supplier not found" };
            }

            // Create company_suppliermaster mapping for the originating company
            const existingMapping = await db.getResults(
                `SELECT id FROM company_suppliermaster WHERE companyid = ? AND supplierid = ? AND isdeleted = 0`,
                [supplier.companyid, id]
            );

            const currDate = moment().format("YYYY-MM-DD HH:mm:ss");

            if (existingMapping && existingMapping.length > 0) {
                // Update existing mapping
                await db.update('company_suppliermaster',
                    [
                        { column: 'isactive', value: 1 },
                        { column: 'modifiedby', value: approvedby },
                        { column: 'modifieddate', value: currDate }
                    ],
                    [
                        { column: 'companyid', value: supplier.companyid },
                        { column: 'supplierid', value: id }
                    ]
                );
            } else {
                // Create new mapping
                await db.insert('company_suppliermaster', [
                    { column: 'companyid', value: supplier.companyid },
                    { column: 'supplierid', value: id },
                    { column: 'uniquekey', value: supplier.uniquekey },
                    { column: 'isactive', value: 1 },
                    { column: 'issync', value: 1 },
                    { column: 'lastsyncdate', value: currDate },
                    { column: 'createdby', value: approvedby },
                    { column: 'createddate', value: currDate },
                    { column: 'modifiedby', value: approvedby },
                    { column: 'modifieddate', value: currDate },
                    { column: 'isdeleted', value: 0 }
                ]);
            }

            winston.info("Supplier approved and mapped to company", {
                source: "supplier.model.js",
                function: "approveSupplier",
                supplierid: id,
                companyid: supplier.companyid
            });

            return {
                status: 200,
                success: 1,
                msg: "Supplier approved successfully and mapped to company",
                data: { id, companyid: supplier.companyid }
            };
        } catch (error) {
            winston.error(`Error approving supplier: ${error.message}`, {
                source: "supplier.model.js",
                function: "approveSupplier",
                error: error.message,
                id
            });
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Reject a single supplier
     * - "Duplicate Supplier" → Soft delete supplier and map original supplier to company_suppliermaster
     * - Other reasons → Keep as company-specific and map to company_suppliermaster
     */
    rejectSupplier: async (id, rejectionData) => {
        try {
            const { rejectedby, rejectionreason, rejectionremark, replacewith } = rejectionData;

            // Validate rejection reason against static list
            const validReasons = REJECTION_REASONS.map(r => r.reason);
            if (rejectionreason && !validReasons.includes(rejectionreason)) {
                return {
                    status: 400,
                    success: 0,
                    msg: `Invalid rejection reason. Must be one of: ${validReasons.join(', ')}`
                };
            }

            // Get supplier details
            const supplierDetails = await db.getResults(
                `SELECT id, companyid, uniquekey, suppliername, gstno FROM suppliermaster WHERE id = ?`,
                [id]
            );

            if (!supplierDetails || supplierDetails.length === 0) {
                return { status: 404, success: 0, msg: "Supplier not found" };
            }

            const supplier = supplierDetails[0];
            const isDuplicate = rejectionreason === 'Duplicate Supplier';
            const currDate = moment().format("YYYY-MM-DD HH:mm:ss");

            let result;
            let originalSupplier = null;

            if (isDuplicate) {
                // For duplicates: Use the selected master supplier (replacewith) or find original/similar supplier
                if (replacewith) {
                    // Use the supplier ID selected by support team
                    const selectedSupplier = await db.getResults(
                        `SELECT id, suppliername, uniquekey FROM suppliermaster WHERE id = ? AND isdeleted = 0 AND isapproved = 1`,
                        [replacewith]
                    );

                    if (selectedSupplier && selectedSupplier.length > 0) {
                        originalSupplier = selectedSupplier[0];
                    }
                } else {
                    // Fallback: Auto-find the original/similar supplier to map instead
                    const similarSupplierSql = `
                        SELECT id, suppliername, uniquekey
                        FROM suppliermaster
                        WHERE isdeleted = 0
                          AND isapproved = 1
                          AND id != ?
                          AND (
                              (gstno = ? AND ? IS NOT NULL AND ? != '')
                              OR LOWER(suppliername) = LOWER(?)
                          )
                        ORDER BY createddate ASC
                        LIMIT 1
                    `;

                    const similarSuppliers = await db.getResults(similarSupplierSql, [
                        id,
                        supplier.gstno, supplier.gstno, supplier.gstno,
                        supplier.suppliername
                    ]);

                    if (similarSuppliers && similarSuppliers.length > 0) {
                        originalSupplier = similarSuppliers[0];
                    }
                }

                // Soft delete the duplicate supplier
                result = await db.update('suppliermaster',
                    [
                        { column: 'isdeleted', value: 1 },
                        { column: 'rejectionreason', value: rejectionreason },
                        { column: 'approvalremark', value: rejectionremark || 'Rejected as duplicate' },
                        { column: 'modifiedby', value: rejectedby },
                        { column: 'modifieddate', value: currDate }
                    ],
                    [{ column: 'id', value: id }]
                );

                // Map the ORIGINAL supplier to company_suppliermaster if found
                if (originalSupplier) {
                    const existingMapping = await db.getResults(
                        `SELECT id FROM company_suppliermaster WHERE companyid = ? AND supplierid = ? AND isdeleted = 0`,
                        [supplier.companyid, originalSupplier.id]
                    );

                    if (existingMapping && existingMapping.length > 0) {
                        await db.update('company_suppliermaster',
                            [
                                { column: 'isactive', value: 1 },
                                { column: 'modifiedby', value: rejectedby },
                                { column: 'modifieddate', value: currDate }
                            ],
                            [
                                { column: 'companyid', value: supplier.companyid },
                                { column: 'supplierid', value: originalSupplier.id }
                            ]
                        );
                    } else {
                        await db.insert('company_suppliermaster', [
                            { column: 'companyid', value: supplier.companyid },
                            { column: 'supplierid', value: originalSupplier.id },
                            { column: 'uniquekey', value: supplier.uniquekey }, // Keep POS uniquekey for sync
                            { column: 'isactive', value: 1 },
                            { column: 'issync', value: 1 },
                            { column: 'lastsyncdate', value: currDate },
                            { column: 'createdby', value: rejectedby },
                            { column: 'createddate', value: currDate },
                            { column: 'modifiedby', value: rejectedby },
                            { column: 'modifieddate', value: currDate },
                            { column: 'isdeleted', value: 0 }
                        ]);
                    }

                    winston.info("Duplicate supplier rejected and original supplier mapped to company", {
                        source: "supplier.model.js",
                        function: "rejectSupplier",
                        duplicateSupplierid: id,
                        originalSupplierid: originalSupplier.id,
                        companyid: supplier.companyid
                    });
                }
            } else {
                // For other reasons: Keep as company-specific (not global)
                result = await db.update('suppliermaster',
                    [
                        { column: 'isapproved', value: 0 }, // Keep unapproved
                        { column: 'rejectionreason', value: rejectionreason },
                        { column: 'approvalremark', value: rejectionremark || 'Kept as company-specific' },
                        { column: 'modifiedby', value: rejectedby },
                        { column: 'modifieddate', value: currDate }
                    ],
                    [{ column: 'id', value: id }]
                );

                // Map the rejected supplier to company_suppliermaster (company-specific)
                const existingMapping = await db.getResults(
                    `SELECT id FROM company_suppliermaster WHERE companyid = ? AND supplierid = ? AND isdeleted = 0`,
                    [supplier.companyid, id]
                );

                if (existingMapping && existingMapping.length > 0) {
                    await db.update('company_suppliermaster',
                        [
                            { column: 'isactive', value: 1 },
                            { column: 'modifiedby', value: rejectedby },
                            { column: 'modifieddate', value: currDate }
                        ],
                        [
                            { column: 'companyid', value: supplier.companyid },
                            { column: 'supplierid', value: id }
                        ]
                    );
                } else {
                    await db.insert('company_suppliermaster', [
                        { column: 'companyid', value: supplier.companyid },
                        { column: 'supplierid', value: id },
                        { column: 'uniquekey', value: supplier.uniquekey },
                        { column: 'isactive', value: 1 },
                        { column: 'issync', value: 1 },
                        { column: 'lastsyncdate', value: currDate },
                        { column: 'createdby', value: rejectedby },
                        { column: 'createddate', value: currDate },
                        { column: 'modifiedby', value: rejectedby },
                        { column: 'modifieddate', value: currDate },
                        { column: 'isdeleted', value: 0 }
                    ]);
                }

                winston.info("Supplier kept as company-specific and mapped to company", {
                    source: "supplier.model.js",
                    function: "rejectSupplier",
                    supplierid: id,
                    companyid: supplier.companyid
                });
            }

            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "Supplier not found" };
            }

            return {
                status: 200,
                success: 1,
                msg: isDuplicate
                    ? "Supplier rejected as duplicate and original supplier mapped"
                    : "Supplier kept as company-specific and mapped",
                data: {
                    id,
                    isDuplicate,
                    action: isDuplicate ? 'deleted' : 'company_specific',
                    originalSupplier: originalSupplier ? {
                        id: originalSupplier.id,
                        suppliername: originalSupplier.suppliername
                    } : null,
                    companyid: supplier.companyid
                }
            };
        } catch (error) {
            winston.error(`Error rejecting supplier: ${error.message}`, {
                source: "supplier.model.js",
                function: "rejectSupplier",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                id: id
            });
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Bulk approve suppliers and create company_suppliermaster mappings
     */
    bulkApproveSuppliers: async (supplierids, approvalData) => {
        try {
            const { approvedby, approvalremark } = approvalData;
            const currDate = moment().format("YYYY-MM-DD HH:mm:ss");

            // Get supplier details for all suppliers to be approved
            const placeholders = supplierids.map(() => '?').join(',');
            const supplierDetails = await db.getResults(
                `SELECT id, companyid, uniquekey FROM suppliermaster WHERE id IN (${placeholders}) AND isdeleted = 0`,
                supplierids
            );

            if (!supplierDetails || supplierDetails.length === 0) {
                return { status: 404, success: 0, msg: "No suppliers found to approve" };
            }

            // Update suppliermaster for all suppliers
            const sql = `
                UPDATE suppliermaster
                SET isapproved = 1,
                    approvalremark = ?,
                    modifiedby = ?,
                    modifieddate = ?
                WHERE id IN (${placeholders}) AND isdeleted = 0
            `;

            const params = [
                approvalremark || 'Bulk approved',
                approvedby,
                currDate,
                ...supplierids
            ];

            const result = await db.executeQuery(sql, params);

            // Create company_suppliermaster mappings for each supplier
            let mappedCount = 0;
            for (const supplier of supplierDetails) {
                try {
                    const existingMapping = await db.getResults(
                        `SELECT id FROM company_suppliermaster WHERE companyid = ? AND supplierid = ? AND isdeleted = 0`,
                        [supplier.companyid, supplier.id]
                    );

                    if (existingMapping && existingMapping.length > 0) {
                        await db.update('company_suppliermaster',
                            [
                                { column: 'isactive', value: 1 },
                                { column: 'modifiedby', value: approvedby },
                                { column: 'modifieddate', value: currDate }
                            ],
                            [
                                { column: 'companyid', value: supplier.companyid },
                                { column: 'supplierid', value: supplier.id }
                            ]
                        );
                    } else {
                        await db.insert('company_suppliermaster', [
                            { column: 'companyid', value: supplier.companyid },
                            { column: 'supplierid', value: supplier.id },
                            { column: 'uniquekey', value: supplier.uniquekey },
                            { column: 'isactive', value: 1 },
                            { column: 'issync', value: 1 },
                            { column: 'lastsyncdate', value: currDate },
                            { column: 'createdby', value: approvedby },
                            { column: 'createddate', value: currDate },
                            { column: 'modifiedby', value: approvedby },
                            { column: 'modifieddate', value: currDate },
                            { column: 'isdeleted', value: 0 }
                        ]);
                    }
                    mappedCount++;
                } catch (mappingError) {
                    winston.error(`Error mapping supplier ${supplier.id} to company ${supplier.companyid}`, {
                        source: "supplier.model.js",
                        function: "bulkApproveSuppliers",
                        error: mappingError.message
                    });
                }
            }

            winston.info("Bulk suppliers approved and mapped to companies", {
                source: "supplier.model.js",
                function: "bulkApproveSuppliers",
                approvedCount: result.affectedRows,
                mappedCount
            });

            return {
                status: 200,
                success: 1,
                msg: `${result.affectedRows} supplier(s) approved and ${mappedCount} mapped successfully`,
                data: { approved: result.affectedRows, mapped: mappedCount }
            };
        } catch (error) {
            winston.error(`Error bulk approving suppliers: ${error.message}`, {
                source: "supplier.model.js",
                function: "bulkApproveSuppliers",
                error: error.message,
                supplierids
            });
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Bulk reject suppliers - handles both duplicate and company-specific flows
     */
    bulkRejectSuppliers: async (supplierids, rejectionData) => {
        try {
            const { rejectedby, rejectionreason, rejectionremark } = rejectionData;

            // Validate rejection reason against static list
            const validReasons = REJECTION_REASONS.map(r => r.reason);
            if (rejectionreason && !validReasons.includes(rejectionreason)) {
                return {
                    status: 400,
                    success: 0,
                    msg: `Invalid rejection reason. Must be one of: ${validReasons.join(', ')}`
                };
            }

            const currDate = moment().format("YYYY-MM-DD HH:mm:ss");
            const isDuplicate = rejectionreason === 'Duplicate Supplier';

            // Get supplier details for all suppliers to be rejected
            const placeholders = supplierids.map(() => '?').join(',');
            const supplierDetails = await db.getResults(
                `SELECT id, companyid, uniquekey, suppliername, gstno
                 FROM suppliermaster
                 WHERE id IN (${placeholders})`,
                supplierids
            );

            if (!supplierDetails || supplierDetails.length === 0) {
                return { status: 404, success: 0, msg: "No suppliers found to reject" };
            }

            // Update suppliermaster based on rejection type
            let sql, params;
            if (isDuplicate) {
                // For duplicates: Soft delete
                sql = `
                    UPDATE suppliermaster
                    SET isdeleted = 1,
                        rejectionreason = ?,
                        approvalremark = ?,
                        modifiedby = ?,
                        modifieddate = ?
                    WHERE id IN (${placeholders})
                `;
                params = [
                    rejectionreason,
                    rejectionremark || 'Bulk rejected as duplicate',
                    rejectedby,
                    currDate,
                    ...supplierids
                ];
            } else {
                // For other reasons: Keep as company-specific
                sql = `
                    UPDATE suppliermaster
                    SET isapproved = 0,
                        rejectionreason = ?,
                        approvalremark = ?,
                        modifiedby = ?,
                        modifieddate = ?
                    WHERE id IN (${placeholders})
                `;
                params = [
                    rejectionreason,
                    rejectionremark || 'Kept as company-specific',
                    rejectedby,
                    currDate,
                    ...supplierids
                ];
            }

            const result = await db.executeQuery(sql, params);

            // Create company_suppliermaster mappings
            let mappedCount = 0;
            for (const supplier of supplierDetails) {
                try {
                    if (isDuplicate) {
                        // Find and map original supplier for duplicates
                        const similarSupplierSql = `
                            SELECT id, suppliername, uniquekey
                            FROM suppliermaster
                            WHERE isdeleted = 0
                              AND isapproved = 1
                              AND id != ?
                              AND (
                                  (gstno = ? AND ? IS NOT NULL AND ? != '')
                                  OR LOWER(suppliername) = LOWER(?)
                              )
                            ORDER BY createddate ASC
                            LIMIT 1
                        `;

                        const similarSuppliers = await db.getResults(similarSupplierSql, [
                            supplier.id,
                            supplier.gstno, supplier.gstno, supplier.gstno,
                            supplier.suppliername
                        ]);

                        if (similarSuppliers && similarSuppliers.length > 0) {
                            const originalSupplier = similarSuppliers[0];

                            // Check if mapping already exists
                            const existingMapping = await db.getResults(
                                `SELECT id FROM company_suppliermaster
                                 WHERE companyid = ? AND supplierid = ? AND isdeleted = 0`,
                                [supplier.companyid, originalSupplier.id]
                            );

                            if (existingMapping && existingMapping.length > 0) {
                                // Update existing mapping
                                await db.update('company_suppliermaster',
                                    [
                                        { column: 'isactive', value: 1 },
                                        { column: 'modifiedby', value: rejectedby },
                                        { column: 'modifieddate', value: currDate }
                                    ],
                                    [
                                        { column: 'companyid', value: supplier.companyid },
                                        { column: 'supplierid', value: originalSupplier.id }
                                    ]
                                );
                            } else {
                                // Create new mapping with original supplier
                                await db.insert('company_suppliermaster', [
                                    { column: 'companyid', value: supplier.companyid },
                                    { column: 'supplierid', value: originalSupplier.id },
                                    { column: 'uniquekey', value: supplier.uniquekey },
                                    { column: 'isactive', value: 1 },
                                    { column: 'issync', value: 1 },
                                    { column: 'lastsyncdate', value: currDate },
                                    { column: 'createdby', value: rejectedby },
                                    { column: 'createddate', value: currDate },
                                    { column: 'modifiedby', value: rejectedby },
                                    { column: 'modifieddate', value: currDate },
                                    { column: 'isdeleted', value: 0 }
                                ]);
                            }
                            mappedCount++;
                        }
                    } else {
                        // Map the rejected supplier itself for company-specific suppliers
                        const existingMapping = await db.getResults(
                            `SELECT id FROM company_suppliermaster
                             WHERE companyid = ? AND supplierid = ? AND isdeleted = 0`,
                            [supplier.companyid, supplier.id]
                        );

                        if (existingMapping && existingMapping.length > 0) {
                            // Update existing mapping
                            await db.update('company_suppliermaster',
                                [
                                    { column: 'isactive', value: 1 },
                                    { column: 'modifiedby', value: rejectedby },
                                    { column: 'modifieddate', value: currDate }
                                ],
                                [
                                    { column: 'companyid', value: supplier.companyid },
                                    { column: 'supplierid', value: supplier.id }
                                ]
                            );
                        } else {
                            // Create new mapping
                            await db.insert('company_suppliermaster', [
                                { column: 'companyid', value: supplier.companyid },
                                { column: 'supplierid', value: supplier.id },
                                { column: 'uniquekey', value: supplier.uniquekey },
                                { column: 'isactive', value: 1 },
                                { column: 'issync', value: 1 },
                                { column: 'lastsyncdate', value: currDate },
                                { column: 'createdby', value: rejectedby },
                                { column: 'createddate', value: currDate },
                                { column: 'modifiedby', value: rejectedby },
                                { column: 'modifieddate', value: currDate },
                                { column: 'isdeleted', value: 0 }
                            ]);
                        }
                        mappedCount++;
                    }
                } catch (mappingError) {
                    winston.error(`Error mapping supplier ${supplier.id} to company ${supplier.companyid}`, {
                        source: "supplier.model.js",
                        function: "bulkRejectSuppliers",
                        error: mappingError.message,
                        supplierid: supplier.id,
                        companyid: supplier.companyid
                    });
                }
            }

            winston.info("Bulk suppliers rejected and mapped to companies", {
                source: "supplier.model.js",
                function: "bulkRejectSuppliers",
                rejectedCount: result.affectedRows,
                mappedCount,
                isDuplicate
            });

            return {
                status: 200,
                success: 1,
                msg: `${result.affectedRows} supplier(s) rejected and ${mappedCount} mapped successfully`,
                data: { rejected: result.affectedRows, mapped: mappedCount }
            };
        } catch (error) {
            winston.error(`Error bulk rejecting suppliers: ${error.message}`, {
                source: "supplier.model.js",
                function: "bulkRejectSuppliers",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                supplierids: supplierids
            });
            return { status: 500, success: 0, msg: error.message };
        }
    },
};
