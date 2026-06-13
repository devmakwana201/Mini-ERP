const multer = require("multer");
const { upload: uploadConfig } = require("../config/config");

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: uploadConfig.maxFileSize, // Use config file size limit
    },
    fileFilter: (req, file, cb) => {
        // Check if file type is allowed
        if (uploadConfig.allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: ${uploadConfig.allowedMimeTypes.join(", ")}`));
        }
    },
});

module.exports = upload;
