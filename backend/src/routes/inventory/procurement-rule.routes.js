const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middlewares/auth.middleware");
const prCtrl = require("../../controllers/inventory/procurement-rule.controller");

router.use(authMiddleware);
router.post("/run", prCtrl.runCheck);
router.get("/", prCtrl.list);
router.get("/:id", prCtrl.getById);
router.post("/", prCtrl.create);
router.put("/:id", prCtrl.update);
router.delete("/:id", prCtrl.softDelete);

module.exports = { path: "/procurement-rules", router };
