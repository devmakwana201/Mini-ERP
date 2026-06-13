const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const permission = require("../../../controllers/masters/user-mgmt/permission.controller");
const { validateBody, validateQuery, validationRules, commonSchemas } = require("../../../middlewares/validation");
const router = express.Router();

// Get permissions list - GET with query validation
router.get("/", 
    authMiddleware,
    validateQuery(commonSchemas.pagination),
    permission.getPermissions
);

// Get permission by ID - GET (RESTful)
router.get("/:id", 
    authMiddleware,
    permission.getData
);

// Create permission - POST method
router.post("/", 
    authMiddleware,
    validateBody(validationRules.createPermission),
    permission.create
);

// Update permission - PUT (RESTful)
router.put("/:id", 
    authMiddleware,
    validateBody(validationRules.updatePermission),
    permission.update
);

// Delete permission - DELETE (RESTful)
router.delete("/:id", 
    authMiddleware,
    permission.delete
);

// Get all permissions for dropdown
router.get("/dropdown/all", 
    authMiddleware, 
    permission.getAllPermissions
);

// Get permissions by module
router.get("/module/:moduleid", 
    authMiddleware, 
    permission.getPermissionsByModule
);

module.exports = {
    path: "/permissions",
    router: router,
};