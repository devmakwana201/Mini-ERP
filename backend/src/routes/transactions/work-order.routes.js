const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middlewares/auth.middleware");
const woController = require("../../controllers/transactions/work-order.controller");

router.use(authMiddleware);
router.get("/", woController.list);
router.get("/:id", woController.getById);
router.put("/:id", woController.update);
router.post("/:id/start", woController.start);
router.post("/:id/complete", woController.complete);
router.post("/:id/cancel", woController.cancel);

module.exports = { path: "/work-orders", router };
