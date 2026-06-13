const bcrypt = require("bcrypt");
const userModel = require("../../../models/masters/user-mgmt/user.model");
const moment = require("moment");
const winston = require("../../../config/winston");
const fs = require("fs");
const path = require("path");
const ResponseFormatter = require("../../../utils/responseFormatter");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { NotFoundError, BadRequestError, ConflictError } = require("../../../utils/customErrors");
const config = require("../../../config/config");
const s3Helper = require("../../../helpers/s3Helper");

// Generic helper function to get file path from multer file object
const getUploadedFilePath = (file, uploadPath = "users/profilepic") => {
    if (!file) return "";
    // For local storage, multer provides the filename
    return `/uploads/${uploadPath}/${file.filename}`;
};

// Generic helper function for S3 upload
const uploadFileToS3 = async (file, s3Path) => {
    const fileName = `${s3Path}/${file.originalname.split(".")[0]}-${Date.now()}${path.extname(
        file.originalname
    )}`;

    const result = await s3Helper.uploadToS3(file.buffer, fileName, file.mimetype);

    return result.url;
};

module.exports = {
    /**
     * Get users list with pagination and filtering
     */
    getUsers: asyncHandler(async (req, res) => {
        const result = await userModel.getUsers(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No users found"));
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
                        "Users retrieved successfully"
                    )
                );
        }

        res.status(200).json(ResponseFormatter.success(result, "Users retrieved successfully"));
    }),

    /**
     * Get user by ID
     */
    getData: asyncHandler(async (req, res) => {
        const userId = req.params.id;

        if (!userId || isNaN(userId)) {
            throw new BadRequestError("Invalid user ID");
        }

        const result = await userModel.getData(userId);

        if (!result || result.length === 0) {
            throw new NotFoundError("User");
        }

        res.status(200).json(
            ResponseFormatter.success(result[0], "User data retrieved successfully")
        );
    }),

    /**
     * Create new user
     */
    create: asyncHandler(async (req, res) => {
        const { username, firstname, lastname, email, password } = req.body;

        // Check if user already exists
        const existingUser = await userModel.checkUserExists(email);
        if (existingUser) {
            throw new ConflictError("User with this email already exists");
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);

        // Handle profile picture if uploaded
        let profilepicPath = "";
        if (req.file) {
            // Check if S3 is enabled in config
            const useS3 = config.aws?.s3?.enabled || false;
            
            if (useS3) {
                // S3 storage (requires memory storage middleware)
                profilepicPath = await uploadFileToS3(req.file, "users/profilepic");
            } else {
                // Local storage
                profilepicPath = getUploadedFilePath(req.file, "users/profilepic");
            }
        }

        const userData = {
            username,
            firstname,
            lastname,
            email,
            password: hashedPassword,
            profilepic: profilepicPath,
            createdby: req.user.userId,
            createddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            modifedby: req.user.userId,
            modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
            isdeleted: 0,
        };

        const result = await userModel.create(userData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to create user");
        }

        winston.info("User created successfully", {
            source: "user.controller.js",
            function: "create",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.userId,
            newUserId: result.data?.userId,
            email,
            createdBy: req.user.userId
        });

        res.status(201).json(ResponseFormatter.created(result.data, "User created successfully"));
    }),

    /**
     * Update user
     */
    update: asyncHandler(async (req, res) => {
        const userId = req.params.id;
        const { username, firstname, lastname, email, password } = req.body;

        // Check if user exists
        const existingUser = await userModel.getData(userId);
        
        if (!existingUser || existingUser.length === 0) {
            throw new NotFoundError("User");
        }

        // Prepare update data
        const updateData = {
            username,
            firstname,
            lastname,
            email,
            modifedby: req.user.userId,
            modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
        };

        // Hash password if provided
        if (password && password.trim() !== "") {
            updateData.password = await bcrypt.hash(password, config.security.bcryptRounds);
        }

        // Handle profile picture if uploaded
        if (req.file) {
            // Check if S3 is enabled in config
            const useS3 = config.aws?.s3?.enabled || false;
            
            if (useS3) {
                // S3 storage (requires memory storage middleware)
                updateData.profilepic = await uploadFileToS3(req.file, "users/profilepic");
            } else {
                // Local storage
                updateData.profilepic = getUploadedFilePath(req.file, "users/profilepic");
            }
        }

        const result = await userModel.update(userId, updateData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to update user");
        }

        winston.info("User updated successfully", {
            source: "user.controller.js",
            function: "update",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.userId,
            targetUserId: userId,
            updatedBy: req.user.userId
        });

        res.status(200).json(ResponseFormatter.updated(result.data, "User updated successfully"));
    }),

    /**
     * Delete user (soft delete)
     */
    delete: asyncHandler(async (req, res) => {
        const userId = req.params.id || req.body.userid;

        if (!userId) {
            throw new BadRequestError("User ID is required");
        }

        // Check if user exists
        const existingUser = await userModel.getData(userId);
        if (!existingUser || existingUser.length === 0) {
            throw new NotFoundError("User");
        }

        const deleteData = {
            isdeleted: 1,
            modifedby: req.user.userId,
            modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
        };

        const result = await userModel.delete(userId, deleteData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to delete user");
        }

        winston.info("User deleted successfully", {
            source: "user.controller.js",
            function: "delete",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.userId,
            targetUserId: userId,
            deletedBy: req.user.userId
        });

        res.status(200).json(ResponseFormatter.deleted("User deleted successfully"));
    }),

    /**
     * Get current user profile
     */
    getUserProfile: asyncHandler(async (req, res) => {
        const userResp = await userModel.getData(req.user.userId);

        if (!userResp || userResp.length === 0) {
            throw new NotFoundError("User profile");
        }

        // Remove sensitive data
        const userProfile = { ...userResp[0] };
        delete userProfile.password;

        res.status(200).json(
            ResponseFormatter.success(userProfile, "Profile retrieved successfully")
        );
    }),
};
