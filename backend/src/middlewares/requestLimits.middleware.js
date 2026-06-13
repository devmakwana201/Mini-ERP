const winston = require("../config/winston");
const { BadRequestError } = require("../utils/customErrors");

/**
 * Middleware to enforce request size limits and prevent memory issues
 */

/**
 * Check request payload size
 * @param {Object} options - Configuration options
 * @param {number} options.maxSize - Maximum size in bytes (default: 50MB)
 * @param {string} options.message - Custom error message
 */
const checkRequestSize = (options = {}) => {
    const {
        maxSize = 50 * 1024 * 1024, // 50MB default
        message = `Request payload too large. Maximum size is ${(options.maxSize || 50 * 1024 * 1024) / 1024 / 1024}MB`
    } = options;

    return (req, res, next) => {
        const contentLength = parseInt(req.headers['content-length'], 10);

        if (contentLength && contentLength > maxSize) {
            winston.warn("Request rejected - payload too large", {
                source: "requestLimits.middleware.js",
                function: "checkRequestSize",
                endpoint: req.path,
                method: req.method,
                contentLength,
                maxSize
            });

            throw new BadRequestError(message);
        }

        next();
    };
};

/**
 * Validate batch request array size
 * @param {Object} options - Configuration options
 * @param {string} options.arrayKey - Key name in req.body (e.g., 'brands', 'items')
 * @param {number} options.maxItems - Maximum number of items allowed
 */
const checkBatchSize = (options = {}) => {
    const {
        arrayKey,
        maxItems = 100
    } = options;

    if (!arrayKey) {
        throw new Error("arrayKey is required for checkBatchSize middleware");
    }

    return (req, res, next) => {
        const array = req.body[arrayKey];

        if (!array) {
            return next();
        }

        if (!Array.isArray(array)) {
            throw new BadRequestError(`${arrayKey} must be an array`);
        }

        if (array.length > maxItems) {
            winston.warn("Batch request rejected - too many items", {
                source: "requestLimits.middleware.js",
                function: "checkBatchSize",
                endpoint: req.path,
                method: req.method,
                arrayKey,
                itemCount: array.length,
                maxItems
            });

            throw new BadRequestError(
                `Maximum batch size is ${maxItems} ${arrayKey}. Received ${array.length}. Please split your request.`
            );
        }

        next();
    };
};

/**
 * Validate base64 images in batch request
 * @param {Object} options - Configuration options
 * @param {string} options.arrayKey - Key name in req.body
 * @param {string} options.imageKey - Key name for base64 image (default: 'base64Image')
 * @param {number} options.maxImageSize - Maximum image size in bytes (default: 5MB)
 */
const checkBase64Images = (options = {}) => {
    const {
        arrayKey,
        imageKey = 'base64Image',
        maxImageSize = 5 * 1024 * 1024 // 5MB default
    } = options;

    if (!arrayKey) {
        throw new Error("arrayKey is required for checkBase64Images middleware");
    }

    return (req, res, next) => {
        const array = req.body[arrayKey];

        if (!array || !Array.isArray(array)) {
            return next();
        }

        let totalImageSize = 0;
        const invalidImages = [];

        array.forEach((item, index) => {
            const base64 = item[imageKey];

            if (base64) {
                // Remove data URI prefix if present
                let base64Data = base64;
                if (base64.includes('data:image')) {
                    const matches = base64.match(/^data:image\/([a-zA-Z+]*);base64,(.*)$/);
                    if (matches && matches.length === 3) {
                        base64Data = matches[2];
                    }
                }

                // Calculate size
                const imageSize = Buffer.from(base64Data, 'base64').length;
                totalImageSize += imageSize;

                // Check individual image size
                if (imageSize > maxImageSize) {
                    invalidImages.push({
                        index,
                        name: item.itemname || item.brandname || `Item ${index}`,
                        size: `${(imageSize / 1024 / 1024).toFixed(2)}MB`,
                        maxSize: `${(maxImageSize / 1024 / 1024).toFixed(2)}MB`
                    });
                }
            }
        });

        if (invalidImages.length > 0) {
            winston.warn("Batch request contains oversized images", {
                source: "requestLimits.middleware.js",
                function: "checkBase64Images",
                endpoint: req.path,
                method: req.method,
                arrayKey,
                invalidCount: invalidImages.length,
                invalidImages: invalidImages.slice(0, 5) // Log first 5
            });

            throw new BadRequestError(
                `${invalidImages.length} image(s) exceed maximum size of ${(maxImageSize / 1024 / 1024).toFixed(2)}MB. ` +
                `First violation: ${invalidImages[0].name} (${invalidImages[0].size})`
            );
        }

        // Log total image data size
        if (totalImageSize > 0) {
            winston.info("Batch request image size", {
                source: "requestLimits.middleware.js",
                function: "checkBase64Images",
                endpoint: req.path,
                method: req.method,
                arrayKey,
                totalImages: array.filter(i => i[imageKey]).length,
                totalSize: `${(totalImageSize / 1024 / 1024).toFixed(2)}MB`
            });
        }

        next();
    };
};

/**
 * Set timeout for long-running batch operations
 * @param {number} timeoutMs - Timeout in milliseconds (default: 5 minutes)
 */
const setBatchTimeout = (timeoutMs = 5 * 60 * 1000) => {
    return (req, res, next) => {
        req.setTimeout(timeoutMs, () => {
            winston.error("Request timeout", {
                source: "requestLimits.middleware.js",
                function: "setBatchTimeout",
                endpoint: req.path,
                method: req.method,
                timeout: timeoutMs
            });

            if (!res.headersSent) {
                res.status(408).json({
                    success: false,
                    message: `Request timeout after ${timeoutMs / 1000} seconds. Please try with a smaller batch.`
                });
            }
        });

        next();
    };
};

module.exports = {
    checkRequestSize,
    checkBatchSize,
    checkBase64Images,
    setBatchTimeout
};
