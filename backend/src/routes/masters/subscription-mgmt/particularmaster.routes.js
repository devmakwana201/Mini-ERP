const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const particularMaster = require("../../../controllers/masters/subscription-mgmt/particularmaster.controller");
const { validateBody, validateQuery, validationRules, commonSchemas } = require("../../../middlewares/validation");
const router = express.Router();

// Get particulars list with pagination
router.get("/",
    authMiddleware,
    particularMaster.getParticulars
);

// Get active particulars for dropdown
router.get("/active",
    authMiddleware,
    particularMaster.getActiveParticulars
);

// Get particular by ID
router.get("/:id",
    authMiddleware,
    particularMaster.getData
);

// Create particular
router.post("/",
    authMiddleware,
    validateBody(validationRules.createParticular),
    particularMaster.create
);

// Update particular
router.put("/:id",
    authMiddleware,
    validateBody(validationRules.updateParticular),
    particularMaster.update
);

// Delete particular (soft delete)
router.delete("/:id",
    authMiddleware,
    particularMaster.delete
);

module.exports = {
    path: "/particulars",
    router: router,
};