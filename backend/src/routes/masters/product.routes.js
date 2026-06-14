const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middlewares/auth.middleware");
const productController = require("../../controllers/masters/product.controller");

router.use(authMiddleware);

// NOTE: specific paths before /:id
router.get("/low-stock", productController.getLowStock);
router.get("/", productController.list);
router.get("/:id", productController.getById);
router.post("/", productController.create);
router.put("/:id", productController.update);
router.delete("/:id", productController.softDelete);
router.put("/:id/stock", productController.adjustStock);

// Vendor links sub-resource
router.get("/:id/vendors", productController.getVendors);
router.post("/:id/vendors", productController.addVendor);
router.put("/:id/vendors/:pvId", productController.updateVendor);
router.delete("/:id/vendors/:pvId", productController.deactivateVendor);

module.exports = {
    path: "/products",
    router,
};
