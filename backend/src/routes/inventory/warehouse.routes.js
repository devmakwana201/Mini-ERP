const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middlewares/auth.middleware");
const whCtrl = require("../../controllers/inventory/warehouse.controller");

router.use(authMiddleware);
router.get("/", whCtrl.list);
router.get("/:id", whCtrl.getById);
router.post("/", whCtrl.create);
router.put("/:id", whCtrl.update);
router.delete("/:id", whCtrl.softDelete);

// Stock Locations sub-resource
router.get("/locations/all", whCtrl.listLocations);
router.post("/locations", whCtrl.createLocation);
router.put("/locations/:id", whCtrl.updateLocation);
router.delete("/locations/:id", whCtrl.deleteLocation);

module.exports = { path: "/warehouses", router };
