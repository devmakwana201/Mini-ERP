const warehouseModel = require("../../../models/masters/inventory/warehouse.model");
const moment = require("moment");
const winston = require("../../../config/winston");
const ResponseFormatter = require("../../../utils/responseFormatter");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { NotFoundError, BadRequestError, ConflictError } = require("../../../utils/customErrors");

module.exports = {
    /**
     * Get warehouses list with pagination and filtering
     */
    getWarehouses: asyncHandler(async (req, res) => {
        const result = await warehouseModel.getWarehouses(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No warehouses found"));
        }

        // If result has pagination info
        if (result.data && result.pagination) {
            return res
                .status(200)
                .json(
                    ResponseFormatter.paginated(
                        result.data,
                        result.pagination.start,
                        result.pagination.length,
                        result.pagination.total,
                        "Warehouses retrieved successfully"
                    )
                );
        }

        res.status(200).json(ResponseFormatter.success(result, "Warehouses retrieved successfully"));
    }),

    /**
     * Get warehouse by ID
     */
    getData: asyncHandler(async (req, res) => {
        const warehouseId = req.params.id;

        if (!warehouseId || isNaN(warehouseId)) {
            throw new BadRequestError("Invalid warehouse ID");
        }

        const result = await warehouseModel.getData(warehouseId);

        if (!result || result.length === 0) {
            throw new NotFoundError("Warehouse");
        }

        res.status(200).json(
            ResponseFormatter.success(result[0], "Warehouse data retrieved successfully")
        );
    }),

    /**
     * Create new warehouse
     */
    create: asyncHandler(async (req, res) => {
        const { 
            warehousename,
            locationid,
            isdefaultwarehouse
        } = req.body;

        // Check if warehouse already exists
        const existingWarehouse = await warehouseModel.checkWarehouseExists(warehousename);
        if (existingWarehouse) {
            throw new ConflictError("Warehouse with this name already exists");
        }

        const warehouseData = {
            warehousename,
            locationid,
            isdefaultwarehouse: isdefaultwarehouse || 0,
            createdby: req.user.userId,
            createddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
            isdeleted: 0,
        };

        const result = await warehouseModel.create(warehouseData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to create warehouse");
        }

        winston.info("Warehouse created successfully", {
            source: "warehouse.controller.js",
            function: "create",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            warehouseId: result.data?.warehouseid,
            warehousename,
            createdBy: req.user.userId,
        });

        res.status(201).json(ResponseFormatter.created(result.data, "Warehouse created successfully"));
    }),

    /**
     * Update warehouse
     */
    update: asyncHandler(async (req, res) => {
        const warehouseId = req.params.id;
        const { 
            warehousename,
            locationid,
            isdefaultwarehouse
        } = req.body;

        // Check if warehouse exists
        const existingWarehouse = await warehouseModel.getData(warehouseId);
        
        if (!existingWarehouse || existingWarehouse.length === 0) {
            throw new NotFoundError("Warehouse");
        }

        // Check if warehouse name already exists for another warehouse
        if (warehousename) {
            const duplicateWarehouse = await warehouseModel.checkWarehouseExists(warehousename, warehouseId);
            if (duplicateWarehouse) {
                throw new ConflictError("Warehouse with this name already exists");
            }
        }

        // Prepare update data
        const updateData = {
            warehousename,
            locationid,
            isdefaultwarehouse,
            modifiedby: req.user.userId,
            modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const result = await warehouseModel.update(warehouseId, updateData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to update warehouse");
        }

        winston.info("Warehouse updated successfully", {
            source: "warehouse.controller.js",
            function: "update",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            warehouseId,
            updatedBy: req.user.userId,
        });

        res.status(200).json(ResponseFormatter.updated(result.data, "Warehouse updated successfully"));
    }),

    /**
     * Delete warehouse (soft delete)
     */
    delete: asyncHandler(async (req, res) => {
        const warehouseId = req.params.id || req.body.warehouseid;

        if (!warehouseId) {
            throw new BadRequestError("Warehouse ID is required");
        }

        // Check if warehouse exists
        const existingWarehouse = await warehouseModel.getData(warehouseId);
        if (!existingWarehouse || existingWarehouse.length === 0) {
            throw new NotFoundError("Warehouse");
        }

        const deleteData = {
            isdeleted: 1,
            modifiedby: req.user.userId,
            modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
        };

        const result = await warehouseModel.delete(warehouseId, deleteData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to delete warehouse");
        }

        winston.info("Warehouse deleted successfully", {
            source: "warehouse.controller.js",
            function: "delete",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            warehouseId,
            deletedBy: req.user.userId,
        });

        res.status(200).json(ResponseFormatter.deleted("Warehouse deleted successfully"));
    }),

    /**
     * Get all warehouses for dropdown
     */
    getAllWarehouses: asyncHandler(async (req, res) => {
        const warehouses = await warehouseModel.getAllWarehouses();

        res.status(200).json(
            ResponseFormatter.success(warehouses, "All warehouses retrieved successfully")
        );
    }),

    /**
     * Get warehouses by location
     */
    getWarehousesByLocation: asyncHandler(async (req, res) => {
        const locationId = req.params.locationid || req.query.locationid;

        if (!locationId) {
            throw new BadRequestError("Location ID is required");
        }

        const warehouses = await warehouseModel.getWarehousesByLocation(locationId);

        res.status(200).json(
            ResponseFormatter.success(warehouses, "Warehouses by location retrieved successfully")
        );
    }),
};