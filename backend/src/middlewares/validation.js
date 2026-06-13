const { validationResult } = require("express-validator");
const Joi = require("joi");
const ResponseFormatter = require("../utils/responseFormatter");
const { ValidationError } = require("../utils/customErrors");

/**
 * Express-validator middleware
 */
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map((err) => ({
            field: err.path || err.param,
            message: err.msg,
            value: err.value,
        }));

        return res.status(422).json(ResponseFormatter.validationError(formattedErrors));
    }

    next();
};

/**
 * Joi validation middleware factory
 */
const validateSchema = (schema, property = "body") => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false,
            stripUnknown: true,
            convert: true,
        });

        if (error) {
            const formattedErrors = error.details.map((detail) => ({
                field: detail.path.join("."),
                message: detail.message,
                type: detail.type,
            }));

            return res.status(422).json(ResponseFormatter.validationError(formattedErrors));
        }

        // Replace request property with validated and sanitized value
        req[property] = value;
        next();
    };
};

/**
 * Common validation schemas
 */
const commonSchemas = {
    // ID validation
    id: Joi.number().integer().positive().required(),

    // Pagination
    pagination: Joi.object({
        start: Joi.number().integer().min(0).default(0),
        length: Joi.number().integer().min(1).max(100).default(10),
        filters: Joi.string().optional().allow(null),
        sortField: Joi.string().default("createddate"),
        sortOrder: Joi.string().valid("asc", "desc").default("desc"),
    }),

    // Email
    email: Joi.string().email().lowercase().trim().required(),

    // Password
    password: Joi.string().min(8).max(128).required(),

    // Phone
    phone: Joi.string().pattern(
        /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/
    ),

    // Date range
    dateRange: Joi.object({
        startDate: Joi.date().iso(),
        endDate: Joi.date().iso().greater(Joi.ref("startDate")),
    }),

    // Search
    search: Joi.string().trim().min(1).max(255),

    // Status
    status: Joi.string().valid("active", "inactive", "pending", "deleted"),
};

/**
 * Validation rules for common operations
 */
