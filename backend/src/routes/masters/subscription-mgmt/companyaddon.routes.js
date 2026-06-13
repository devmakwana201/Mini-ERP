const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const companyAddon = require("../../../controllers/masters/subscription-mgmt/companyaddon.controller");
const { validateBody, validateQuery, validationRules, commonSchemas } = require("../../../middlewares/validation");
const router = express.Router();

// Get all company addons (admin view)
router.get("/",
    authMiddleware,
    companyAddon.getAllCompanyAddons
);

// Get expiring company addons
router.get("/expiring",
    authMiddleware,
    companyAddon.getExpiringCompanyAddons
);

// Get company addon by ID
router.get("/:id",
    authMiddleware,
    companyAddon.getCompanyAddonById
);

// Get company addons for specific company
router.get("/company/:companyid",
    authMiddleware,
    companyAddon.getCompanyAddons
);

// Get available addons for a company
router.get("/company/:companyid/available",
    authMiddleware,
    companyAddon.getAvailableAddonsForCompany
);

// Add addon to company
router.post("/company/:companyid/addons",
    authMiddleware,
    validateBody(validationRules.addAddonToCompany),
    companyAddon.addAddonToCompany
);

// Bulk deactivate company addons
router.post("/bulk-deactivate",
    authMiddleware,
    validateBody(validationRules.bulkAddAddonsToCompany),
    companyAddon.bulkDeactivateCompanyAddons
);

// Update company addon
router.put("/:id",
    authMiddleware,
    validateBody(validationRules.updateCompanyAddon),
    companyAddon.updateCompanyAddon
);

// Renew company addon
router.put("/:id/renew",
    authMiddleware,
    companyAddon.renewCompanyAddon
);

// Deactivate company addon
router.delete("/:id",
    authMiddleware,
    companyAddon.deactivateCompanyAddon
);

module.exports = {
    path: "/company-addons",
    router: router,
};