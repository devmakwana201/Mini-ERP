const roleModel = require("../../../models/masters/user-mgmt/role.model");
const moment = require("moment");
const winston = require("../../../config/winston");
const ResponseFormatter = require("../../../utils/responseFormatter");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { NotFoundError, BadRequestError, ConflictError } = require("../../../utils/customErrors");

module.exports = {
    /**
     * Get roles list with pagination and filtering
     */
    getRoles: asyncHandler(async (req, res) => {
        const result = await roleModel.getRoles(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No roles found"));
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
                        "Roles retrieved successfully"
                    )
                );
        }

        res.status(200).json(ResponseFormatter.success(result, "Roles retrieved successfully"));
    }),

    /**
     * Get role by ID
     */
    getData: asyncHandler(async (req, res) => {
        const roleId = req.params.id;

        if (!roleId || isNaN(roleId)) {
            throw new BadRequestError("Invalid role ID");
        }

        const result = await roleModel.getData(roleId);

        if (!result || result.length === 0) {
            throw new NotFoundError("Role");
        }

        res.status(200).json(
            ResponseFormatter.success(result[0], "Role data retrieved successfully")
        );
    }),

    /**
     * Create new role
     */
    create: asyncHandler(async (req, res) => {
        const { 
            rolename,
            type
        } = req.body;

        // Check if role already exists
        const existingRole = await roleModel.checkRoleExists(rolename);
        if (existingRole) {
            throw new ConflictError("Role with this name already exists");
        }

        const roleData = {
            rolename,
            type: type || 1,
            createdby: req.user.userId,
            createddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
            isdeleted: 0,
        };

        const result = await roleModel.create(roleData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to create role");
        }

        winston.info("Role created successfully", {
            source: "role.controller.js",
            function: "create",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            roleId: result.data?.roleid,
            rolename,
            createdBy: req.user.userId,
        });

        res.status(201).json(ResponseFormatter.created(result.data, "Role created successfully"));
    }),

    /**
     * Update role
     */
    update: asyncHandler(async (req, res) => {
        const roleId = req.params.id;
        const { 
            rolename,
            type
        } = req.body;

        // Check if role exists
        const existingRole = await roleModel.getData(roleId);
        
        if (!existingRole || existingRole.length === 0) {
            throw new NotFoundError("Role");
        }

        // Check if role name already exists for another role
        if (rolename) {
            const duplicateRole = await roleModel.checkRoleExists(rolename, roleId);
            if (duplicateRole) {
                throw new ConflictError("Role with this name already exists");
            }
        }

        // Prepare update data
        const updateData = {
            rolename,
            type,
            modifedby: req.user.userId,
            modifeddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const result = await roleModel.update(roleId, updateData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to update role");
        }

        winston.info("Role updated successfully", {
            source: "role.controller.js",
            function: "update",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            roleId,
            updatedBy: req.user.userId,
        });

        res.status(200).json(ResponseFormatter.updated(result.data, "Role updated successfully"));
    }),

    /**
     * Delete role (soft delete)
     */
    delete: asyncHandler(async (req, res) => {
        const roleId = req.params.id || req.body.roleid;

        if (!roleId) {
            throw new BadRequestError("Role ID is required");
        }

        // Check if role exists
        const existingRole = await roleModel.getData(roleId);
        if (!existingRole || existingRole.length === 0) {
            throw new NotFoundError("Role");
        }

        const deleteData = {
            isdeleted: 1,
            modifedby: req.user.userId,
            modifeddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
        };

        const result = await roleModel.delete(roleId, deleteData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to delete role");
        }

        winston.info("Role deleted successfully", {
            source: "role.controller.js",
            function: "delete",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            roleId,
            deletedBy: req.user.userId,
        });

        res.status(200).json(ResponseFormatter.deleted("Role deleted successfully"));
    }),

    /**
     * Get all roles for dropdown
     */
    getAllRoles: asyncHandler(async (req, res) => {
        const roles = await roleModel.getAllRoles();

        res.status(200).json(
            ResponseFormatter.success(roles, "All roles retrieved successfully")
        );
    }),

};