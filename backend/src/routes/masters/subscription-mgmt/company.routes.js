const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const company = require("../../../controllers/masters/subscription-mgmt/company.controller");
const { validateBody, validateQuery, validationRules, commonSchemas } = require("../../../middlewares/validation");
const router = express.Router();

// Get companies list with pagination
router.get("/",
    authMiddleware,
    company.getCompanies
);

// Get companies with expiring plans
router.get("/expiring-plans",
    authMiddleware,
    company.getExpiringPlans
);

// Get company by ID
router.get("/:id",
    authMiddleware,
    company.getData
);

// Get company plan history
router.get("/:id/plan-history",
    authMiddleware,
    company.getPlanHistory
);

// Register new company with plan
router.post("/register",
    authMiddleware,
    validateBody(validationRules.registerCompany),
    company.register
);

// Update company details
router.put("/:id",
    authMiddleware,
    validateBody(validationRules.updateCompany),
    company.update
);

// Update company plan
router.put("/:id/plan",
    authMiddleware,
    company.updatePlan
);

// Delete company (soft delete)
router.delete("/:id",
    authMiddleware,
    company.delete
);

module.exports = {
    path: "/companies",
    router: router,
};