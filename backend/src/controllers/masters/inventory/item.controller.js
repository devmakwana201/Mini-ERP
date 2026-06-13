const itemModel = require("../../../models/masters/inventory/item.model");
const moment = require("moment");
const winston = require("../../../config/winston");
const fs = require("fs");
const path = require("path");
const s3Helper = require("../../../helpers/s3Helper");
const ResponseFormatter = require("../../../utils/responseFormatter");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { NotFoundError, BadRequestError, ConflictError } = require("../../../utils/customErrors");
const config = require("../../../config/config");
const {
    handleProductImport,
    validateProductImport: validateProductImportService,
    insertValidatedProducts,
    generateSampleExcel,
} = require("../../../services/productImport.service");

// Generic helper function to get file path from multer file object
const getUploadedFilePath = (file, uploadPath = "items/images") => {
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

/**
 * Step 1: Validate and preview product import from Excel
 * Returns counts of new products, categories, subcategories, brands, and errors
 */
const validateProductImport = asyncHandler(async (req, res) => {
    try {
        const file = req.file;
        if (!file) throw new BadRequestError("No Excel file uploaded");

        winston.info(`[VALIDATE_PRODUCTS] File received: ${file.originalname}`);

        const result = await validateProductImportService(file);

        if (!result.success) {
            return res.status(400).json(ResponseFormatter.error(result.error, 400));
        }

        winston.info(
            `[VALIDATE_PRODUCTS] Validation completed: NewProducts=${result.newProductsCount}, Existing=${result.existingProductsCount}, Errors=${result.errorsCount}`
        );

        return res
            .status(200)
            .json(
                ResponseFormatter.success(result, result.message || "Product validation completed")
            );
    } catch (error) {
        winston.error(`[VALIDATE_PRODUCTS] Error: ${error.message}`);
        return res
            .status(500)
            .json(
                ResponseFormatter.error(
                    "Internal Server Error during product validation",
                    error.message
                )
            );
    }
});

/**
 * Step 2: Actually insert validated products from Excel
 */
const confirmProductImport = asyncHandler(async (req, res) => {
    try {
        const file = req.file;
        if (!file) throw new BadRequestError("No Excel file uploaded");

        winston.info(`[CONFIRM_IMPORT_PRODUCTS] File received: ${file.originalname}`);

        const userId = req.user?.userId || null;
        const ipAddress = req.ip || req.connection?.remoteAddress;

        const result = await insertValidatedProducts(file, userId, ipAddress);

        if (!result.success) {
            return res
                .status(400)
                .json(ResponseFormatter.error("Product import failed", result.error));
        }

        winston.info(
            `[CONFIRM_IMPORT_PRODUCTS] Import completed: Added=${result.summary?.addedProducts}, Updated=${result.summary?.updatedProducts}`
        );

        return res
            .status(200)
            .json(
                ResponseFormatter.success(
                    result,
                    result.message || "Products imported successfully"
                )
            );
    } catch (error) {
        winston.error(`[CONFIRM_IMPORT_PRODUCTS] Error: ${error.message}`);
        return res
            .status(500)
            .json(
                ResponseFormatter.error(
                    "Internal Server Error during product import",
                    error.message
                )
            );
    }
});

module.exports = {
    /**
     * Get items list with pagination and filtering
     */
    getItems: asyncHandler(async (req, res) => {
        const result = await itemModel.getItems(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No items found"));
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
                        "Items retrieved successfully"
                    )
                );
        }

        res.status(200).json(ResponseFormatter.success(result, "Items retrieved successfully"));
    }),

    /**
     * Get item by ID
     */
    getData: asyncHandler(async (req, res) => {
        const itemId = req.params.id;
        const { includeUom = "true" } = req.query; // Include UOM by default

        if (!itemId || isNaN(itemId)) {
            throw new BadRequestError("Invalid item ID");
        }

        const result = await itemModel.getData(itemId);

        if (!result || result.length === 0) {
            throw new NotFoundError("Item");
        }

        const itemData = result[0];
        if (itemData.imgpath) {
            // Extract filename after last "/" and create object with filename as key and full path as value
            const filename = itemData.imgpath.substring(itemData.imgpath.lastIndexOf("/") + 1);
            itemData.imgpath = {
                ["key"]: filename,
                ["value"]: itemData.imgpath,
            };
        }

        res.status(200).json(
            ResponseFormatter.success(itemData, "Item data retrieved successfully")
        );
    }),

    /**
     * Create new item
     */
    create: asyncHandler(async (req, res) => {
        const {
            itemname,
            itemdisplayname,
            genericname,
            itemcode,
            mastercategoryid,
            categoryid,
            subcategoryid,
            brandid,
            safetyquantity,
            defaulttaxprofileid,
            sellingitemas,
            hsnseccode,
            pricetype,
            sellingprice,
            purchaseprice,
            netcost,
            ingredients,
            description,
            baseunit,
            imgpath,
            wholesaleprice,
            ignoretax,
            ignorediscount,
            isnegativesale,
            packageuom,
            packingqty,
        } = req.body;

        // Check if item with code already exists
        if (itemcode) {
            const existingItem = await itemModel.checkItemCodeExists(itemcode);
            if (existingItem) {
                throw new ConflictError("Item with this code already exists");
            }
        }

        // Check if item name already exists
        const existingItemName = await itemModel.checkItemNameExists(itemname);
        if (existingItemName) {
            throw new ConflictError("Item with this name already exists");
        }

        // Handle item image - either from file upload or imgpath field
        let imgPath = "";

        if (req.files && req.files.length > 0) {
            // File was uploaded (using .any() so files is an array)
            const uploadedFile = req.files[0]; // Take first file
            const useS3 = config.aws?.s3?.enabled || false;

            const year = new Date().getFullYear();
            const monthNames = [
                "jan",
                "feb",
                "mar",
                "apr",
                "may",
                "jun",
                "jul",
                "aug",
                "sep",
                "oct",
                "nov",
                "dec",
            ];
            const month = monthNames[new Date().getMonth()];

            if (useS3) {
                imgPath = await uploadFileToS3(uploadedFile, `items/images/${year}/${month}`);
            } else {
                // For local storage with .any(), construct path manually
                imgPath = `/uploads/items/images/${uploadedFile.filename}`;
            }
        } else if (imgpath && typeof imgpath === "string") {
            // Image path was provided from frontend as string
            imgPath = imgpath;
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const random = Math.floor(10000 + Math.random() * 90000);
        const uniquekey = parseInt(`${timestamp}${random}`);

        const itemData = {
            itemname: itemname.toLowerCase(),
            itemdisplayname: itemdisplayname,
            genericname: genericname,
            itemcode: itemcode,
            mastercategoryid: mastercategoryid || null,
            categoryid: categoryid || null,
            subcategoryid: subcategoryid || null,
            brandid: brandid || null,
            safetyquantity: safetyquantity || null,
            defaulttaxprofileid: defaulttaxprofileid || null,
            sellingitemas: sellingitemas || 1,
            hsnseccode,
            pricetype: pricetype || 1,
            sellingprice: sellingprice || 0,
            purchaseprice: purchaseprice || 0,
            netcost: netcost || 0,
            ingredients,
            description,
            baseunit: baseunit || null,
            imgpath: imgPath,
            wholesaleprice: wholesaleprice || 0,
            ignoretax: ignoretax || 0,
            ignorediscount: ignorediscount || 0,
            isnegativesale: isnegativesale || 0,
            packageuom: packageuom || null,
            packingqty: packingqty || null,
            uniquekey: uniquekey,
            createdby: req.user?.userId || null,
            modifiedby: req.user?.userId || null,
            ipaddress: req.ip || req.connection?.remoteAddress,
            isdeleted: 0,
        };

        const result = await itemModel.create(itemData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to create item");
        }

        winston.info("Item created successfully", {
            source: "item.controller.js",
            function: "create",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.userId,
            itemId: result.data?.itemId,
            itemname,
            createdBy: req.user?.userId,
        });

        res.status(201).json(ResponseFormatter.created(result.data, "Item created successfully"));
    }),

    /**
     * Update item
     */
    update: asyncHandler(async (req, res) => {
        const itemId = req.params.id;
        const {
            itemname,
            itemdisplayname,
            genericname,
            itemcode,
            mastercategoryid,
            categoryid,
            subcategoryid,
            brandid,
            safetyquantity,
            defaulttaxprofileid,
            sellingitemas,
            hsnseccode,
            pricetype,
            sellingprice,
            purchaseprice,
            netcost,
            ingredients,
            description,
            baseunit,
            imgpath,
            wholesaleprice,
            ignoretax,
            ignorediscount,
            isnegativesale,
            packageuom,
            packingqty,
        } = req.body;

        // Check if item exists
        const existingItem = await itemModel.getData(itemId);

        if (!existingItem || existingItem.length === 0) {
            throw new NotFoundError("Item");
        }

        // Check if code is being changed and if new code already exists
        if (itemcode && itemcode !== existingItem[0].itemcode) {
            const codeExists = await itemModel.checkItemCodeExists(itemcode);
            if (codeExists) {
                throw new ConflictError("Item with this code already exists");
            }
        }

        // Check if item name is being changed and if new name already exists
        if (itemname && itemname !== existingItem[0].itemname) {
            const nameExists = await itemModel.checkItemNameExists(itemname, itemId);
            if (nameExists) {
                throw new ConflictError("Item with this name already exists");
            }
        }

        // Prepare update data
        const updateData = {
            modifiedby: req.user?.userId || null,
            modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection?.remoteAddress,
        };

        // Add fields to update only if they are provided
        if (itemname !== undefined) updateData.itemname = itemname.toLowerCase();
        if (itemdisplayname !== undefined) updateData.itemdisplayname = itemdisplayname;
        if (genericname !== undefined) updateData.genericname = genericname;
        if (itemcode !== undefined) updateData.itemcode = itemcode;
        if (mastercategoryid !== undefined) updateData.mastercategoryid = mastercategoryid;
        if (categoryid !== undefined) updateData.categoryid = categoryid;
        if (subcategoryid !== undefined) updateData.subcategoryid = subcategoryid;
        if (brandid !== undefined) updateData.brandid = brandid;
        if (safetyquantity !== undefined) updateData.safetyquantity = safetyquantity;
        if (defaulttaxprofileid !== undefined) updateData.defaulttaxprofileid = defaulttaxprofileid;
        if (sellingitemas !== undefined) updateData.sellingitemas = sellingitemas;
        if (hsnseccode !== undefined) updateData.hsnseccode = hsnseccode;
        if (pricetype !== undefined) updateData.pricetype = pricetype;
        if (sellingprice !== undefined) updateData.sellingprice = sellingprice;
        if (purchaseprice !== undefined) updateData.purchaseprice = purchaseprice;
        if (netcost !== undefined) updateData.netcost = netcost;
        if (ingredients !== undefined) updateData.ingredients = ingredients;
        if (description !== undefined) updateData.description = description;
        if (baseunit !== undefined) updateData.baseunit = baseunit;
        if (wholesaleprice !== undefined) updateData.wholesaleprice = wholesaleprice;
        if (ignoretax !== undefined) updateData.ignoretax = ignoretax;
        if (ignorediscount !== undefined) updateData.ignorediscount = ignorediscount;
        if (isnegativesale !== undefined) updateData.isnegativesale = isnegativesale;
        if (packageuom !== undefined) updateData.packageuom = packageuom;
        if (packingqty !== undefined) updateData.packingqty = packingqty;

        // Handle item image - either from file upload or imgpath field
        if (req.files && req.files.length > 0) {
            // File was uploaded (using .any() so files is an array)
            const uploadedFile = req.files[0]; // Take first file
            const useS3 = config.aws?.s3?.enabled || false;

            // Delete old image if exists
            const currentItem = existingItem[0];
            if (currentItem.imgpath) {
                try {
                    if (useS3) {
                        const s3Helper = require("../helpers/s3Helper");
                        const s3Key = currentItem.imgpath.replace(/^https?:\/\/[^\/]+\//, "");
                        await s3Helper.deleteFromS3(s3Key);
                        winston.info("Deleted S3 image", {
                            source: "item.controller.js",
                            function: "update",
                            endpoint: req.path,
                            method: req.method,
                            userId: req.user?.userId,
                            s3Key,
                        });
                    } else {
                        // Delete from local storage
                        const oldImagePath = path.join(process.cwd(), currentItem.imgpath);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                            winston.info("Deleted old image", {
                                source: "item.controller.js",
                                function: "update",
                                endpoint: req.path,
                                method: req.method,
                                userId: req.user?.userId,
                                oldImagePath,
                            });
                        }
                    }
                } catch (error) {
                    winston.warn(`Failed to delete old image: ${error.message}`, {
                        source: "item.controller.js",
                        function: "update",
                        endpoint: req.path,
                        method: req.method,
                        userId: req.user?.userId,
                        error: error.message,
                    });
                }
            }

            if (useS3) {
                const year = new Date().getFullYear();
                const monthNames = [
                    "jan",
                    "feb",
                    "mar",
                    "apr",
                    "may",
                    "jun",
                    "jul",
                    "aug",
                    "sep",
                    "oct",
                    "nov",
                    "dec",
                ];
                const month = monthNames[new Date().getMonth()];
                updateData.imgpath = await uploadFileToS3(
                    uploadedFile,
                    `items/images/${year}/${month}`
                );
            } else {
                // For local storage with .any(), construct path manually
                updateData.imgpath = `/uploads/items/images/${uploadedFile.filename}`;
            }

            // If storing image as blob
            if (req.body.storeAsBlob === "true") {
                updateData.blobimg = uploadedFile.buffer;
            }
        } else if (imgpath !== undefined && typeof imgpath === "string") {
            // Image path was provided from frontend as string or being cleared
            if (imgpath === "" || imgpath === null) {
                // If clearing the image, delete the old one
                const currentItem = existingItem[0];
                if (currentItem.imgpath) {
                    try {
                        const useS3 = config.aws?.s3?.enabled || false;
                        if (useS3) {
                            // Delete from S3
                            const s3Helper = require("../helpers/s3Helper");
                            const s3Key = currentItem.imgpath.replace(/^https?:\/\/[^\/]+\//, "");
                            await s3Helper.deleteFromS3(s3Key);
                            winston.info("Deleted cleared S3 image", {
                                source: "item.controller.js",
                                function: "update",
                                endpoint: req.path,
                                method: req.method,
                                userId: req.user?.userId,
                                s3Key,
                            });
                        } else {
                            // Delete from local storage
                            const oldImagePath = path.join(process.cwd(), currentItem.imgpath);
                            if (fs.existsSync(oldImagePath)) {
                                fs.unlinkSync(oldImagePath);
                                winston.info("Deleted cleared image", {
                                    source: "item.controller.js",
                                    function: "update",
                                    endpoint: req.path,
                                    method: req.method,
                                    userId: req.user?.userId,
                                    oldImagePath,
                                });
                            }
                        }
                    } catch (error) {
                        winston.warn(`Failed to delete cleared image: ${error.message}`, {
                            source: "item.controller.js",
                            function: "update",
                            endpoint: req.path,
                            method: req.method,
                            userId: req.user?.userId,
                            error: error.message,
                        });
                    }
                }
            }
            updateData.imgpath = imgpath;
        }

        const result = await itemModel.update(itemId, updateData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to update item");
        }

        winston.info("Item updated successfully", {
            source: "item.controller.js",
            function: "update",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.userId,
            itemId,
            updatedBy: req.user?.userId,
        });

        res.status(200).json(ResponseFormatter.updated(result.data, "Item updated successfully"));
    }),

    /**
     * Delete item (soft delete)
     */
    delete: asyncHandler(async (req, res) => {
        const itemId = req.params.id || req.body.itemid;

        if (!itemId) {
            throw new BadRequestError("Item ID is required");
        }

        // Check if item exists
        const existingItem = await itemModel.getData(itemId);

        if (!existingItem || existingItem.length === 0) {
            throw new NotFoundError("Item");
        }

        // Delete associated image file before soft deleting the item
        if (existingItem[0].imgpath) {
            try {
                const useS3 = config.aws?.s3?.enabled || false;
                if (useS3) {
                    // Delete from S3
                    const s3Helper = require("../helpers/s3Helper");
                    const s3Key = existingItem[0].imgpath.replace(/^https?:\/\/[^\/]+\//, "");
                    await s3Helper.deleteFromS3(s3Key);
                    winston.info("Deleted S3 image during item deletion", {
                        source: "item.controller.js",
                        function: "delete",
                        endpoint: req.path,
                        method: req.method,
                        userId: req.user?.userId,
                        itemId,
                        s3Key,
                    });
                } else {
                    // Delete from local storage
                    const imagePath = path.join(process.cwd(), existingItem[0].imgpath);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                        winston.info("Deleted item image", {
                            source: "item.controller.js",
                            function: "delete",
                            endpoint: req.path,
                            method: req.method,
                            userId: req.user?.userId,
                            itemId,
                            imagePath,
                        });
                    }
                }
            } catch (error) {
                winston.warn(`Failed to delete item image: ${error.message}`, {
                    source: "item.controller.js",
                    function: "delete",
                    endpoint: req.path,
                    method: req.method,
                    userId: req.user?.userId,
                    itemId,
                    error: error.message,
                });
            }
        }

        const deleteData = {
            isdeleted: 1,
            modifiedby: req.user?.userId || null,
            modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection?.remoteAddress,
        };

        const result = await itemModel.delete(itemId, deleteData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to delete item");
        }

        winston.info("Item deleted successfully", {
            source: "item.controller.js",
            function: "delete",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.userId,
            itemId,
            deletedBy: req.user?.userId,
        });

        res.status(200).json(ResponseFormatter.deleted("Item deleted successfully"));
    }),

    /**
     * Get items by category
     */
    getItemsByCategory: asyncHandler(async (req, res) => {
        const { categoryId, type = "master" } = req.params;

        if (!categoryId || isNaN(categoryId)) {
            throw new BadRequestError("Invalid category ID");
        }

        const result = await itemModel.getItemsByCategory(categoryId, type);

        res.status(200).json(ResponseFormatter.success(result, "Items retrieved successfully"));
    }),

    /**
     * Get items by brand
     */
    getItemsByBrand: asyncHandler(async (req, res) => {
        const { brandId } = req.params;

        if (!brandId || isNaN(brandId)) {
            throw new BadRequestError("Invalid brand ID");
        }

        const result = await itemModel.getItemsByBrand(brandId);

        res.status(200).json(ResponseFormatter.success(result, "Items retrieved successfully"));
    }),

    /**
     * Search items
     */
    searchItems: asyncHandler(async (req, res) => {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            throw new BadRequestError("Search term must be at least 2 characters");
        }

        const result = await itemModel.searchItems(q);

        res.status(200).json(
            ResponseFormatter.success(result, "Search results retrieved successfully")
        );
    }),

    /**
     * Update item stock
     */
    updateStock: asyncHandler(async (req, res) => {
        const { itemId } = req.params;
        const { quantity, operation = "add" } = req.body;

        if (!itemId || isNaN(itemId)) {
            throw new BadRequestError("Invalid item ID");
        }

        if (!quantity || isNaN(quantity) || quantity <= 0) {
            throw new BadRequestError("Invalid quantity");
        }

        if (!["add", "subtract"].includes(operation)) {
            throw new BadRequestError("Invalid operation. Must be 'add' or 'subtract'");
        }

        const result = await itemModel.updateStock(itemId, quantity, operation);

        if (!result.success) {
            throw new Error(result.msg || "Failed to update stock");
        }

        winston.info("Item stock updated", {
            source: "item.controller.js",
            function: "updateStock",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.userId,
            itemId,
            quantity,
            operation,
            updatedBy: req.user?.userId,
        });

        res.status(200).json(ResponseFormatter.success(null, "Stock updated successfully"));
    }),

    /**
     * Get low stock items
     */
    getLowStockItems: asyncHandler(async (req, res) => {
        const { threshold = 10 } = req.query;

        const result = await itemModel.getLowStockItems(threshold);

        res.status(200).json(
            ResponseFormatter.success(result, "Low stock items retrieved successfully")
        );
    }),

    /**
     * Get unapproved items with pagination and optional company filter
     */
    getUnapprovedItems: asyncHandler(async (req, res) => {
        const result = await itemModel.getUnapprovedItems(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No unapproved items found"));
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
                        "Unapproved items retrieved successfully"
                    )
                );
        }

        res.status(200).json(
            ResponseFormatter.success(result, "Unapproved items retrieved successfully")
        );
    }),

    // Product Import endpoints
    validateProductImport: validateProductImport,
    confirmProductImport: confirmProductImport,

    /**
     * Download sample Excel template for product import
     */
    downloadSampleExcel: asyncHandler(async (req, res) => {
        try {
            winston.info("[DOWNLOAD_SAMPLE_EXCEL] Generating sample Excel template");

            const excelBuffer = await generateSampleExcel();

            const filename = `product_import_template_${Date.now()}.xlsx`;

            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
            res.setHeader("Content-Length", excelBuffer.length);

            res.send(excelBuffer);

            winston.info("[DOWNLOAD_SAMPLE_EXCEL] Template downloaded successfully");
        } catch (error) {
            winston.error(`[DOWNLOAD_SAMPLE_EXCEL] Error: ${error.message}`);
            return res
                .status(500)
                .json(
                    ResponseFormatter.error(
                        "Failed to generate sample Excel template",
                        error.message
                    )
                );
        }
    }),

    /**
     * Approve a single item
     */
    approveItem: asyncHandler(async (req, res) => {
        const itemId = req.params.id;
        const { approvalremark } = req.body;

        if (!itemId || isNaN(itemId)) {
            throw new BadRequestError("Invalid item ID");
        }

        const approvalData = {
            approvedby: req.user.userId,
            approvalremark: approvalremark || "Approved",
        };

        const result = await itemModel.approveItem(itemId, approvalData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to approve item");
        }

        winston.info("Item approved", {
            source: "item.controller.js",
            function: "approveItem",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.userId,
            itemId,
            approvedBy: req.user.userId,
            remark: approvalremark,
        });

        res.status(200).json(ResponseFormatter.success(result.data, result.msg));
    }),

    /**
     * Reject a single item
     */
    rejectItem: asyncHandler(async (req, res) => {
        const itemId = req.params.id;
        const { rejectionreason, rejectionremark, replacewith } = req.body;

        if (!itemId || isNaN(itemId)) {
            throw new BadRequestError("Invalid item ID");
        }

        const rejectionData = {
            rejectedby: req.user.userId,
            rejectionreason: rejectionreason || null,
            rejectionremark: rejectionremark || "Rejected",
            replacewith: replacewith || null,
        };

        const result = await itemModel.rejectItem(itemId, rejectionData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to reject item");
        }

        winston.info("Item rejected", {
            source: "item.controller.js",
            function: "rejectItem",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.userId,
            itemId,
            rejectedBy: req.user.userId,
            reason: rejectionreason,
            remark: rejectionremark,
        });

        res.status(200).json(ResponseFormatter.success(result.data, result.msg));
    }),

    /**
     * Bulk approve items
     */
    bulkApproveItems: asyncHandler(async (req, res) => {
        const { itemids, approvalremark } = req.body;

        if (!itemids || !Array.isArray(itemids) || itemids.length === 0) {
            throw new BadRequestError("Item IDs array is required");
        }

        const approvalData = {
            approvedby: req.user.userId,
            approvalremark: approvalremark || "Bulk approved",
        };

        const result = await itemModel.bulkApproveItems(itemids, approvalData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to approve items");
        }

        winston.info("Items bulk approved", {
            source: "item.controller.js",
            function: "bulkApproveItems",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.userId,
            count: itemids.length,
            approvedBy: req.user.userId,
            remark: approvalremark,
        });

        res.status(200).json(ResponseFormatter.success(result.data, result.msg));
    }),

    /**
     * Bulk reject items
     */
    bulkRejectItems: asyncHandler(async (req, res) => {
        const { itemids, rejectionreason, rejectionremark } = req.body;

        if (!itemids || !Array.isArray(itemids) || itemids.length === 0) {
            throw new BadRequestError("Item IDs array is required");
        }

        const rejectionData = {
            rejectedby: req.user.userId,
            rejectionreason: rejectionreason || null,
            rejectionremark: rejectionremark || "Bulk rejected",
        };

        const result = await itemModel.bulkRejectItems(itemids, rejectionData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to reject items");
        }

        winston.info("Items bulk rejected", {
            source: "item.controller.js",
            function: "bulkRejectItems",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.userId,
            count: itemids.length,
            rejectedBy: req.user.userId,
            reason: rejectionreason,
            remark: rejectionremark,
        });

        res.status(200).json(ResponseFormatter.success(result.data, result.msg));
    }),

    /**
     * Get rejection reasons
     */
    getRejectionReasons: asyncHandler(async (req, res) => {
        const reasons = itemModel.getRejectionReasons();

        res.status(200).json(
            ResponseFormatter.success(reasons, "Rejection reasons retrieved successfully")
        );
    }),

    /**
     * Get similar items for a given item
     */
    getSimilarItems: asyncHandler(async (req, res) => {
        const itemId = req.params.id;

        if (!itemId || isNaN(itemId)) {
            throw new BadRequestError("Invalid item ID");
        }

        const result = await itemModel.getSimilarItems(itemId);

        if (!result.success) {
            throw new Error(result.msg || "Failed to get similar items");
        }

        res.status(200).json(
            ResponseFormatter.success(result.data, `Found ${result.count} similar item(s)`)
        );
    }),
};
