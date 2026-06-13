const {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    CopyObjectCommand,
    ListObjectsV2Command,
    HeadObjectCommand,
} = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const winston = require("../config/winston");
const { aws, cron } = require("../config/config");

// Create reusable S3Client
const s3Client = new S3Client({
    region: aws.region,
    credentials: {
        accessKeyId: aws.accessKeyId,
        secretAccessKey: aws.secretAccessKey,
    },
});

/**
 * Uploads a file buffer to S3 (AWS SDK v3)
 * @param {Buffer} fileBuffer - File buffer
 * @param {String} fileName - Desired S3 key
 * @param {String} mimeType - File MIME type
 * @returns {Promise<{key: string, url: string}>}
 */
async function uploadToS3(fileBuffer, fileName, mimeType) {
    // Validate input parameters
    if (!fileBuffer) {
        throw new Error("File buffer is required");
    }
    
    if (!Buffer.isBuffer(fileBuffer)) {
        throw new Error("Invalid file buffer - expected Buffer object");
    }
    
    if (!fileName) {
        throw new Error("File name is required");
    }
    
    if (!mimeType) {
        throw new Error("MIME type is required");
    }

    winston.info(`Uploading to S3: ${fileName}, size: ${fileBuffer.length} bytes, type: ${mimeType}`, {
        source: "s3Helper.js",
        function: "uploadToS3",
        fileName: fileName,
        fileSize: fileBuffer.length,
        mimeType: mimeType
    });

    // For small files (< 5MB), use PutObjectCommand directly
    // For larger files, the Upload class would be more appropriate
    const command = new PutObjectCommand({
        Bucket: aws.bucketName,
        Key: fileName,
        Body: fileBuffer,
        ContentType: mimeType,
        ContentDisposition: "inline",
        ContentLength: fileBuffer.length
    });

    try {
        const result = await s3Client.send(command);

        // Construct proper S3 URL
        const url = aws.cloudFrontUrl
            ? `${aws.cloudFrontUrl}/${fileName}`
            : `https://${aws.bucketName}.s3.${aws.region}.amazonaws.com/${fileName}`;

        winston.info(`S3 upload successful: ${url}`, {
            source: "s3Helper.js",
            function: "uploadToS3",
            url: url,
            key: fileName
        });
        return { key: fileName, url: url };
    } catch (err) {
        winston.error(`S3 upload failed: ${err.message}`, {
            source: "s3Helper.js",
            function: "uploadToS3",
            fileName: fileName,
            error: err.message,
            code: err.code,
            stack: err.stack
        });
        throw err;
    }
}

/**
 * Deletes a file from S3 (AWS SDK v3)
 * @param {String} key - S3 object key
 * @returns {Promise<void>}
 */
async function deleteFromS3(key) {
    const command = new DeleteObjectCommand({
        Bucket: aws.bucketName,
        Key: key,
    });

    try {
        await s3Client.send(command);
    } catch (err) {
        winston.warn(`Failed to delete S3 object: ${key}`, {
            source: "s3Helper.js",
            function: "deleteFromS3",
            key: key,
            error: err.message
        });
    }
}

async function copyInS3(sourceKey, destinationKey) {
    const command = new CopyObjectCommand({
        Bucket: aws.bucketName,
        CopySource: `/${aws.bucketName}/${sourceKey}`,
        Key: destinationKey,
        // ACL: "public-read",
    });

    try {
        await s3Client.send(command);
        return {
            key: destinationKey,
            url: `${aws.cloudFrontUrl || aws.bucketName}/${destinationKey}`,
        };
    } catch (err) {
        winston.error(`S3 copy failed: ${err.message}`, {
            source: "s3Helper.js",
            function: "copyInS3",
            sourceKey: sourceKey,
            destinationKey: destinationKey,
            error: err.message,
            code: err.code,
            stack: err.stack
        });
        throw err;
    }
}

/**
 * ✅ Checks if an object exists in S3 using HeadObjectCommand (AWS SDK v3)
 * @param {String} key - S3 object key
 * @returns {Promise<Boolean>}
 */
