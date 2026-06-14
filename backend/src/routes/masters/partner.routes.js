const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middlewares/auth.middleware");
const partnerController = require("../../controllers/masters/partner.controller");

// All routes require authentication
router.use(authMiddleware);

// Partner CRUD
router.get("/vendors", partnerController.listVendors);
router.get("/customers", partnerController.listCustomers);
router.get("/", partnerController.list);
router.get("/:id", partnerController.getById);
router.post("/", partnerController.create);
router.put("/:id", partnerController.update);
router.delete("/:id", partnerController.softDelete);

// Vendor-Product links
router.get("/:id/products", partnerController.getPartnerProducts);
router.post("/:id/products", partnerController.addProductLink);
router.delete("/:id/products/:productId", partnerController.removeProductLink);

module.exports = {
    path: "/partners",
    router,
};
