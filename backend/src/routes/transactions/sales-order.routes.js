const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middlewares/auth.middleware");
const soController = require("../../controllers/transactions/sales-order.controller");

router.use(authMiddleware);

// Specific routes before /:id
router.get("/stats", soController.getStats);
router.post("/from-po/:poId", soController.createFromPO);
router.get("/", soController.list);
router.get("/:id", soController.getById);
router.post("/", soController.create);
router.put("/:id", soController.update);
router.delete("/:id", soController.softDelete);

// Status transitions
router.post("/:id/confirm", soController.confirm);
router.post("/:id/deliver", soController.deliver);
router.post("/:id/cancel", soController.cancel);

// Line items
router.post("/:id/lines", soController.addLine);
router.put("/:id/lines/:solId", soController.updateLine);
router.delete("/:id/lines/:solId", soController.removeLine);

module.exports = {
    path: "/sales-orders",
    router,
};
