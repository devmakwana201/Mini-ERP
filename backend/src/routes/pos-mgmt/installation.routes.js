const express = require("express");
const installationController = require("../../controllers/pos-mgmt/installation.controller");
const { validateBody, validationRules } = require("../../middlewares/validation");
const { verifyStep2Token, verifyStep3Token } = require("../../middlewares/installationAuth.middleware");
const { verifyPOSToken } = require("../../middlewares/pos.middleware");
const router = express.Router();

// ========================================
// MASTER DATA ROUTES (Supporting APIs)
// ========================================
router.get("/countries", installationController.getCountries);
router.get("/states/", installationController.getStates);
router.get("/cities/:stateId", installationController.getCities);
router.get("/companies/", installationController.getCompanies);

// ========================================
// OTP ROUTES (Unified System)
// ========================================
// Send SAME OTP to both email & WhatsApp
router.post("/send-otp", validateBody(validationRules.sendOTP), installationController.sendOTP);

// Verify OTP from EITHER channel
router.post(
    "/verify-otp",
    validateBody(validationRules.verifyOTP),
    installationController.verifyOTP
);

// ========================================
// NEW INSTALLATION FLOW (Step-by-Step)
// ========================================

// Step 1: Validate company and OTP
router.post(
    "/validate-company-and-otp",
    validateBody(validationRules.validateCompanyAndOTP),
    installationController.validateCompanyAndOTP
);

// Step 2: Register user and activate serial
router.post(
    "/register-user-and-activate-serial",
    verifyStep2Token,
    validateBody(validationRules.registerUserAndActivateSerial),
    installationController.registerUserAndActivateSerial
);

// Step 3: Confirm activation
// Uses step 3 installation token (validates step 2 was completed)
router.post(
    "/confirm-activation",
    verifyStep3Token,
    validateBody(validationRules.confirmActivation),
    installationController.confirmActivation
);

// Step 4: Create/Update location for company
// Works with OPTIONAL POS token
// Checks if location exists to differentiate registration vs existing company
// - No location exists: Registration flow (creates location + updates plan expiry)
// - Location exists: Logged-in flow (creates/updates location, no plan update)
router.post("/create-location-for-company",
    verifyPOSToken,
    validateBody(validationRules.createLocationForCompany),
    installationController.createLocationForCompany
);

// ========================================
// INFORMATION & UTILITY ROUTES
// ========================================
router.get("/customers/:productKey", installationController.getCustomers);
router.get("/info/:productKey", installationController.getInstallationInfo);
router.get("/db-script", installationController.getDbScript);

// ========================================
// TOKEN MANAGEMENT
// ========================================
router.post(
    "/refresh-token",
    validateBody(validationRules.refreshPosToken),
    installationController.refreshToken
);

// ========================================
// TESTING & DEVELOPMENT
// ========================================
router.post("/test-mail", installationController.testMail);

// DEVELOPMENT ONLY: Reset activation for testing
router.post(
    "/reset-activation",
    validateBody(validationRules.resetActivation),
    installationController.resetActivation
);

module.exports = {
    path: "/pos/installation",
    router,
};