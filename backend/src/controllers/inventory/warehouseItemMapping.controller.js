const warehouseItemMappingModel = require("../../models/inventory/warehouseItemMapping.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");

module.exports = {
    /**
     * Get locations and categories for dropdowns
     */
    getLocationsAndCategories: asyncHandler(async (req, res) => {
        const locations = await warehouseItemMappingModel.getLocations();
        const categories = await warehouseItemMappingModel.getCategories();

        return res.status(200).json(ResponseFormatter.success({
            locations,
            categories
        }, "Data retrieved successfully"));
    }),

    /**
     * Get warehouses by location IDs
     */
    getWarehousesByLocations: asyncHandler(async (req, res) => {
        const { locationIds } = req.body;

        if (!locationIds || !Array.isArray(locationIds) || locationIds.length === 0) {
            return res.status(400).json(ResponseFormatter.error("Location IDs array is required", 400));
        }

        const warehouses = await warehouseItemMappingModel.getWarehousesByLocations(locationIds);

        return res.status(200).json(ResponseFormatter.success({
            warehouses
        }, "Warehouses retrieved successfully"));
    }),

    /**
     * Get items by category IDs
     */
    getItemsByCategories: asyncHandler(async (req, res) => {
        const { categoryIds } = req.body;

        if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
            return res.status(400).json(ResponseFormatter.error("Category IDs array is required", 400));
        }

        const items = await warehouseItemMappingModel.getItemsByCategories(categoryIds);

        return res.status(200).json(ResponseFormatter.success({
            items
        }, "Items retrieved successfully"));
    }),

    /**
     * Map multiple items to multiple warehouses
     */
    mapItemsToWarehouses: asyncHandler(async (req, res) => {
        const { items, warehouses } = req.body;
        const createdBy = req.user?.userid || 1; // Assuming user info is in req.user

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json(ResponseFormatter.error("Items array is required", 400));
        }

        if (!warehouses || !Array.isArray(warehouses) || warehouses.length === 0) {
            return res.status(400).json(ResponseFormatter.error("Warehouses array is required", 400));
        }

        const result = await warehouseItemMappingModel.mapItemsToWarehouses({
            items,
            warehouses,
            createdBy
        });

        return res.status(200).json(ResponseFormatter.success(result, result.message));
    }),

    /**
     * Get warehouse item mapping list with pagination and filters
     */
    getWarehouseItemMappingList: asyncHandler(async (req, res) => {
        const {
            locationIds,
            warehouseIds,
            categoryIds,
            itemIds,
            start = 0,
            length = 25,
            order = [{ column: 1, dir: 'desc' }],
            search = { value: '' }
        } = req.body;

        const orderColumn = order[0]?.column || 1;
        const orderDir = order[0]?.dir || 'desc';
        const searchValue = search?.value || '';

        const result = await warehouseItemMappingModel.getWarehouseItemMappingList({
            locationIds: locationIds ? (Array.isArray(locationIds) ? locationIds : [locationIds]) : [],
            warehouseIds: warehouseIds ? (Array.isArray(warehouseIds) ? warehouseIds : [warehouseIds]) : [],
            categoryIds: categoryIds ? (Array.isArray(categoryIds) ? categoryIds : [categoryIds]) : [],
            itemIds: itemIds ? (Array.isArray(itemIds) ? itemIds : [itemIds]) : [],
            start: parseInt(start),
            length: parseInt(length),
            orderColumn,
            orderDir,
            searchValue
        });

        // Format data for DataTables
        const data = result.records.map((record, index) => [
            `<input type='checkbox' name='mapids[]' class='mapids' value='${record.wimid}'>`,
            parseInt(start) + index + 1,
            record.itemname || '',
            record.itemcategoryname || '',
            record.warehousename || '',
            record.locationname || '',
            `<button type='button' class='btn btn-xs btn-danger btnDeleteMap' data-mapid='${record.wimid}'>
                <i class='icon-trash'></i>
            </button>`
        ]);

        const response = {
            draw: req.body.draw || 1,
            recordsTotal: result.totalRecords,
            recordsFiltered: result.filteredRecords,
            data: data
        };

        return res.status(200).json(response);
    }),

    /**
     * Delete warehouse item mapping
     */
    deleteWarehouseItemMapping: asyncHandler(async (req, res) => {
        const { mappingId } = req.body;
        const userId = req.user?.userid || 1; // Assuming user info is in req.user

        if (!mappingId) {
            return res.status(400).json(ResponseFormatter.error("Mapping ID is required", 400));
        }

        const result = await warehouseItemMappingModel.deleteWarehouseItemMapping(mappingId, userId);

        return res.status(200).json(ResponseFormatter.success(null, result.message));
    }),

    /**
     * Delete multiple warehouse item mappings
     */
    deleteMultipleWarehouseItemMappings: asyncHandler(async (req, res) => {
        const { mappingIds } = req.body;
        const userId = req.user?.userid || 1; // Assuming user info is in req.user

        if (!mappingIds || !Array.isArray(mappingIds) || mappingIds.length === 0) {
            return res.status(400).json(ResponseFormatter.error("Mapping IDs array is required", 400));
        }

        const result = await warehouseItemMappingModel.deleteMultipleWarehouseItemMappings(mappingIds, userId);

        return res.status(200).json(ResponseFormatter.success(result, result.message));
    }),

    /**
     * Get warehouses mapped to specific item
     */
    getWarehousesByItem: asyncHandler(async (req, res) => {
        const { itemId } = req.body;

        if (!itemId) {
            return res.status(400).json(ResponseFormatter.error("Item ID is required", 400));
        }

        const warehouses = await warehouseItemMappingModel.getWarehousesByItem(itemId);

        return res.status(200).json(ResponseFormatter.success({
            warehouses
        }, "Warehouses retrieved successfully"));
    }),

    /**
     * Get filtered data for search functionality
     */
    getFilteredData: asyncHandler(async (req, res) => {
        const { locationIds, warehouseIds } = req.body;

        let result = {};

        // Get locations and categories
        const locations = await warehouseItemMappingModel.getLocations();
        const categories = await warehouseItemMappingModel.getCategories();
        
        result.locations = locations;
        result.categories = categories;

        // Get warehouses based on locations if provided
        if (locationIds && locationIds.length > 0) {
            const warehouses = await warehouseItemMappingModel.getWarehousesByLocations(locationIds);
            result.warehouses = warehouses;
        } else {
            result.warehouses = [];
        }

        // Get all categories for item filtering
        result.items = [];

        return res.status(200).json(ResponseFormatter.success(result, "Filtered data retrieved successfully"));
    })
};