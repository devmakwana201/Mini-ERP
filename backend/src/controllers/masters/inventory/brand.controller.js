const fs = require("fs");
const path = require("path");
const config = require("../../../config/config");
const brandModel = require("../../../models/masters/inventory/brand.model");
const moment = require("moment");
const winston = require("../../../config/winston");
const ResponseFormatter = require("../../../utils/responseFormatter");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { NotFoundError, BadRequestError, ConflictError } = require("../../../utils/customErrors");
const s3Helper = require("../../../helpers/s3Helper");

// Generic helper function to get file path from multer file object
const getUploadedFilePath = (file, uploadPath = "brands/icons") => {
    if (!file) return "";
    return `/uploads/${uploadPath}/${file.filename}`;
};

// Generic helper function for S3 upload
const uploadFileToS3 = async (file, s3Path) => {
    if (!file) {
        throw new Error("No file provided for upload");
    }
    if (!file.buffer) {
        throw new Error("File buffer not available - check multer configuration");
    }
    let fileName = file.originalname.split(".")[0];
    fileName = fileName.replace(/[^a-zA-Z0-9]/g, "_");

    fileName = `${s3Path}/${fileName}_${Date.now()}${path.extname(file.originalname)}`;

    const result = await s3Helper.uploadToS3(file.buffer, fileName, file.mimetype);
    return result.url;
};

