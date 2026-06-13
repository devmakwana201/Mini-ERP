const uomModel = require("../../../models/masters/inventory/uom.model");
const moment = require("moment");
const winston = require("../../../config/winston");
const ResponseFormatter = require("../../../utils/responseFormatter");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { NotFoundError, BadRequestError, ConflictError } = require("../../../utils/customErrors");

module.exports = {
    /**
     * Get UOMs list with pagination and filtering
     */
    getUOMs: asyncHandler(async (req, res) => {
        const result = await uomModel.getUOMs(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No UOMs found"));
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
                        "UOMs retrieved successfully"
                    )
                );
        }

        res.status(200).json(ResponseFormatter.success(result, "UOMs retrieved successfully"));
    }),

    /**
     * Get UOM by ID
     */
    getData: asyncHandler(async (req, res) => {
        const uomId = req.params.id;

        if (!uomId || isNaN(uomId)) {
            throw new BadRequestError("Invalid UOM ID");
        }

        const result = await uomModel.getData(uomId);

        if (!result || result.length === 0) {
            throw new NotFoundError("UOM");
        }

        res.status(200).json(
            ResponseFormatter.success(result[0], "UOM data retrieved successfully")
        );
    }),

    /**
     * Create new UOM
     */
    create: asyncHandler(async (req, res) => {
        const { uomname, companyid } = req.body;

        // Check if UOM already exists
        const existingUOM = await uomModel.checkUOMExists(uomname, companyid);
        if (existingUOM) {
            throw new ConflictError("UOM with this name already exists in the company");
        }

        const uomData = {
            uomname,
            companyid,
            createdby: req.user.userId,
            ipaddress: req.ip || req.connection.remoteAddress,
            isdeleted: 0,
        };

        const result = await uomModel.create(uomData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to create UOM");
        }

        winston.info("UOM created successfully", {
            source: "uom.controller.js",
            function: "create",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            uomId: result.data?.uomid,
            uomname,
            createdBy: req.user.userId,
        });

        res.status(201).json(ResponseFormatter.created(result.data, "UOM created successfully"));
    }),

    /**
     * Update UOM
     */
    update: asyncHandler(async (req, res) => {
        const uomId = req.params.id;
        const { uomname, companyid } = req.body;

        // Check if UOM exists
        const existingUOM = await uomModel.getData(uomId);
        
        if (!existingUOM || existingUOM.length === 0) {
            throw new NotFoundError("UOM");
        }

        // Check if UOM name already exists for another UOM
        if (uomname && companyid) {
            const duplicateUOM = await uomModel.checkUOMExists(uomname, companyid, uomId);
            if (duplicateUOM) {
                throw new ConflictError("UOM with this name already exists in the company");
            }
        }

        // Prepare update data
        const updateData = {
            uomname,
            companyid,
            modifiedby: req.user.userId,
            ipaddress: req.ip || req.connection.remoteAddress,
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const result = await uomModel.update(uomId, updateData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to update UOM");
        }

        winston.info("UOM updated successfully", {
            source: "uom.controller.js",
            function: "update",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            uomId,
            updatedBy: req.user.userId,
        });

        res.status(200).json(ResponseFormatter.updated(result.data, "UOM updated successfully"));
    }),

    /**
     * Delete UOM (soft delete)
     */
    delete: asyncHandler(async (req, res) => {
        const uomId = req.params.id || req.body.uomid;

        if (!uomId) {
            throw new BadRequestError("UOM ID is required");
        }

        // Check if UOM exists
        const existingUOM = await uomModel.getData(uomId);
        if (!existingUOM || existingUOM.length === 0) {
            throw new NotFoundError("UOM");
        }

        const deleteData = {
            isdeleted: 1,
            modifiedby: req.user.userId,
            modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
        };

        const result = await uomModel.delete(uomId, deleteData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to delete UOM");
        }

        winston.info("UOM deleted successfully", {
            source: "uom.controller.js",
            function: "delete",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            uomId,
            deletedBy: req.user.userId,
        });

        res.status(200).json(ResponseFormatter.deleted("UOM deleted successfully"));
    }),

    /**
     * Get UOMs by company
     */
    getUOMsByCompany: asyncHandler(async (req, res) => {
        const companyId = req.params.companyid || req.query.companyid;

        if (!companyId) {
            throw new BadRequestError("Company ID is required");
        }

        const uoms = await uomModel.getUOMsByCompany(companyId);

        res.status(200).json(
            ResponseFormatter.success(uoms, "UOMs retrieved successfully")
        );
    }),
};