const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const planMaster = require("../../../controllers/masters/subscription-mgmt/planmaster.controller");
const { validateBody, validateQuery, validationRules, commonSchemas } = require("../../../middlewares/validation");
const router = express.Router();

// Get plans list with pagination
router.get("/",
    authMiddleware,
    planMaster.getPlans
);

// Get active plans for dropdown
router.get("/active",
    authMiddleware,
    planMaster.getActivePlans
);

// Get plan by ID with details
router.get("/:id",
    authMiddleware,
    planMaster.getData
);

// Create plan with details
router.post("/",
    authMiddleware,
    validateBody(validationRules.createPlan),
    planMaster.create
);

// Compare multiple plans
router.post("/compare",
    authMiddleware,
    validateBody(validationRules.comparePlans),
    planMaster.comparePlans
);

// Duplicate a plan
router.post("/:id/duplicate",
    authMiddleware,
    validateBody(validationRules.duplicatePlan),
    planMaster.duplicatePlan
);

// Update plan with details
router.put("/:id",
    authMiddleware,
    validateBody(validationRules.updatePlan),
    planMaster.update
);

// Update only plan details
router.put("/:id/details",
    authMiddleware,
    validateBody(validationRules.updatePlanDetails),
    planMaster.updatePlanDetails
);

// Delete plan (soft delete)
router.delete("/:id",
    authMiddleware,
    planMaster.delete
);

module.exports = {
    path: "/plans",
    router: router,
};