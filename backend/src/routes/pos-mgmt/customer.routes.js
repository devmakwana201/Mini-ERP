const express = require("express");
const router = express.Router();
const customerController = require("../../controllers/pos-mgmt/customer.controller");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");
const { validateBody, validationRules } = require("../../middlewares/validation");

// Save customers from POS
router.post(
    "/save-customers",
    verifyPOSToken,
    validateBody(validationRules.saveCustomers),
    customerController.saveCustomers
);

// Save customer details (account details) from POS
router.post(
    "/save-customer-details",
    verifyPOSToken,
    validateBody(validationRules.saveCustomerDetails),
    customerController.saveCustomerDetails
);

// Sync customers from POS
router.post(
    "/sync",
    verifyPOSToken,
    validateBody(validationRules.saveCustomers),
    customerController.syncCustomers
);

// Sync customer details from POS
router.post(
    "/sync-details",
    verifyPOSToken,
    validateBody(validationRules.saveCustomerDetails),
    customerController.syncCustomerDetails
);

// Get customer by ID (requires POS authentication)
router.get(
    "/:customerId",
    verifyPOSToken,
    customerController.getCustomerById
);

// Get customers by location (requires POS authentication)
router.get(
    "/location/:companyId",
    verifyPOSToken,
    customerController.getCustomersByCompany
);

// Get customer account details (requires POS authentication)
router.get(
    "/:customerId/account-details",
    verifyPOSToken,
    customerController.getCustomerAccountDetails
);

// Get customer statistics for a location (requires POS authentication)
router.get(
    "/stats/:companyId",
    verifyPOSToken,
    customerController.getCustomerStats
);

module.exports = {
    path: "/pos/customer",
    router: router,
};