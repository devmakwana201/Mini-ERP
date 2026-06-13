const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const warehouse = require("../../../controllers/masters/inventory/warehouse.controller");
const { validateBody, validateQuery, validationRules, commonSchemas } = require("../../../middlewares/validation");
const router = express.Router();

// Get warehouses list - GET with query validation
router.get("/", 
    authMiddleware,
    validateQuery(commonSchemas.pagination),
    warehouse.getWarehouses
);

// Get warehouse by ID - GET (RESTful)
router.get("/:id", 
    authMiddleware,
    warehouse.getData
);

// Create warehouse - POST method
router.post("/", 
    authMiddleware,
    validateBody(validationRules.createWarehouse),
    warehouse.create
);

// Update warehouse - PUT (RESTful)
router.put("/:id", 
    authMiddleware,
    validateBody(validationRules.updateWarehouse),
    warehouse.update
);

// Delete warehouse - DELETE (RESTful)
router.delete("/:id", 
    authMiddleware,
    warehouse.delete
);

// Get all warehouses for dropdown
router.get("/dropdown/all", 
    authMiddleware, 
    warehouse.getAllWarehouses
);

// Get warehouses by location
router.get("/location/:locationid", 
    authMiddleware, 
    warehouse.getWarehousesByLocation
);

module.exports = {
    path: "/warehouses",
    router: router,
};