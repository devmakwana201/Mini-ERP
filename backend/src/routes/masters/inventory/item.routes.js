const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const item = require("../../../controllers/masters/inventory/item.controller");
const { validateBody, validateQuery, validationRules, commonSchemas } = require("../../../middlewares/validation");
const { uploadSingle, uploadSingleMemory } = require("../../../middlewares/upload.middleware");
const config = require("../../../config/config");
const { upload: uploadConfig } = require("../../../config/config");
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
            const uploadPath = path.join(process.cwd(), 'uploads', 'items', 'images');
            const fs = require('fs');
            
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniqueName = `item-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
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
        limits: uploadConfig.maxFileSize,
        fileFilter: fileFilter
    }).any(); // Accept any field name
};

const itemImageUpload = createFlexibleUpload();
// Get items list with pagination and filtering
router.get("/", 
    authMiddleware,
    validateQuery(commonSchemas.pagination),
    item.getItems
);

// Search items
router.get("/search", 
    authMiddleware,
    item.searchItems
);

// Get low stock items
router.get("/low-stock",
    authMiddleware,
    item.getLowStockItems
);

// Item Approval Routes (must be before /:id route)
router.get("/approvals/unapproved",
    authMiddleware,
    item.getUnapprovedItems
);

router.get("/approvals/rejection-reasons",
    authMiddleware,
    item.getRejectionReasons
);

router.get("/approvals/:id/similar",
    authMiddleware,
    item.getSimilarItems
);

router.put("/approvals/:id/approve",
    authMiddleware,
    item.approveItem
);

router.put("/approvals/:id/reject",
    authMiddleware,
    item.rejectItem
);

router.post("/approvals/bulk-approve",
    authMiddleware,
    item.bulkApproveItems
);

router.post("/approvals/bulk-reject",
    authMiddleware,
    item.bulkRejectItems
);

// Get item by ID
router.get("/:id",
    authMiddleware,
    item.getData
);

// Get items by category
router.get("/category/:categoryId/:type?", 
    authMiddleware,
    item.getItemsByCategory
);

// Get items by brand
router.get("/brand/:brandId", 
    authMiddleware,
    item.getItemsByBrand
);

// Create item - make image upload optional
router.post("/", 
    authMiddleware,
    (req, res, next) => {
        
        // Only apply image upload middleware if there's a file being uploaded
        const contentType = req.get('content-type');
        if (contentType && contentType.includes('multipart/form-data')) {
            itemImageUpload(req, res, next);
        } else {
            // Skip file upload middleware for JSON requests
            next();
        }
    },
    validateBody(validationRules.createItem),
    item.create
);

// Update item - make image upload optional
router.put("/:id", 
    authMiddleware,
    (req, res, next) => {
        // Only apply image upload middleware if there's a file being uploaded
        const contentType = req.get('content-type');
        if (contentType && contentType.includes('multipart/form-data')) {
            itemImageUpload(req, res, next);
        } else {
            // Skip file upload middleware for JSON requests
            next();
        }
    },
    validateBody(validationRules.updateItem),
    item.update
);

// Update item stock
router.patch("/:itemId/stock", 
    authMiddleware,
    validateBody(validationRules.updateStock),
    item.updateStock
);

// Delete item
router.delete("/:id",
    authMiddleware,
    item.delete
);

// Product Import Routes

// Download sample Excel template
router.get("/import/sample",
    authMiddleware,
    item.downloadSampleExcel
);

// Step 1: Validate product import (preview)
const multerExcel = require('multer');

const excelFileFilter = (req, file, cb) => {
    const allowedTypes = /xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     file.mimetype === 'application/vnd.ms-excel';

    if (mimetype && extname) {
        cb(null, true);
    } else {
        cb(new Error('Only Excel files are allowed (xlsx, xls)'));
    }
};

const excelUpload = multerExcel({
    storage: multerExcel.memoryStorage(),
    fileFilter: excelFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('file');

router.post("/import/validate",
    authMiddleware,
    excelUpload,
    item.validateProductImport
);

// Step 2: Confirm and insert products
router.post("/import/confirm",
    authMiddleware,
    excelUpload,
    item.confirmProductImport
);

// Debug endpoint to list uploaded files
router.get("/debug/files", 
    authMiddleware,
    (req, res) => {
        const fs = require('fs');
        const path = require('path');
        
        const uploadsDir = path.join(process.cwd(), 'uploads', 'items', 'images');
        
        try {
            const files = fs.readdirSync(uploadsDir);
            const fileDetails = files.map(filename => {
                const filePath = path.join(uploadsDir, filename);
                const stats = fs.statSync(filePath);
                return {
                    filename,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    url: `http://localhost:8001/uploads/items/images/${filename}`
                };
            });
            
            res.json({
                success: true,
                uploadsDirectory: uploadsDir,
                filesFound: files.length,
                files: fileDetails
            });
        } catch (error) {
            res.json({
                success: false,
                uploadsDirectory: uploadsDir,
                error: error.message
            });
        }
    }
);

module.exports = {
    path: "/items",
    router: router,
};