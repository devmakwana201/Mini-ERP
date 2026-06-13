const itemSupplierMappingModel = require("../../models/inventory/itemSupplierMapping.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");

module.exports = {
    /**
     * Get suppliers and categories for dropdowns
     */
    getSuppliersAndCategories: asyncHandler(async (req, res) => {
        const suppliers = await itemSupplierMappingModel.getSuppliers();
        const categories = await itemSupplierMappingModel.getCategories();

        return res.status(200).json(ResponseFormatter.success({
            suppliers,
            categories
        }, "Data retrieved successfully"));
    }),

    /**
     * Get items by category ID for dropdown
     */
    getItemsByCategory: asyncHandler(async (req, res) => {
        const { categoryId } = req.body;

        if (!categoryId) {
            return res.status(400).json(ResponseFormatter.error("Category ID is required", 400));
        }

        const items = await itemSupplierMappingModel.getItemsByCategory(categoryId);

        return res.status(200).json(ResponseFormatter.success({
            items
        }, "Items retrieved successfully"));
    }),

    /**
     * Map multiple suppliers to an item
     */
    mapMultipleSuppliersToItem: asyncHandler(async (req, res) => {
        const { suppliers, itemId } = req.body;
        const createdBy = req.user?.userid || 1; // Assuming user info is in req.user

        if (!suppliers || !Array.isArray(suppliers) || suppliers.length === 0) {
            return res.status(400).json(ResponseFormatter.error("Suppliers array is required", 400));
        }

        if (!itemId) {
            return res.status(400).json(ResponseFormatter.error("Item ID is required", 400));
        }

        const result = await itemSupplierMappingModel.mapMultipleSuppliersToItem({
            suppliers,
            itemId,
            createdBy
        });

        return res.status(200).json(ResponseFormatter.success(result, result.message));
    }),

    /**
     * Get item supplier mapping list with pagination and filters
     */
    getItemSupplierMappingList: asyncHandler(async (req, res) => {
        const {
            locationIds,
            warehouseIds,
            supplierIds,
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

        const result = await itemSupplierMappingModel.getItemSupplierMappingList({
            locationIds: locationIds ? (Array.isArray(locationIds) ? locationIds : [locationIds]) : [],
            warehouseIds: warehouseIds ? (Array.isArray(warehouseIds) ? warehouseIds : [warehouseIds]) : [],
            supplierIds: supplierIds ? (Array.isArray(supplierIds) ? supplierIds : [supplierIds]) : [],
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
            `<input type='checkbox' name='mapids[]' class='mapids' value='${record.productsuppliermapid}'>`,
            parseInt(start) + index + 1,
            record.suppliername || '',
            record.locationname || '',
            record.itemcategoryname || '',
            record.itemname || '',
            `<button type='button' class='btn btn-xs btn-danger btnDeleteCat' data-mapid='${record.productsuppliermapid}'>
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
     * Delete item supplier mapping
     */
    deleteItemSupplierMapping: asyncHandler(async (req, res) => {
        const { mappingId } = req.body;
        const userId = req.user?.userid || 1; // Assuming user info is in req.user

        if (!mappingId) {
            return res.status(400).json(ResponseFormatter.error("Mapping ID is required", 400));
        }

        const result = await itemSupplierMappingModel.deleteItemSupplierMapping(mappingId, userId);

        return res.status(200).json(ResponseFormatter.success(null, result.message));
    }),

    /**
     * Delete multiple item supplier mappings
     */
    deleteMultipleItemSupplierMappings: asyncHandler(async (req, res) => {
        const { mappingIds } = req.body;
        const userId = req.user?.userid || 1; // Assuming user info is in req.user

        if (!mappingIds || !Array.isArray(mappingIds) || mappingIds.length === 0) {
            return res.status(400).json(ResponseFormatter.error("Mapping IDs array is required", 400));
        }

        const result = await itemSupplierMappingModel.deleteMultipleItemSupplierMappings(mappingIds, userId);

        return res.status(200).json(ResponseFormatter.success(result, result.message));
    }),

    /**
     * Get locations by supplier IDs
     */
    getLocationsBySuppliers: asyncHandler(async (req, res) => {
        const { supplierIds } = req.body;

        if (!supplierIds || !Array.isArray(supplierIds) || supplierIds.length === 0) {
            return res.status(400).json(ResponseFormatter.error("Supplier IDs array is required", 400));
        }

        const locations = await itemSupplierMappingModel.getLocationsBySuppliers(supplierIds);
        const warehouses = await itemSupplierMappingModel.getWarehousesByLocations(
            locations.map(loc => loc.locationid)
        );

        return res.status(200).json(ResponseFormatter.success({
            locations,
            warehouses
        }, "Locations and warehouses retrieved successfully"));
    }),

    /**
     * Get warehouses by location IDs
     */
    getWarehousesByLocations: asyncHandler(async (req, res) => {
        const { locationIds } = req.body;

        if (!locationIds || !Array.isArray(locationIds) || locationIds.length === 0) {
            return res.status(400).json(ResponseFormatter.error("Location IDs array is required", 400));
        }

        const warehouses = await itemSupplierMappingModel.getWarehousesByLocations(locationIds);

        return res.status(200).json(ResponseFormatter.success({
            warehouses
        }, "Warehouses retrieved successfully"));
    }),

    /**
     * Get filtered data for search functionality
     */
    getFilteredData: asyncHandler(async (req, res) => {
        const { locationIds, supplierIds } = req.body;

        let result = {};

        // Get items and categories based on suppliers
        if (supplierIds && supplierIds.length > 0) {
            const categories = await itemSupplierMappingModel.getCategories();
            result.categories = categories;
            
            // Get items from all categories for now
            // You can extend this to filter items based on supplier mappings
            let items = [];
            for (const category of categories) {
                const categoryItems = await itemSupplierMappingModel.getItemsByCategory(category.itemcategoryid);
                items = items.concat(categoryItems);
            }
            result.items = items;
        } else {
            const categories = await itemSupplierMappingModel.getCategories();
            result.categories = categories;
            result.items = [];
        }

        return res.status(200).json(ResponseFormatter.success(result, "Filtered data retrieved successfully"));
    })
};