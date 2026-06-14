const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/auth.middleware");
const dashCtrl = require("../controllers/dashboard.controller");

router.use(authMiddleware);
router.get("/", dashCtrl.getSummary);
router.get("/sales-chart", dashCtrl.getSalesChart);
router.get("/inventory-summary", dashCtrl.getInventorySummary);

module.exports = { path: "/dashboard", router };