async function checkIfExists(key) {
    const command = new HeadObjectCommand({
        Bucket: aws.bucketName,
        Key: key,
    });

    try {
        await s3Client.send(command);
        return true; // Object exists
    } catch (err) {
        if (err.name === "NotFound") {
            winston.info(`[S3] Object does not exist: ${key}`, {
                source: "s3Helper.js",
                function: "checkIfExists",
                key: key
            });
            return false; // Object not found
        }
        winston.error(`[S3] checkIfExists error: ${err.message}`, {
            source: "s3Helper.js",
            function: "checkIfExists",
            key: key,
            error: err.message,
            code: err.code,
            stack: err.stack
        });
        throw err; // Other errors (like permissions) should propagate
    }
}

async function cleanupOldTempImages(thresholdHours = cron.cleanupAge) {
    const BUCKET = aws.bucketName;
    const TEMP_PREFIX = "uploads/temp/";
    const now = Date.now();
    const thresholdMs = thresholdHours * 60 * 60 * 1000;

    try {
        const listCommand = new ListObjectsV2Command({
            Bucket: BUCKET,
            Prefix: TEMP_PREFIX,
        });

        const listedObjects = await s3Client.send(listCommand);

        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
            winston.info("[CLEANUP] No temp images found.", {
                source: "s3Helper.js",
                function: "cleanupOldTempImages",
                bucket: BUCKET,
                prefix: TEMP_PREFIX
            });
            return { deletedCount: 0 };
        }

        let deletedCount = 0;
        for (const obj of listedObjects.Contents) {
            const key = obj.Key;

            if (key.endsWith("/")) continue; // Skip folder marker

            const parts = key.split("/");
            const filename = parts[parts.length - 1];
            const timestampStr = filename.split("_")[0];
            const timestamp = Number(timestampStr);

            if (isNaN(timestamp)) {
                winston.warn(`[CLEANUP] Invalid timestamp: ${key}`, {
                    source: "s3Helper.js",
                    function: "cleanupOldTempImages",
                    key: key,
                    timestampStr: timestampStr
                });
                continue;
            }

            if (now - timestamp > thresholdMs) {
                await deleteFromS3(key);
                winston.info(`[CLEANUP] Deleted: ${key}`, {
                    source: "s3Helper.js",
                    function: "cleanupOldTempImages",
                    key: key
                });
                deletedCount++;
            }
        }

        winston.info(`[CLEANUP] Complete. Deleted ${deletedCount} old temp images.`, {
            source: "s3Helper.js",
            function: "cleanupOldTempImages",
            deletedCount: deletedCount,
            thresholdHours: thresholdHours
        });
        return { deletedCount };
    } catch (err) {
        winston.error(`[CLEANUP ERROR]: ${err.message}`, {
            source: "s3Helper.js",
            function: "cleanupOldTempImages",
            error: err.message,
            code: err.code,
            stack: err.stack
        });
        throw err;
    }
}

/**
 * Generate a pre-signed URL for direct client upload to S3
 * This allows clients to upload files directly to S3 without going through the server
 *
 * @param {Object} options - Upload options
 * @param {String} options.folder - Folder path in S3 (e.g., 'items/images', 'brands/icons')
 * @param {String} options.filename - Original filename (used to determine extension)
 * @param {String} options.contentType - MIME type of the file
 * @param {Number} options.expiresIn - URL expiration time in seconds (default: 300 = 5 minutes)
 * @param {Number} options.maxSize - Maximum file size in bytes (default: 10MB)
 * @returns {Promise<{uploadUrl: string, key: string, publicUrl: string, expiresAt: Date}>}
 */
