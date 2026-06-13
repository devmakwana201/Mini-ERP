const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const supplier = require("../../../controllers/masters/inventory/supplier.controller");
const { validateBody, validateQuery, validationRules, commonSchemas } = require("../../../middlewares/validation");
const { uploadSingle, uploadSingleMemory } = require("../../../middlewares/upload.middleware");
const config = require("../../../config/config");
const router = express.Router();

// Determine which upload middleware to use based on config
const useS3 = config.aws?.s3?.enabled || false;
const supplierImageUpload = useS3 

    ? uploadSingleMemory("supplierimage", {
        fileType: "images",
        maxFileSize: 5 * 1024 * 1024 // 5MB
      })
    : uploadSingle("supplierimage", {
        uploadPath: "suppliers/images",
        filePrefix: "supplier",
        fileType: "images",
        maxFileSize: 5 * 1024 * 1024 // 5MB
      });

// Get suppliers list - GET with query validation
router.get("/", 
    authMiddleware,
    validateQuery(commonSchemas.pagination),
    supplier.getSuppliers
);

// Get supplier by ID - GET (RESTful)
router.get("/:id", 
    authMiddleware,
    supplier.getData
);

// Create supplier - POST method
router.post("/", 
    authMiddleware,
    supplierImageUpload,
    validateBody(validationRules.createSupplier),
    supplier.create
);

// Update supplier - PUT (RESTful)
router.put("/:id", 
    authMiddleware,
    supplierImageUpload,
    validateBody(validationRules.updateSupplier),
    supplier.update
);

// Delete supplier - DELETE (RESTful)
router.delete("/:id",
    authMiddleware,
    supplier.delete
);

// Approval Management Routes

// Get unapproved suppliers
router.get("/approvals/unapproved",
    authMiddleware,
    supplier.getUnapprovedSuppliers
);

// Get rejection reasons
router.get("/approvals/rejection-reasons",
    authMiddleware,
    supplier.getRejectionReasons
);

// Approve single supplier
router.put("/approvals/:id/approve",
    authMiddleware,
    supplier.approveSupplier
);

// Reject single supplier
router.put("/approvals/:id/reject",
    authMiddleware,
    supplier.rejectSupplier
);

// Bulk approve suppliers
router.post("/approvals/bulk-approve",
    authMiddleware,
    supplier.bulkApproveSuppliers
);

// Bulk reject suppliers
router.post("/approvals/bulk-reject",
    authMiddleware,
    supplier.bulkRejectSuppliers
);

module.exports = {
    path: "/suppliers",
    router: router,
};