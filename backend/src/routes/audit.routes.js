const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/auth.middleware");
const auditCtrl = require("../controllers/audit.controller");

router.use(authMiddleware);
router.get("/", auditCtrl.list);
router.get("/:id", auditCtrl.getById);

module.exports = { path: "/audit-logs", router };
