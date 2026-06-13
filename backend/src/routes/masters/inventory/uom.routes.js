const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const uom = require("../../../controllers/masters/inventory/uom.controller");
const { validateBody, validateQuery, validationRules, commonSchemas } = require("../../../middlewares/validation");
const router = express.Router();

// Get UOMs list with pagination
router.get("/",
    authMiddleware,
    uom.getUOMs
);

// Get UOM by ID
router.get("/:id",
    authMiddleware,
    uom.getData
);

// Get UOMs by company
router.get("/company/:companyid",
    authMiddleware,
    uom.getUOMsByCompany
);

// Create UOM
router.post("/",
    authMiddleware,
    validateBody(validationRules.createUOM),
    uom.create
);

// Update UOM
router.put("/:id",
    authMiddleware,
    validateBody(validationRules.updateUOM),
    uom.update
);

// Delete UOM (soft delete)
router.delete("/:id",
    authMiddleware,
    uom.delete
);

module.exports = {
    path: "/uoms",
    router: router,
};