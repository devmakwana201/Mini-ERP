const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const user = require("../../../controllers/masters/user-mgmt/user.controller");
const { validateBody, validateQuery, validationRules, commonSchemas } = require("../../../middlewares/validation");
const { uploadSingle, uploadSingleMemory } = require("../../../middlewares/upload.middleware");
const config = require("../../../config/config");
const router = express.Router();

// Determine which upload middleware to use based on config
const useS3 = config.aws?.s3?.enabled || false;
const profilePicUpload = useS3 
    ? uploadSingleMemory("profilepic", {
        fileType: "images",
        maxFileSize: 5 * 1024 * 1024 // 5MB
      })
    : uploadSingle("profilepic", {
        uploadPath: "users/profilepic",
        filePrefix: "user",
        fileType: "images",
        maxFileSize: 5 * 1024 * 1024 // 5MB
      });


// Get users list
router.get("/", 
    authMiddleware,
    validateQuery(commonSchemas.pagination),
    user.getUsers
);

// IMPORTANT: /profile/me MUST be before /:id
// Otherwise Express matches "profile" as the :id param
router.get("/profile/me", 
    authMiddleware, 
    user.getUserProfile
);

// Get user by ID
router.get("/:id", 
    authMiddleware,
    user.getData
);

// Create user
router.post("/", 
    authMiddleware,
    // profilePicUpload,
    validateBody(validationRules.createUser),
    user.create
);

// Update user
router.put("/:id", 
    authMiddleware,
    // profilePicUpload,
    validateBody(validationRules.updateUser),
    user.update
);

// Delete user (soft delete)
router.delete("/:id", 
    authMiddleware,
    user.delete
);

module.exports = {
    path: "/users",
    router: router,
};