const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middlewares/auth.middleware");
const poController = require("../../controllers/transactions/purchase-order.controller");

router.use(authMiddleware);

router.get("/stats", poController.getStats);
router.get("/", poController.list);
router.get("/:id", poController.getById);
router.post("/", poController.create);
router.put("/:id", poController.update);
router.delete("/:id", poController.softDelete);

router.post("/:id/send", poController.send);
router.post("/:id/confirm", poController.confirmPO);
router.post("/:id/receive", poController.receive);
router.post("/:id/cancel", poController.cancelPO);

module.exports = { path: "/purchase-orders", router };
