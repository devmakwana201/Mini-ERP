const fs = require("fs");
const path = require("path");
const s3Helper = require("../../../helpers/s3Helper");
const itemCategoryModel = require("../../../models/masters/inventory/itemcategory.model");
const moment = require("moment");
const winston = require("../../../config/winston");
const ResponseFormatter = require("../../../utils/responseFormatter");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { NotFoundError, BadRequestError, ConflictError } = require("../../../utils/customErrors");
const config = require("../../../config/config");

// Generic helper function to get file path from multer file object
const getUploadedFilePath = (file, uploadPath = "itemcategories/images") => {
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
     * Get item categories list with pagination and filtering
     */
    getItemCategories: asyncHandler(async (req, res) => {
        const result = await itemCategoryModel.getItemCategories(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No item categories found"));
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
                        "Item categories retrieved successfully"
                    )
                );
        }

        res.status(200).json(
            ResponseFormatter.success(result, "Item categories retrieved successfully")
        );
    }),

    /**
     * Get item category by ID
     */
    getData: asyncHandler(async (req, res) => {
        const itemCategoryId = req.params.id;

        if (!itemCategoryId || isNaN(itemCategoryId)) {
            throw new BadRequestError("Invalid item category ID");
        }

        const result = await itemCategoryModel.getData(itemCategoryId);

        if (!result || result.length === 0) {
            throw new NotFoundError("Item category");
        }
        if (result[0].itemcategoryimage) {
            // Extract filename after last "/" and create object with filename as key and full path as value
            const filename = result[0].itemcategoryimage.substring(
                result[0].itemcategoryimage.lastIndexOf("/") + 1
            );
            result[0].itemcategoryimage = {
                ["key"]: filename,
                ["value"]: result[0].itemcategoryimage,
            };
        }
        res.status(200).json(
            ResponseFormatter.success(result[0], "Item category data retrieved successfully")
        );
    }),

    /**
     * Create new item category
     */
    create: asyncHandler(async (req, res) => {
        const {
            itemcategoryname,
            gujratiname,
            displayname,
            parentcategoryid,
            itemcategorydesc,
            itemcategoryorder,
            companyid,
            itemcategoryimage,
        } = req.body;

        // Check if item category already exists
        const existingCategory = await itemCategoryModel.checkItemCategoryExists(itemcategoryname);
        if (existingCategory) {
            throw new ConflictError("Item category with this name already exists in the company");
        }

        // Handle item category image - either from file upload or itemcategoryimage field
        let imagePath = "";

        if (req.files && req.files.length > 0) {
            // File was uploaded (using .any() so files is an array)
            const uploadedFile = req.files[0]; // Take first file
            const useS3 = config.aws?.s3?.enabled || false;

            if (useS3) {
                imagePath = await uploadFileToS3(uploadedFile, `itemcategories/images`);
            } else {
                // For local storage with .any(), construct path manually
                imagePath = `/uploads/itemcategories/images/${uploadedFile.filename}`;
            }
        } else if (itemcategoryimage) {
            // Image path was provided from frontend
            imagePath = itemcategoryimage;
        }

        const categoryData = {
            itemcategoryname: itemcategoryname.toLowerCase(),
            gujratiname,
            displayname,
            parentcategoryid: parentcategoryid || null,
            itemcategorydesc: itemcategorydesc || null,
            itemcategoryorder: itemcategoryorder || null,
            itemcategoryimage: imagePath,
            companyid,
            createdby: req.user.userId,
            createddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            modifiedby: req.user.userId,
            modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
            isdeleted: 0,
        };

        const result = await itemCategoryModel.create(categoryData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to create item category");
        }

        winston.info("Item category created successfully", {
            source: "item.category.controller.js",
            function: "create",
            endpoint: req.path,
            method: req.method,
            itemCategoryId: result.data?.itemcategoryid,
            itemcategoryname,
            createdBy: req.user?.userId,
        });

        res.status(201).json(
            ResponseFormatter.created(result.data, "Item category created successfully")
        );
    }),

    /**
     * Update item category
     */
    update: asyncHandler(async (req, res) => {
        const itemCategoryId = req.params.id;
        const {
            itemcategoryname,
            gujratiname,
            displayname,
            parentcategoryid,
            itemcategorydesc,
            itemcategoryorder,
            companyid,
            itemcategoryimage,
        } = req.body;

        // Check if item category exists
        const existingCategory = await itemCategoryModel.getData(itemCategoryId);

        if (!existingCategory || existingCategory.length === 0) {
            throw new NotFoundError("Item category");
        }

        // Check if item category name already exists for another category
        if (itemcategoryname && companyid) {
            const duplicateCategory = await itemCategoryModel.checkItemCategoryExists(
                itemcategoryname,
                itemCategoryId
            );
            if (duplicateCategory) {
                throw new ConflictError(
                    "Item category with this name already exists in the company"
                );
            }
        }

        // Prepare update data
        const updateData = {
            itemcategoryname: itemcategoryname.toLowerCase(),
            gujratiname,
            displayname,
            parentcategoryid: parentcategoryid || null,
            itemcategorydesc,
            itemcategoryorder: itemcategoryorder || null,
            companyid,
            modifiedby: req.user.userId,
            modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
        };

        // Handle item category image - either from file upload or itemcategoryimage field
        if (req.files && req.files.length > 0) {
            // File was uploaded (using .any() so files is an array)
            const uploadedFile = req.files[0]; // Take first file
            const useS3 = config.aws?.s3?.enabled || false;

            // Delete old image if exists
            const currentCategory = existingCategory[0];
            if (currentCategory.itemcategoryimage) {
                try {
                    if (useS3) {
                        const s3Helper = require("../helpers/s3Helper");
                        const s3Key = currentCategory.itemcategoryimage.replace(
                            /^https?:\/\/[^\/]+\//,
                            ""
                        );
                        await s3Helper.deleteFromS3(s3Key);
                        winston.info("Deleted S3 item category image", {
                            source: "itemcategory.controller.js",
                            function: "update",
                            endpoint: req.path,
                            method: req.method,
                            itemCategoryId,
                            deletedBy: req.user.userId,
                            s3Key,
                        });
                    } else {
                        // Delete from local storage
                        const oldImagePath = path.join(
                            process.cwd(),
                            currentCategory.itemcategoryimage
                        );
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                            winston.info("Deleted old item category image", {
                                source: "itemcategory.controller.js",
                                function: "update",
                                endpoint: req.path,
                                method: req.method,
                                itemCategoryId,
                                deletedBy: req.user.userId,
                                oldImagePath,
                            });
                        }
                    }
                } catch (error) {
                    winston.warn(`Failed to delete old item category image: ${error.message}`, {
                        source: "itemcategory.controller.js",
                        function: "update",
                        endpoint: req.path,
                        method: req.method,
                        userId: req.user?.userId,
                        error: error.message,
                    });
                }
            }

            if (useS3) {
                updateData.itemcategoryimage = await uploadFileToS3(
                    uploadedFile,
                    `itemcategories/images`
                );
            } else {
                // For local storage with .any(), construct path manually
                updateData.itemcategoryimage = `/uploads/itemcategories/images/${uploadedFile.filename}`;
            }
        } else if (itemcategoryimage !== undefined) {
            // Image path was provided from frontend or being cleared
            if (itemcategoryimage === "" || itemcategoryimage === null) {
                // If clearing the image, delete the old one
                const currentCategory = existingCategory[0];
                if (currentCategory.itemcategoryimage) {
                    try {
                        const useS3 = config.aws?.s3?.enabled || false;
                        if (useS3) {
                            // Delete from S3
                            const s3Helper = require("../helpers/s3Helper");
                            const s3Key = currentCategory.itemcategoryimage.replace(
                                /^https?:\/\/[^\/]+\//,
                                ""
                            );
                            await s3Helper.deleteFromS3(s3Key);
                            winston.info("Deleted cleared S3 item category image", {
                                source: "itemcategory.controller.js",
                                function: "update",
                                endpoint: req.path,
                                method: req.method,
                                itemCategoryId,
                                deletedBy: req.user.userId,
                                s3Key,
                            });
                        } else {
                            // Delete from local storage
                            const oldImagePath = path.join(
                                process.cwd(),
                                currentCategory.itemcategoryimage
                            );
                            if (fs.existsSync(oldImagePath)) {
                                fs.unlinkSync(oldImagePath);
                                winston.info("Deleted cleared item category image", {
                                    source: "itemcategory.controller.js",
                                    function: "update",
                                    endpoint: req.path,
                                    method: req.method,
                                    itemCategoryId,
                                    deletedBy: req.user.userId,
                                    oldImagePath,
                                });
                            }
                        }
                    } catch (error) {
                        winston.warn(
                            `Failed to delete cleared item category image: ${error.message}`,
                            {
                                source: "itemcategory.controller.js",
                                function: "update",
                                endpoint: req.path,
                                method: req.method,
                                userId: req.user?.userId,
                                error: error.message,
                            }
                        );
                    }
                }
            }
            updateData.itemcategoryimage = itemcategoryimage;
        }

        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const result = await itemCategoryModel.update(itemCategoryId, updateData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to update item category");
        }

        winston.info("Item category updated successfully", {
            source: "itemcategory.controller.js",
            function: "update",
            endpoint: req.path,
            method: req.method,
            itemCategoryId,
            updatedBy: req.user?.userId,
        });

        res.status(200).json(
            ResponseFormatter.updated(result.data, "Item category updated successfully")
        );
    }),

    /**
     * Delete item category (soft delete)
     */
    delete: asyncHandler(async (req, res) => {
        const itemCategoryId = req.params.id || req.body.itemcategoryid;

        if (!itemCategoryId) {
            throw new BadRequestError("Item category ID is required");
        }

        // Check if item category exists
        const existingCategory = await itemCategoryModel.getData(itemCategoryId);
        if (!existingCategory || existingCategory.length === 0) {
            throw new NotFoundError("Item category");
        }

        // Delete associated image file before soft deleting the item category
        if (existingCategory[0].itemcategoryimage) {
            try {
                const useS3 = config.aws?.s3?.enabled || false;
                if (useS3) {
                    // Delete from S3
                    const s3Helper = require("../helpers/s3Helper");
                    const s3Key = existingCategory[0].itemcategoryimage.replace(
                        /^https?:\/\/[^\/]+\//,
                        ""
                    );
                    await s3Helper.deleteFromS3(s3Key);

                    winston.info("Deleted S3 item category image during category deletion", {
                        source: "itemcategory.controller.js",
                        function: "delete",
                        endpoint: req.path,
                        method: req.method,
                        itemCategoryId,
                        deletedBy: req.user.userId,
                        s3Key,
                    });
                } else {
                    // Delete from local storage
                    const imagePath = path.join(
                        process.cwd(),
                        existingCategory[0].itemcategoryimage
                    );
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                        winston.info("Deleted item category image", {
                            source: "itemcategory.controller.js",
                            function: "delete",
                            endpoint: req.path,
                            method: req.method,
                            itemCategoryId,
                            deletedBy: req.user.userId,
                            imagePath,
                        });
                    }
                }
            } catch (error) {
                winston.warn(`Failed to delete item category image: ${error.message}`, {
                    source: "itemcategory.controller.js",
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

        const result = await itemCategoryModel.delete(itemCategoryId, deleteData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to delete item category");
        }

        winston.info("Item category deleted successfully", {
            source: "masters/inventory/itemcategory.controller.js",
            function: "delete",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            itemCategoryId,
            deletedBy: req.user.userId,
        });

        res.status(200).json(ResponseFormatter.deleted("Item category deleted successfully"));
    }),

    /**
     * Get item categories by company
     */
    getItemCategoriesByCompany: asyncHandler(async (req, res) => {
        const companyId = req.params.companyid || req.query.companyid;

        if (!companyId) {
            throw new BadRequestError("Company ID is required");
        }

        const categories = await itemCategoryModel.getItemCategoriesByCompany(companyId);

        res.status(200).json(
            ResponseFormatter.success(categories, "Item categories retrieved successfully")
        );
    }),

    /**
     * Get child categories by parent category
     */
    getChildCategories: asyncHandler(async (req, res) => {
        const parentCategoryId = req.params.parentid || req.query.parentid;

        if (!parentCategoryId) {
            throw new BadRequestError("Parent category ID is required");
        }

        const childCategories = await itemCategoryModel.getChildCategories(parentCategoryId);

        res.status(200).json(
            ResponseFormatter.success(childCategories, "Child categories retrieved successfully")
        );
    }),

    /**
     * Get parent categories (top level categories)
     */
    getParentCategories: asyncHandler(async (req, res) => {
        const companyId = req.params.companyid || req.query.companyid;

        if (!companyId) {
            throw new BadRequestError("Company ID is required");
        }

        const parentCategories = await itemCategoryModel.getParentCategories(companyId);

        res.status(200).json(
            ResponseFormatter.success(parentCategories, "Parent categories retrieved successfully")
        );
    }),
};
