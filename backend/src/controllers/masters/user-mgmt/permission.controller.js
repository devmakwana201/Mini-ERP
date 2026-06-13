const permissionModel = require("../../../models/masters/user-mgmt/permission.model");
const moment = require("moment");
const winston = require("../../../config/winston");
const ResponseFormatter = require("../../../utils/responseFormatter");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { NotFoundError, BadRequestError, ConflictError } = require("../../../utils/customErrors");

module.exports = {
    /**
     * Get permissions list with pagination and filtering
     */
    getPermissions: asyncHandler(async (req, res) => {
        const result = await permissionModel.getPermissions(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No permissions found"));
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
                        "Permissions retrieved successfully"
                    )
                );
        }

        res.status(200).json(ResponseFormatter.success(result, "Permissions retrieved successfully"));
    }),

    /**
     * Get permission by ID
     */
    getData: asyncHandler(async (req, res) => {
        const permissionId = req.params.id;

        if (!permissionId || isNaN(permissionId)) {
            throw new BadRequestError("Invalid permission ID");
        }

        const result = await permissionModel.getData(permissionId);

        if (!result || result.length === 0) {
            throw new NotFoundError("Permission");
        }

        res.status(200).json(
            ResponseFormatter.success(result[0], "Permission data retrieved successfully")
        );
    }),

    /**
     * Create new permission
     */
    create: asyncHandler(async (req, res) => {
        const { 
            permissiontitle,
            permissioncode,
            permissiontype,
            moduleid,
            applicablefor
        } = req.body;

        // Check if permission title already exists
        const existingTitle = await permissionModel.checkPermissionExists(permissiontitle);
        if (existingTitle) {
            throw new ConflictError("Permission with this title already exists");
        }

        // Check if permission code already exists
        if (permissioncode) {
            const existingCode = await permissionModel.checkPermissionCodeExists(permissioncode);
            if (existingCode) {
                throw new ConflictError("Permission with this code already exists");
            }
        }

        const permissionData = {
            permissiontitle,
            permissioncode,
            permissiontype,
            moduleid,
            applicablefor: applicablefor || 1, // Default to web
            createdby: req.user.userId,
            createddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
            isdeleted: 0,
        };

        const result = await permissionModel.create(permissionData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to create permission");
        }

        winston.info("Permission created successfully", {
            source: "permission.controller.js",
            function: "create",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            permissionId: result.data?.permissionid,
            permissiontitle,
            createdBy: req.user.userId,
        });

        res.status(201).json(ResponseFormatter.created(result.data, "Permission created successfully"));
    }),

    /**
     * Update permission
     */
    update: asyncHandler(async (req, res) => {
        const permissionId = req.params.id;
        const { 
            permissiontitle,
            permissioncode,
            permissiontype,
            moduleid,
            applicablefor
        } = req.body;

        // Check if permission exists
        const existingPermission = await permissionModel.getData(permissionId);
        
        if (!existingPermission || existingPermission.length === 0) {
            throw new NotFoundError("Permission");
        }

        // Check if permission title already exists for another permission
        if (permissiontitle) {
            const duplicateTitle = await permissionModel.checkPermissionExists(permissiontitle, permissionId);
            if (duplicateTitle) {
                throw new ConflictError("Permission with this title already exists");
            }
        }

        // Check if permission code already exists for another permission
        if (permissioncode) {
            const duplicateCode = await permissionModel.checkPermissionCodeExists(permissioncode, permissionId);
            if (duplicateCode) {
                throw new ConflictError("Permission with this code already exists");
            }
        }

        // Prepare update data
        const updateData = {
            permissiontitle,
            permissioncode,
            permissiontype,
            moduleid,
            applicablefor,
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

        const result = await permissionModel.update(permissionId, updateData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to update permission");
        }

        winston.info("Permission updated successfully", {
            source: "permission.controller.js",
            function: "update",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            permissionId,
            updatedBy: req.user.userId,
        });

        res.status(200).json(ResponseFormatter.updated(result.data, "Permission updated successfully"));
    }),

    /**
     * Delete permission (soft delete)
     */
    delete: asyncHandler(async (req, res) => {
        const permissionId = req.params.id || req.body.permissionid;

        if (!permissionId) {
            throw new BadRequestError("Permission ID is required");
        }

        // Check if permission exists
        const existingPermission = await permissionModel.getData(permissionId);
        if (!existingPermission || existingPermission.length === 0) {
            throw new NotFoundError("Permission");
        }

        const deleteData = {
            isdeleted: 1,
            modifiedby: req.user.userId,
            modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
        };

        const result = await permissionModel.delete(permissionId, deleteData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to delete permission");
        }

        winston.info("Permission deleted successfully", {
            source: "permission.controller.js",
            function: "delete",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            permissionId,
            deletedBy: req.user.userId,
        });

        res.status(200).json(ResponseFormatter.deleted("Permission deleted successfully"));
    }),

    /**
     * Get all permissions for dropdown
     */
    getAllPermissions: asyncHandler(async (req, res) => {
        const permissions = await permissionModel.getAllPermissions();

        res.status(200).json(
            ResponseFormatter.success(permissions, "All permissions retrieved successfully")
        );
    }),

    /**
     * Get permissions by module
     */
    getPermissionsByModule: asyncHandler(async (req, res) => {
        const moduleId = req.params.moduleid || req.query.moduleid;

        if (!moduleId) {
            throw new BadRequestError("Module ID is required");
        }

        const permissions = await permissionModel.getPermissionsByModule(moduleId);

        res.status(200).json(
            ResponseFormatter.success(permissions, "Permissions by module retrieved successfully")
        );
    }),

};