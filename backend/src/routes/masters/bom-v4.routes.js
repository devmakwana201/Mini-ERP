const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middlewares/auth.middleware");
const bomCtrl = require("../../controllers/masters/bom-v4.controller");

router.use(authMiddleware);

// Specific before /:id
router.get("/product/:productId", bomCtrl.getByProduct);
router.get("/", bomCtrl.list);
router.get("/:id", bomCtrl.getById);
router.post("/", bomCtrl.create);
router.put("/:id", bomCtrl.update);
router.delete("/:id", bomCtrl.softDelete);

// BOM Lines
router.post("/:id/lines", bomCtrl.addLine);
router.put("/:id/lines/:lineId", bomCtrl.updateLine);
router.delete("/:id/lines/:lineId", bomCtrl.removeLine);

module.exports = { path: "/bom-v4", router };
