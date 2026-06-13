const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const brand = require("../../../controllers/masters/inventory/brand.controller");
const { validateBody, validateQuery, validationRules, commonSchemas } = require("../../../middlewares/validation");
const { uploadSingle, uploadSingleMemory } = require("../../../middlewares/upload.middleware");
const config = require("../../../config/config");
const router = express.Router();

// Determine which upload middleware to use based on config
const useS3 = config.aws?.s3?.enabled || false;

// Create flexible upload middleware that accepts any field name
const multer = require('multer');
const path = require('path');

const createFlexibleUpload = () => {
    // Use memory storage for S3 uploads, disk storage for local uploads
    const storage = useS3 ? multer.memoryStorage() : multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path.join(process.cwd(), 'uploads', 'brands', 'icons');
            const fs = require('fs');
            
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniqueName = `brand-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
            cb(null, uniqueName);
        }
    });

    const fileFilter = (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
        }
    };

    return multer({
        storage: storage,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
        fileFilter: fileFilter
    }).any(); // Accept any field name
};

const brandIconUpload = createFlexibleUpload();

// Get brands list with pagination
router.get("/",
    authMiddleware,
    brand.getBrands
);

// Get brand by ID
router.get("/:id",
    authMiddleware,
    brand.getData
);

// Get brands by company
router.get("/company/:companyid",
    authMiddleware,
    brand.getBrandsByCompany
);

// Create brand - make image upload optional
router.post("/",
    authMiddleware,
    (req, res, next) => {
        // Only apply image upload middleware if there's a file being uploaded
        const contentType = req.get('content-type');
        if (contentType && contentType.includes('multipart/form-data')) {
            brandIconUpload(req, res, next);
        } else {
            // Skip file upload middleware for JSON requests
            next();
        }
    },
    validateBody(validationRules.createBrand),
    brand.create
);

// Update brand - make image upload optional
router.put("/:id",
    authMiddleware,
    (req, res, next) => {
        // Only apply image upload middleware if there's a file being uploaded
        const contentType = req.get('content-type');
        if (contentType && contentType.includes('multipart/form-data')) {
            brandIconUpload(req, res, next);
        } else {
            // Skip file upload middleware for JSON requests
            next();
        }
    },
    validateBody(validationRules.updateBrand),
    brand.update
);

// Delete brand (soft delete)
router.delete("/:id",
    authMiddleware,
    brand.delete
);

// Approval Management Routes

// Get unapproved brands
router.get("/approvals/unapproved",
    authMiddleware,
    brand.getUnapprovedBrands
);

// Get rejection reasons
router.get("/approvals/rejection-reasons",
    authMiddleware,
    brand.getRejectionReasons
);

// Approve single brand
router.put("/approvals/:id/approve",
    authMiddleware,
    brand.approveBrand
);

// Reject single brand
router.put("/approvals/:id/reject",
    authMiddleware,
    brand.rejectBrand
);

// Bulk approve brands
router.post("/approvals/bulk-approve",
    authMiddleware,
    brand.bulkApproveBrands
);

// Bulk reject brands
router.post("/approvals/bulk-reject",
    authMiddleware,
    brand.bulkRejectBrands
);

module.exports = {
    path: "/brands",
    router: router,
};