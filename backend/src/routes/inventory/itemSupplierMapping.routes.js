const express = require("express");
const itemSupplierMappingController = require("../../controllers/inventory/itemSupplierMapping.controller");
const { validateBody, validationRules } = require("../../middlewares/validation");
const { authMiddleware } = require("../../middlewares/auth.middleware");

const router = express.Router();

/**
 * @route GET /inventory/item-supplier-mapping/suppliers-and-categories
 * @desc Get suppliers and categories for dropdowns
 * @access Private
 */
router.get(
    "/suppliers-and-categories",
    authMiddleware,
    itemSupplierMappingController.getSuppliersAndCategories
);

/**
 * @route POST /inventory/item-supplier-mapping/items-by-category
 * @desc Get items by category ID
 * @access Private
 */
router.post(
    "/items-by-category",
    authMiddleware,
    validateBody(validationRules.getItemsByCategory),
    itemSupplierMappingController.getItemsByCategory
);

/**
 * @route POST /inventory/item-supplier-mapping/map-suppliers
 * @desc Map multiple suppliers to an item
 * @access Private
 */
router.post(
    "/map-suppliers",
    authMiddleware,
    validateBody(validationRules.mapMultipleSuppliersToItem),
    itemSupplierMappingController.mapMultipleSuppliersToItem
);

/**
 * @route POST /inventory/item-supplier-mapping/list
 * @desc Get item supplier mapping list with pagination and filters
 * @access Private
 */
router.post(
    "/list",
    authMiddleware,
    validateBody(validationRules.getItemSupplierMappingList),
    itemSupplierMappingController.getItemSupplierMappingList
);

/**
 * @route POST /inventory/item-supplier-mapping/delete
 * @desc Delete item supplier mapping
 * @access Private
 */
router.post(
    "/delete",
    authMiddleware,
    validateBody(validationRules.deleteItemSupplierMapping),
    itemSupplierMappingController.deleteItemSupplierMapping
);

/**
 * @route POST /inventory/item-supplier-mapping/delete-multiple
 * @desc Delete multiple item supplier mappings
 * @access Private
 */
router.post(
    "/delete-multiple",
    authMiddleware,
    validateBody(validationRules.deleteMultipleItemSupplierMappings),
    itemSupplierMappingController.deleteMultipleItemSupplierMappings
);

/**
 * @route POST /inventory/item-supplier-mapping/locations-by-suppliers
 * @desc Get locations and warehouses by supplier IDs
 * @access Private
 */
router.post(
    "/locations-by-suppliers",
    authMiddleware,
    validateBody(validationRules.getLocationsBySuppliers),
    itemSupplierMappingController.getLocationsBySuppliers
);

/**
 * @route POST /inventory/item-supplier-mapping/warehouses-by-locations
 * @desc Get warehouses by location IDs
 * @access Private
 */
router.post(
    "/warehouses-by-locations",
    authMiddleware,
    validateBody(validationRules.getWarehousesByLocations),
    itemSupplierMappingController.getWarehousesByLocations
);

/**
 * @route POST /inventory/item-supplier-mapping/filtered-data
 * @desc Get filtered data for search functionality
 * @access Private
 */
router.post(
    "/filtered-data",
    authMiddleware,
    validateBody(validationRules.getFilteredData),
    itemSupplierMappingController.getFilteredData
);

module.exports = {
    path: "/inventory/item-supplier-mapping",
    router: router,
};