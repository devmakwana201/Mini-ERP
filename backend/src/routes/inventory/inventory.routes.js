const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middlewares/auth.middleware");
const invCtrl = require("../../controllers/inventory/inventory.controller");

router.use(authMiddleware);
router.get("/transactions", invCtrl.listTransactions);
router.get("/transactions/:id", invCtrl.getTransaction);
router.get("/ledger/:productId", invCtrl.getLedger);
router.get("/reservations", invCtrl.listReservations);

module.exports = { path: "/inventory", router };