const validationRules = {
    // User validation
    createUser: Joi.object({
        username: Joi.string().min(3).max(30).required(),
        email: commonSchemas.email,
        password: commonSchemas.password,
        phone: commonSchemas.phone.optional(),
        firstname: Joi.string().min(1).max(50).required(),
        lastname: Joi.string().min(1).max(50).required(),
    }),

    updateUser: Joi.object({
        username: Joi.string().min(3).max(30),
        email: Joi.string().email().lowercase().trim(),
        phone: commonSchemas.phone,
        firstname: Joi.string().min(1).max(50),
        lastname: Joi.string().min(1).max(50),
        status: commonSchemas.status,
    }).min(1),

    // Auth validation
    login: Joi.object({
        email: commonSchemas.email,
        password: commonSchemas.password,
        rememberMe: Joi.boolean().default(false),
    }),

    // Change password
    changePassword: Joi.object({
        currentPassword: commonSchemas.password,
        newPassword: commonSchemas.password,
        confirmPassword: Joi.string()
            .valid(Joi.ref("newPassword"))
            .required()
            .messages({ "any.only": "Passwords do not match" }),
    }),

    // Reset password
    resetPassword: Joi.object({
        token: Joi.string().required(),
        newPassword: commonSchemas.password,
        confirmPassword: Joi.string()
            .valid(Joi.ref("newPassword"))
            .required()
            .messages({ "any.only": "Passwords do not match" }),
    }),

    // Refresh token
    refreshToken: Joi.object({
        refreshToken: Joi.string().required(),
    }),

    // Forgot password
    forgotPassword: Joi.object({
        email: commonSchemas.email,
    }),

    // File upload
    fileUpload: Joi.object({
        fieldname: Joi.string().required(),
        originalname: Joi.string().required(),
        mimetype: Joi.string().required(),
        size: Joi.number()
            .max(10 * 1024 * 1024)
            .required(), // 10MB max
    }),

    masterData: Joi.object({
        lastsyncdates: Joi.array()
            .items(
                Joi.object({
                    tablename: Joi.string()
                        .valid(
                            "brandmst",
                            "itemcategorymst",
                            "itemtypemst",
                            "suppliermst",
                            "uommst",
                            "taxmst",
                            "taxprofilemst",
                            "taxprofiledetails",
                            "reasonmst",
                            "reasontypemst",
                            "paymenttype",
                            "planmst",
                            "plandetails",
                            "addons"
                        )
                        .required(),
                    lastsyncdate: Joi.alternatives()
                        .try(
                            Joi.date().iso(),
                            Joi.string().isoDate(),
                            Joi.string().pattern(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
                        )
                        .required(),
                })
            )
            .optional(),
    }),

    // Brand validation
    createBrand: Joi.object({
        brandname: Joi.string().min(1).max(245).trim().required(),
        branddesc: Joi.string().max(255).trim().optional().allow(null, ""),
        brandcategory: Joi.alternatives().try(
            Joi.array().items(Joi.number().integer().positive()).min(1),
            Joi.string().custom((value, helpers) => {
                // Convert comma-separated string to array
                const arr = value.split(",").map((v) => parseInt(v.trim(), 10));
                if (arr.some(isNaN)) {
                    return helpers.error("any.invalid");
                }
                return arr;
            }, "comma-separated string to array")
        ),
        brandicon: Joi.string().max(500).trim().optional().allow(null, ""),
        // companyid: Joi.number().integer().positive().required(),
    }),

    updateBrand: Joi.object({
        brandname: Joi.string().min(1).max(245).trim().required(),
        branddesc: Joi.string().max(255).trim().optional().allow(null, ""),
        brandicon: Joi.string().max(500).trim().optional().allow(null, ""),
        brandcategory: Joi.alternatives()
            .try(
                Joi.array().items(Joi.number().integer().positive()).min(1),
                Joi.string().custom((value, helpers) => {
                    const arr = value.split(",").map((v) => parseInt(v.trim(), 10));
                    if (arr.some(isNaN)) {
                        return helpers.error("any.invalid");
                    }
                    return arr;
                }, "comma-separated string to array")
            )
            .optional(),
    }).min(1),

    // Item Category validation
    createItemCategory: Joi.object({
        itemcategoryname: Joi.string().min(1).max(155).trim().required(),
        displayname: Joi.string().max(250).trim().optional(),
        parentcategoryid: Joi.number().integer().positive().optional().allow(null, ""),
        itemcategorydesc: Joi.string().max(255).trim().optional().allow(null, ""),
        itemcategoryorder: Joi.number().integer().min(0).max(255).optional(),
        itemcategoryimage: Joi.string().max(500).trim().optional().allow(null, ""),
        // companyid: Joi.number().integer().positive().required(),
    }),

    updateItemCategory: Joi.object({
        itemcategoryname: Joi.string().min(1).max(155).trim(),
        displayname: Joi.string().max(250).trim(),
        parentcategoryid: Joi.number().integer().positive().optional().allow(null, ""),
        itemcategorydesc: Joi.string().max(255).trim().allow(null, ""),
        itemcategoryorder: Joi.number().integer().min(0).max(255),
        itemcategoryimage: Joi.string().max(500).trim().optional().allow(null, ""),
        // companyid: Joi.number().integer().positive(),
    }).min(1),

    // Supplier validation
    createSupplier: Joi.object({
        suppliername: Joi.string().min(1).max(250).trim().required(),
        address: Joi.string().max(65535).trim().optional().allow(null, ""),
        gstno: Joi.string().max(25).trim().optional().allow(null, ""),
        panno: Joi.string().max(25).trim().optional().allow(null, ""),
        phoneno: Joi.string()
            .max(15)
            .pattern(/^[+]?[(]?[0-9\s\-()]{7,15}$/)
            .optional()
            .allow(null, ""),
        email: Joi.string().email().max(100).trim().optional().allow(null, ""),
        pincode: Joi.string().max(45).trim().optional().allow(null, ""),
        contactperson: Joi.string().max(145).trim().optional().allow(null, ""),
        countryid: Joi.number().integer().positive().optional().allow(null, ""),
        stateid: Joi.number().integer().positive().optional().allow(null, ""),
        cityid: Joi.number().integer().positive().optional().allow(null, ""),
        // companyid: Joi.number().integer().positive().required(),
        locationid: Joi.number().integer().positive().optional().allow(null, ""),
        vatno: Joi.string().max(50).trim().optional().allow(null, ""),
        outstandingamt: Joi.number().precision(5).min(0).default(0.0).optional(),
        seedslicensenumber: Joi.string()
            .max(50)
            .pattern(/^[a-zA-Z0-9\-]+$/)
            .trim()
            .optional()
            .allow(null, "")
            .messages({
                "string.pattern.base":
                    "Seeds license number can only contain alphanumeric characters and hyphens",
            }),
        seedslicensedate: Joi.date().iso().optional().allow(null, ""),
        fertilizerlicensenumber: Joi.string()
            .max(50)
            .pattern(/^[a-zA-Z0-9\-]+$/)
            .trim()
            .optional()
            .allow(null, "")
            .messages({
                "string.pattern.base":
                    "Fertilizer license number can only contain alphanumeric characters and hyphens",
            }),
        fertilizerlicensedate: Joi.date().iso().optional().allow(null, ""),
        pesticideslicensenumber: Joi.string()
            .max(50)
            .pattern(/^[a-zA-Z0-9\-]+$/)
            .trim()
            .optional()
            .allow(null, "")
            .messages({
                "string.pattern.base":
                    "Pesticides license number can only contain alphanumeric characters and hyphens",
            }),
        pesticideslicensedate: Joi.date().iso().optional().allow(null, ""),
        isapproved: Joi.number().integer().valid(0, 1).default(0).optional(),
        approvalremark: Joi.string().max(255).trim().optional().allow(null, ""),
        replacewith: Joi.number().integer().positive().optional().allow(null),
    }),

    updateSupplier: Joi.object({
        suppliername: Joi.string().min(1).max(250).trim(),
        address: Joi.string().max(65535).trim().allow(null, ""),
        gstno: Joi.string().max(25).trim().allow(null, ""),
        panno: Joi.string().max(25).trim().allow(null, ""),
        phoneno: Joi.string()
            .max(15)
            .pattern(/^[+]?[(]?[0-9\s\-()]{7,15}$/)
            .allow(null, ""),
        email: Joi.string().email().max(100).trim().allow(null, ""),
        pincode: Joi.string().max(45).trim().allow(null, ""),
        contactperson: Joi.string().max(145).trim().allow(null, ""),
        countryid: Joi.number().integer().positive().allow(null, ""),
        stateid: Joi.number().integer().positive().allow(null, ""),
        cityid: Joi.number().integer().positive().allow(null, ""),
        // companyid: Joi.number().integer().positive(),
        locationid: Joi.number().integer().positive().allow(null, ""),
        vatno: Joi.string().max(50).trim().allow(null, ""),
        outstandingamt: Joi.number().precision(5).min(0),
        seedslicensenumber: Joi.string()
            .max(50)
            .pattern(/^[a-zA-Z0-9\-]+$/)
            .trim()
            .allow(null, "")
            .messages({
                "string.pattern.base":
                    "Seeds license number can only contain alphanumeric characters and hyphens",
            }),
        seedslicensedate: Joi.date().iso().allow(null, ""),
        fertilizerlicensenumber: Joi.string()
            .max(50)
            .pattern(/^[a-zA-Z0-9\-]+$/)
            .trim()
            .allow(null, "")
            .messages({
                "string.pattern.base":
                    "Fertilizer license number can only contain alphanumeric characters and hyphens",
            }),
        fertilizerlicensedate: Joi.date().iso().allow(null, ""),
        pesticideslicensenumber: Joi.string()
            .max(50)
            .pattern(/^[a-zA-Z0-9\-]+$/)
            .trim()
            .allow(null, "")
            .messages({
                "string.pattern.base":
                    "Pesticides license number can only contain alphanumeric characters and hyphens",
            }),
        pesticideslicensedate: Joi.date().iso().allow(null, ""),
        isapproved: Joi.number().integer().valid(0, 1),
        approvalremark: Joi.string().max(255).trim().allow(null, ""),
        replacewith: Joi.number().integer().positive().allow(null),
    }).min(1),

    // POS Brand Sync validation (single brand from POS)
    saveBrandFromPOS: Joi.object({
        brandid: Joi.number().integer().positive().optional().allow(null),
        brandname: Joi.string().min(1).max(245).trim().required().messages({
            "string.empty": "Brand name is required",
            "any.required": "Brand name is required",
        }),
        branddesc: Joi.string().max(255).trim().optional().allow(null, ""),
        brandcategory: Joi.string().max(255).trim().optional().allow(null, ""),
        brandicon: Joi.string().max(500).trim().optional().allow(null, ""),
        companyid: Joi.number().integer().positive().required().messages({
            "number.base": "Company ID must be a number",
            "number.positive": "Company ID must be positive",
            "any.required": "Company ID is required",
        }),
        isapproved: Joi.number().integer().valid(0, 1).default(1).optional(),
        approvalremark: Joi.string().max(255).trim().optional().allow(null, ""),
        replacewith: Joi.number().integer().positive().optional().allow(null),
        uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
        issync: Joi.number().integer().valid(0, 1).default(1).optional(),
        ipaddress: Joi.string().ip().optional().allow(null, ""),
        createdby: Joi.number().integer().optional().allow(null),
        createddate: Joi.date().optional().allow(null),
        modifiedby: Joi.number().integer().optional().allow(null),
        modifieddate: Joi.date().optional().allow(null),
        isdeleted: Joi.number().integer().valid(0, 1).default(0).optional(),
    }),

    // POS Item Sync validation (single item from POS)
    saveItemFromPOS: Joi.object({
        itemid: Joi.number().integer().positive().optional().allow(null),
        itemname: Joi.string().min(1).max(250).trim().required().messages({
            "string.empty": "Item name is required",
            "any.required": "Item name is required",
        }),
        itemdisplayname: Joi.string().max(255).trim().optional().allow(null, ""),
        genericname: Joi.string().max(250).trim().optional().allow(null, ""),
        itembarcode: Joi.string().max(20).trim().optional().allow(null, ""),
        itemcode: Joi.string().max(15).trim().optional().allow(null, ""),
        mastercategoryid: Joi.number().integer().positive().optional().allow(null),
        categoryid: Joi.number().integer().positive().optional().allow(null),
        subcategoryid: Joi.number().integer().positive().optional().allow(null),
        brandid: Joi.number().integer().positive().optional().allow(null),
        itemtypeid: Joi.number().integer().positive().optional().allow(null),
        appearanceid: Joi.number().integer().valid(0, 1).optional().allow(null),
        packingqty: Joi.number().precision(5).min(0).optional().allow(null),
        packageuom: Joi.number().integer().positive().optional().allow(null),
        safetyquantity: Joi.number().integer().min(0).optional().allow(null),
        defaulttaxprofileid: Joi.number().integer().positive().optional().allow(null),
        sellingitemas: Joi.number().integer().valid(1, 2).default(1).optional(),
        hsnseccode: Joi.string().max(45).trim().optional().allow(null, ""),
        pricetype: Joi.number().integer().valid(1, 2).default(1).optional(),
        sellingprice: Joi.number().precision(5).min(0).default(0).optional(),
        purchaseprice: Joi.number().precision(5).min(0).default(0).optional(),
        netcost: Joi.number().precision(5).min(0).default(0).optional(),
        wholesaleprice: Joi.number().precision(5).min(0).default(0).optional(),
        ingredients: Joi.string().max(245).trim().optional().allow(null, ""),
        description: Joi.string().max(65535).trim().optional().allow(null, ""),
        baseunit: Joi.number().integer().positive().optional().allow(null),
        ismanufacturer: Joi.number().integer().valid(0, 1).default(0).optional(),
        batchquantity: Joi.number().integer().min(1).default(1).optional(),
        ispackingitem: Joi.number().integer().valid(0, 1).default(0).optional(),
        isnegativesale: Joi.number().integer().valid(0, 1).default(0).optional(),
        ignoretax: Joi.number().integer().valid(0, 1).default(0).optional(),
        ignorediscount: Joi.number().integer().valid(0, 1).default(0).optional(),
        imgpath: Joi.string().max(500).trim().optional().allow(null, ""),
        companyid: Joi.number().integer().positive().required().messages({
            "number.base": "Company ID must be a number",
            "number.positive": "Company ID must be positive",
            "any.required": "Company ID is required",
        }),
        uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
        ipaddress: Joi.string().ip().optional().allow(null, ""),
        createdby: Joi.number().integer().optional().allow(null),
        createddate: Joi.date().optional().allow(null),
        modifiedby: Joi.number().integer().optional().allow(null),
        modifieddate: Joi.date().optional().allow(null),
        isdeleted: Joi.number().integer().valid(0, 1).default(0).optional(),
    }),

    // Item Type validation
    createItemType: Joi.object({
        itemtypename: Joi.string().min(1).max(255).trim().required(),
        itemtypedesc: Joi.string().max(255).trim().optional().allow(null, ""),
        // companyid: Joi.number().integer().positive().required(),
    }),

    updateItemType: Joi.object({
        itemtypename: Joi.string().min(1).max(255).trim(),
        itemtypedesc: Joi.string().max(255).trim().allow(null, ""),
        // companyid: Joi.number().integer().positive(),
    }).min(1),

    // UOM validation
    createUOM: Joi.object({
        uomname: Joi.string().min(1).max(50).trim().required(),
        // companyid: Joi.number().integer().positive().required(),
    }),

    updateUOM: Joi.object({
        uomname: Joi.string().min(1).max(50).trim(),
        // companyid: Joi.number().integer().positive(),
    }).min(1),

    // Item validation
    createItem: Joi.object({
        itemname: Joi.string().min(1).max(250).trim().required(),
        itemdisplayname: Joi.string().max(255).trim().optional().allow(null, ""),
        genericname: Joi.string().max(250).trim().optional().allow(null, ""),
        itemcode: Joi.string().alphanum().max(20).trim().optional().allow(null, ""),
        mastercategoryid: Joi.number().integer().positive().required(),
        categoryid: Joi.number().integer().positive().required(),
        subcategoryid: Joi.number().integer().positive().optional().allow(null, ""),
        brandid: Joi.number().integer().positive().required(),
        safetyquantity: Joi.number().integer().allow(null, ""),
        defaulttaxprofileid: Joi.number().integer().positive().required(),
        sellingitemas: Joi.number().integer().valid(1, 2).default(1),
        hsnseccode: Joi.string().max(45).trim().required(),
        pricetype: Joi.number().integer().valid(1, 2).default(1).required(),
        sellingprice: Joi.number().precision(5).min(0).required(),
        purchaseprice: Joi.number().precision(5).min(0).optional().allow(null, ""),
        netcost: Joi.number().precision(5).min(0).required(),
        ingredients: Joi.string().max(245).trim().optional().allow(null, ""),
        description: Joi.string().max(65535).trim().optional().allow(null, ""),
        baseunit: Joi.number().integer().positive().required(),
        imgpath: Joi.alternatives()
            .try(Joi.string().max(500).trim().optional().allow(null, ""), Joi.object())
            .optional()
            .allow(null, ""),
        wholesaleprice: Joi.number().precision(5).min(0).optional().allow(null, ""),
        ignoretax: Joi.number().integer().valid(0, 1).default(0),
        ignorediscount: Joi.number().integer().valid(0, 1).default(0),
        isnegativesale: Joi.number().integer().valid(0, 1).default(0),
        packageuom: Joi.number().integer().positive().required(),
        packingqty: Joi.number().integer().required(),
    }),

    updateItem: Joi.object({
        itemname: Joi.string().min(1).max(250).trim(),
        itemdisplayname: Joi.string().max(255).trim().optional().allow(null, ""),
        genericname: Joi.string().max(250).trim().optional().allow(null, ""),
        itemcode: Joi.string().alphanum().max(20).trim().optional().allow(null, ""),
        mastercategoryid: Joi.number().integer().positive().allow(null),
        categoryid: Joi.number().integer().positive().allow(null),
        subcategoryid: Joi.number().integer().positive().optional().allow(null, ""),
        brandid: Joi.number().integer().positive().allow(null),
        safetyquantity: Joi.number().integer().optional().allow(null, ""),
        defaulttaxprofileid: Joi.number().integer().positive().allow(null),
        sellingitemas: Joi.number().integer().valid(1, 2),
        hsnseccode: Joi.string().max(45).trim().allow(null, ""),
        pricetype: Joi.number().integer().valid(1, 2),
        sellingprice: Joi.number().precision(5).min(0),
        purchaseprice: Joi.number().precision(5).min(0).optional().allow(null, ""),
        netcost: Joi.number().precision(5).min(0),
        ingredients: Joi.string().max(245).trim().optional().allow(null, ""),
        description: Joi.string().max(65535).trim().optional().allow(null, ""),
        baseunit: Joi.number().integer().positive().allow(null),
        imgpath: Joi.alternatives()
            .try(Joi.string().max(500).trim().optional().allow(null, ""), Joi.object())
            .optional()
            .allow(null, ""),
        wholesaleprice: Joi.number().precision(5).min(0).optional().allow(null, ""),
        ignoretax: Joi.number().integer().valid(0, 1),
        ignorediscount: Joi.number().integer().valid(0, 1),
        isnegativesale: Joi.number().integer().valid(0, 1),
        packageuom: Joi.number().integer().positive().required(),
        packingqty: Joi.number().integer().required(),
    }).min(1),

    updateStock: Joi.object({
        quantity: Joi.number().positive().required(),
        operation: Joi.string().valid("add", "subtract").default("add"),
    }),

    // Get Item Details validation
    getItems: Joi.object({
        categoryids: Joi.array()
            .items(Joi.number().integer().positive())
            .optional()
            .allow(null)
            .messages({
                "array.base": "categoryids must be an array",
            }),
        mastercategoryids: Joi.array()
            .items(Joi.number().integer().positive())
            .optional()
            .allow(null)
            .messages({
                "array.base": "mastercategoryids must be an array",
            }),
        subcategoryids: Joi.array()
            .items(Joi.number().integer().positive())
            .optional()
            .allow(null)
            .messages({
                "array.base": "subcategoryids must be an array",
            }),
        brandids: Joi.array()
            .items(Joi.number().integer().positive())
            .optional()
            .allow(null)
            .messages({
                "array.base": "brandids must be an array",
            }),
        start: Joi.number().integer().min(0).default(0).optional(),
        length: Joi.number().integer().min(1).max(100).default(20).optional(),
        search: Joi.string().trim().max(255).allow("", null).optional().default(""),
    }).custom((value, helpers) => {
        const hasCategories = value.categoryids && value.categoryids.length > 0;
        const hasMasterCategories = value.mastercategoryids && value.mastercategoryids.length > 0;
        const hasSubCategories = value.subcategoryids && value.subcategoryids.length > 0;

        // At least one category type must be provided
        if (!hasCategories && !hasMasterCategories && !hasSubCategories) {
            return helpers.error("any.required", {
                message:
                    "At least one of categoryids, mastercategoryids, or subcategoryids is required",
            });
        }

        // All combinations are now allowed
        return value;
    }),

    // Warehouse validation
    createWarehouse: Joi.object({
        warehousename: Joi.string().min(1).max(245).trim().required(),
        locationid: Joi.number().integer().positive().required(),
        isdefaultwarehouse: Joi.number().integer().valid(0, 1).default(0),
    }),

    updateWarehouse: Joi.object({
        warehousename: Joi.string().min(1).max(245).trim(),
        locationid: Joi.number().integer().positive(),
        isdefaultwarehouse: Joi.number().integer().valid(0, 1),
    }).min(1),

    // Role validation
    createRole: Joi.object({
        rolename: Joi.string().min(1).max(100).trim().required(),
    }),

    updateRole: Joi.object({
        rolename: Joi.string().min(1).max(100).trim(),
    }).min(1),

    // Permission validation
    createPermission: Joi.object({
        permissiontitle: Joi.string().min(1).max(100).trim().required(),
        permissioncode: Joi.string().min(1).max(45).trim().required(),
        permissiontype: Joi.number().integer().positive(),
        moduleid: Joi.number().integer().positive(),
        applicablefor: Joi.number().integer().valid(1, 2), // 1=web, 2=desktop
    }),

    updatePermission: Joi.object({
        permissiontitle: Joi.string().min(1).max(100).trim(),
        permissioncode: Joi.string().min(1).max(45).trim(),
        permissiontype: Joi.number().integer().positive(),
        moduleid: Joi.number().integer().positive(),
        applicablefor: Joi.number().integer().valid(1, 2), // 1=web, 2=desktop
    }).min(1),

    // POS Device validation
    registerPOSDevice: Joi.object({
        deviceid: Joi.string().min(1).max(50).trim().required(),
        devicename: Joi.string().min(1).max(100).trim().required(),
        location: Joi.string().max(255).trim().optional(),
        version: Joi.string().max(20).trim().optional(),
        ipadrress: Joi.string().ip().optional(),
        macaddress: Joi.string()
            .pattern(/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i)
            .optional(),
    }),

    updatePOSDevice: Joi.object({
        deviceid: Joi.string().min(1).max(50).trim(),
        devicename: Joi.string().min(1).max(100).trim(),
        location: Joi.string().max(255).trim(),
        version: Joi.string().max(20).trim(),
        ipadrress: Joi.string().ip(),
        macaddress: Joi.string().pattern(/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i),
        status: Joi.string().valid("active", "inactive", "suspended"),
    }).min(1),

    // ========================================
    // OTP VALIDATION RULES (Unified System)
    // ========================================

    // Send OTP - accepts both email and mobile (at least one required)
    // Sends SAME OTP to both email & WhatsApp
    sendOTP: Joi.object({
        email: Joi.string().email().lowercase().trim().optional().allow(null, ""),
        mobile: Joi.string()
            .pattern(/^[+]?[0-9]{10,15}$/)
            .optional()
            .allow(null, ""),
    })
        .or("email", "mobile")
        .messages({
            "object.missing": "At least one of email or mobile is required",
        }),

    // Verify OTP - accepts both email and mobile (at least one required)
    // Verifies OTP from either channel
    verifyOTP: Joi.object({
        email: Joi.string().email().lowercase().trim().optional().allow(null, ""),
        mobile: Joi.string()
            .pattern(/^[+]?[0-9]{10,15}$/)
            .optional()
            .allow(null, ""),
        otp: Joi.string()
            .pattern(/^[0-9]{6}$/)
            .required()
            .messages({
                "string.pattern.base": "OTP must be a 6-digit number",
            }),
    })
        .or("email", "mobile")
        .messages({
            "object.missing": "At least one of email or mobile is required",
        }),

    activatePOS: Joi.object({
        productKey: Joi.string().min(1).max(100).trim().required(),
        locationName: Joi.string().min(1).max(255).trim().required(),
        companyId: Joi.number().integer().optional().allow(null),
        userId: Joi.number().integer().positive().optional().allow(null),
        gstNumber: Joi.string().max(20).trim().optional().allow(null, ""),
        panNumber: Joi.string().max(15).trim().optional().allow(null, ""),
        username: Joi.string().min(3).max(100).trim().optional(),
        pinnumber: Joi.string().min(4).max(20).optional(),
        licenseType: Joi.string()
            .pattern(/^[1-3](,[1-3])*$/)
            .custom((value, helpers) => {
                if (!value || value.trim() === "") return value;

                const types = value.split(",").map((t) => t.trim());
                const uniqueTypes = [...new Set(types)];

                // Check for duplicates
                if (types.length !== uniqueTypes.length) {
                    return helpers.error("string.duplicates");
                }

                // Check for valid values only
                if (!uniqueTypes.every((type) => ["1", "2", "3"].includes(type))) {
                    return helpers.error("string.invalid");
                }

                return value;
            })
            .optional()
            .allow(null, "")
            .messages({
                "string.pattern.base":
                    "License type must be comma-separated values of 1, 2, or 3 (1=Seeds, 2=Fertilizer, 3=Pesticides)",
                "string.duplicates": "Duplicate license types are not allowed",
                "string.invalid": "License type can only contain values 1, 2, or 3",
            }),
        seedLicenseNumber: Joi.string()
            .max(50)
            .pattern(/^[a-zA-Z0-9\-]+$/)
            .trim()
            .optional()
            .allow(null, "")
            .messages({
                "string.pattern.base":
                    "Seeds license number can only contain alphanumeric characters and hyphens",
            }),
        seedLicenseDate: Joi.string().optional().allow(null, ""),
        fertilizerLicenseNumber: Joi.string()
            .max(50)
            .pattern(/^[a-zA-Z0-9\-]+$/)
            .trim()
            .optional()
            .allow(null, "")
            .messages({
                "string.pattern.base":
                    "Fertilizer license number can only contain alphanumeric characters and hyphens",
            }),
        fertilizerLicenseDate: Joi.string().optional().allow(null, ""),
        pesticidesLicenseNumber: Joi.string()
            .max(50)
            .pattern(/^[a-zA-Z0-9\-]+$/)
            .trim()
            .optional()
            .allow(null, "")
            .messages({
                "string.pattern.base":
                    "Pesticides license number can only contain alphanumeric characters and hyphens",
            }),
        pesticidesLicenseDate: Joi.string().optional().allow(null, ""),
        businessType: Joi.string().max(100).trim().optional().allow(null, ""),
        contactNumber: Joi.string()
            .pattern(/^[+]?[0-9]{10,15}$/)
            .required(),
        email: Joi.string().email().lowercase().trim().optional().allow(null, ""),
        address: Joi.string().max(500).trim().optional().allow(null, ""),
        countryId: Joi.number()
            .integer()
            .positive()
            .when("userId", {
                is: Joi.exist(),
                then: Joi.optional().allow(null), // countryId is optional when userId is provided
                otherwise: Joi.required(), // countryId is required for legacy flow
            }),
        stateId: Joi.number().integer().positive().optional().allow(null),
        cityId: Joi.number().integer().positive().optional().allow(null),
        areaCode: Joi.string().max(10).trim().optional().allow(null, ""),
        deviceId: Joi.string().min(1).max(100).trim().required(),
        ipAddress: Joi.string().ip().optional().allow(null),
        OTP: Joi.string()
            .pattern(/^[0-9]{6}$/)
            .when("userId", {
                is: Joi.exist(),
                then: Joi.optional().allow(null, ""), // OTP is optional when userId is provided
                otherwise: Joi.required(), // OTP is required when userId is not provided (legacy flow)
            }),
    }).custom((value, helpers) => {
        // Custom validation for license requirements based on licenseType
        const { licenseType } = value;

        if (!licenseType || licenseType.trim() === "") {
            return value; // If no license type specified, skip validation
        }

        // Parse license types (1=Seeds, 2=Fertilizer, 3=Pesticides)
        const licenseTypes = licenseType.split(",").map((type) => type.trim());
        const errors = [];

        // Check Seeds License (type 1)
        if (licenseTypes.includes("1")) {
            if (!value.seedLicenseNumber || value.seedLicenseNumber.trim() === "") {
                errors.push(
                    "Seeds license number is required when license type includes Seeds (1)"
                );
            }
            if (!value.seedLicenseDate || value.seedLicenseDate.toString().trim() === "") {
                errors.push("Seeds license date is required when license type includes Seeds (1)");
            }
        }

        // Check Fertilizer License (type 2)
        if (licenseTypes.includes("2")) {
            if (!value.pesticidesLicenseNumber || value.pesticidesLicenseNumber.trim() === "") {
                errors.push(
                    "Pesticides license number is required when license type includes Pesticides (2)"
                );
            }
            if (
                !value.pesticidesLicenseDate ||
                value.pesticidesLicenseDate.toString().trim() === ""
            ) {
                errors.push(
                    "Pesticides license date is required when license type includes Pesticides (2)"
                );
            }
        }

        // Check Pesticides License (type 3)
        if (licenseTypes.includes("3")) {
            if (!value.fertilizerLicenseNumber || value.fertilizerLicenseNumber.trim() === "") {
                errors.push(
                    "Fertilizer license number is required when license type includes Fertilizer (3)"
                );
            }
            if (
                !value.fertilizerLicenseDate ||
                value.fertilizerLicenseDate.toString().trim() === ""
            ) {
                errors.push(
                    "Fertilizer license date is required when license type includes Fertilizer (3)"
                );
            }
        }

        // If there are validation errors, return them
        if (errors.length > 0) {
            return helpers.error("any.custom", {
                message: errors.join(". "),
            });
        }

        return value;
    }, "License Type Validation"),

    reactivatePOS: Joi.object({
        productKey: Joi.string().min(1).max(100).trim().required(),
        contactNumber: Joi.string()
            .pattern(/^[+]?[0-9]{10,15}$/)
            .optional(),
        email: Joi.string().email().lowercase().trim().optional().allow(null, ""),
        countryId: Joi.number().integer().positive().required(),
        deviceId: Joi.string().min(1).max(100).trim().required(),
        ipAddress: Joi.string().ip().optional().allow(null),
        OTP: Joi.string()
            .pattern(/^[0-9]{6}$/)
            .required(),
        reactivePos: Joi.number().integer().valid(0, 1).optional(),
        username: Joi.string().min(3).max(100).trim().optional(),
        pinnumber: Joi.string().min(4).max(20).optional(),
    }),

    confirmActivation: Joi.object({
        productKey: Joi.string().min(1).max(100).trim().required(),
    }),

    reinstallPOS: Joi.object({
        productKey: Joi.string().min(1).max(100).trim().required(),
        hardwareId: Joi.string().min(1).max(100).trim().required(),
        locationName: Joi.string().min(1).max(255).trim().optional(),
        gstNumber: Joi.string().max(20).trim().optional().allow(null, ""),
        panNumber: Joi.string().max(15).trim().optional().allow(null, ""),
        businessType: Joi.string().max(100).trim().optional().allow(null, ""),
        contactNumber: Joi.string()
            .pattern(/^[+]?[0-9]{10,15}$/)
            .optional(),
        email: Joi.string().email().lowercase().trim().optional().allow(null, ""),
        address: Joi.string().max(500).trim().optional().allow(null, ""),
        countryId: Joi.number().integer().positive().optional().allow(null),
        stateId: Joi.number().integer().positive().optional().allow(null),
        cityId: Joi.number().integer().positive().optional().allow(null),
        areaCode: Joi.string().max(10).trim().optional().allow(null, ""),
        ipAddress: Joi.string().ip().optional().allow(null),
        username: Joi.string().min(3).max(100).trim().optional(),
        pinnumber: Joi.string().min(4).max(20).optional(),
    }),

    refreshPosToken: Joi.object({
        productKey: Joi.string().min(1).max(100).trim().required(),
        currentToken: Joi.string().required(),
    }),

    // DEVELOPMENT: Reset activation
    resetActivation: Joi.object({
        productKey: Joi.string().min(1).max(100).trim().required().messages({
            "string.empty": "Product key is required",
            "any.required": "Product key is required",
        }),
    }),

    // NEW INSTALLATION FLOW VALIDATION RULES

    // Step 1: Validate company and OTP
    validateCompanyAndOTP: Joi.object({
        phone: Joi.string()
            .pattern(/^[+]?[0-9]{10,15}$/)
            .required()
            .messages({
                "string.pattern.base": "Phone number must be between 10-15 digits",
                "any.required": "Phone number is required",
            }),
        email: Joi.string().email().lowercase().trim().required().messages({
            "string.email": "Please provide a valid email address",
            "any.required": "Email is required",
        }),
        productKey: Joi.string().min(1).max(100).trim().required().messages({
            "string.empty": "Product key is required",
            "string.min": "Product key is required",
            "string.max": "Product key cannot exceed 100 characters",
            "any.required": "Product key is required",
        }),
        deviceId: Joi.string().min(1).max(100).trim().required().messages({
            "string.empty": "Device ID is required",
            "string.min": "Device ID is required",
            "string.max": "Device ID cannot exceed 100 characters",
            "any.required": "Device ID is required",
        }),
        otp: Joi.string()
            .pattern(/^[0-9]{6}$/)
            .required()
            .messages({
                "string.pattern.base": "OTP must be exactly 6 digits",
                "any.required": "OTP is required",
            }),
        countryId: Joi.number().integer().positive().default(101).optional().messages({
            "number.positive": "Country ID must be positive",
        }),
    }),

    // Step 2: Register user and activate serial
    registerUserAndActivateSerial: Joi.object({
        companyId: Joi.number().integer().positive().required().messages({
            "number.base": "Company ID must be a number",
            "number.positive": "Company ID must be positive",
            "any.required": "Company ID is required",
        }),
        productKey: Joi.string().min(1).max(100).trim().required().messages({
            "string.empty": "Product key is required",
            "string.min": "Product key is required",
            "string.max": "Product key cannot exceed 100 characters",
            "any.required": "Product key is required",
        }),
        deviceId: Joi.string().min(1).max(100).trim().required().messages({
            "string.empty": "Device ID is required",
            "string.min": "Device ID is required",
            "string.max": "Device ID cannot exceed 100 characters",
            "any.required": "Device ID is required",
        }),
        username: Joi.string().min(3).max(100).trim().required().messages({
            "string.empty": "Username is required",
            "string.min": "Username must be at least 3 characters",
            "string.max": "Username cannot exceed 100 characters",
            "any.required": "Username is required",
        }),
        pinNumber: Joi.string()
            .min(4)
            .max(10)
            .pattern(/^[0-9]+$/)
            .required()
            .messages({
                "string.empty": "PIN number is required",
                "string.min": "PIN must be at least 4 digits",
                "string.max": "PIN cannot exceed 10 digits",
                "string.pattern.base": "PIN must contain only numbers",
                "any.required": "PIN number is required",
            }),
    }),

    // Step 3: Create or Update location for company
    // Works for both registration and logged-in flows
    createLocationForCompany: Joi.object({
        companyId: Joi.number().integer().positive().required().messages({
            "number.base": "Company ID must be a number",
            "number.positive": "Company ID must be positive",
            "any.required": "Company ID is required",
        }),
        locationId: Joi.number().integer().positive().optional().messages({
            "number.base": "Location ID must be a number",
            "number.positive": "Location ID must be positive",
        }),
        locationName: Joi.string().min(1).max(255).trim().required().messages({
            "string.empty": "Location name is required",
            "string.min": "Location name is required",
            "string.max": "Location name cannot exceed 255 characters",
            "any.required": "Location name is required",
        }),
        contactNumber: Joi.string()
            .pattern(/^[+]?[0-9]{10,15}$/)
            .required()
            .messages({
                "string.pattern.base": "Contact number must be between 10-15 digits",
                "any.required": "Contact number is required",
            }),
        deviceId: Joi.string().min(1).max(100).trim().optional().allow(null, "").messages({
            "string.min": "Device ID must be at least 1 character",
            "string.max": "Device ID cannot exceed 100 characters",
        }),
        email: Joi.string().email().lowercase().trim().optional().allow(null, "").messages({
            "string.email": "Please provide a valid email address",
        }),
        gstNumber: Joi.string().max(20).trim().optional().allow(null, "").messages({
            "string.max": "GST number cannot exceed 20 characters",
        }),
        panNumber: Joi.string().max(15).trim().optional().allow(null, "").messages({
            "string.max": "PAN number cannot exceed 15 characters",
        }),
        gstNotRegistered: Joi.number().integer().min(0).max(1).optional().allow(null).default(0).messages({
            "number.base": "GST not registered must be a number",
            "number.integer": "GST not registered must be an integer",
            "number.min": "GST not registered must be 0 or 1",
            "number.max": "GST not registered must be 0 or 1",
        }),
        licenseType: Joi.string()
            .pattern(/^[1-3](,[1-3])*$/)
            .custom((value, helpers) => {
                if (!value || value.trim() === "") return value;

                const types = value.split(",").map((t) => t.trim());
                const uniqueTypes = [...new Set(types)];

                // Check for duplicates
                if (types.length !== uniqueTypes.length) {
                    return helpers.error("string.duplicates");
                }

                // Check for valid values only
                if (!uniqueTypes.every((type) => ["1", "2", "3"].includes(type))) {
                    return helpers.error("string.invalid");
                }

                return value;
            })
            .optional()
            .allow(null, "")
            .messages({
                "string.pattern.base":
                    "License type must be comma-separated values of 1, 2, or 3 (1=Seeds, 2=Fertilizer, 3=Pesticides)",
                "string.duplicates": "Duplicate license types are not allowed",
                "string.invalid": "License type can only contain values 1, 2, or 3",
            }),
        seedLicenseNumber: Joi.string()
            .max(50)
            .pattern(/^[a-zA-Z0-9\-]+$/)
            .trim()
            .optional()
            .allow(null, "")
            .messages({
                "string.pattern.base":
                    "Seeds license number can only contain alphanumeric characters and hyphens",
            }),
        seedLicenseDate: Joi.string().optional().allow(null, ""),
        fertilizerLicenseNumber: Joi.string()
            .max(50)
            .pattern(/^[a-zA-Z0-9\-]+$/)
            .trim()
            .optional()
            .allow(null, "")
            .messages({
                "string.pattern.base":
                    "Fertilizer license number can only contain alphanumeric characters and hyphens",
            }),
        fertilizerLicenseDate: Joi.string().optional().allow(null, ""),
        pesticidesLicenseNumber: Joi.string()
            .max(50)
            .pattern(/^[a-zA-Z0-9\-]+$/)
            .trim()
            .optional()
            .allow(null, "")
            .messages({
                "string.pattern.base":
                    "Pesticides license number can only contain alphanumeric characters and hyphens",
            }),
        pesticidesLicenseDate: Joi.string().optional().allow(null, ""),
        address: Joi.string().max(500).trim().optional().allow(null, "").messages({
            "string.max": "Address cannot exceed 500 characters",
        }),
        countryId: Joi.number().integer().positive().optional().allow(null).messages({
            "number.positive": "Country ID must be positive",
        }),
        stateId: Joi.number().integer().positive().optional().allow(null).messages({
            "number.positive": "State ID must be positive",
        }),
        cityId: Joi.number().integer().positive().optional().allow(null).messages({
            "number.positive": "City ID must be positive",
        }),
        areaCode: Joi.string().max(10).trim().optional().allow(null, "").messages({
            "string.max": "Area code cannot exceed 10 characters",
        }),
        ipaddress: Joi.string().max(50).trim().optional().allow(null, "").messages({
            "string.max": "IP address cannot exceed 50 characters",
        }),
        ipAddress: Joi.string().optional().allow(null).messages({
            "any.required": "Please provide a valid IP address",
        }),
    }).custom((value, helpers) => {
        // Custom validation for license requirements based on licenseType
        const { licenseType } = value;

        if (!licenseType || licenseType.trim() === "") {
            return value; // If no license type specified, skip validation
        }

        // Parse license types (1=Seeds, 2=Fertilizer, 3=Pesticides)
        const licenseTypes = licenseType.split(",").map((type) => type.trim());
        const errors = [];

        // Check Seeds License (type 1)
        if (licenseTypes.includes("1")) {
            if (!value.seedLicenseNumber || value.seedLicenseNumber.trim() === "") {
                errors.push(
                    "Seeds license number is required when license type includes Seeds (1)"
                );
            }
            if (!value.seedLicenseDate || value.seedLicenseDate.toString().trim() === "") {
                errors.push("Seeds license date is required when license type includes Seeds (1)");
            }
        }

        // Check Fertilizer License (type 2)
        if (licenseTypes.includes("2")) {
            if (!value.fertilizerLicenseNumber || value.fertilizerLicenseNumber.trim() === "") {
                errors.push(
                    "Fertilizer license number is required when license type includes Fertilizer (2)"
                );
            }
            if (
                !value.fertilizerLicenseDate ||
                value.fertilizerLicenseDate.toString().trim() === ""
            ) {
                errors.push(
                    "Fertilizer license date is required when license type includes Fertilizer (2)"
                );
            }
        }

        // Check Pesticides License (type 3)
        if (licenseTypes.includes("3")) {
            if (!value.pesticidesLicenseNumber || value.pesticidesLicenseNumber.trim() === "") {
                errors.push(
                    "Pesticides license number is required when license type includes Pesticides (3)"
                );
            }
            if (
                !value.pesticidesLicenseDate ||
                value.pesticidesLicenseDate.toString().trim() === ""
            ) {
                errors.push(
                    "Pesticides license date is required when license type includes Pesticides (3)"
                );
            }
        }

        // If there are validation errors, return them
        if (errors.length > 0) {
            return helpers.error("any.custom", {
                message: errors.join(". "),
            });
        }

        return value;
    }, "License Type Validation"),

    // Universal Search validation
    universalSearch: Joi.object({
        filterType: Joi.string()
            .valid("product", "item", "brand", "supplier", "customer", "company")
            .required()
            .messages({
                "any.required": "Filter type is required",
                "any.only":
                    "Filter type must be one of: product, item, brand, supplier, customer, company",
            }),
        // For product/brand search
        searchKeyword: Joi.string().min(1).max(255).trim().optional().messages({
            "string.empty": "Search keyword cannot be empty",
            "string.max": "Search keyword cannot exceed 255 characters",
        }),
        // For supplier/customer/company search
        mobile: Joi.string().min(1).max(20).trim().optional().messages({
            "string.empty": "Mobile cannot be empty",
            "string.max": "Mobile cannot exceed 20 characters",
        }),
        gst: Joi.string().min(1).max(50).trim().optional().messages({
            "string.empty": "GST cannot be empty",
            "string.max": "GST cannot exceed 50 characters",
        }),
        panno: Joi.string().min(1).max(15).trim().optional().messages({
            "string.empty": "PAN number cannot be empty",
            "string.max": "PAN number cannot exceed 15 characters",
        }),
        mastercategoryId: Joi.number().integer().positive().optional().allow(null).messages({
            "number.positive": "Master category ID must be positive",
        }),
        companyId: Joi.number().integer().positive().optional().messages({
            "number.positive": "Company ID must be positive",
        })
    }).custom((value, helpers) => {
        const filterType = value.filterType?.toLowerCase();

        // For product/brand, searchKeyword is required
        if (["product", "item", "brand"].includes(filterType)) {
            if (!value.searchKeyword) {
                return helpers.error("any.required", {
                    message: "searchKeyword is required for product/brand search",
                });
            }
        }

        // For supplier/customer/company, at least mobile or gst is required
        if (["customer", "company"].includes(filterType)) {
            if (!value.mobile && !value.gst) {
                return helpers.error("any.required", {
                    message:
                        "Either mobile or gst is required for supplier/customer/company search",
                });
            }
        }
         if (["supplier"].includes(filterType)) {
            if (!value.panno && !value.gst) {
                return helpers.error("any.required", {
                    message:
                        "Either panno or gst is required for supplier search",
                });
            }
        }

        return value;
    }),

    // Item Supplier Mapping validation

    getItemsByCategory: Joi.object({
        categoryId: Joi.number().integer().positive().required(),
    }),

    mapMultipleSuppliersToItem: Joi.object({
        suppliers: Joi.array().items(Joi.number().integer().positive()).min(1).required().messages({
            "array.base": "suppliers must be an array",
            "array.min": "At least one supplier must be selected",
        }),
        itemId: Joi.number().integer().positive().required(),
    }),

    getItemSupplierMappingList: Joi.object({
        locationIds: Joi.array().items(Joi.number().integer().positive()).optional(),
        warehouseIds: Joi.array().items(Joi.number().integer().positive()).optional(),
        supplierIds: Joi.array().items(Joi.number().integer().positive()).optional(),
        categoryIds: Joi.array().items(Joi.number().integer().positive()).optional(),
        itemIds: Joi.array().items(Joi.number().integer().positive()).optional(),
        start: Joi.number().integer().min(0).default(0).optional(),
        length: Joi.number().integer().min(1).max(100).default(25).optional(),
        draw: Joi.number().integer().optional(),
        order: Joi.array()
            .items(
                Joi.object({
                    column: Joi.number().integer().min(0).max(10),
                    dir: Joi.string().valid("asc", "desc").default("desc"),
                })
            )
            .optional(),
        search: Joi.object({
            value: Joi.string().trim().max(255).allow("").optional(),
        }).optional(),
    }),

    deleteItemSupplierMapping: Joi.object({
        mappingId: Joi.number().integer().positive().required(),
    }),

    deleteMultipleItemSupplierMappings: Joi.object({
        mappingIds: Joi.array()
            .items(Joi.number().integer().positive())
            .min(1)
            .required()
            .messages({
                "array.base": "mappingIds must be an array",
                "array.min": "At least one mapping ID must be provided",
            }),
    }),

    getLocationsBySuppliers: Joi.object({
        supplierIds: Joi.array()
            .items(Joi.number().integer().positive())
            .min(1)
            .required()
            .messages({
                "array.base": "supplierIds must be an array",
                "array.min": "At least one supplier ID must be provided",
            }),
    }),

    getWarehousesByLocations: Joi.object({
        locationIds: Joi.array()
            .items(Joi.number().integer().positive())
            .min(1)
            .required()
            .messages({
                "array.base": "locationIds must be an array",
                "array.min": "At least one location ID must be provided",
            }),
    }),

    getFilteredData: Joi.object({
        locationIds: Joi.array().items(Joi.number().integer().positive()).optional(),
        supplierIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    }),

    // Warehouse Item Mapping validation
    getWarehousesByLocations: Joi.object({
        locationIds: Joi.array()
            .items(Joi.number().integer().positive())
            .min(1)
            .required()
            .messages({
                "array.base": "locationIds must be an array",
                "array.min": "At least one location ID must be provided",
            }),
    }),

    getItemsByCategories: Joi.object({
        categoryIds: Joi.array()
            .items(Joi.number().integer().positive())
            .min(1)
            .required()
            .messages({
                "array.base": "categoryIds must be an array",
                "array.min": "At least one category ID must be provided",
            }),
    }),

    mapItemsToWarehouses: Joi.object({
        items: Joi.array().items(Joi.number().integer().positive()).min(1).required().messages({
            "array.base": "items must be an array",
            "array.min": "At least one item must be selected",
        }),
        warehouses: Joi.array()
            .items(Joi.number().integer().positive())
            .min(1)
            .required()
            .messages({
                "array.base": "warehouses must be an array",
                "array.min": "At least one warehouse must be selected",
            }),
    }),

    getWarehouseItemMappingList: Joi.object({
        locationIds: Joi.array().items(Joi.number().integer().positive()).optional(),
        warehouseIds: Joi.array().items(Joi.number().integer().positive()).optional(),
        categoryIds: Joi.array().items(Joi.number().integer().positive()).optional(),
        itemIds: Joi.array().items(Joi.number().integer().positive()).optional(),
        start: Joi.number().integer().min(0).default(0).optional(),
        length: Joi.number().integer().min(1).max(100).default(25).optional(),
        draw: Joi.number().integer().optional(),
        order: Joi.array()
            .items(
                Joi.object({
                    column: Joi.number().integer().min(0).max(10),
                    dir: Joi.string().valid("asc", "desc").default("desc"),
                })
            )
            .optional(),
        search: Joi.object({
            value: Joi.string().trim().max(255).allow("").optional(),
        }).optional(),
    }),

    deleteWarehouseItemMapping: Joi.object({
        mappingId: Joi.number().integer().positive().required(),
    }),

    deleteMultipleWarehouseItemMappings: Joi.object({
        mappingIds: Joi.array()
            .items(Joi.number().integer().positive())
            .min(1)
            .required()
            .messages({
                "array.base": "mappingIds must be an array",
                "array.min": "At least one mapping ID must be provided",
            }),
    }),

    getWarehousesByItem: Joi.object({
        itemId: Joi.number().integer().positive().required(),
    }),

    getWarehouseFilteredData: Joi.object({
        locationIds: Joi.array().items(Joi.number().integer().positive()).optional(),
        warehouseIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    }),

    // Order Management Validation - Custom validator for better error reporting
    saveOrder: Joi.any()
        .custom((value, helpers) => {
            // Check if input is array (bulk orders) or single object
            const isArray = Array.isArray(value);

            // Define the base order schema - Updated for new payload structure
            const baseOrderSchema = Joi.object({
                orderid: Joi.number().integer().positive().optional().allow(null),
                uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).required().messages({
                    "string.base": "uniquekey must be a string",
                    "string.empty": "uniquekey cannot be empty",
                    "string.min": "uniquekey must be at least 1 character",
                    "string.max": "uniquekey cannot exceed 255 characters",
                    "any.required": "uniquekey is required",
                }),
                billno: Joi.string().max(30).optional().allow(null, ""),
                customerid: Joi.number().integer().min(0).optional().allow(null, 0),
                customeruniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                homedeliveryaddress: Joi.string().max(250).optional().allow(null, ""),
                orderdate: Joi.date().required().messages({
                    "date.base": "orderdate must be a valid date",
                    "any.required": "orderdate is required",
                }),
                amount: Joi.number().precision(5).min(0).required().messages({
                    "number.base": "amount must be a number",
                    "number.min": "amount must be at least 0",
                    "any.required": "amount is required",
                }),
                discountamount: Joi.number().precision(5).min(0).optional().allow(null),
                taxableamount: Joi.number().precision(5).min(0).optional().allow(null),
                totaltaxamount: Joi.number().precision(5).min(0).optional().allow(null),
                roundoff: Joi.number().precision(5).optional().allow(null),
                billprintcount: Joi.number().integer().min(0).optional().allow(null),
                totalcharges: Joi.number().precision(5).min(0).optional().allow(null),
                grandtotal: Joi.number().precision(5).min(0).required().messages({
                    "number.base": "grandtotal must be a number",
                    "number.min": "grandtotal must be at least 0",
                    "any.required": "grandtotal is required",
                }),
                ordertype: Joi.string().max(50).optional().allow(null, ""),
                remarks: Joi.string().max(450).optional().allow(null, ""),
                shiftid: Joi.number().integer().optional().allow(null),
                createdby: Joi.number().integer().positive().required().messages({
                    "number.base": "createdby must be a number",
                    "number.positive": "createdby must be positive",
                    "any.required": "createdby is required",
                }),
                createddate: Joi.date().required().messages({
                    "date.base": "createddate must be a valid date",
                    "any.required": "createddate is required",
                }),
                modifiedby: Joi.number().integer().positive().optional().allow(null),
                modifieddate: Joi.date().optional().allow(null),
                isdeleted: Joi.number().integer().valid(0, 1).default(0),
                posid: Joi.number().integer().positive().optional().allow(null),
                locationid: Joi.number().integer().positive().required().messages({
                    "number.base": "locationid must be a number",
                    "number.positive": "locationid must be positive",
                    "any.required": "locationid is required",
                }),
                companyid: Joi.number().integer().positive().required().messages({
                    "number.base": "companyid must be a number",
                    "number.positive": "companyid must be positive",
                    "any.required": "companyid is required",
                }),
                discountreasonid: Joi.number().integer().optional().allow(null),
                ipaddress: Joi.string().max(50).optional().allow(null, ""),
                datekey: Joi.number().integer().positive().required().messages({
                    "number.base": "datekey must be a number",
                    "number.positive": "datekey must be positive",
                    "any.required": "datekey is required",
                }),
                isreturn: Joi.number().integer().valid(0, 1).default(0),
                ismodified: Joi.number().integer().valid(0, 1).optional().allow(null),
                isadvance: Joi.number().integer().valid(0, 1).default(0),
                reservationdate: Joi.date().optional().allow(null),
                isonline: Joi.number().integer().valid(0, 1).default(0),
                onlineorderid: Joi.string().max(255).optional().allow(null, ""),
                channel: Joi.number().integer().valid(1, 2, 3).optional().allow(null),
                reprintremark: Joi.string().max(450).optional().allow(null, ""),

                // Order Invoice
                orderInvoice: Joi.array().optional().allow(null),

                // Order Products - accept both field names
                orderProducts: Joi.array().optional().allow(null),
                orderProductDetails: Joi.array().optional().allow(null),
                orderProductTaxDetails: Joi.array().optional().allow(null),

                // Payment Details
                paymentDetails: Joi.array().optional().allow(null),
                paymentMaster: Joi.array().optional().allow(null),

                // Payment Transaction Details
                paymentTransactionDetails: Joi.array().optional().allow(null),
                paymentTransactionMaster: Joi.array().optional().allow(null),
            });

            if (isArray) {
                // Validate as bulk orders
                if (value.length === 0) {
                    return helpers.error("array.min", { limit: 1, value });
                }
                if (value.length > 100) {
                    return helpers.error("array.max", { limit: 100, value });
                }

                // Validate each order in the array
                for (let i = 0; i < value.length; i++) {
                    const { error } = baseOrderSchema.validate(value[i], {
                        abortEarly: false,
                        stripUnknown: true,
                        convert: true,
                    });

                    if (error) {
                        // Return specific error for the order at index i
                        return helpers.error("any.custom", {
                            message: `Validation failed for order at index ${i}: ${error.details
                                .map((d) => `${d.path.join(".")} - ${d.message}`)
                                .join(", ")}`,
                        });
                    }
                }
            } else {
                // Validate as single order
                const { error } = baseOrderSchema.validate(value, {
                    abortEarly: false,
                    stripUnknown: true,
                    convert: true,
                });

                if (error) {
                    // Return specific field errors
                    return helpers.error("any.custom", {
                        message: `Validation failed: ${error.details
                            .map((d) => `${d.path.join(".")} - ${d.message}`)
                            .join(", ")}`,
                    });
                }
            }

            return value;
        }, "Order validation")
        .messages({
            "array.min": "At least one order is required for bulk orders",
            "array.max": "Maximum 100 orders allowed in bulk request",
            "any.custom": "{#message}",
        }),

    // Purchase Order Management Validation - Custom validator for better error reporting
    savePurchaseOrder: Joi.any()
        .custom((value, helpers) => {
            // Check if input is array (bulk orders) or single object
            const isArray = Array.isArray(value);

            // Define purchase order items tax details schema
            const purchaseOrderItemsTaxDetailsSchema = Joi.object({
                id: Joi.number().integer().optional().allow(null),
                orderitemstaxdetailsid: Joi.number().integer().optional().allow(null),
                orderitemsdetailsid: Joi.number().integer().required(),
                orderid: Joi.number().integer().required(),
                locationid: Joi.number().integer().positive().required(),
                taxid: Joi.number().integer().required(),
                taxamount: Joi.number().precision(5).min(0).required(),
                taxpercentage: Joi.number().precision(5).min(0).required(),
                isdeleted: Joi.number().integer().valid(0, 1).default(0),
                uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                companyid: Joi.number().integer().optional().allow(null),
                clientcreateddate: Joi.date().optional().allow(null),
                clientmodifieddate: Joi.date().optional().allow(null),
                clientcreatedby: Joi.number().integer().optional().allow(null),
                clientmodifiedby: Joi.number().integer().optional().allow(null),
                createdby: Joi.number().integer().optional().allow(null),
                createddate: Joi.date().optional().allow(null),
                modifiedby: Joi.number().integer().optional().allow(null),
                modifieddate: Joi.date().optional().allow(null),
            });

            // Define purchase order items details schema
            const purchaseOrderItemsDetailsSchema = Joi.object({
                orderitemsdetailsid: Joi.number().integer().required().messages({
                    "number.base": "orderitemsdetailsid must be a number",
                    "any.required": "orderitemsdetailsid is required",
                }),
                orderid: Joi.number().integer().required(),
                itemid: Joi.number().integer().required(),
                fatvalue: Joi.number().optional().allow(null),
                effectiveid: Joi.number().optional().allow(null),
                productuniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                taxprofileid: Joi.number().integer().optional().allow(null),
                locationid: Joi.number().integer().positive().required(),
                uomid: Joi.number().integer().optional().allow(null),
                lastprice: Joi.number().precision(5).optional().allow(null),
                unitprice: Joi.number().precision(5).required(),
                baseprice: Joi.number().precision(5).optional().allow(null),
                quantity: Joi.number().precision(5).min(0).required(),
                totalamount: Joi.number().precision(5).min(0).required(),
                discountpercent: Joi.number().precision(5).min(0).optional().allow(null),
                discountamount: Joi.number().precision(5).min(0).optional().allow(null),
                taxableamount: Joi.number().precision(5).min(0).optional().allow(null),
                cessamount: Joi.number().precision(5).optional().allow(null),
                cesspercent: Joi.number().precision(5).optional().allow(null),
                taxamount: Joi.number().precision(5).min(0).optional().allow(null),
                totaltaxamount: Joi.number().precision(5).min(0).optional().allow(null),
                expirydate: Joi.string().optional().allow(null),
                islabelprinted: Joi.number().integer().valid(0, 1).optional().allow(null),
                isdeleted: Joi.number().integer().valid(0, 1).default(0),
                ipaddress: Joi.string().max(50).optional().allow(null, ""),
                remarks: Joi.string().max(200).optional().allow(null, ""),
                batchid: Joi.string().max(100).optional().allow(null, ""),
                batchdate: Joi.string().optional().allow(null),
                uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                companyid: Joi.number().integer().optional().allow(null),
                clientcreateddate: Joi.date().optional().allow(null),
                clientmodifieddate: Joi.date().optional().allow(null),
                clientcreatedby: Joi.number().integer().optional().allow(null),
                clientmodifiedby: Joi.number().integer().optional().allow(null),
                createdby: Joi.number().integer().optional().allow(null),
                createddate: Joi.date().optional().allow(null),
                modifiedby: Joi.number().integer().optional().allow(null),
                modifieddate: Joi.date().optional().allow(null),
                purchaseOrderItemsTaxDetails: Joi.array()
                    .items(purchaseOrderItemsTaxDetailsSchema)
                    .optional()
                    .allow(null),
            });

            // Define the base purchase order schema
            const basePurchaseOrderSchema = Joi.object({
                orderid: Joi.number().integer().required().messages({
                    "number.base": "orderid must be a number",
                    "any.required": "orderid is required",
                }),
                locationid: Joi.number().integer().positive().required().messages({
                    "number.base": "locationid must be a number",
                    "number.positive": "locationid must be positive",
                    "any.required": "locationid is required",
                }),
                supplierid: Joi.number().integer().required().messages({
                    "number.base": "supplierid must be a number",
                    "any.required": "supplierid is required",
                }),
                smuniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                ordernumber: Joi.string().max(50).required().messages({
                    "string.base": "ordernumber must be a string",
                    "string.max": "ordernumber cannot exceed 50 characters",
                    "any.required": "ordernumber is required",
                }),
                datekey: Joi.number().integer().required().messages({
                    "number.base": "datekey must be a number",
                    "any.required": "datekey is required",
                }),
                referencebillnumber: Joi.string().max(50).optional().allow(null, ""),
                referencechallannumber: Joi.string().max(50).optional().allow(null, ""),
                purchaseorderdate: Joi.date().required().messages({
                    "date.base": "purchaseorderdate must be a valid date",
                    "any.required": "purchaseorderdate is required",
                }),
                expectedorderdate: Joi.date().optional().allow(null),
                remarks: Joi.string().max(200).optional().allow(null, ""),
                totalamount: Joi.number().precision(5).min(0).required().messages({
                    "number.base": "totalamount must be a number",
                    "number.min": "totalamount must be at least 0",
                    "any.required": "totalamount is required",
                }),
                discounttype: Joi.number().integer().valid(0, 1, 2).default(0),
                discountpercentamt: Joi.number().precision(5).min(0).optional().allow(null),
                totaltaxableamount: Joi.number().precision(5).min(0).required(),
                additionalcharge: Joi.number().precision(5).min(0).optional().allow(null),
                roundoffamount: Joi.number().precision(5).optional().allow(null),
                totalcessamt: Joi.number().precision(5).min(0).optional().allow(null),
                totaltax: Joi.number().precision(5).min(0).optional().allow(null),
                grandtotal: Joi.number().precision(5).min(0).required().messages({
                    "number.base": "grandtotal must be a number",
                    "number.min": "grandtotal must be at least 0",
                    "any.required": "grandtotal is required",
                }),
                orderstatus: Joi.number().integer().valid(1, 2, 3).default(1),
                potype: Joi.number().integer().valid(0, 1, 2).default(0),
                isdeleted: Joi.number().integer().valid(0, 1).default(0),
                ipaddress: Joi.string().max(50).required().messages({
                    "string.base": "ipaddress must be a string",
                    "any.required": "ipaddress is required",
                }),
                companyid: Joi.number().integer().optional().allow(null),
                uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).required().messages({
                    "number.base": "uniquekey must be a number",
                    "any.required": "uniquekey is required",
                }),
                clientcreateddate: Joi.date().optional().allow(null),
                clientmodifieddate: Joi.date().optional().allow(null),
                clientcreatedby: Joi.number().integer().optional().allow(null),
                clientmodifiedby: Joi.number().integer().optional().allow(null),
                createdby: Joi.number().integer().required().messages({
                    "number.base": "createdby must be a number",
                    "any.required": "createdby is required",
                }),
                createddate: Joi.date().required().messages({
                    "date.base": "createddate must be a valid date",
                    "any.required": "createddate is required",
                }),
                modifiedby: Joi.number().integer().optional().allow(null),
                modifieddate: Joi.date().optional().allow(null),
                issynce: Joi.number().integer().valid(0, 1).default(0),

                // Purchase Order Items Details
                purchaseOrderItemsDetails: Joi.array()
                    .items(purchaseOrderItemsDetailsSchema)
                    .min(1)
                    .required()
                    .messages({
                        "array.base": "purchaseOrderItemsDetails must be an array",
                        "array.min": "At least one item is required",
                        "any.required": "purchaseOrderItemsDetails is required",
                    }),
            });

            if (isArray) {
                // Validate as bulk purchase orders
                if (value.length === 0) {
                    return helpers.error("array.min", { limit: 1, value });
                }
                if (value.length > 100) {
                    return helpers.error("array.max", { limit: 100, value });
                }

                // Validate each purchase order in the array
                for (let i = 0; i < value.length; i++) {
                    const { error } = basePurchaseOrderSchema.validate(value[i], {
                        abortEarly: false,
                        stripUnknown: true,
                        convert: true,
                    });

                    if (error) {
                        // Return specific error for the purchase order at index i
                        return helpers.error("any.custom", {
                            message: `Validation failed for purchase order at index ${i}: ${error.details
                                .map((d) => `${d.path.join(".")} - ${d.message}`)
                                .join(", ")}`,
                        });
                    }
                }
            } else {
                // Validate as single purchase order
                const { error } = basePurchaseOrderSchema.validate(value, {
                    abortEarly: false,
                    stripUnknown: true,
                    convert: true,
                });

                if (error) {
                    // Return specific field errors
                    return helpers.error("any.custom", {
                        message: `Validation failed: ${error.details
                            .map((d) => `${d.path.join(".")} - ${d.message}`)
                            .join(", ")}`,
                    });
                }
            }

            return value;
        }, "Purchase Order validation")
        .messages({
            "array.min": "At least one purchase order is required for bulk orders",
            "array.max": "Maximum 100 purchase orders allowed in bulk request",
            "any.custom": "{#message}",
        }),

    // Purchase Return Management Validation - Custom validator for better error reporting
    savePurchaseReturn: Joi.any()
        .custom((value, helpers) => {
            // Check if input is array (bulk returns) or single object
            const isArray = Array.isArray(value);

            // Define purchase return items details schema
            const purchaseReturnItemsDetailsSchema = Joi.object({
                returnitemsdetailsid: Joi.number().integer().required().messages({
                    "number.base": "returnitemsdetailsid must be a number",
                    "any.required": "returnitemsdetailsid is required",
                }),
                returnid: Joi.number().integer().required(),
                itemid: Joi.number().integer().required(),
                productuniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                taxprofileid: Joi.number().integer().optional().allow(null),
                locationid: Joi.number().integer().positive().required(),
                uomid: Joi.number().integer().optional().allow(null),
                unitprice: Joi.number().precision(5).required(),
                quantity: Joi.number().precision(5).min(0).required(),
                totalamount: Joi.number().precision(5).min(0).required(),
                discountpercent: Joi.number().precision(5).min(0).optional().allow(null),
                discountamount: Joi.number().precision(5).min(0).optional().allow(null),
                taxableamount: Joi.number().precision(5).min(0).optional().allow(null),
                cessamount: Joi.number().precision(5).optional().allow(null),
                cesspercent: Joi.number().precision(5).optional().allow(null),
                taxamount: Joi.number().precision(5).min(0).optional().allow(null),
                totaltaxamount: Joi.number().precision(5).min(0).optional().allow(null),
                expirydate: Joi.date().optional().allow(null),
                isdeleted: Joi.number().integer().valid(0, 1).default(0),
                ipaddress: Joi.string().max(50).optional().allow(null, ""),
                remarks: Joi.string().max(200).optional().allow(null, ""),
                batchid: Joi.string().max(100).optional().allow(null, ""),
                batchdate: Joi.date().optional().allow(null),
                uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                companyid: Joi.number().integer().optional().allow(null),
                clientcreateddate: Joi.date().optional().allow(null),
                clientmodifieddate: Joi.date().optional().allow(null),
                clientcreatedby: Joi.number().integer().optional().allow(null),
                clientmodifiedby: Joi.number().integer().optional().allow(null),
                createdby: Joi.number().integer().optional().allow(null),
                createddate: Joi.date().optional().allow(null),
                modifiedby: Joi.number().integer().optional().allow(null),
                modifieddate: Joi.date().optional().allow(null),
            });

            // Define purchase return items tax details schema
            const purchaseReturnItemsTaxDetailsSchema = Joi.object({
                id: Joi.number().integer().optional().allow(null),
                returnitemstaxdetailsid: Joi.number().integer().optional().allow(null),
                returnitemsdetailsid: Joi.number().integer().required(),
                returnid: Joi.number().integer().required(),
                locationid: Joi.number().integer().positive().required(),
                taxid: Joi.number().integer().required(),
                taxamount: Joi.number().precision(5).min(0).required(),
                taxpercentage: Joi.number().precision(5).min(0).required(),
                isdeleted: Joi.number().integer().valid(0, 1).default(0),
                uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                companyid: Joi.number().integer().optional().allow(null),
                clientcreateddate: Joi.date().optional().allow(null),
                clientmodifieddate: Joi.date().optional().allow(null),
                clientcreatedby: Joi.number().integer().optional().allow(null),
                clientmodifiedby: Joi.number().integer().optional().allow(null),
                createdby: Joi.number().integer().optional().allow(null),
                createddate: Joi.date().optional().allow(null),
                modifiedby: Joi.number().integer().optional().allow(null),
                modifieddate: Joi.date().optional().allow(null),
            });

            // Define the base purchase return schema
            const basePurchaseReturnSchema = Joi.object({
                returnid: Joi.number().integer().required().messages({
                    "number.base": "returnid must be a number",
                    "any.required": "returnid is required",
                }),
                locationid: Joi.number().integer().positive().required().messages({
                    "number.base": "locationid must be a number",
                    "number.positive": "locationid must be positive",
                    "any.required": "locationid is required",
                }),
                supplierid: Joi.number().integer().required().messages({
                    "number.base": "supplierid must be a number",
                    "any.required": "supplierid is required",
                }),
                purchaseorderid: Joi.number().integer().optional().allow(null),
                smuniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                returnnumber: Joi.string().max(50).optional().allow(null, ""),
                datekey: Joi.number().integer().required().messages({
                    "number.base": "datekey must be a number",
                    "any.required": "datekey is required",
                }),
                referencebillnumber: Joi.string().max(50).optional().allow(null, ""),
                referencechallannumber: Joi.string().max(50).optional().allow(null, ""),
                debitnotenumber: Joi.string().max(50).optional().allow(null, ""),
                purchaseorderreturndate: Joi.date().required().messages({
                    "date.base": "purchaseorderreturndate must be a valid date",
                    "any.required": "purchaseorderreturndate is required",
                }),
                remarks: Joi.string().max(200).optional().allow(null, ""),
                totalamount: Joi.number().precision(5).min(0).required().messages({
                    "number.base": "totalamount must be a number",
                    "number.min": "totalamount must be at least 0",
                    "any.required": "totalamount is required",
                }),
                discounttype: Joi.number().integer().valid(0, 1, 2).default(0),
                discountpercentamt: Joi.number().precision(5).min(0).optional().allow(null),
                totaltaxableamount: Joi.number().precision(5).min(0).required(),
                additionalcharge: Joi.number().precision(5).min(0).optional().allow(null),
                roundoffamount: Joi.number().precision(5).optional().allow(null),
                totalcessamt: Joi.number().precision(5).min(0).optional().allow(null),
                totaltax: Joi.number().precision(5).min(0).optional().allow(null),
                grandtotal: Joi.number().precision(5).min(0).required().messages({
                    "number.base": "grandtotal must be a number",
                    "number.min": "grandtotal must be at least 0",
                    "any.required": "grandtotal is required",
                }),
                isdeleted: Joi.number().integer().valid(0, 1).default(0),
                ipaddress: Joi.string().max(50).required().messages({
                    "string.base": "ipaddress must be a string",
                    "any.required": "ipaddress is required",
                }),
                companyid: Joi.number().integer().optional().allow(null),
                uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).required().messages({
                    "number.base": "uniquekey must be a number",
                    "any.required": "uniquekey is required",
                }),
                clientcreateddate: Joi.date().optional().allow(null),
                clientmodifieddate: Joi.date().optional().allow(null),
                clientcreatedby: Joi.number().integer().optional().allow(null),
                clientmodifiedby: Joi.number().integer().optional().allow(null),
                createdby: Joi.number().integer().required().messages({
                    "number.base": "createdby must be a number",
                    "any.required": "createdby is required",
                }),
                createddate: Joi.date().required().messages({
                    "date.base": "createddate must be a valid date",
                    "any.required": "createddate is required",
                }),
                modifiedby: Joi.number().integer().optional().allow(null),
                modifieddate: Joi.date().optional().allow(null),

                // Purchase Return Items Details
                purchaseReturnItemsDetails: Joi.array()
                    .items(purchaseReturnItemsDetailsSchema)
                    .min(1)
                    .required()
                    .messages({
                        "array.base": "purchaseReturnItemsDetails must be an array",
                        "array.min": "At least one item is required",
                        "any.required": "purchaseReturnItemsDetails is required",
                    }),

                // Purchase Return Items Tax Details
                purchaseReturnItemsTaxDetails: Joi.array()
                    .items(purchaseReturnItemsTaxDetailsSchema)
                    .optional()
                    .allow(null),
            });

            if (isArray) {
                // Validate as bulk purchase returns
                if (value.length === 0) {
                    return helpers.error("array.min", { limit: 1, value });
                }
                if (value.length > 100) {
                    return helpers.error("array.max", { limit: 100, value });
                }

                // Validate each purchase return in the array
                for (let i = 0; i < value.length; i++) {
                    const { error } = basePurchaseReturnSchema.validate(value[i], {
                        abortEarly: false,
                        stripUnknown: true,
                        convert: true,
                    });

                    if (error) {
                        // Return specific error for the purchase return at index i
                        return helpers.error("any.custom", {
                            message: `Validation failed for purchase return at index ${i}: ${error.details
                                .map((d) => `${d.path.join(".")} - ${d.message}`)
                                .join(", ")}`,
                        });
                    }
                }
            } else {
                // Validate as single purchase return
                const { error } = basePurchaseReturnSchema.validate(value, {
                    abortEarly: false,
                    stripUnknown: true,
                    convert: true,
                });

                if (error) {
                    // Return specific field errors
                    return helpers.error("any.custom", {
                        message: `Validation failed: ${error.details
                            .map((d) => `${d.path.join(".")} - ${d.message}`)
                            .join(", ")}`,
                    });
                }
            }

            return value;
        }, "Purchase Return validation")
        .messages({
            "array.min": "At least one purchase return is required for bulk returns",
            "array.max": "Maximum 100 purchase returns allowed in bulk request",
            "any.custom": "{#message}",
        }),

    // Sales Return Management Validation - Custom validator for better error reporting
    saveSalesReturn: Joi.any()
        .custom((value, helpers) => {
            // Check if input is array (bulk returns) or single object
            const isArray = Array.isArray(value);

            // Define sales return product details schema
            const salesReturnProductDetailsSchema = Joi.object({
                returnsaleorderproductid: Joi.number().integer().required(),
                returnsaleorderid: Joi.number().integer().required(),
                productid: Joi.number().integer().optional().allow(null),
                unitprice: Joi.number().precision(5).optional().allow(null),
                orderedquantity: Joi.number().precision(5).optional().allow(null),
                returnquantity: Joi.number().precision(5).optional().allow(null),
                wastagequantity: Joi.number().precision(5).optional().allow(null),
                totalamount: Joi.number().precision(5).optional().allow(null),
                discountamount: Joi.number().precision(5).optional().allow(null),
                taxableamount: Joi.number().precision(5).optional().allow(null),
                taxamount: Joi.number().precision(5).optional().allow(null),
                totaltaxamount: Joi.number().precision(5).optional().allow(null),
                batchid: Joi.string().max(50).optional().allow(null, ""),
                batchdate: Joi.date().optional().allow(null),
                locationid: Joi.number().integer().optional().allow(null),
                uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                pmuniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null),
                datekey: Joi.number().integer().optional().allow(null),
                companyid: Joi.number().integer().optional().allow(null),
                isdeleted: Joi.number().integer().valid(0, 1).default(0),
                createdby: Joi.number().integer().optional().allow(null),
                createddate: Joi.date().optional().allow(null),
                modifiedby: Joi.number().integer().optional().allow(null),
                modifieddate: Joi.date().optional().allow(null),
            });

            // Define sales return product tax details schema
            const salesReturnProductTaxDetailsSchema = Joi.object({
                returnorderproducttaxdetailsid: Joi.number().integer().optional().allow(null),
                returnsaleorderid: Joi.number().integer().optional().allow(null),
                returnsaleorderproductid: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
                returnorderproducttaxdetailscol: Joi.string().max(45).optional().allow(null, ""),
                taxprofiledetailsid: Joi.number().integer().optional().allow(null),
                taxid: Joi.number().integer().optional().allow(null),
                taxpercentage: Joi.number().precision(5).optional().allow(null),
                taxamount: Joi.number().precision(5).optional().allow(null),
                locationid: Joi.number().integer().optional().allow(null),
                companyid: Joi.number().integer().optional().allow(null),
                uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                datekey: Joi.number().integer().optional().allow(null),
                isdeleted: Joi.number().integer().valid(0, 1).default(0),
                createdby: Joi.number().integer().optional().allow(null),
                createddate: Joi.date().optional().allow(null),
                modifiedby: Joi.number().integer().optional().allow(null),
                modifieddate: Joi.date().optional().allow(null),
            });

            // Define the base sales return schema
            const baseSalesReturnSchema = Joi.object({
                returnorderid: Joi.number().integer().required(),
                orderid: Joi.number().integer().optional().allow(null),
                creditnumber: Joi.string().max(50).optional().allow(null, ""),
                customerid: Joi.number().integer().optional().allow(null),
                returndate: Joi.date().required(),
                amount: Joi.number().precision(5).optional().allow(null),
                taxableamount: Joi.number().precision(5).optional().allow(null),
                discountamount: Joi.number().precision(5).optional().allow(null),
                totaltaxamount: Joi.number().precision(5).required(),
                roundoff: Joi.number().precision(5).optional().allow(null),
                grandtotal: Joi.number().precision(5).optional().allow(null),
                remarks: Joi.string().max(450).optional().allow(null, ""),
                gtbeforesalereturn: Joi.number().precision(5).optional().allow(null),
                gtaftersalereturn: Joi.number().precision(5).optional().allow(null),
                companyid: Joi.number().integer().optional().allow(null),
                locationid: Joi.number().integer().optional().allow(null),
                uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
                omuniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null),
                datekey: Joi.number().integer().optional().allow(null),
                isdeleted: Joi.number().integer().valid(0, 1).default(0),
                type: Joi.string().max(45).optional().allow(null, ""),
                isexchange: Joi.number().integer().valid(0, 1).optional().allow(null),
                issync: Joi.number().integer().valid(0, 1).default(0),
                createdby: Joi.number().integer().optional().allow(null),
                createddate: Joi.date().optional().allow(null),
                modifiedby: Joi.number().integer().optional().allow(null),
                modifieddate: Joi.date().optional().allow(null),

                // Sales Return Product Details
                salesReturnProductDetails: Joi.array()
                    .items(salesReturnProductDetailsSchema)
                    .min(1)
                    .required(),

                // Sales Return Product Tax Details (optional)
                salesReturnProductTaxDetails: Joi.array()
                    .items(salesReturnProductTaxDetailsSchema)
                    .optional()
                    .allow(null),
            });

            if (isArray) {
                // Validate as bulk sales returns
                if (value.length === 0) {
                    return helpers.error("array.min", { limit: 1, value });
                }
                if (value.length > 100) {
                    return helpers.error("array.max", { limit: 100, value });
                }

                // Validate each sales return in the array
                for (let i = 0; i < value.length; i++) {
                    const { error } = baseSalesReturnSchema.validate(value[i], {
                        abortEarly: false,
                        stripUnknown: true,
                        convert: true,
                    });

                    if (error) {
                        // Return specific error for the sales return at index i
                        return helpers.error("any.custom", {
                            message: `Validation failed for sales return at index ${i}: ${error.details
                                .map((d) => `${d.path.join(".")} - ${d.message}`)
                                .join(", ")}`,
                        });
                    }
                }
            } else {
                // Validate as single sales return
                const { error } = baseSalesReturnSchema.validate(value, {
                    abortEarly: false,
                    stripUnknown: true,
                    convert: true,
                });

                if (error) {
                    // Return specific field errors
                    return helpers.error("any.custom", {
                        message: `Validation failed: ${error.details
                            .map((d) => `${d.path.join(".")} - ${d.message}`)
                            .join(", ")}`,
                    });
                }
            }

            return value;
        }, "Sales Return validation")
        .messages({
            "array.min": "At least one sales return is required for bulk returns",
            "array.max": "Maximum 100 sales returns allowed in bulk request",
            "any.custom": "{#message}",
        }),

    // POS Customer validation rules
    saveCustomers: Joi.object({
        customers: Joi.array()
            .items(
                Joi.object({
                    customerid: Joi.number().integer().positive().required(),
                    customeruniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                    companyid: Joi.number().integer().positive().required(),
                    name: Joi.string().max(200).optional().allow(null, ""),
                    phoneno: Joi.string().max(30).optional().allow(null, ""),
                    email: Joi.string().email().max(100).optional().allow(null, ""),
                    outstandingamt: Joi.number().optional().default(0),
                    overduelimit: Joi.number().optional().default(0),
                    birthdate: Joi.alternatives().try(Joi.date(), Joi.string()).optional().allow(null, ""),
                    anniversarydate: Joi.alternatives().try(Joi.date(), Joi.string()).optional().allow(null, ""),
                    panno: Joi.string().max(50).optional().allow(null, ""),
                    gstno: Joi.string().max(50).optional().allow(null, ""),
                    createdby: Joi.number().integer().positive().optional().allow(null),
                    createddate: Joi.date().optional().allow(null),
                    modifiedby: Joi.number().integer().positive().optional().allow(null),
                    modifieddate: Joi.date().optional().allow(null),
                    isdeleted: Joi.number().integer().valid(0, 1).default(0),
                    pincodeno: Joi.string().max(50).optional().allow(null, ""),
                    contactpersonname: Joi.string().max(50).optional().allow(null, ""),
                    smsalert: Joi.number().integer().valid(0, 1).default(0),
                    iscompany: Joi.number().integer().valid(0, 1).default(0),
                    stateid: Joi.number().integer().min(0).optional().allow(null),
                    cityid: Joi.number().integer().min(0).optional().allow(null),
                    countryid: Joi.number().integer().min(0).optional().allow(null),
                    countrycode: Joi.number().integer().optional().allow(null),
                    address: Joi.string().max(200).optional().allow(null, ""),
                    aadharnum: Joi.string().max(45).optional().allow(null, ""),
                    agrilanddata: Joi.string().optional().allow(null, ""),
                    cropgrown1: Joi.string().max(45).optional().allow(null, ""),
                    cropgrown2: Joi.string().max(45).optional().allow(null, ""),
                    cropgrown3: Joi.string().max(45).optional().allow(null, ""),
                    residencedocument: Joi.binary().optional().allow(null),
                    iddocument: Joi.binary().optional().allow(null),
                    uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                    issync: Joi.number().integer().valid(0, 1).default(0),
                    clientcreatedby: Joi.number().integer().optional().allow(null),
                    clientcreateddate: Joi.date().optional().allow(null),
                    clientmodifiedby: Joi.number().integer().optional().allow(null),
                    clientmodifieddate: Joi.date().optional().allow(null),
                })
            )
            .min(1)
            .required()
            .messages({
                "array.base": "Customers must be an array",
                "array.min": "At least one customer is required",
            }),
    }),

    saveCustomerDetails: Joi.object({
        customerDetails: Joi.array()
            .items(
                Joi.object({
                    uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
                    customeraccountid: Joi.number().integer().positive().required(),
                    customerid: Joi.number().integer().positive().required(),
                    locationid: Joi.number().integer().required(),
                    companyid: Joi.number().integer().positive().required(),
                    creditamount: Joi.number().optional().allow(null).default(0),
                    debitamount: Joi.number().optional().allow(null).default(0),
                    balance: Joi.number().optional().allow(null).default(0),
                    paymentdate: Joi.date().optional().allow(null),
                    datekey: Joi.number().integer().optional().allow(null),
                    createdby: Joi.number().integer().positive().optional().allow(null),
                    createddate: Joi.date().optional().allow(null),
                    modifiedby: Joi.number().integer().positive().optional().allow(null),
                    modifieddate: Joi.date().optional().allow(null),
                    isdeleted: Joi.number().integer().valid(0, 1).default(0),
                    description: Joi.string().max(500).optional().allow(null, ""),
                    paymodeid: Joi.number().integer().positive().optional().allow(null),
                    // Client tracking fields
                    clientcreatedby: Joi.number().integer().optional().allow(null),
                    clientcreateddate: Joi.date().optional().allow(null),
                    clientmodifiedby: Joi.number().integer().optional().allow(null),
                    clientmodifieddate: Joi.date().optional().allow(null),
                    cmuniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                    reciptno: Joi.number().optional().allow(null),
                    txntype: Joi.number().optional().allow(null),
                    shiftid: Joi.number().optional().allow(null),
                })
            )
            .min(1)
            .required()
            .messages({
                "array.base": "Customer details must be an array",
                "array.min": "At least one customer detail is required",
            }),
    }),

    // Supplier validation
    saveSuppliers: Joi.object({
        suppliers: Joi.array()
            .items(
                Joi.object({
                    supplierid: Joi.number().integer().positive().required(),
                    suppliername: Joi.string().max(250).optional().allow(null, ""),
                    address: Joi.string().optional().allow(null, ""),
                    gstno: Joi.string().max(25).optional().allow(null, ""),
                    panno: Joi.string().max(25).optional().allow(null, ""),
                    vatno: Joi.string().max(25).optional().allow(null, ""),
                    phoneno: Joi.string().max(15).optional().allow(null, ""),
                    email: Joi.string().email().max(100).optional().allow(null, ""),
                    pincode: Joi.string().max(45).optional().allow(null, ""),
                    contactperson: Joi.string().max(145).optional().allow(null, ""),
                    countryid: Joi.number().integer().positive().optional().allow(null),
                    stateid: Joi.number().integer().positive().optional().allow(null),
                    cityid: Joi.number().integer().positive().optional().allow(null),
                    supplierimage: Joi.string().optional().allow(null, ""),
                    outstandingamt: Joi.number().precision(5).optional().default(0),
                    overduelimit: Joi.number().precision(5).optional().default(0),
                    uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                    seedslicensenumber: Joi.string().max(50).optional().allow(null, ""),
                    seedslicensedate: Joi.alternatives()
                        .try(Joi.date(), Joi.string().valid("0000-00-00", ""))
                        .optional()
                        .allow(null),
                    fertilizerlicensenumber: Joi.string().max(50).optional().allow(null, ""),
                    fertilizerlicensedate: Joi.alternatives()
                        .try(Joi.date(), Joi.string().valid("0000-00-00", ""))
                        .optional()
                        .allow(null),
                    pesticideslicensenumber: Joi.string().max(50).optional().allow(null, ""),
                    pesticideslicensedate: Joi.alternatives()
                        .try(Joi.date(), Joi.string().valid("0000-00-00", ""))
                        .optional()
                        .allow(null),
                    isactive: Joi.number().integer().valid(0, 1).default(1),
                    isapproved: Joi.number().integer().valid(0, 1).default(0),
                    approvalremark: Joi.string().max(255).optional().allow(null, ""),
                    replacewith: Joi.number().integer().optional().allow(null),
                    licensetype: Joi.string().max(50).optional().allow(null, ""),
                    isdeleted: Joi.number().integer().valid(0, 1).default(0),
                    ipaddress: Joi.string().max(50).optional().allow(null, ""),
                    clientcreateddate: Joi.date().optional().allow(null),
                    clientmodifieddate: Joi.date().optional().allow(null),
                    clientcreatedby: Joi.number().integer().optional().allow(null),
                    clientmodifiedby: Joi.number().integer().optional().allow(null, 0),
                    createdby: Joi.number().integer().optional().allow(null),
                    createddate: Joi.date().optional().allow(null),
                    modifiedby: Joi.number().integer().optional().allow(null, 0),
                    modifieddate: Joi.date().optional().allow(null),
                })
            )
            .min(1)
            .required()
            .messages({
                "array.base": "Suppliers must be an array",
                "array.min": "At least one supplier is required",
            }),
    }),

    // Supplier account details validation
    saveSupplierAccountDetails: Joi.object({
        supplierAccounts: Joi.array()
            .items(
                Joi.object({
                    supplieraccountid: Joi.number().integer().positive().optional().allow(null),
                    supplierid: Joi.number().integer().positive().optional().allow(null),
                    companyid: Joi.number().integer().optional().allow(null),
                    locationid: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                    creditamount: Joi.number().precision(5).optional().default(0),
                    debitamount: Joi.number().precision(5).optional().default(0),
                    balance: Joi.number().precision(5).optional().allow(null),
                    paymentdate: Joi.date().optional().allow(null),
                    datekey: Joi.number().integer().optional().allow(null),
                    description: Joi.string().max(255).optional().allow(null, ""),
                    paymodeid: Joi.number().integer().positive().optional().allow(null),
                    purchaseorderid: Joi.number().integer().positive().optional().allow(null),
                    shiftid: Joi.number().integer().optional().allow(null),
                    txntype: Joi.number().integer().valid(1, 2, 3, 4, 5).optional().allow(null),
                    isdeleted: Joi.number().integer().valid(0, 1).default(0),
                    supplieruniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                    purchaseorderuniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                    shiftuniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                    clientcreateddate: Joi.date().optional().allow(null),
                    clientmodifieddate: Joi.date().optional().allow(null),
                    clientcreatedby: Joi.number().integer().optional().allow(null),
                    clientmodifiedby: Joi.number().integer().optional().allow(null),
                    createdby: Joi.number().integer().optional().allow(null),
                    createddate: Joi.date().optional().allow(null),
                    modifiedby: Joi.number().integer().optional().allow(null),
                    modifieddate: Joi.date().optional().allow(null),
                })
            )
            .min(1)
            .required()
            .messages({
                "array.base": "Supplier accounts must be an array",
                "array.min": "At least one supplier account is required",
            }),
    }),

    // Bill number format validation
    saveBillNumFormats: Joi.object({
        billnumformats: Joi.array()
            .items(
                Joi.object({
                    formatid: Joi.number().integer().required(),
                    format: Joi.string().max(255).optional().allow(null, ""),
                    prefix: Joi.string().max(255).optional().allow(null, ""),
                    startnumber: Joi.number().integer().default(0),
                    locationid: Joi.number().integer().positive().required(),
                    isdeleted: Joi.number().integer().valid(0, 1).default(0),
                    lastupdate: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                    termconditions: Joi.string().optional().allow(null, ""),
                    jurisdiction: Joi.string().optional().allow(null, ""),
                    bankdetails: Joi.string().optional().allow(null, ""),
                    tagline: Joi.string().optional().allow(null, ""),
                    invoicemsg: Joi.string().max(255).optional().allow(null, ""),
                })
            )
            .min(1)
            .required()
            .messages({
                "array.base": "Bill number formats must be an array",
                "array.min": "At least one bill number format is required",
            }),
    }),

    // Expense transaction validation
            saveExpenseTransactions: Joi.object({
        expenseTransactions: Joi.array()
            .items(
                Joi.object({
                    expensetransactionid: Joi.number().integer().required(),
                    frequencyid: Joi.number().integer().optional().allow(null, 0),
                    date: Joi.date().optional().allow(null),
                    totalamount: Joi.number().precision(5).optional().allow(null, 0),
                    issync: Joi.number().integer().valid(0, 1).default(0),
                    monthid: Joi.number().integer().optional().allow(null, 0),
                    datekey: Joi.number().integer().optional().allow(null, 0),
                    shiftid: Joi.number().integer().optional().allow(null, 0),
                    yearid: Joi.number().integer().optional().allow(null, 0),
                    isdeleted: Joi.number().integer().valid(0, 1).default(0),
                    companyid: Joi.number().integer().optional().allow(null, 0),
                    uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
                    clientcreateddate: Joi.date().optional().allow(null),
                    clientmodifieddate: Joi.date().optional().allow(null),
                    clientcreatedby: Joi.number().integer().optional().allow(null),
                    clientmodifiedby: Joi.number().integer().optional().allow(null, 0),
                    createdby: Joi.number().integer().optional().allow(null),
                    createddate: Joi.date().optional().allow(null),
                    modifiedby: Joi.number().integer().optional().allow(null, 0),
                    modifieddate: Joi.date().optional().allow(null),
                    expenseTransactionDetails: Joi.array()
                        .items(
                            Joi.object({
                                expensetransactiondetailsId: Joi.number().integer().required(),
                                serverexpensetransactionid: Joi.number().integer().optional().allow(null),
                                expenseid: Joi.number().integer().optional().allow(null),
                                paymentamount: Joi.number().precision(5).optional().allow(null),
                                remarks: Joi.string().max(255).optional().allow(null, ""),
                                shiftbalance: Joi.number().precision(5).optional().allow(null),
                                expensetransactionid: Joi.number().integer().required(),
                                isdeleted: Joi.number().integer().valid(0, 1).default(0),
                                companyid: Joi.number().integer().optional().allow(null, 0),
                                uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
                                datekey: Joi.number().integer().optional().allow(null),
                                expenseuniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                                clientcreateddate: Joi.date().optional().allow(null),
                                clientmodifieddate: Joi.date().optional().allow(null),
                                clientcreatedby: Joi.number().integer().optional().allow(null),
                                clientmodifiedby: Joi.number().integer().optional().allow(null, 0),
                                createdby: Joi.number().integer().optional().allow(null),
                                createddate: Joi.date().optional().allow(null),
                                modifiedby: Joi.number().integer().optional().allow(null, 0),
                                modifieddate: Joi.date().optional().allow(null),
                            })
                        )
                        .min(1)
                        .required()
                        .messages({
                            "array.base": "Expense transaction details must be an array",
                            "array.min": "At least one expense transaction detail is required",
                        }),
                })
            )
            .min(1)
            .required()
            .messages({
                "array.base": "Expense transactions must be an array",
                "array.min": "At least one expense transaction is required",
            }),
    }),

    syncExpenseMaster: Joi.object({
        expenseMaster: Joi.array().items(
            Joi.object({
                expid: Joi.number().integer().required(),
                expname: Joi.string().max(200).required(),
                expdisplayname: Joi.string().max(200).allow(null, ''),
                expdescription: Joi.string().allow(null, ''),
                createdby: Joi.number().integer().required(),
                createddate: Joi.date().iso().required(),
                modifiedby: Joi.any().allow(null),
                modifieddate: Joi.any().allow(null),
                isdeleted: Joi.number().integer().valid(0, 1).required(),
                ipaddress: Joi.string().ip().allow(null),
                companyid: Joi.number().integer().required(),
                uniquekey: Joi.any().required(),
                issync: Joi.number().integer().valid(0, 1).optional()
            })
        ).min(1).required()
    }),

    // Item supplier mapping sync validation
    syncItemSupplierMapping: Joi.object({
        itemSupplierMapping: Joi.array().items(
            Joi.object({
                itemsuppliermapid: Joi.number().integer().required(),
                itemid: Joi.number().integer().required(),
                supplierid: Joi.number().integer().required(),
                pmuniquekey: Joi.any().allow(null),
                smuniquekey: Joi.any().allow(null),
                companyid: Joi.number().integer().required(),
                createdby: Joi.number().integer().required(),
                createddate: Joi.date().iso().required(),
                modifiedby: Joi.any().allow(null),
                modifieddate: Joi.any().allow(null),
                isdeleted: Joi.number().integer().valid(0, 1).required(),
                ipaddress: Joi.string().max(50).allow(null, ''),
                issync: Joi.number().integer().valid(0, 1).optional()
            })
        ).min(1).required()
    }),

    // Stock adjustment details sync validation
    syncStockAdjustmentDetails: Joi.object({
        stockadjustments: Joi.array().items(
            Joi.object({
                stockid: Joi.number().integer().allow(null),
                batchid: Joi.string().max(455).allow(null, ''),
                itemid: Joi.number().integer().allow(null),
                pmuniquekey: Joi.number().integer().required(),
                quantity: Joi.number().allow(null),
                remarks: Joi.string().max(455).allow(null, ''),
                createdby: Joi.number().integer().allow(null),
                createddate: Joi.date().iso().allow(null),
                modifiedby: Joi.number().integer().allow(null),
                modifieddate: Joi.date().iso().allow(null),
                isdeleted: Joi.number().integer().valid(0, 1).required(),
                locationid: Joi.number().integer().required(),
                companyid: Joi.number().integer().required(),
                ipaddress: Joi.string().max(50).allow(null, ''),
                datekey: Joi.number().integer().allow(null),
                previousqty: Joi.number().allow(null),
                reasonid: Joi.number().integer().allow(null),
                issync: Joi.number().integer().valid(0, 1).optional(),
                adjustmenttype: Joi.number().integer().valid(1, 2).allow(null)
            })
        ).min(1).required()
    }),

    // User sync validation
    syncUsers: Joi.object({
        users: Joi.array()
            .items(
                Joi.object({
                    userid: Joi.number().integer().optional().allow(null),
                    username: Joi.string().max(100).required(),
                    firstname: Joi.string().max(145).required(),
                    lastname: Joi.string().max(145).required(),
                    email: Joi.string().email().max(255).optional().allow(null, ""),
                    pinnumber: Joi.alternatives().try(
                        Joi.number().integer().required(),
                        Joi.string().pattern(/^\d+$/).required()
                    ),
                    role: Joi.number().integer().optional().allow(null),
                    roleid: Joi.number().integer().optional().allow(null),
                    policyid: Joi.number().integer().optional().allow(null),
                    usermobileno: Joi.alternatives().try(
                        Joi.number().integer().required(),
                        Joi.string().max(15).required()
                    ),
                    companyid: Joi.number().integer().optional().allow(null, 0),
                    isdeleted: Joi.number().integer().valid(0, 1).default(0),
                    createdby: Joi.number().integer().optional().allow(null),
                    modifiedby: Joi.number().integer().optional().allow(null),
                    ipaddress: Joi.string().max(45).optional().allow(null, ""),
                })
            )
            .min(1)
            .required()
            .messages({
                "array.base": "Users must be an array",
                "array.min": "At least one user is required",
            }),
    }),

    // API log sync validation
    syncApiLogs: Joi.object({
        apilogs: Joi.array()
            .items(
                Joi.object({
                    id: Joi.number().integer().optional().allow(null),
                    apilogid: Joi.number().integer().optional().allow(null),
                    request: Joi.string().optional().allow(null, ""),
                    response: Joi.string().optional().allow(null, ""),
                    action: Joi.number().integer().optional().allow(null),
                    apiurl: Joi.string().max(500).optional().allow(null, ""),
                    header: Joi.string().optional().allow(null, ""),
                    statuscode: Joi.number().integer().optional().allow(null),
                    ip: Joi.string().max(50).optional().allow(null, ""),
                    companyid: Joi.number().integer().optional().allow(null, 0),
                    createdby: Joi.number().integer().optional().allow(null),
                    createddate: Joi.date().optional().allow(null),
                    modifiedby: Joi.number().integer().optional().allow(null),
                    modifieddate: Joi.date().optional().allow(null),
                })
            )
            .min(1)
            .required()
            .messages({
                "array.base": "API logs must be an array",
                "array.min": "At least one API log is required",
            }),
    }),

    // Current stock master validation
    saveCurrentStockMaster: Joi.object({
        currentStockMaster: Joi.array()
            .items(
                Joi.object({
                    currentstockid: Joi.number().integer().positive().required(),
                    productid: Joi.number().integer().positive().required(),
                    pmuniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                    locationid: Joi.number().integer().positive().required(),
                    batchid: Joi.string().max(50).optional().allow(null, ""),
                    batchdate: Joi.string().optional().allow(null),
                    quantity: Joi.number().precision(5).optional().allow(null),
                    lastaction: Joi.number().integer().valid(1, 2).optional().allow(null),
                    lastactiontransactionid: Joi.number().integer().optional().allow(null),
                    expirydate: Joi.string().optional().allow(null),
                    issync: Joi.number().integer().valid(0, 1).default(0),
                    isdeleted: Joi.number().integer().valid(0, 1).default(0),
                    ipaddress: Joi.string().max(50).optional().allow(null, ""),
                    companyid: Joi.number().integer().optional().allow(null),
                    uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                    createdby: Joi.number().integer().optional().allow(null),
                    createddate: Joi.date().optional().allow(null),
                    modifiedby: Joi.number().integer().optional().allow(null),
                    modifieddate: Joi.date().optional().allow(null),
                })
            )
            .min(1)
            .required()
            .messages({
                "array.base": "Current stock master must be an array",
                "array.min": "At least one current stock record is required",
            }),
    }),

    saveCurrentStockAuditMaster: Joi.object({
        currentStockAuditMaster: Joi.array()
            .items(
                Joi.object({
                    auditid: Joi.number().integer().required(),
                    currentstockid: Joi.number().integer().required(),
                    productid: Joi.number().integer().required(),
                    pmuniquekey: Joi.any().optional().allow(null),
                    batchid: Joi.string().max(50).optional().allow(null, ""),
                    batchdate: Joi.date().iso().optional().allow(null),
                    quantity: Joi.number().required(),
                    locationid: Joi.number().integer().required(),
                    companyid: Joi.number().integer().optional().allow(null),
                    createdby: Joi.number().integer().required(),
                    createddate: Joi.date().iso().required(),
                    modifiedby: Joi.number().integer().optional().allow(null),
                    modifieddate: Joi.date().iso().optional().allow(null),
                    isdeleted: Joi.number().integer().valid(0, 1).default(0),
                    ipaddress: Joi.string().max(50).optional().allow(null, ""),
                    lastaction: Joi.number().integer().optional().allow(null),
                    lastactiontransactionid: Joi.number().integer().optional().allow(null),
                    expirydate: Joi.date().iso().optional().allow(null),
                    issync: Joi.number().integer().valid(0, 1).default(0),
                })
            )
            .min(1)
            .required(),
    }),

    // Item day wise stock details validation
    saveItemDayWiseStock: Joi.object({
        itemDayWiseStock: Joi.array()
            .items(
                Joi.object({
                    dwsdid: Joi.number().integer().positive().required(),
                    itemid: Joi.number().integer().positive().required(),
                    pmuniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null),
                    locationid: Joi.number().integer().positive().required(),
                    batchid: Joi.string().max(100).optional().allow(null, ""),
                    batchdate: Joi.string().optional().allow(null),
                    companyid: Joi.number().integer().optional().allow(null),
                    datekey: Joi.number().integer().optional().allow(null),
                    stockdate: Joi.string().optional().allow(null),
                    openingstock: Joi.number().precision(5).optional().allow(null),
                    totalsales: Joi.number().precision(5).optional().allow(null),
                    totalpurchase: Joi.number().precision(5).optional().allow(null),
                    totalwastage: Joi.number().precision(5).optional().allow(null),
                    salereturn: Joi.number().precision(5).optional().default(0),
                    purchasereturn: Joi.number().precision(5).optional().allow(null),
                    closingstock: Joi.number().precision(5).optional().allow(null),
                    adjustin: Joi.number().precision(0).optional().allow(null),
                    adjustout: Joi.number().precision(0).optional().allow(null),
                    adjustedstock: Joi.number().precision(0).optional().allow(null),
                    issync: Joi.number().integer().valid(0, 1).default(0),
                    isdeleted: Joi.number().integer().valid(0, 1).default(0),
                    ipaddress: Joi.string().max(50).optional().allow(null, ""),
                    uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                    clientcreateddate: Joi.date().optional().allow(null),
                    clientmodifieddate: Joi.date().optional().allow(null),
                    clientcreatedby: Joi.number().integer().optional().allow(null),
                    clientmodifiedby: Joi.number().integer().optional().allow(null),
                    createdby: Joi.number().integer().optional().allow(null),
                    createddate: Joi.date().optional().allow(null),
                    modifiedby: Joi.number().integer().optional().allow(null),
                    modifieddate: Joi.date().optional().allow(null),
                })
            )
            .min(1)
            .required()
            .messages({
                "array.base": "Item day wise stock must be an array",
                "array.min": "At least one item day wise stock record is required",
            }),
    }),

    // Shift validation
    saveShift: Joi.any()
        .custom((value, helpers) => {
            const isArray = Array.isArray(value);

            // Base shift schema
            const baseShiftSchema = Joi.object({
                uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
                shiftid: Joi.number().integer().optional().allow(null),
                userid: Joi.number().integer().positive().optional().allow(null),
                posid: Joi.number().integer().positive().optional().allow(null),
                startdatetime: Joi.date().optional().allow(null),
                enddatetime: Joi.date().optional().allow(null),
                openingbalance: Joi.number().precision(5).min(0).optional().allow(null),
                totalpaymentamount: Joi.number().precision(5).min(0).optional().allow(null),
                salereturn: Joi.number().precision(5).min(0).optional().allow(null),
                closingbalance: Joi.number().precision(5).min(0).optional().allow(null),
                dueamount: Joi.number().precision(5).min(0).optional().allow(null),
                startdescription: Joi.string().max(255).optional().allow(null, ""),
                enddescription: Joi.string().max(255).optional().allow(null, ""),
                isactive: Joi.number().integer().valid(0, 1).default(1),
                createdby: Joi.number().integer().positive().optional().allow(null),
                createddate: Joi.date().optional().allow(null),
                modifiedby: Joi.number().integer().positive().optional().allow(null),
                modifieddate: Joi.date().optional().allow(null),
                isdeleted: Joi.number().integer().valid(0, 1).default(0),
                companyid: Joi.number().integer().positive().optional().allow(null),
                issync: Joi.number().integer().valid(0, 1).default(0),
                datekey: Joi.number().integer().positive().optional().allow(null),
                totalbills: Joi.number().integer().min(0).optional().allow(null),
                cancelledbills: Joi.number().integer().min(0).optional().allow(null),

                // Shift details (nested array)
                shiftDetails: Joi.array()
                    .items(
                        Joi.object({
                            shiftdetailid: Joi.number().integer().optional().allow(null),
                            shiftid: Joi.number().integer().optional().allow(null),
                            exchangedbyuserid: Joi.number().integer().positive().optional().allow(null),
                            exchangedtouserid: Joi.number().integer().positive().optional().allow(null),
                            currentbalance: Joi.number().precision(5).optional().allow(null),
                            drawerbalance: Joi.number().precision(5).optional().allow(null),
                            differenceamount: Joi.number().precision(5).optional().allow(null),
                            remarks: Joi.string().max(255).optional().allow(null, ""),
                            uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                            datekey: Joi.number().integer().positive().optional().allow(null),
                            posid: Joi.number().integer().positive().optional().allow(null),
                            locationid: Joi.number().integer().positive().optional().allow(null),
                            companyid: Joi.number().integer().positive().optional().allow(null),
                            createdby: Joi.number().integer().positive().optional().allow(null),
                            createddate: Joi.date().optional().allow(null),
                            modifiedby: Joi.number().integer().positive().optional().allow(null),
                            modifieddate: Joi.date().optional().allow(null),
                            isdeleted: Joi.number().integer().valid(0, 1).default(0),
                        })
                    )
                    .optional(),
            });

            if (isArray) {
                if (value.length === 0) {
                    return helpers.error("array.min", { limit: 1 });
                }
                if (value.length > 100) {
                    return helpers.error("array.max", { limit: 100 });
                }

                for (let i = 0; i < value.length; i++) {
                    const { error } = baseShiftSchema.validate(value[i], {
                        abortEarly: false,
                        stripUnknown: true,
                        convert: true,
                    });

                    if (error) {
                        return helpers.error("any.custom", {
                            message: `Validation failed for shift at index ${i}: ${error.details
                                .map((d) => `${d.path.join(".")} - ${d.message}`)
                                .join(", ")}`,
                        });
                    }
                }
            } else {
                const { error } = baseShiftSchema.validate(value, {
                    abortEarly: false,
                    stripUnknown: true,
                    convert: true,
                });

                if (error) {
                    return helpers.error("any.custom", {
                        message: `Validation failed: ${error.details
                            .map((d) => `${d.path.join(".")} - ${d.message}`)
                            .join(", ")}`,
                    });
                }
            }

            return value;
        }, "Shift validation")
        .messages({
            "array.min": "At least one shift is required for bulk requests",
            "array.max": "Maximum 100 shifts allowed in bulk request",
            "any.custom": "{#message}",
        }),

    // Settlement sync validation
    syncSettlement: Joi.any()
        .custom((value, helpers) => {
            // Check if input is array (bulk settlements) or single object
            const isArray = Array.isArray(value);

            // Define the base settlement schema
            const baseSettlementSchema = Joi.object({
                uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).required().messages({
                    "string.base": "uniquekey must be a string",
                    "string.empty": "uniquekey cannot be empty",
                    "string.min": "uniquekey must be at least 1 character",
                    "string.max": "uniquekey cannot exceed 255 characters",
                    "any.required": "uniquekey is required",
                }),
                settlementid: Joi.number().integer().positive().required().messages({
                    "number.base": "settlementid must be a number",
                    "number.positive": "settlementid must be positive",
                    "any.required": "settlementid is required",
                }),
                userid: Joi.number().integer().positive().optional().allow(null),
                date: Joi.date().optional().allow(null),
                shiftamount: Joi.number().precision(5).min(0).optional().allow(null),
                withdrawalamount: Joi.number().precision(5).min(0).optional().allow(null),
                settledbalance: Joi.number().precision(5).min(0).optional().allow(null),
                cashdiff: Joi.number().precision(5).optional().allow(null),
                description: Joi.string().max(500).optional().allow(null, ""),
                shiftid: Joi.number().integer().positive().optional().allow(null),
                posid: Joi.number().integer().positive().optional().allow(null),
                companyid: Joi.number().integer().positive().required().messages({
                    "number.base": "companyid must be a number",
                    "number.positive": "companyid must be positive",
                    "any.required": "companyid is required",
                }),
                datekey: Joi.number().integer().positive().required().messages({
                    "number.base": "datekey must be a number",
                    "number.positive": "datekey must be positive",
                    "any.required": "datekey is required",
                }),
                createdby: Joi.number().integer().positive().optional().allow(null),
                createddate: Joi.date().optional().allow(null),
                modifiedby: Joi.number().integer().positive().optional().allow(null),
                modifieddate: Joi.date().optional().allow(null),
                isdeleted: Joi.number().integer().valid(0, 1).default(0),
                issync: Joi.number().integer().valid(0, 1).default(0),
                clientcreatedby: Joi.number().integer().positive().optional().allow(null),
                clientcreateddate: Joi.date().optional().allow(null),
                clientmodifiedby: Joi.number().integer().positive().optional().allow(null),
                clientmodifieddate: Joi.date().optional().allow(null),

                // Settlement details (nested array)
                settlementDetails: Joi.array()
                    .items(
                        Joi.object({
                            settlementdetailsid: Joi.number().integer().positive().required(),
                            settlementid: Joi.number().integer().positive().required(),
                            settlementtype: Joi.number()
                                .integer()
                                .positive()
                                .optional()
                                .allow(null),
                            denominationid: Joi.number()
                                .integer()
                                .positive()
                                .optional()
                                .allow(null),
                            denomination: Joi.number().integer().positive().optional().allow(null),
                            qty: Joi.number().integer().min(0).optional().allow(null),
                            total: Joi.number().precision(5).min(0).optional().allow(null),
                            companyid: Joi.number().integer().positive().required(),
                            posid: Joi.number().integer().positive().optional().allow(null),
                            datekey: Joi.number().integer().positive().optional().allow(null),
                            uniquekey: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null, ""),
                            createdby: Joi.number().integer().positive().optional().allow(null),
                            createddate: Joi.date().optional().allow(null),
                            modifiedby: Joi.number().integer().positive().optional().allow(null),
                            modifieddate: Joi.date().optional().allow(null),
                            isdeleted: Joi.number().integer().valid(0, 1).default(0),
                            clientcreatedby: Joi.number()
                                .integer()
                                .positive()
                                .optional()
                                .allow(null),
                            clientcreateddate: Joi.date().optional().allow(null),
                            clientmodifiedby: Joi.number()
                                .integer()
                                .positive()
                                .optional()
                                .allow(null),
                            clientmodifieddate: Joi.date().optional().allow(null),
                        })
                    )
                    .optional()
                    .allow(null),
            });

            if (isArray) {
                // Validate as bulk settlements
                if (value.length === 0) {
                    return helpers.error("array.min", { limit: 1, value });
                }
                if (value.length > 100) {
                    return helpers.error("array.max", { limit: 100, value });
                }

                // Validate each settlement in the array
                for (let i = 0; i < value.length; i++) {
                    const { error } = baseSettlementSchema.validate(value[i], {
                        abortEarly: false,
                        stripUnknown: true,
                        convert: true,
                    });

                    if (error) {
                        // Return specific error for the settlement at index i
                        return helpers.error("any.custom", {
                            message: `Validation failed for settlement at index ${i}: ${error.details
                                .map((d) => `${d.path.join(".")} - ${d.message}`)
                                .join(", ")}`,
                        });
                    }
                }
            } else {
                // Validate as single settlement
                const { error } = baseSettlementSchema.validate(value, {
                    abortEarly: false,
                    stripUnknown: true,
                    convert: true,
                });

                if (error) {
                    // Return specific field errors
                    return helpers.error("any.custom", {
                        message: `Validation failed: ${error.details
                            .map((d) => `${d.path.join(".")} - ${d.message}`)
                            .join(", ")}`,
                    });
                }
            }

            return value;
        }, "Settlement validation")
        .messages({
            "array.min": "At least one settlement is required for bulk settlements",
            "array.max": "Maximum 100 settlements allowed in bulk request",
            "any.custom": "{#message}",
        }),

    // Subscription Management Validation Rules
    // Plan Master validation
    createPlan: Joi.object({
        planname: Joi.string().min(1).max(255).trim().required().messages({
            "string.empty": "Plan name is required",
            "string.min": "Plan name is required",
            "any.required": "Plan name is required",
        }),
        duration: Joi.number().integer().positive().required().messages({
            "number.base": "Valid duration is required",
            "number.positive": "Valid duration is required",
            "any.required": "Valid duration is required",
        }),
        description: Joi.string().max(65535).optional().allow(null, ""),
        price: Joi.number().min(0).required().messages({
            "number.base": "Valid price is required",
            "number.min": "Valid price is required",
            "any.required": "Valid price is required",
        }),
        isactive: Joi.number().integer().valid(0, 1).default(1),
        startdate: Joi.date().iso().optional().allow(null),
        enddate: Joi.date().iso().optional().allow(null),
        amc_charges: Joi.number().min(0).default(0),
        frequency: Joi.string()
            .valid("Yearly", "Half-yearly", "Monthly", "Bi-weekly", "Weekly")
            .required()
            .messages({
                "any.only":
                    "Frequency must be one of: Yearly, Half-yearly, Monthly, Bi-weekly, Weekly",
                "any.required": "Frequency is required",
            }),
        is_trial: Joi.number().integer().valid(0, 1).default(0),
        details: Joi.array()
            .items(
                Joi.object({
                    particularid: Joi.number().integer().positive().required().messages({
                        "any.required": "Particular ID is required for each detail",
                    }),
                    limitation: Joi.string().required().messages({
                        "any.required": "Limitation is required for each detail",
                        "string.empty": "Limitation is required for each detail",
                    }),
                    description: Joi.string().allow("").optional(),
                })
            )
            .optional()
            .default([]),
    }),

    updatePlan: Joi.object({
        planname: Joi.string().min(1).max(255).trim(),
        duration: Joi.number().integer().positive(),
        description: Joi.string().max(65535).allow(null, ""),
        price: Joi.number().min(0),
        isactive: Joi.number().integer().valid(0, 1),
        startdate: Joi.date().iso().allow(null),
        enddate: Joi.date().iso().allow(null),
        amc_charges: Joi.number().min(0),
        frequency: Joi.string()
            .valid("Yearly", "Half-yearly", "Monthly", "Bi-weekly", "Weekly")
            .messages({
                "any.only":
                    "Frequency must be one of: Yearly, Half-yearly, Monthly, Bi-weekly, Weekly",
            }),
        is_trial: Joi.number().integer().valid(0, 1),
        details: Joi.array()
            .items(
                Joi.object({
                    particularid: Joi.number().integer().positive().required().messages({
                        "any.required": "Particular ID is required for each detail",
                    }),
                    limitation: Joi.string().required().messages({
                        "any.required": "Limitation is required for each detail",
                        "string.empty": "Limitation is required for each detail",
                    }),
                    description: Joi.string().allow("").optional(),
                })
            )
            .optional(),
    }).min(1),

    updatePlanDetails: Joi.object({
        details: Joi.array()
            .items(
                Joi.object({
                    particularid: Joi.number().integer().positive().required().messages({
                        "any.required": "Particular ID is required for each detail",
                    }),
                    limitation: Joi.string().required().messages({
                        "any.required": "Limitation is required for each detail",
                        "string.empty": "Limitation is required for each detail",
                    }),
                    description: Joi.string().allow("").optional(),
                })
            )
            .required()
            .messages({
                "any.required": "Details array is required",
            }),
    }),

    duplicatePlan: Joi.object({
        newPlanName: Joi.string().min(1).max(255).trim().required().messages({
            "string.empty": "New plan name is required",
            "string.min": "New plan name is required",
            "any.required": "New plan name is required",
        }),
    }),

    comparePlans: Joi.object({
        planIds: Joi.array()
            .items(Joi.number().integer().positive())
            .min(1)
            .max(5)
            .required()
            .messages({
                "array.base": "Plan IDs array is required",
                "array.min": "Plan IDs array is required",
                "array.max": "Maximum 5 plans can be compared at once",
                "any.required": "Plan IDs array is required",
            }),
    }),

    // Addon Master validation
    createAddon: Joi.object({
        addonname: Joi.string().min(1).max(255).trim().required().messages({
            "string.empty": "Addon name is required",
            "string.min": "Addon name is required",
            "any.required": "Addon name is required",
        }),
        description: Joi.string().max(65535).optional().allow(null, ""),
        limitation: Joi.string().max(65535).optional().allow(null, ""),
        isactive: Joi.number().integer().valid(0, 1).default(1),
        duration: Joi.number().integer().positive().optional().allow(null),
        particularid: Joi.number().integer().positive().optional().allow(null),
        price: Joi.number().min(0).required().messages({
            "number.base": "Valid price is required",
            "number.min": "Valid price is required",
            "any.required": "Valid price is required",
        }),
    }),

    updateAddon: Joi.object({
        addonname: Joi.string().min(1).max(255).trim(),
        description: Joi.string().max(65535).allow(null, ""),
        limitation: Joi.string().max(65535).allow(null, ""),
        isactive: Joi.number().integer().valid(0, 1),
        duration: Joi.number().integer().positive().allow(null),
        particularid: Joi.number().integer().positive().allow(null),
        price: Joi.number().min(0).messages({
            "number.base": "Price cannot be negative",
            "number.min": "Price cannot be negative",
        }),
    }).min(1),

    duplicateAddon: Joi.object({
        newAddonName: Joi.string().min(1).max(255).trim().required().messages({
            "string.empty": "New addon name is required",
            "string.min": "New addon name is required",
            "any.required": "New addon name is required",
        }),
    }),

    bulkUpdateAddonPrices: Joi.object({
        updates: Joi.array()
            .items(
                Joi.object({
                    addonid: Joi.number().integer().positive().required().messages({
                        "any.required": "Addon ID is required for each update",
                    }),
                    price: Joi.number().min(0).required().messages({
                        "number.base": "Valid price is required for each update",
                        "number.min": "Price cannot be negative",
                        "any.required": "Price is required for each update",
                    }),
                })
            )
            .min(1)
            .required()
            .messages({
                "array.base": "Updates array is required",
                "array.min": "Updates array is required",
                "any.required": "Updates array is required",
            }),
    }),

    // Particular Master validation
    createParticular: Joi.object({
        name: Joi.string().min(1).max(255).trim().required().messages({
            "string.empty": "Particular name is required",
            "string.min": "Particular name is required",
            "any.required": "Particular name is required",
        }),
        isactive: Joi.number().integer().valid(0, 1).default(1),
    }),

    updateParticular: Joi.object({
        name: Joi.string().min(1).max(255).trim(),
        isactive: Joi.number().integer().valid(0, 1),
    }).min(1),

    // Company Master validation
    registerCompany: Joi.object({
        companyname: Joi.string().min(1).max(255).trim().required().messages({
            "string.empty": "Company name is required",
            "string.min": "Company name is required",
            "any.required": "Company name is required",
        }),
        companycontactnumber: Joi.string().min(1).trim().required().messages({
            "string.empty": "Phone number is required",
            "string.min": "Phone number is required",
            "any.required": "Phone number is required",
        }),
        companyemailid: Joi.string().email().lowercase().trim().required().messages({
            "string.empty": "Email ID is required",
            "string.email": "Invalid email format",
            "any.required": "Email ID is required",
        }),
        planid: Joi.number().integer().positive().required().messages({
            "number.base": "Plan selection is required",
            "number.positive": "Plan selection is required",
            "any.required": "Plan selection is required",
        }),
        offeredPrice: Joi.number().min(0).optional().messages({
            "number.base": "Offered plan price cannot be negative",
            "number.min": "Offered plan price cannot be negative",
        }),
        offeredAmcCharges: Joi.number().min(0).optional().messages({
            "number.base": "Offered AMC charges cannot be negative",
            "number.min": "Offered AMC charges cannot be negative",
        }),
        remarks: Joi.string().max(65535).optional().allow(null, ""),
        address: Joi.string().max(65535).optional().allow(null, ""),
    }),

    updateCompany: Joi.object({
        companyname: Joi.string().min(1).max(255).trim(),
        companycontactnumber: Joi.string().min(1).trim(),
        companyemailid: Joi.string().email().lowercase().trim().messages({
            "string.email": "Invalid email format",
        }),
        address: Joi.string().max(65535).allow(null, ""),
        remarks: Joi.string().max(65535).allow(null, ""),
        isactive: Joi.number().integer().valid(0, 1),
    }).min(1),

    // Company Addon validation
    addAddonToCompany: Joi.object({
        addonid: Joi.number().integer().positive().required().messages({
            "number.base": "Addon ID is required",
            "number.positive": "Addon ID is required",
            "any.required": "Addon ID is required",
        }),
        customPrice: Joi.number().min(0).optional().messages({
            "number.base": "Custom price cannot be negative",
            "number.min": "Custom price cannot be negative",
        }),
        duration: Joi.number().integer().positive().optional().messages({
            "number.base": "Duration must be positive",
            "number.positive": "Duration must be positive",
        }),
        planid: Joi.number().integer().positive().optional().allow(null),
    }),

    updateCompanyAddon: Joi.object({
        customPrice: Joi.number().min(0).optional().messages({
            "number.base": "Custom price cannot be negative",
            "number.min": "Custom price cannot be negative",
        }),
        duration: Joi.number().integer().positive().optional().messages({
            "number.base": "Duration must be positive",
            "number.positive": "Duration must be positive",
        }),
        isactive: Joi.number().integer().valid(0, 1),
        autorenewonoff: Joi.number().integer().valid(0, 1),
        planid: Joi.number().integer().positive().optional().allow(null),
        remarks: Joi.string().max(65535).optional().allow(null, ""),
    }).min(1),

    bulkAddAddonsToCompany: Joi.object({
        addons: Joi.array()
            .items(
                Joi.object({
                    addonid: Joi.number().integer().positive().required(),
                    customPrice: Joi.number().min(0).optional(),
                    duration: Joi.number().integer().positive().optional(),
                    planid: Joi.number().integer().positive().optional().allow(null),
                })
            )
            .min(1)
            .required()
            .messages({
                "array.base": "Addons array is required",
                "array.min": "At least one addon is required",
                "any.required": "Addons array is required",
            }),
    }),
};
/**
 * Sanitization helpers
 */
