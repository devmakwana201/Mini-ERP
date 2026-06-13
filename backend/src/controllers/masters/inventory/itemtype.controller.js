const itemTypeModel = require("../../../models/masters/inventory/itemtype.model");
const moment = require("moment");
const winston = require("../../../config/winston");
const ResponseFormatter = require("../../../utils/responseFormatter");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { NotFoundError, BadRequestError, ConflictError } = require("../../../utils/customErrors");

module.exports = {
    /**
     * Get item types list with pagination and filtering
     */
    getItemTypes: asyncHandler(async (req, res) => {
        const result = await itemTypeModel.getItemTypes(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No item types found"));
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
                        "Item types retrieved successfully"
                    )
                );
        }

        res.status(200).json(ResponseFormatter.success(result, "Item types retrieved successfully"));
    }),

    /**
     * Get item type by ID
     */
    getData: asyncHandler(async (req, res) => {
        const itemTypeId = req.params.id;

        if (!itemTypeId || isNaN(itemTypeId)) {
            throw new BadRequestError("Invalid item type ID");
        }

        const result = await itemTypeModel.getData(itemTypeId);

        if (!result || result.length === 0) {
            throw new NotFoundError("Item type");
        }

        res.status(200).json(
            ResponseFormatter.success(result[0], "Item type data retrieved successfully")
        );
    }),

    /**
     * Create new item type
     */
    create: asyncHandler(async (req, res) => {
        const { itemtypename, itemtypedesc, companyid } = req.body;

        // Check if item type already exists
        const existingType = await itemTypeModel.checkItemTypeExists(itemtypename, companyid);
        if (existingType) {
            throw new ConflictError("Item type with this name already exists in the company");
        }

        const typeData = {
            itemtypename,
            itemtypedesc: itemtypedesc || null,
            companyid,
            createdby: req.user.userId,
            createddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            // modifiedby: req.user.userId,
            // modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
            isdeleted: 0,
        };

        const result = await itemTypeModel.create(typeData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to create item type");
        }

        winston.info("Item type created successfully", {
            source: "itemtype.controller.js",
            function: "create",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            itemTypeId: result.data?.itemtypeid,
            itemtypename,
            createdBy: req.user.userId,
        });

        res.status(201).json(ResponseFormatter.created(result.data, "Item type created successfully"));
    }),

    /**
     * Update item type
     */
    update: asyncHandler(async (req, res) => {
        const itemTypeId = req.params.id;
        const { itemtypename, itemtypedesc, companyid } = req.body;

        // Check if item type exists
        const existingType = await itemTypeModel.getData(itemTypeId);
        
        if (!existingType || existingType.length === 0) {
            throw new NotFoundError("Item type");
        }

        // Check if item type name already exists for another type
        if (itemtypename && companyid) {
            const duplicateType = await itemTypeModel.checkItemTypeExists(itemtypename, companyid, itemTypeId);
            if (duplicateType) {
                throw new ConflictError("Item type with this name already exists in the company");
            }
        }

        // Prepare update data
        const updateData = {
            itemtypename,
            itemtypedesc,
            companyid,
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

        const result = await itemTypeModel.update(itemTypeId, updateData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to update item type");
        }

        winston.info("Item type updated successfully", {
            source: "itemtype.controller.js",
            function: "update",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            itemTypeId,
            updatedBy: req.user.userId,
        });

        res.status(200).json(ResponseFormatter.updated(result.data, "Item type updated successfully"));
    }),

    /**
     * Delete item type (soft delete)
     */
    delete: asyncHandler(async (req, res) => {
        const itemTypeId = req.params.id || req.body.itemtypeid;

        if (!itemTypeId) {
            throw new BadRequestError("Item type ID is required");
        }

        // Check if item type exists
        const existingType = await itemTypeModel.getData(itemTypeId);
        if (!existingType || existingType.length === 0) {
            throw new NotFoundError("Item type");
        }

        const deleteData = {
            isdeleted: 1,
            modifiedby: req.user.userId,
            modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
        };

        const result = await itemTypeModel.delete(itemTypeId, deleteData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to delete item type");
        }

        winston.info("Item type deleted successfully", {
            source: "itemtype.controller.js",
            function: "delete",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            itemTypeId,
            deletedBy: req.user.userId,
        });

        res.status(200).json(ResponseFormatter.deleted("Item type deleted successfully"));
    }),

    /**
     * Get item types by company
     */
    getItemTypesByCompany: asyncHandler(async (req, res) => {
        const companyId = req.params.companyid || req.query.companyid;

        if (!companyId) {
            throw new BadRequestError("Company ID is required");
        }

        const types = await itemTypeModel.getItemTypesByCompany(companyId);

        res.status(200).json(
            ResponseFormatter.success(types, "Item types retrieved successfully")
        );
    }),
};