async function generatePresignedUploadUrl(options) {
    const {
        folder,
        filename,
        contentType,
        expiresIn = 300,
        maxSize = 10 * 1024 * 1024
    } = options;

    // Validate required parameters
    if (!folder) throw new Error("folder is required");
    if (!filename) throw new Error("filename is required");
    if (!contentType) throw new Error("contentType is required");

    // Validate content type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(contentType.toLowerCase())) {
        throw new Error(`Invalid content type: ${contentType}. Allowed: ${allowedTypes.join(', ')}`);
    }

    // Generate unique key with timestamp and random string
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const year = new Date().getFullYear();
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const month = monthNames[new Date().getMonth()];

    const key = `${folder}/${year}/${month}/${timestamp}_${random}.${ext}`;

    const command = new PutObjectCommand({
        Bucket: aws.bucketName,
        Key: key,
        ContentType: contentType,
        ContentDisposition: "inline",
    });

    try {
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

        // Generate public URL
        const publicUrl = aws.cloudFrontUrl
            ? `${aws.cloudFrontUrl}/${key}`
            : `https://${aws.bucketName}.s3.${aws.region}.amazonaws.com/${key}`;

        const expiresAt = new Date(Date.now() + expiresIn * 1000);

        winston.info(`Generated pre-signed upload URL`, {
            source: "s3Helper.js",
            function: "generatePresignedUploadUrl",
            key: key,
            contentType: contentType,
            expiresIn: expiresIn,
            maxSize: maxSize
        });

        return {
            uploadUrl,      // Use this URL to PUT the file directly
            key,            // S3 key to store in database
            publicUrl,      // Public URL after upload completes
            expiresAt,      // When the upload URL expires
            maxSize         // Maximum allowed file size
        };
    } catch (err) {
        winston.error(`Failed to generate pre-signed URL: ${err.message}`, {
            source: "s3Helper.js",
            function: "generatePresignedUploadUrl",
            folder: folder,
            error: err.message,
            code: err.code,
            stack: err.stack
        });
        throw err;
    }
}

/**
 * Generate multiple pre-signed URLs for batch uploads
 *
 * @param {Array} files - Array of {folder, filename, contentType}
 * @param {Object} options - Additional options {expiresIn, maxSize}
 * @returns {Promise<Array>} Array of pre-signed URL objects
 */
async function generateBatchPresignedUrls(files, options = {}) {
    if (!Array.isArray(files) || files.length === 0) {
        throw new Error("files array is required and cannot be empty");
    }

    const MAX_BATCH = 50;
    if (files.length > MAX_BATCH) {
        throw new Error(`Maximum batch size is ${MAX_BATCH} files`);
    }

    const results = await Promise.allSettled(
        files.map(file => generatePresignedUploadUrl({
            ...file,
            ...options
        }))
    );

    return results.map((result, index) => {
        if (result.status === 'fulfilled') {
            return {
                success: true,
                index,
                ...result.value
            };
        } else {
            return {
                success: false,
                index,
                error: result.reason?.message || 'Failed to generate URL'
            };
        }
    });
}

/**
 * Verify that an upload was completed successfully
 * Call this after client reports upload completion
 *
 * @param {String} key - S3 key to verify
 * @returns {Promise<{exists: boolean, size: number, contentType: string}>}
 */
async function verifyUpload(key) {
    try {
        const command = new HeadObjectCommand({
            Bucket: aws.bucketName,
            Key: key,
        });

        const response = await s3Client.send(command);

        winston.info(`Upload verified: ${key}`, {
            source: "s3Helper.js",
            function: "verifyUpload",
            key: key,
            size: response.ContentLength,
            contentType: response.ContentType
        });

        return {
            exists: true,
            size: response.ContentLength,
            contentType: response.ContentType,
            lastModified: response.LastModified
        };
    } catch (err) {
        if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
            return { exists: false, size: 0, contentType: null };
        }
        throw err;
    }
}

/**
 * Get public URL for an S3 key
 *
 * @param {String} key - S3 object key
 * @returns {String} Public URL
 */
function getPublicUrl(key) {
    if (!key) return null;

    // If it's already a full URL, return as-is
    if (key.startsWith('http://') || key.startsWith('https://')) {
        return key;
    }

    return aws.cloudFrontUrl
        ? `${aws.cloudFrontUrl}/${key}`
        : `https://${aws.bucketName}.s3.${aws.region}.amazonaws.com/${key}`;
}

module.exports = {
    uploadToS3,
    deleteFromS3,
    copyInS3,
    checkIfExists,
    cleanupOldTempImages,
    generatePresignedUploadUrl,
    generateBatchPresignedUrls,
    verifyUpload,
    getPublicUrl,
};