module.exports = {
    /**
     * Get brands list with pagination and filtering
     */
    getBrands: asyncHandler(async (req, res) => {
        const result = await brandModel.getBrands(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No brands found"));
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
                        "Brands retrieved successfully"
                    )
                );
        }

        res.status(200).json(ResponseFormatter.success(result, "Brands retrieved successfully"));
    }),

    /**
     * Get brand by ID
     */
    getData: asyncHandler(async (req, res) => {
        const brandId = req.params.id;

        if (!brandId || isNaN(brandId)) {
            throw new BadRequestError("Invalid brand ID");
        }

        const result = await brandModel.getData(brandId);

        if (!result || result.length === 0) {
            throw new NotFoundError("Brand");
        }
        if (result[0].brandicon) {
            // Extract filename after last "/" and create object with filename as key and full path as value
            const filename = result[0].brandicon.substring(
                result[0].brandicon.lastIndexOf("/") + 1
            );
            result[0].brandicon = {
                ["key"]: filename,
                ["value"]: result[0].brandicon,
            };
        }

        res.status(200).json(
            ResponseFormatter.success(result[0], "Brand data retrieved successfully")
        );
    }),

    /**
     * Create new brand
     */
    create: asyncHandler(async (req, res) => {
        const { brandname, branddesc, brandcategory, companyid, brandicon } = req.body;

        // Check if brand already exists
        const existingBrand = await brandModel.checkBrandExists(brandname);
        if (existingBrand) {
            throw new ConflictError("Brand with this name already exists in the company");
        }

        // Handle brand icon - either from file upload or brandicon field
        let iconPath = "";

        if (req.files && req.files.length > 0) {
            // File was uploaded (using .any() so files is an array)
            const uploadedFile = req.files[0]; // Take first file
            const useS3 = config.aws?.s3?.enabled || false;

            if (useS3) {
                iconPath = await uploadFileToS3(uploadedFile, `brands/icons`);
            } else {
                // For local storage with .any(), construct path manually
                iconPath = `/uploads/brands/icons/${uploadedFile.filename}`;
            }
        } else if (brandicon) {
            // Icon path was provided from frontend
            iconPath = brandicon;
        }

        const brandData = {
            brandname: brandname.toLowerCase(),
            branddesc,
            brandcategory: brandcategory.join(", "),
            brandicon: iconPath,
            companyid,
            isapproved: 1,
            approvalremark: "addded by server",
            replacewith: null,
            createdby: req.user.userId,
            createddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            modifiedby: req.user.userId,
            modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
            isdeleted: 0,
        };
        const result = await brandModel.create(brandData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to create brand");
        }

        winston.info("Brand created successfully", {
            source: "brand.controller.js",
            function: "create",
            endpoint: req.path,
            method: req.method,
            brandId: result.data?.brandid,
            brandname,
            createdBy: req.user?.userId,
        });

        res.status(201).json(ResponseFormatter.created(result.data, "Brand created successfully"));
    }),

    /**
     * Update brand
     */
    update: asyncHandler(async (req, res) => {
        const brandId = req.params.id;
        const {
            brandname,
            branddesc,
            brandcategory,
            companyid,
            isapproved,
            approvalremark,
            replacewith,
            brandicon,
        } = req.body;

        // Check if brand exists
        const existingBrand = await brandModel.getData(brandId);

        if (!existingBrand || existingBrand.length === 0) {
            throw new NotFoundError("Brand");
        }

        // Check if brand name already exists for another brand
        if (brandname && companyid) {
            const duplicateBrand = await brandModel.checkBrandExists(brandname, brandId);
            if (duplicateBrand) {
                throw new ConflictError("Brand with this name already exists in the company");
            }
        }

        // Prepare update data
        const updateData = {
            brandname: brandname.toLowerCase(),
            branddesc,
            brandcategory: brandcategory.join(", "),
            companyid,
            isapproved,
            approvalremark,
            replacewith,
            modifiedby: req.user.userId,
            modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
        };

        // Handle brand icon - either from file upload or brandicon field
        if (req.files && req.files.length > 0) {
            // File was uploaded (using .any() so files is an array)
            const uploadedFile = req.files[0]; // Take first file
            const useS3 = config.aws?.s3?.enabled || false;

            // Delete old icon if exists
            const currentBrand = existingBrand[0];
            if (currentBrand.brandicon) {
                try {
                    if (useS3) {
                        const s3Helper = require("../helpers/s3Helper");
                        const s3Key = currentBrand.brandicon.replace(/^https?:\/\/[^\/]+\//, "");
                        await s3Helper.deleteFromS3(s3Key);
                        winston.info("Deleted S3 brand icon", {
                            source: "brand.controller.js",
                            function: "update",
                            endpoint: req.path,
                            method: req.method,
                            brandId,
                            deletedBy: req.user.userId,
                            s3Key,
                        });
                    } else {
                        // Delete from local storage
                        const oldIconPath = path.join(process.cwd(), currentBrand.brandicon);
                        if (fs.existsSync(oldIconPath)) {
                            fs.unlinkSync(oldIconPath);
                            winston.info("Deleted old brand icon", {
                                source: "brand.controller.js",
                                function: "update",
                                endpoint: req.path,
                                method: req.method,
                                brandId,
                                deletedBy: req.user.userId,
                                oldIconPath,
                            });
                        }
                    }
                } catch (error) {
                    winston.warn(`Failed to delete old brand icon: ${error.message}`, {
                        source: "brand.controller.js",
                        function: "update",
                        endpoint: req.path,
                        method: req.method,
                        userId: req.user?.userId,
                        error: error.message,
                    });
                }
            }

            if (useS3) {
                updateData.brandicon = await uploadFileToS3(uploadedFile, `brands/icons`);
            } else {
                // For local storage with .any(), construct path manually
                updateData.brandicon = `/uploads/brands/icons/${uploadedFile.filename}`;
            }
        } else if (brandicon !== undefined) {
            // Icon path was provided from frontend or being cleared
            if (brandicon === "" || brandicon === null) {
                // If clearing the icon, delete the old one
                const currentBrand = existingBrand[0];
                if (currentBrand.brandicon) {
                    try {
                        const useS3 = config.aws?.s3?.enabled || false;
                        if (useS3) {
                            // Delete from S3
                            const s3Helper = require("../helpers/s3Helper");
                            const s3Key = currentBrand.brandicon.replace(
                                /^https?:\/\/[^\/]+\//,
                                ""
                            );
                            await s3Helper.deleteFromS3(s3Key);
                            winston.info("Deleted cleared S3 brand icon", {
                                source: "brand.controller.js",
                                function: "update",
                                endpoint: req.path,
                                method: req.method,
                                brandId,
                                deletedBy: req.user.userId,
                                s3Key,
                            });
                        } else {
                            // Delete from local storage
                            const oldIconPath = path.join(process.cwd(), currentBrand.brandicon);
                            if (fs.existsSync(oldIconPath)) {
                                fs.unlinkSync(oldIconPath);
                                winston.info("Deleted cleared brand icon", {
                                    source: "brand.controller.js",
                                    function: "update",
                                    endpoint: req.path,
                                    method: req.method,
                                    brandId,
                                    deletedBy: req.user.userId,
                                    oldIconPath,
                                });
                            }
                        }
                    } catch (error) {
                        winston.warn(`Failed to delete cleared brand icon: ${error.message}`, {
                            source: "brand.controller.js",
                            function: "update",
                            endpoint: req.path,
                            method: req.method,
                            userId: req.user?.userId,
                            error: error.message,
                        });
                    }
                }
            }
            updateData.brandicon = brandicon;
        }

        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const result = await brandModel.update(brandId, updateData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to update brand");
        }

        winston.info("Brand updated successfully", {
            source: "brand.controller.js",
            function: "update",
            endpoint: req.path,
            method: req.method,
            brandId,
            updatedBy: req.user?.userId,
        });

        res.status(200).json(ResponseFormatter.updated(result.data, "Brand updated successfully"));
    }),

    /**
     * Delete brand (soft delete)
     */
    delete: asyncHandler(async (req, res) => {
        const brandId = req.params.id || req.body.brandid;

        if (!brandId) {
            throw new BadRequestError("Brand ID is required");
        }

        // Check if brand exists
        const existingBrand = await brandModel.getData(brandId);
        if (!existingBrand || existingBrand.length === 0) {
            throw new NotFoundError("Brand");
        }

        // Delete associated icon file before soft deleting the brand
        if (existingBrand[0].brandicon) {
            try {
                const useS3 = config.aws?.s3?.enabled || false;
                if (useS3) {
                    // Delete from S3
                    const s3Helper = require("../helpers/s3Helper");
                    const s3Key = existingBrand[0].brandicon.replace(/^https?:\/\/[^\/]+\//, "");
                    await s3Helper.deleteFromS3(s3Key);
                    winston.info("Deleted S3 brand icon during brand deletion", {
                        source: "brand.controller.js",
                        function: "delete",
                        endpoint: req.path,
                        method: req.method,
                        brandId,
                        deletedBy: req.user.userId,
                        s3Key,
                    });
                } else {
                    // Delete from local storage
                    const iconPath = path.join(process.cwd(), existingBrand[0].brandicon);
                    if (fs.existsSync(iconPath)) {
                        fs.unlinkSync(iconPath);
                        winston.info("Deleted brand icon during brand deletion", {
                            source: "brand.controller.js",
                            function: "delete",
                            endpoint: req.path,
                            method: req.method,
                            brandId,
                            deletedBy: req.user.userId,
                            iconPath,
                        });
                    }
                }
            } catch (error) {
                winston.warn(`Failed to delete brand icon: ${error.message}`, {
                    source: "brand.controller.js",
                    function: "delete",
                    endpoint: req.path,
                    method: req.method,
                    userId: req.user?.userId,
                    error: error.message,
                });
            }
        }

        const deleteData = {
            isdeleted: 1,
            modifiedby: req.user.userId,
            modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
        };

        const result = await brandModel.delete(brandId, deleteData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to delete brand");
        }

        winston.info("Brand deleted successfully", {
            source: "brand.controller.js",
            function: "delete",
            endpoint: req.path,
            method: req.method,
            brandId,
            deletedBy: req.user.userId,
        });

        res.status(200).json(ResponseFormatter.deleted("Brand deleted successfully"));
    }),

    /**
     * Get brands by company
     */
    getBrandsByCompany: asyncHandler(async (req, res) => {
        const companyId = req.params.companyid || req.query.companyid;

        if (!companyId) {
            throw new BadRequestError("Company ID is required");
        }

        const brands = await brandModel.getBrandsByCompany(companyId);

        res.status(200).json(ResponseFormatter.success(brands, "Brands retrieved successfully"));
    }),

    /**
     * Get unapproved brands with pagination and optional company filter
     */
    getUnapprovedBrands: asyncHandler(async (req, res) => {
        const result = await brandModel.getUnapprovedBrands(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res
                .status(200)
                .json(ResponseFormatter.success([], "No unapproved brands found"));
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
                        "Unapproved brands retrieved successfully"
                    )
                );
        }

        res.status(200).json(
            ResponseFormatter.success(result, "Unapproved brands retrieved successfully")
        );
    }),

    /**
     * Get rejection reasons for brand approval
     */
    getRejectionReasons: asyncHandler(async (req, res) => {
        const result = await brandModel.getRejectionReasons();

        if (result.success) {
            res.status(200).json(ResponseFormatter.success(result.data, "Rejection reasons retrieved successfully"));
        } else {
            res.status(500).json(ResponseFormatter.error("Failed to retrieve rejection reasons"));
        }
    }),

    /**
     * Approve a single brand
     */
    approveBrand: asyncHandler(async (req, res) => {
        const brandId = req.params.id;
        const { approvalremark } = req.body;

        if (!brandId || isNaN(brandId)) {
            throw new BadRequestError("Invalid brand ID");
        }

        const approvalData = {
            approvedby: req.user.userId,
            approvalremark: approvalremark || "Approved",
        };

        const result = await brandModel.approveBrand(brandId, approvalData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to approve brand");
        }

        winston.info("Brand approved", {
            source: "brand.controller.js",
            function: "approveBrand",
            endpoint: req.path,
            method: req.method,
            brandId,
            approvedBy: req.user.userId,
            remark: approvalremark,
        });

        res.status(200).json(ResponseFormatter.success(result.data, result.msg));
    }),

    /**
     * Reject a single brand
     */
    rejectBrand: asyncHandler(async (req, res) => {
        const brandId = req.params.id;
        const { rejectionreason, rejectionremark, replacewith } = req.body;

        if (!brandId || isNaN(brandId)) {
            throw new BadRequestError("Invalid brand ID");
        }

        if (!rejectionreason) {
            throw new BadRequestError("Rejection reason is required");
        }

        const rejectionData = {
            rejectedby: req.user.userId,
            rejectionreason,
            rejectionremark: rejectionremark || "",
            replacewith: replacewith || null,
        };

        const result = await brandModel.rejectBrand(brandId, rejectionData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to reject brand");
        }

        winston.info("Brand rejected", {
            source: "brand.controller.js",
            function: "rejectBrand",
            endpoint: req.path,
            method: req.method,
            brandId,
            rejectedBy: req.user.userId,
            reason: rejectionreason,
            remark: rejectionremark,
        });

        res.status(200).json(ResponseFormatter.success(result.data, result.msg));
    }),

    /**
     * Bulk approve brands
     */
    bulkApproveBrands: asyncHandler(async (req, res) => {
        const { brandids, approvalremark } = req.body;

        if (!brandids || !Array.isArray(brandids) || brandids.length === 0) {
            throw new BadRequestError("Brand IDs array is required");
        }

        const approvalData = {
            approvedby: req.user.userId,
            approvalremark: approvalremark || "Bulk approved",
        };

        const result = await brandModel.bulkApproveBrands(brandids, approvalData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to approve brands");
        }

        winston.info("Brand bulk approved", {
            source: "brand.controller.js",
            function: "bulkApproveBrands",
            endpoint: req.path,
            method: req.method,
            count: brandids.length,
            approvedBy: req.user.userId,
            remark: approvalremark,
        });

        res.status(200).json(ResponseFormatter.success(result.data, result.msg));
    }),

    /**
     * Bulk reject brands
     */
    bulkRejectBrands: asyncHandler(async (req, res) => {
        const { brandids, rejectionreason, rejectionremark } = req.body;

        if (!brandids || !Array.isArray(brandids) || brandids.length === 0) {
            throw new BadRequestError("Brand IDs array is required");
        }

        if (!rejectionreason) {
            throw new BadRequestError("Rejection reason is required");
        }

        const rejectionData = {
            rejectedby: req.user.userId,
            rejectionreason,
            rejectionremark: rejectionremark || "",
        };

        const result = await brandModel.bulkRejectBrands(brandids, rejectionData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to reject brands");
        }

         winston.info("Brand bulk rejected", {
            source: "brand.controller.js",
            function: "bulkRejectBrands",
            endpoint: req.path,
            method: req.method,
            count: brandids.length,
            rejectedBy: req.user.userId,
            reason: rejectionreason,
            remark: rejectionremark,
        });

        res.status(200).json(ResponseFormatter.success(result.data, result.msg));
    }),
};
