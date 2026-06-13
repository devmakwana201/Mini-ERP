const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const priceDeviationController = require("../../../controllers/reports/purchase/priceDeviation.controller");
const router = express.Router();

// Get price deviation report with pagination and filters
router.get(
    "/price-deviation",
    authMiddleware,
    priceDeviationController.getPriceDeviation
);

module.exports = {
    path: "/reports/purchase",
    router: router,
};