const sanitize = {
    // Remove HTML tags
    stripHTML: (str) => {
        return str.replace(/<[^>]*>?/gm, "");
    },

    // Escape HTML special characters
    escapeHTML: (str) => {
        const map = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#x27;",
            "/": "&#x2F;",
        };
        const reg = /[&<>"'/]/gi;
        return str.replace(reg, (match) => map[match]);
    },

    // Normalize whitespace
    normalizeWhitespace: (str) => {
        return str.replace(/\s+/g, " ").trim();
    },

    // Sanitize filename
    sanitizeFilename: (filename) => {
        return filename.replace(/[^a-z0-9._-]/gi, "_");
    },
};

/**
 * Custom validation functions
 */
const customValidators = {
    // Check if value is a valid ObjectId (for MongoDB)
    isObjectId: (value) => {
        return /^[0-9a-fA-F]{24}$/.test(value);
    },

    // Check if value is a valid UUID
    isUUID: (value) => {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            value
        );
    },

    // Check if value is a valid URL
    isURL: (value) => {
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    },

    // Check if value is a valid JSON string
    isJSON: (value) => {
        try {
            JSON.parse(value);
            return true;
        } catch {
            return false;
        }
    },

    // Check if value is a strong password
    isStrongPassword: (value) => {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value);
    },
};

