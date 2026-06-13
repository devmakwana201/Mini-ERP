const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const itemCategory = require("../../../controllers/masters/inventory/itemcategory.controller");
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
            const uploadPath = path.join(process.cwd(), 'uploads', 'itemcategories', 'images');
            const fs = require('fs');
            
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniqueName = `itemcategory-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
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

const itemCategoryImageUpload = createFlexibleUpload();

// Get item categories list with pagination
router.get("/",
    authMiddleware,
    itemCategory.getItemCategories
);

// Get item category by ID
router.get("/:id",
    authMiddleware,
    itemCategory.getData
);

// Get item categories by company
router.get("/company/:companyid",
    authMiddleware,
    itemCategory.getItemCategoriesByCompany
);

// Get parent categories by company
router.get("/parent/:companyid",
    authMiddleware,
    itemCategory.getParentCategories
);

// Get child categories by parent category
router.get("/children/:parentid",
    authMiddleware,
    itemCategory.getChildCategories
);

// Create item category - make image upload optional
router.post("/",
    authMiddleware,
    (req, res, next) => {
        // Only apply image upload middleware if there's a file being uploaded
        const contentType = req.get('content-type');
        if (contentType && contentType.includes('multipart/form-data')) {
            itemCategoryImageUpload(req, res, next);
        } else {
            // Skip file upload middleware for JSON requests
            next();
        }
    },
    validateBody(validationRules.createItemCategory),
    itemCategory.create
);

// Update item category - make image upload optional
router.put("/:id",
    authMiddleware,
    (req, res, next) => {
        // Only apply image upload middleware if there's a file being uploaded
        const contentType = req.get('content-type');
        if (contentType && contentType.includes('multipart/form-data')) {
            itemCategoryImageUpload(req, res, next);
        } else {
            // Skip file upload middleware for JSON requests
            next();
        }
    },
    validateBody(validationRules.updateItemCategory),
    itemCategory.update
);

// Delete item category (soft delete)
router.delete("/:id",
    authMiddleware,
    itemCategory.delete
);

module.exports = {
    path: "/itemcategories",
    router: router,
};