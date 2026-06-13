const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const ensureUploadDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// File filters
const fileFilters = {
    images: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
        }
    },
    documents: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx|xls|xlsx|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

        if (extname) {
            return cb(null, true);
        } else {
            cb(new Error("Only document files are allowed (pdf, doc, docx, xls, xlsx, txt)"));
        }
    },
    all: (req, file, cb) => {
        cb(null, true); // Accept all file types
    },
};

// Dynamic storage configuration factory
const createDiskStorage = (uploadPath, filePrefix = "file") => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            const fullPath = path.join(process.cwd(), "uploads", uploadPath);
            ensureUploadDir(fullPath);
            cb(null, fullPath);
        },
        filename: (req, file, cb) => {
            const uniqueName = `${filePrefix}-${Date.now()}-${Math.round(
                Math.random() * 1e9
            )}${path.extname(file.originalname)}`;
            cb(null, uniqueName);
        },
    });
};

// Memory storage for S3 uploads
const memoryStorage = multer.memoryStorage();

// Dynamic upload middleware factory
const createUploadMiddleware = (options = {}) => {
    const {
        uploadPath = "temp", // Default upload path
        filePrefix = "file", // Default file prefix
        maxFileSize = 5 * 1024 * 1024, // Default 5MB
        fileType = "images", // Default to images only
        useMemory = false, // Use memory storage for S3
    } = options;

    const storage = useMemory ? memoryStorage : createDiskStorage(uploadPath, filePrefix);

    const fileFilter = fileFilters[fileType] || fileFilters.all;

    return multer({
        storage: storage,
        limits: {
            fileSize: maxFileSize,
        },
        fileFilter: fileFilter,
    });
};

const documentUpload = createUploadMiddleware({
    uploadPath: "documents",
    filePrefix: "doc",
    fileType: "documents",
    maxFileSize: 20 * 1024 * 1024, // 20MB for documents
});

module.exports = {
    // Dynamic middleware creator
    createUploadMiddleware,

    // Pre-configured middlewares
    uploadDocument: documentUpload.single("document"),

    // Generic dynamic upload functions
    uploadSingle: (fieldName, options = {}) => {
        const upload = createUploadMiddleware(options);
        return upload.single(fieldName);
    },

    uploadMultiple: (fieldName, maxCount, options = {}) => {
        const upload = createUploadMiddleware(options);
        return upload.array(fieldName, maxCount);
    },

    uploadFields: (fields, options = {}) => {
        const upload = createUploadMiddleware(options);
        return upload.fields(fields);
    },

    // Memory storage versions for S3
    uploadSingleMemory: (fieldName, options = {}) => {
        const upload = createUploadMiddleware({ ...options, useMemory: true });
        return upload.single(fieldName);
    },

    uploadMultipleMemory: (fieldName, maxCount, options = {}) => {
        const upload = createUploadMiddleware({ ...options, useMemory: true });
        return upload.array(fieldName, maxCount);
    },
};
