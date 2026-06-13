const express = require("express");
const searchController = require("../../controllers/pos-mgmt/search.controller");
const { validateBody, validationRules } = require("../../middlewares/validation");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");
const router = express.Router();

// Universal search endpoint
router.post(
    "/universal-search",
    verifyPOSToken,  // Optional POS token - continues without token if not provided
    validateBody(validationRules.universalSearch),
    searchController.universalSearch
);

module.exports = {
    path: "/pos/search",
    router,
};