const express = require("express");
const warehouseItemMappingController = require("../../controllers/inventory/warehouseItemMapping.controller");
const { validateBody, validationRules } = require("../../middlewares/validation");
const { authMiddleware } = require("../../middlewares/auth.middleware");

const router = express.Router();

/**
 * @route GET /inventory/warehouse-item-mapping/locations-and-categories
 * @desc Get locations and categories for dropdowns
 * @access Private
 */
router.get(
    "/locations-and-categories",
    authMiddleware,
    warehouseItemMappingController.getLocationsAndCategories
);

/**
 * @route POST /inventory/warehouse-item-mapping/warehouses-by-locations
 * @desc Get warehouses by location IDs
 * @access Private
 */
router.post(
    "/warehouses-by-locations",
    authMiddleware,
    validateBody(validationRules.getWarehousesByLocations),
    warehouseItemMappingController.getWarehousesByLocations
);

/**
 * @route POST /inventory/warehouse-item-mapping/items-by-categories
 * @desc Get items by category IDs
 * @access Private
 */
router.post(
    "/items-by-categories",
    authMiddleware,
    validateBody(validationRules.getItemsByCategories),
    warehouseItemMappingController.getItemsByCategories
);

/**
 * @route POST /inventory/warehouse-item-mapping/map-items
 * @desc Map multiple items to multiple warehouses
 * @access Private
 */
router.post(
    "/map-items",
    authMiddleware,
    validateBody(validationRules.mapItemsToWarehouses),
    warehouseItemMappingController.mapItemsToWarehouses
);

/**
 * @route POST /inventory/warehouse-item-mapping/list
 * @desc Get warehouse item mapping list with pagination and filters
 * @access Private
 */
router.post(
    "/list",
    authMiddleware,
    validateBody(validationRules.getWarehouseItemMappingList),
    warehouseItemMappingController.getWarehouseItemMappingList
);

/**
 * @route POST /inventory/warehouse-item-mapping/delete
 * @desc Delete warehouse item mapping
 * @access Private
 */
router.post(
    "/delete",
    authMiddleware,
    validateBody(validationRules.deleteWarehouseItemMapping),
    warehouseItemMappingController.deleteWarehouseItemMapping
);

/**
 * @route POST /inventory/warehouse-item-mapping/delete-multiple
 * @desc Delete multiple warehouse item mappings
 * @access Private
 */
router.post(
    "/delete-multiple",
    authMiddleware,
    validateBody(validationRules.deleteMultipleWarehouseItemMappings),
    warehouseItemMappingController.deleteMultipleWarehouseItemMappings
);

/**
 * @route POST /inventory/warehouse-item-mapping/warehouses-by-item
 * @desc Get warehouses mapped to specific item
 * @access Private
 */
router.post(
    "/warehouses-by-item",
    authMiddleware,
    validateBody(validationRules.getWarehousesByItem),
    warehouseItemMappingController.getWarehousesByItem
);

/**
 * @route POST /inventory/warehouse-item-mapping/filtered-data
 * @desc Get filtered data for search functionality
 * @access Private
 */
router.post(
    "/filtered-data",
    authMiddleware,
    validateBody(validationRules.getWarehouseFilteredData),
    warehouseItemMappingController.getFilteredData
);

module.exports = {
    path: "/inventory/warehouse-item-mapping",
    router: router,
};