const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const role = require("../../../controllers/masters/user-mgmt/role.controller");
const { validateBody, validateQuery, validationRules, commonSchemas } = require("../../../middlewares/validation");
const router = express.Router();

// Get roles list - GET with query validation
router.get("/", 
    authMiddleware,
    validateQuery(commonSchemas.pagination),
    role.getRoles
);

// Get role by ID - GET (RESTful)
router.get("/:id", 
    authMiddleware,
    role.getData
);

// Create role - POST method
router.post("/", 
    authMiddleware,
    validateBody(validationRules.createRole),
    role.create
);

// Update role - PUT (RESTful)
router.put("/:id", 
    authMiddleware,
    validateBody(validationRules.updateRole),
    role.update
);

// Delete role - DELETE (RESTful)
router.delete("/:id", 
    authMiddleware,
    role.delete
);

// Get all roles for dropdown
router.get("/dropdown/all", 
    authMiddleware, 
    role.getAllRoles
);

module.exports = {
    path: "/roles",
    router: router,
};