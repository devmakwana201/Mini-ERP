const express = require("express");
const router = express.Router();
const itemSupplierMappingController = require("../../controllers/pos-mgmt/itemsuppliermapping.controller");
const { validateSchema } = require("../../middlewares/validation");
const { validationRules } = require("../../middlewares/validation");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");

router.post(
    "/sync",
    verifyPOSToken,
    validateSchema(validationRules.syncItemSupplierMapping),
    itemSupplierMappingController.syncItemSupplierMapping
);

module.exports = {
    router: router,
    path: "/pos/item-supplier-mapping"
};
