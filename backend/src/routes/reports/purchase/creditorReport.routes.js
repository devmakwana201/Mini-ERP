const express = require("express");
const { authMiddleware } = require("../../../middlewares/auth.middleware");
const creditorReportController = require("../../../controllers/reports/purchase/creditorReport.controller");

const router = express.Router();

router.get(
    "/creditor-report",
    authMiddleware,
    creditorReportController.getCreditorReport
);

module.exports = {
    path: "/reports/purchase",
    router,
};
