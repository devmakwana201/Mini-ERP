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


// Get users list - Changed from POST to GET with query validation
router.get("/", 
    authMiddleware,
    validateQuery(commonSchemas.pagination),
    user.getUsers
);

// Get user by ID - Changed from POST to GET (RESTful)
router.get("/:id", 
    authMiddleware,
    user.getData
);

// Create user - POST method is correct
router.post("/", 
    authMiddleware,
    // profilePicUpload,
    validateBody(validationRules.createUser),
    user.create
);

// Update user - Changed from POST to PUT (RESTful)
router.put("/:id", 
    authMiddleware,
    // profilePicUpload,
    validateBody(validationRules.updateUser),
    user.update
);

// Delete user - Changed from POST to DELETE (RESTful)
router.delete("/:id", 
    authMiddleware,
    user.delete
);

// Get user profile - Changed from POST to GET
router.get("/profile/me", 
    authMiddleware, 
    user.getUserProfile
);

module.exports = {
    path: "/users",
    router: router,
};