/**
 * Middleware to validate request parameters
 */
const validateParams = (rules) => {
    return (req, res, next) => {
        const errors = [];

        for (const [param, validator] of Object.entries(rules)) {
            const value = req.params[param];

            if (!value && validator.required) {
                errors.push({
                    field: param,
                    message: `${param} is required`,
                });
            } else if (value && validator.validate) {
                const isValid = validator.validate(value);
                if (!isValid) {
                    errors.push({
                        field: param,
                        message: validator.message || `Invalid ${param}`,
                    });
                }
            }
        }

        if (errors.length > 0) {
            return res.status(422).json(ResponseFormatter.validationError(errors));
        }

        next();
    };
};

/**
 * Middleware to validate query parameters
 */
const validateQuery = (schema) => validateSchema(schema, "query");

/**
 * Middleware to validate request body
 */
const validateBody = (schema) => validateSchema(schema, "body");

// ============================================================
// Schema v3 — New Entity Validation Rules
// ============================================================

// Work Center
validationRules.createWorkCenter = Joi.object({
    name: Joi.string().min(1).max(150).trim().required(),
    code: Joi.string().min(1).max(50).trim().required(),
    description: Joi.string().max(65535).trim().optional().allow(null, ""),
    capacity_per_day: Joi.number().precision(2).min(0).default(8.00).optional(),
    cost_per_hour: Joi.number().precision(2).min(0).default(0.00).optional(),
    is_active: Joi.boolean().default(true).optional(),
});

