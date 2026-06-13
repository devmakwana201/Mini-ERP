const supplierModel = require("../../../models/masters/inventory/supplier.model");
const moment = require("moment");
const winston = require("../../../config/winston");
const path = require("path");
const s3Helper = require("../../../helpers/s3Helper");
const ResponseFormatter = require("../../../utils/responseFormatter");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { NotFoundError, BadRequestError, ConflictError } = require("../../../utils/customErrors");
const config = require("../../../config/config");

// Generic helper function to get file path from multer file object
const getUploadedFilePath = (file, uploadPath = "suppliers/icons") => {
    if (!file) return "";
    // For local storage, multer provides the filename
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
    fileName = fileName.replace(/[^a-zA-Z0-9]/g , "_");

    fileName = `${s3Path}/${fileName}_${Date.now()}${path.extname(
        file.originalname
    )}`;
    const result = await s3Helper.uploadToS3(file.buffer, fileName, file.mimetype);
    return result.url;
};

module.exports = {
    /**
     * Get suppliers list with pagination and filtering
     */
    getSuppliers: asyncHandler(async (req, res) => {
        const result = await supplierModel.getSuppliers(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No suppliers found"));
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
                        "Suppliers retrieved successfully"
                    )
                );
        }

        res.status(200).json(ResponseFormatter.success(result, "Suppliers retrieved successfully"));
    }),

    /**
     * Get supplier by ID
     */
    getData: asyncHandler(async (req, res) => {
        const supplierId = req.params.id;

        if (!supplierId || isNaN(supplierId)) {
            throw new BadRequestError("Invalid supplier ID");
        }

        const result = await supplierModel.getData(supplierId);

        if (!result || result.length === 0) {
            throw new NotFoundError("Supplier");
        }
        if(result[0].supplierimage){
            // Extract filename after last "/" and create object with filename as key and full path as value
            const filename = result[0].supplierimage.substring(result[0].supplierimage.lastIndexOf('/') + 1);
            result[0].supplierimage = {
                ["key"]: filename,
                ["value"]: result[0].supplierimage
            };
        }

        res.status(200).json(
            ResponseFormatter.success(result[0], "Supplier data retrieved successfully")
        );
    }),

    /**
     * Create new supplier
     */
    create: asyncHandler(async (req, res) => {
        const { 
            suppliername, address, gstno, panno, phoneno, email, pincode, contactperson,
            countryid, stateid, cityid, vatno,
            outstandingamt, seedslicensenumber, seedslicensedate, fertilizerlicensenumber,
            fertilizerlicensedate, pesticideslicensenumber, pesticideslicensedate,
            isapproved, approvalremark, replacewith
        } = req.body;

        // Check if supplier already exists
        const existingSupplier = await supplierModel.checkSupplierExists(gstno);
        if (existingSupplier) {
            throw new ConflictError("Supplier with this gstno already exists in the company");
        }

        // Handle supplier image if uploaded
        let supplierImagePath = "";
        if (req.file) {
            // Check if S3 is enabled in config
            const useS3 = config.aws?.s3?.enabled || false;
            
            if (useS3) {
                // S3 storage (requires memory storage middleware)
                supplierImagePath = await uploadFileToS3(req.file, "suppliers/icons");
            } else {
                // Local storage
                supplierImagePath = getUploadedFilePath(req.file, "suppliers/icons");
            }
        }

        const supplierData = {
            suppliername: suppliername.toLowerCase(),
            address,
            gstno,
            panno,
            phoneno,
            email,
            pincode,
            contactperson,
            countryid,
            stateid,
            cityid,
            vatno,
            supplierimage: supplierImagePath,
            outstandingamt: outstandingamt || 0.00000,
            seedslicensenumber,
            seedslicensedate,
            fertilizerlicensenumber,
            fertilizerlicensedate,
            pesticideslicensenumber,
            pesticideslicensedate,
            isapproved: 1,
            approvalremark: "added by server",
            replacewith: replacewith || null,
            createdby: req.user.userId,
            createddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
            isdeleted: 0,
        };

        const result = await supplierModel.create(supplierData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to create supplier");
        }

        winston.info("Supplier created successfully", {
            source: "supplier.controller.js",
            function: "create",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            supplierId: result.data?.supplierid,
            suppliername,
            createdBy: req.user.userId,
        });

        res.status(201).json(ResponseFormatter.created(result.data, "Supplier created successfully"));
    }),

    /**
     * Update supplier
     */
    update: asyncHandler(async (req, res) => {
        const supplierId = req.params.id;
        const { 
            suppliername, address, gstno, panno, phoneno, email, pincode, contactperson,
            countryid, stateid, cityid, vatno,
            outstandingamt, seedslicensenumber, seedslicensedate, fertilizerlicensenumber,
            fertilizerlicensedate, pesticideslicensenumber, pesticideslicensedate,
            isapproved, approvalremark, replacewith
        } = req.body;

        // Check if supplier exists
        const existingSupplier = await supplierModel.getData(supplierId);
        
        if (!existingSupplier || existingSupplier.length === 0) {
            throw new NotFoundError("Supplier");
        }

        // Check if supplier gstno already exists for another supplier
        if (gstno) {
            const duplicateSupplier = await supplierModel.checkSupplierExists(gstno, supplierId);
            if (duplicateSupplier) {
                throw new ConflictError("Supplier with this gstno already exists in the company");
            }
        }

        // Prepare update data
        const updateData = {
            suppliername: suppliername.toLowerCase(),
            address,
            gstno,
            panno,
            phoneno,
            email,
            pincode,
            contactperson,
            countryid,
            stateid,
            cityid,
            vatno,
            outstandingamt,
            seedslicensenumber,
            seedslicensedate,
            fertilizerlicensenumber,
            fertilizerlicensedate,
            pesticideslicensenumber,
            pesticideslicensedate,
            isapproved,
            approvalremark,
            replacewith,
            modifiedby: req.user.userId,
            modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
        };

        // Handle supplier image if uploaded
        if (req.file) {
            // Check if S3 is enabled in config
            const useS3 = config.aws?.s3?.enabled || false;
            
            if (useS3) {
                // S3 storage (requires memory storage middleware)
                updateData.supplierimage = await uploadFileToS3(req.file, "suppliers/icons");
            } else {
                // Local storage
                updateData.supplierimage = getUploadedFilePath(req.file, "suppliers/icons");
            }
        }

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const result = await supplierModel.update(supplierId, updateData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to update supplier");
        }

        winston.info("Supplier updated successfully", {
            source: "supplier.controller.js",
            function: "update",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            supplierId,
            updatedBy: req.user.userId,
        });

        res.status(200).json(ResponseFormatter.updated(result.data, "Supplier updated successfully"));
    }),

    /**
     * Delete supplier (soft delete)
     */
    delete: asyncHandler(async (req, res) => {
        const supplierId = req.params.id || req.body.supplierid;

        if (!supplierId) {
            throw new BadRequestError("Supplier ID is required");
        }

        // Check if supplier exists
        const existingSupplier = await supplierModel.getData(supplierId);
        if (!existingSupplier || existingSupplier.length === 0) {
            throw new NotFoundError("Supplier");
        }

        const deleteData = {
            isdeleted: 1,
            modifiedby: req.user.userId,
            modifieddate: moment().format("YYYY-MM-DD HH:mm:ss"),
            ipaddress: req.ip || req.connection.remoteAddress,
        };

        const result = await supplierModel.delete(supplierId, deleteData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to delete supplier");
        }

        winston.info("Supplier deleted successfully", {
            source: "supplier.controller.js",
            function: "delete",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            supplierId,
            deletedBy: req.user.userId,
        });

        res.status(200).json(ResponseFormatter.deleted("Supplier deleted successfully"));
    }),

    /**
     * Get unapproved suppliers with pagination
     */
    getUnapprovedSuppliers: asyncHandler(async (req, res) => {
        const result = await supplierModel.getUnapprovedSuppliers(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res
                .status(200)
                .json(ResponseFormatter.success([], "No unapproved suppliers found"));
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
                        "Unapproved suppliers retrieved successfully"
                    )
                );
        }

        res.status(200).json(
            ResponseFormatter.success(result, "Unapproved suppliers retrieved successfully")
        );
    }),

    /**
     * Get rejection reasons for supplier approval
     */
    getRejectionReasons: asyncHandler(async (req, res) => {
        const result = await supplierModel.getRejectionReasons();

        if (result.success) {
            res.status(200).json(ResponseFormatter.success(result.data, "Rejection reasons retrieved successfully"));
        } else {
            res.status(500).json(ResponseFormatter.error("Failed to retrieve rejection reasons"));
        }
    }),

    /**
     * Approve a single supplier
     */
    approveSupplier: asyncHandler(async (req, res) => {
        const supplierId = req.params.id;
        const { approvalremark } = req.body;

        if (!supplierId || isNaN(supplierId)) {
            throw new BadRequestError("Invalid supplier ID");
        }

        const approvalData = {
            approvedby: req.user.userId,
            approvalremark: approvalremark || "Approved",
        };

        const result = await supplierModel.approveSupplier(supplierId, approvalData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to approve supplier");
        }

        winston.info("Supplier approved", {
            source: "supplier.controller.js",
            function: "approveSupplier",
            endpoint: req.path,
            method: req.method,
            supplierId,
            approvedBy: req.user.userId,
            remark: approvalremark,
        });

        res.status(200).json(ResponseFormatter.success(result.data, result.msg));
    }),

    /**
     * Reject a single supplier
     */
    rejectSupplier: asyncHandler(async (req, res) => {
        const supplierId = req.params.id;
        const { rejectionreason, rejectionremark, replacewith } = req.body;

        if (!supplierId || isNaN(supplierId)) {
            throw new BadRequestError("Invalid supplier ID");
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

        const result = await supplierModel.rejectSupplier(supplierId, rejectionData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to reject supplier");
        }

        winston.info("Supplier rejected", {
            source: "supplier.controller.js",
            function: "rejectSupplier",
            endpoint: req.path,
            method: req.method,
            supplierId,
            rejectedBy: req.user.userId,
            reason: rejectionreason,
            remark: rejectionremark,
        });

        res.status(200).json(ResponseFormatter.success(result.data, result.msg));
    }),

    /**
     * Bulk approve suppliers
     */
    bulkApproveSuppliers: asyncHandler(async (req, res) => {
        const { supplierids, approvalremark } = req.body;

        if (!supplierids || !Array.isArray(supplierids) || supplierids.length === 0) {
            throw new BadRequestError("Supplier IDs array is required");
        }

        const approvalData = {
            approvedby: req.user.userId,
            approvalremark: approvalremark || "Bulk approved",
        };

        const result = await supplierModel.bulkApproveSuppliers(supplierids, approvalData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to approve suppliers");
        }

        winston.info("Supplier bulk approved", {
            source: "supplier.controller.js",
            function: "bulkApproveSuppliers",
            endpoint: req.path,
            method: req.method,
            count: supplierids.length,
            approvedBy: req.user.userId,
            remark: approvalremark,
        });

        res.status(200).json(ResponseFormatter.success(result.data, result.msg));
    }),

    /**
     * Bulk reject suppliers
     */
    bulkRejectSuppliers: asyncHandler(async (req, res) => {
        const { supplierids, rejectionreason, rejectionremark } = req.body;

        if (!supplierids || !Array.isArray(supplierids) || supplierids.length === 0) {
            throw new BadRequestError("Supplier IDs array is required");
        }

        if (!rejectionreason) {
            throw new BadRequestError("Rejection reason is required");
        }

        const rejectionData = {
            rejectedby: req.user.userId,
            rejectionreason,
            rejectionremark: rejectionremark || "",
        };

        const result = await supplierModel.bulkRejectSuppliers(supplierids, rejectionData);

        if (!result.success) {
            throw new Error(result.msg || "Failed to reject suppliers");
        }

        winston.info("Supplier bulk rejected", {
            source: "supplier.controller.js",
            function: "bulkRejectSuppliers",
            endpoint: req.path,
            method: req.method,
            count: supplierids.length,
            rejectedBy: req.user.userId,
            reason: rejectionreason,
            remark: rejectionremark,
        });

        res.status(200).json(ResponseFormatter.success(result.data, result.msg));
    })
};