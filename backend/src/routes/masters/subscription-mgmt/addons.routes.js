const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const addons = require("../../../controllers/masters/subscription-mgmt/addons.controller");
const { validateBody, validateQuery, validationRules, commonSchemas } = require("../../../middlewares/validation");
const router = express.Router();

// Get addons list with pagination
router.get("/",
    authMiddleware,
    addons.getAddons
);

// Get active addons for dropdown
router.get("/active",
    authMiddleware,
    addons.getActiveAddons
);

// Get addons grouped by particular
router.get("/grouped",
    authMiddleware,
    addons.getAddonsGroupedByParticular
);

// Get addons by particular ID
router.get("/particular/:particularid",
    authMiddleware,
    addons.getAddonsByParticular
);

// Get addon by ID
router.get("/:id",
    authMiddleware,
    addons.getData
);

// Create addon
router.post("/",
    authMiddleware,
    validateBody(validationRules.createAddon),
    addons.create
);

// Bulk update addon prices
router.post("/bulk-update-prices",
    authMiddleware,
    validateBody(validationRules.bulkUpdateAddonPrices),
    addons.bulkUpdatePrices
);

// Duplicate an addon
router.post("/:id/duplicate",
    authMiddleware,
    validateBody(validationRules.duplicateAddon),
    addons.duplicateAddon
);

// Update addon
router.put("/:id",
    authMiddleware,
    validateBody(validationRules.updateAddon),
    addons.update
);

// Delete addon (soft delete)
router.delete("/:id",
    authMiddleware,
    addons.delete
);

module.exports = {
    path: "/addons",
    router: router,
};