validationRules.updateWorkCenter = Joi.object({
    name: Joi.string().min(1).max(150).trim().required(),
    code: Joi.string().min(1).max(50).trim().required(),
    description: Joi.string().max(65535).trim().optional().allow(null, ""),
    capacity_per_day: Joi.number().precision(2).min(0).optional(),
    cost_per_hour: Joi.number().precision(2).min(0).optional(),
    is_active: Joi.boolean().optional(),
});

// Operation
validationRules.createOperation = Joi.object({
    work_center_id: Joi.number().integer().positive().required()
        .messages({ "any.required": "Work Center ID is required" }),
    name: Joi.string().min(1).max(150).trim().required(),
    code: Joi.string().min(1).max(50).trim().required(),
    description: Joi.string().max(65535).trim().optional().allow(null, ""),
    duration_minutes: Joi.number().precision(2).min(0).default(0.00).optional(),
    is_active: Joi.boolean().default(true).optional(),
});

validationRules.updateOperation = Joi.object({
    work_center_id: Joi.number().integer().positive().required()
        .messages({ "any.required": "Work Center ID is required" }),
    name: Joi.string().min(1).max(150).trim().required(),
    code: Joi.string().min(1).max(50).trim().required(),
    description: Joi.string().max(65535).trim().optional().allow(null, ""),
    duration_minutes: Joi.number().precision(2).min(0).optional(),
    is_active: Joi.boolean().optional(),
});

