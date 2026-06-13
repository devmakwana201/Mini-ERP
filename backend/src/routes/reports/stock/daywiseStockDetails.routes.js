const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const daywiseStockDetailsController = require("../../../controllers/reports/stock/daywiseStockDetails.controller");
const router = express.Router();

// Get daywise stock details report with pagination and filters
router.get(
    "/daywise-stock-details",
    authMiddleware,
    daywiseStockDetailsController.getDaywiseStockDetails
);

module.exports = {
    path: "/reports/stock",
    router: router,
};
