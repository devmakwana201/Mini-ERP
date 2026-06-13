const express = require("express");
const router = express.Router();
const itemCategoryController = require("../../controllers/pos-mgmt/itemcategory.controller");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");

/**
 * @route   GET /api/pos/itemcategory/dropdown/master
 * @desc    Get master categories dropdown (parentcategoryid IS NULL)
 * @query   companyid - Optional company filter
 * @access  Protected (POS token required)
 */
router.get("/dropdown/master", verifyPOSToken, itemCategoryController.getMasterCategoriesDropdown);

/**
 * @route   GET /api/pos/itemcategory/dropdown/category
 * @desc    Get categories dropdown (parentcategoryid IS NOT NULL)
 * @query   companyid - Optional company filter
 * @query   parentcategoryid - Optional parent category filter
 * @access  Protected (POS token required)
 */
router.get("/dropdown/category", verifyPOSToken, itemCategoryController.getCategoriesDropdown);

/**
 * @route   GET /api/pos/itemcategory/dropdown/all
 * @desc    Get all categories dropdown (both master and sub)
 * @query   companyid - Optional company filter
 * @access  Protected (POS token required)
 */
router.get("/dropdown/all", verifyPOSToken, itemCategoryController.getAllCategoriesDropdown);

/**
 * @route   GET /api/pos/itemcategory/:id
 * @desc    Get item category by ID
 * @access  Protected (POS token required)
 */
router.get("/:id", verifyPOSToken, itemCategoryController.getById);

module.exports = {
    path: "/pos/itemcategory",
    router: router,
};
