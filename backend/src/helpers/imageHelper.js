const fs = require("fs").promises;
const path = require("path");
const winston = require("../config/winston");
const s3Helper = require("./s3Helper");
const config = require("../config/config");

/**
 * Process base64 image string and save to storage (S3 or local)
 * @param {String} base64String - Base64 encoded image string (with or without data:image prefix)
 * @param {String} folder - Folder path (e.g., 'brands/icons', 'items/images')
 * @param {String} prefix - Filename prefix (e.g., 'brand', 'item')
 * @returns {Promise<String>} - File path/URL
 */
async function processBase64Image(base64String, folder, prefix = 'image') {
    try {
        // Validate input
        if (!base64String || typeof base64String !== 'string') {
            throw new Error("Invalid base64 string provided");
        }

        // Remove data:image prefix if present
        let base64Data = base64String;
        let mimeType = 'image/jpeg'; // Default
        let extension = 'jpg';

        if (base64String.includes('data:image')) {
            const matches = base64String.match(/^data:image\/([a-zA-Z]*);base64,(.*)$/);
            if (!matches || matches.length !== 3) {
                throw new Error("Invalid base64 image format");
            }

            extension = matches[1];
            base64Data = matches[2];
            mimeType = `image/${extension}`;

            // Normalize extension
            if (extension === 'jpeg') extension = 'jpg';
            if (extension === 'svg+xml') extension = 'svg';
        }

        // Convert base64 to buffer
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Validate image size (max 5MB by default)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (imageBuffer.length > maxSize) {
            throw new Error(`Image size (${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (5MB)`);
        }

        // Validate minimum size (at least 100 bytes to ensure valid image)
        if (imageBuffer.length < 100) {
            throw new Error("Image size too small, possibly corrupted");
        }

        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.floor(1000 + Math.random() * 9000);
        const filename = `${prefix}_${timestamp}_${random}.${extension}`;

        // Check if S3 is enabled
        const useS3 = config.aws?.s3?.enabled || false;

        if (useS3) {
            // Upload to S3
            const year = new Date().getFullYear();
            const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                               'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const month = monthNames[new Date().getMonth()];

            const s3Path = `${folder}/${year}/${month}/${filename}`;
            const result = await s3Helper.uploadToS3(imageBuffer, s3Path, mimeType);

            winston.info(`Image uploaded to S3: ${result.url}`, {
                source: "imageHelper.js",
                function: "processBase64Image",
                s3Path: s3Path,
                imageSize: imageBuffer.length
            });
            return result.url;
        } else {
            // Save to local storage
            const uploadDir = path.join(process.cwd(), 'uploads', folder);

            // Ensure directory exists
            await fs.mkdir(uploadDir, { recursive: true });

            const filePath = path.join(uploadDir, filename);
            await fs.writeFile(filePath, imageBuffer);

            const relativePath = `/uploads/${folder}/${filename}`;
            winston.info(`Image saved locally: ${relativePath}`, {
                source: "imageHelper.js",
                function: "processBase64Image",
                filePath: relativePath,
                imageSize: imageBuffer.length
            });
            return relativePath;
        }
    } catch (error) {
        winston.error(`Error processing base64 image: ${error.message}`, {
            source: "imageHelper.js",
            function: "processBase64Image",
            error: error.message,
            code: error.code,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Process multiple base64 images in batch with cleanup on failure
 * @param {Array} images - Array of {base64: string, folder: string, prefix: string}
 * @param {Object} options - Processing options
 * @param {boolean} options.cleanupOnError - Clean up uploaded images if batch fails (default: true)
 * @returns {Promise<Array>} - Array of {success: boolean, path: string, error: string}
 */
async function processBatchBase64Images(images, options = {}) {
    const { cleanupOnError = true } = options;
    const results = [];
    const uploadedPaths = [];

    try {
        for (const img of images) {
            try {
                const path = await processBase64Image(img.base64, img.folder, img.prefix);
                results.push({ success: true, path, error: null });
                uploadedPaths.push(path);
            } catch (error) {
                results.push({ success: false, path: null, error: error.message });

                // If cleanupOnError is true and we have a failure, clean up and throw
                if (cleanupOnError) {
                    winston.warn(`Image processing failed, cleaning up ${uploadedPaths.length} uploaded images`, {
                        source: "imageHelper.js",
                        function: "processBatchBase64Images",
                        uploadedCount: uploadedPaths.length,
                        error: error.message
                    });
                    await Promise.allSettled(
                        uploadedPaths.map(path => deleteImage(path))
                    );
                    throw error;
                }
            }
        }

        return results;
    } catch (error) {
        // If error was thrown, cleanup already happened
        throw error;
    }
}

/**
 * Clean up orphaned images from failed batch operations
 * @param {Array<String>} imagePaths - Array of image paths to delete
 * @returns {Promise<Object>} - {deleted: number, failed: number}
 */
async function cleanupOrphanedImages(imagePaths) {
    if (!imagePaths || !Array.isArray(imagePaths) || imagePaths.length === 0) {
        return { deleted: 0, failed: 0 };
    }

    winston.info(`Cleaning up ${imagePaths.length} orphaned images`, {
        source: "imageHelper.js",
        function: "cleanupOrphanedImages",
        imageCount: imagePaths.length
    });

    const results = await Promise.allSettled(
        imagePaths.map(path => deleteImage(path))
    );

    const deleted = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const failed = results.length - deleted;

    winston.info(`Cleanup completed: ${deleted} deleted, ${failed} failed`, {
        source: "imageHelper.js",
        function: "cleanupOrphanedImages",
        deleted: deleted,
        failed: failed
    });

    return { deleted, failed };
}

/**
 * Delete image from storage (S3 or local)
 * @param {String} imagePath - Image path/URL to delete
 * @returns {Promise<Boolean>}
 */
async function deleteImage(imagePath) {
    try {
        if (!imagePath) return true;

        const useS3 = config.aws?.s3?.enabled || false;

        if (useS3) {
            // Extract S3 key from URL
            const s3Key = imagePath.replace(/^https?:\/\/[^\/]+\//, '');
            await s3Helper.deleteFromS3(s3Key);
            winston.info(`Deleted from S3: ${s3Key}`, {
                source: "imageHelper.js",
                function: "deleteImage",
                s3Key: s3Key
            });
        } else {
            // Delete from local storage
            const filePath = path.join(process.cwd(), imagePath);
            try {
                await fs.unlink(filePath);
                winston.info(`Deleted from local storage: ${filePath}`, {
                    source: "imageHelper.js",
                    function: "deleteImage",
                    filePath: filePath
                });
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    throw err;
                }
            }
        }

        return true;
    } catch (error) {
        winston.warn(`Failed to delete image: ${imagePath}`, {
            source: "imageHelper.js",
            function: "deleteImage",
            imagePath: imagePath,
            error: error.message
        });
        return false;
    }
}

/**
 * Validate base64 image string
 * @param {String} base64String - Base64 string to validate
 * @returns {Object} - {valid: boolean, error: string, size: number}
 */
function validateBase64Image(base64String) {
    try {
        if (!base64String || typeof base64String !== 'string') {
            return { valid: false, error: "Invalid or empty base64 string", size: 0 };
        }

        // Remove data URI prefix if present
        let base64Data = base64String;
        if (base64String.includes('data:image')) {
            const matches = base64String.match(/^data:image\/([a-zA-Z+]*);base64,(.*)$/);
            if (!matches || matches.length !== 3) {
                return { valid: false, error: "Invalid base64 format", size: 0 };
            }
            base64Data = matches[2];
        }

        // Check if valid base64
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
            return { valid: false, error: "Invalid base64 characters", size: 0 };
        }

        // Calculate size
        const size = Buffer.from(base64Data, 'base64').length;

        // Check size limits
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (size > maxSize) {
            return {
                valid: false,
                error: `Image too large (${(size / 1024 / 1024).toFixed(2)}MB). Maximum: 5MB`,
                size
            };
        }

        if (size < 100) {
            return { valid: false, error: "Image too small, possibly corrupted", size };
        }

        return { valid: true, error: null, size };
    } catch (error) {
        return { valid: false, error: error.message, size: 0 };
    }
}

module.exports = {
    processBase64Image,
    processBatchBase64Images,
    cleanupOrphanedImages,
    deleteImage,
    validateBase64Image
};
