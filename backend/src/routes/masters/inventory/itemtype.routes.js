const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const itemType = require("../../../controllers/masters/inventory/itemtype.controller");
const { validateBody, validateQuery, validationRules, commonSchemas } = require("../../../middlewares/validation");
const router = express.Router();

// Get item types list with pagination
router.get("/",
    authMiddleware,
    itemType.getItemTypes
);

// Get item type by ID
router.get("/:id",
    authMiddleware,
    itemType.getData
);

// Get item types by company
router.get("/company/:companyid",
    authMiddleware,
    itemType.getItemTypesByCompany
);

// Create item type
router.post("/",
    authMiddleware,
    validateBody(validationRules.createItemType),
    itemType.create
);

// Update item type
router.put("/:id",
    authMiddleware,
    validateBody(validationRules.updateItemType),
    itemType.update
);

// Delete item type (soft delete)
router.delete("/:id",
    authMiddleware,
    itemType.delete
);

module.exports = {
    path: "/itemtypes",
    router: router,
};