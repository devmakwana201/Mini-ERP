const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middlewares/auth.middleware");
const moController = require("../../controllers/transactions/manufacturing-order.controller");

router.use(authMiddleware);

router.get("/stats", moController.getStats);
router.get("/", moController.list);
router.get("/:id", moController.getById);
router.post("/", moController.create);
router.put("/:id", moController.update);
router.delete("/:id", moController.softDelete);

router.post("/:id/confirm", moController.confirm);
router.post("/:id/start", moController.start);
router.post("/:id/produce", moController.produce);
router.post("/:id/cancel", moController.cancel);

module.exports = { path: "/manufacturing-orders", router };
