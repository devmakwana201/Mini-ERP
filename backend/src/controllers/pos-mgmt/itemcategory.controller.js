const itemCategoryModel = require("../../models/pos-mgmt/itemcategory.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { NotFoundError, BadRequestError } = require("../../utils/customErrors");
const winston = require("../../config/winston");

module.exports = {
    /**
     * Get master categories dropdown (parentcategoryid IS NULL)
     * @route GET /api/pos-mgmt/itemcategory/dropdown/master
     * @query companyid - Optional company filter
     */
    getMasterCategoriesDropdown: asyncHandler(async (req, res) => {
        const { companyid } = req.query;

        const params = {};
        if (companyid) params.companyid = parseInt(companyid);

        winston.info("Fetching master categories dropdown", {
            source: "pos-mgmt/itemcategory.controller.js",
            function: "getMasterCategoriesDropdown",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            ...params,
        });

        const categories = await itemCategoryModel.getMasterCategoriesDropdown(params);

        res.status(200).json(
            ResponseFormatter.success(
                categories,
                "Master categories retrieved successfully"
            )
        );
    }),

    /**
     * Get categories dropdown (parentcategoryid IS NOT NULL)
     * @route GET /api/pos-mgmt/itemcategory/dropdown/category
     * @query companyid - Optional company filter
     * @query parentcategoryid - Optional parent category filter
     */
    getCategoriesDropdown: asyncHandler(async (req, res) => {
        const { companyid, parentcategoryid } = req.query;

        const params = {};
        if (companyid) params.companyid = parseInt(companyid);
        if (parentcategoryid) params.parentcategoryid = parseInt(parentcategoryid);

        winston.info("Fetching categories dropdown", {
            source: "pos-mgmt/itemcategory.controller.js",
            function: "getCategoriesDropdown",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            ...params,
        });

        const categories = await itemCategoryModel.getCategoriesDropdown(params);

        res.status(200).json(
            ResponseFormatter.success(
                categories,
                "Categories retrieved successfully"
            )
        );
    }),

    /**
     * Get all categories dropdown (both master and sub)
     * @route GET /api/pos-mgmt/itemcategory/dropdown/all
     * @query companyid - Optional company filter
     */
    getAllCategoriesDropdown: asyncHandler(async (req, res) => {
        const { companyid } = req.query;

        const params = {};
        if (companyid) params.companyid = parseInt(companyid);

        winston.info("Fetching all categories dropdown", {
            source: "pos-mgmt/itemcategory.controller.js",
            function: "getAllCategoriesDropdown",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            ...params,
        });

        const categories = await itemCategoryModel.getAllCategoriesDropdown(params);

        res.status(200).json(
            ResponseFormatter.success(
                categories,
                "All categories retrieved successfully"
            )
        );
    }),

    /**
     * Get item category by ID
     * @route GET /api/pos-mgmt/itemcategory/:id
     */
    getById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            throw new BadRequestError("Invalid category ID");
        }

        winston.info("Fetching category by ID", {
            source: "pos-mgmt/itemcategory.controller.js",
            function: "getById",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            id,
        });

        const category = await itemCategoryModel.getCategoryById(parseInt(id));

        if (!category) {
            throw new NotFoundError("Item category");
        }

        res.status(200).json(
            ResponseFormatter.success(
                category,
                "Category retrieved successfully"
            )
        );
    })
};