// MO Component — manual add
validationRules.createMOComponent = Joi.object({
    product_id: Joi.number().integer().positive().required()
        .messages({ "any.required": "Product ID is required" }),
    qty_planned: Joi.number().precision(3).min(0.001).required()
        .messages({
            "any.required": "Planned quantity is required",
            "number.min": "Planned quantity must be greater than 0",
        }),
    uom: Joi.string().max(20).trim().default("Unit").optional(),
    bom_line_id: Joi.number().integer().positive().optional().allow(null),
    notes: Joi.string().max(65535).trim().optional().allow(null, ""),
    is_available: Joi.boolean().default(false).optional(),
});

// MO Component — update consumed qty
validationRules.updateMOComponentConsumed = Joi.object({
    qty_consumed: Joi.number().precision(3).min(0).required()
        .messages({
            "any.required": "Consumed quantity is required",
            "number.min": "Consumed quantity cannot be negative",
        }),
});

// ─── Auth — Sign Up ──────────────────────────────────────────────────────────
validationRules.signupUser = Joi.object({
    username: Joi.string()
        .alphanum()
        .min(6)
        .max(12)
        .trim()
        .required()
        .messages({
            "string.alphanum": "Login ID can only contain letters and numbers",
            "string.min": "Login ID must be between 6 and 12 characters",
            "string.max": "Login ID must be between 6 and 12 characters",
            "any.required": "Login ID is required",
        }),
    email: Joi.string()
        .email()
        .lowercase()
        .trim()
        .required()
        .messages({
            "string.email": "Please enter a valid email address",
            "any.required": "Email is required",
        }),
    password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/)
        .required()
        .messages({
            "string.min": "Password must be at least 8 characters long",
            "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, and one special character",
            "any.required": "Password is required",
        }),
    confirmPassword: Joi.any()
        .valid(Joi.ref("password"))
        .required()
        .messages({
            "any.only": "Passwords do not match",
            "any.required": "Please re-enter your password",
        }),
});

module.exports = {
    validateRequest,
    validateSchema,
    validateParams,
    validateQuery,
    validateBody,
    commonSchemas,
    validationRules,
    sanitize,
    customValidators,
};

