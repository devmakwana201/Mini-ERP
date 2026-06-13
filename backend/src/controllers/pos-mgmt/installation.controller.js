const installationModel = require("../../models/pos-mgmt/installation.model");
const moment = require("moment");
const winston = require("../../config/winston");
const jwt = require("jsonwebtoken");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { NotFoundError, BadRequestError, ConflictError } = require("../../utils/customErrors");
const { generatePOSToken } = require("../../middlewares/pos.middleware");

module.exports = {
    // ========================================
    // MASTER DATA APIS (Supporting APIs)
    // ========================================

    /**
     * Get countries
     */
    getCountries: asyncHandler(async (req, res) => {
        const result = await installationModel.getCountries();

        if (result.success) {
            res.status(200).json(
                ResponseFormatter.success(result.countries, "Countries retrieved successfully")
            );
        } else {
            res.status(404).json(ResponseFormatter.error(result.msg));
        }
    }),

    /**
     * Get states by country ID
     */
    getStates: asyncHandler(async (req, res) => {
        const result = await installationModel.getStates();

        if (result.success) {
            res.status(200).json(
                ResponseFormatter.success(result.states, "States retrieved successfully")
            );
        } else {
            res.status(404).json(ResponseFormatter.error(result.msg));
        }
    }),

    /**
     * Get cities by state ID
     */
    getCities: asyncHandler(async (req, res) => {
        const { stateId } = req.params;

        if (!stateId || isNaN(stateId)) {
            throw new BadRequestError("Valid state ID is required");
        }

        const result = await installationModel.getCities(stateId);

        if (result.success) {
            res.status(200).json(
                ResponseFormatter.success(result.cities, "Cities retrieved successfully")
            );
        } else {
            res.status(404).json(ResponseFormatter.error(result.msg));
        }
    }),

    /**
     * Get companies
     */
    getCompanies: asyncHandler(async (req, res) => {
        const result = await installationModel.getCompanies();

        if (result.success) {
            res.status(200).json(
                ResponseFormatter.success(result.companies, "Companies retrieved successfully")
            );
        } else {
            res.status(404).json(ResponseFormatter.error(result.msg));
        }
    }),

    // ========================================
    // OTP APIS (Unified System)
    // ========================================

    /**
     * Send OTP - Sends SAME OTP to both email and mobile
     */
    sendOTP: asyncHandler(async (req, res) => {
        const { mobile, email } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress;

        if (!mobile && !email) {
            throw new BadRequestError("Email or mobile number is required");
        }

        winston.info("Send OTP request", {
            source: "pos-mgmt/installation.controller.js",
            function: "sendOTP",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            email: email || "not provided",
            mobile: mobile || "not provided",
            ip: ipAddress,
        });

        const result = await installationModel.sendOTP(email, mobile, "activation", ipAddress);

        if (result.success) {
            res.status(200).json(ResponseFormatter.success(result.data, result.msg));
        } else {
            res.status(400).json(ResponseFormatter.error(result.msg || "Failed to send OTP"));
        }
    }),

    /**
     * Verify OTP - Verifies OTP from either email or mobile
     */
    verifyOTP: asyncHandler(async (req, res) => {
        const { email, mobile, otp } = req.body;

        if (!otp) {
            throw new BadRequestError("OTP is required");
        }

        if (!email && !mobile) {
            throw new BadRequestError("Email or mobile number is required");
        }

        winston.info("Verify OTP request", {
            source: "pos-mgmt/installation.controller.js",
            function: "verifyOTP",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            email: email || "not provided",
            mobile: mobile || "not provided",
            otp: otp,
        });

        const result = await installationModel.verifyOTP(email, mobile, otp, "activation");

        if (result.success) {
            res.status(200).json(ResponseFormatter.success(result.data, result.msg));
        } else {
            res.status(400).json(ResponseFormatter.error(result.msg));
        }
    }),

    // ========================================
    // NEW INSTALLATION FLOW (Step-by-Step)
    // ========================================

    /**
     * Step 1: Validate company and OTP - First API
     * Validates company, device, OTP, and returns plan data
     */
    validateCompanyAndOTP: asyncHandler(async (req, res) => {
        const { phone, email, productKey, deviceId, otp, countryId } = req.body;

        if (!phone || !email || !productKey || !deviceId || !otp) {
            throw new BadRequestError("Phone, Email, Product Key, Device ID and OTP are required");
        }

        // Extract IP address from request
        const ipAddress =
            req.ip ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
            req.headers["x-forwarded-for"]?.split(",")[0] ||
            req.headers["x-real-ip"] ||
            "127.0.0.1";

        const result = await installationModel.validateCompanyAndOTP(
            phone,
            email,
            productKey,
            deviceId,
            otp,
            countryId || 101,
            ipAddress
        );

        if (result.success) {
            winston.info("Company validation and OTP verification successful", {
                source: "pos-mgmt/installation.controller.js",
                function: "validateCompanyAndOTP",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                phone,
                email,
                productKey,
            });
            res.status(200).json(ResponseFormatter.success(result.data, result.msg));
        } else {
            res.status(400).json(ResponseFormatter.error(result.msg));
        }
    }),

    /**
     * Step 2: Register user and activate serial - Second API
     * Creates user and activates serial key
     */
    registerUserAndActivateSerial: asyncHandler(async (req, res) => {
        const { companyId, productKey, deviceId, username, pinNumber } = req.body;

        if (!companyId || !productKey || !deviceId || !username || !pinNumber) {
            throw new BadRequestError(
                "Company ID, Product Key, Device ID, Username and PIN Number are required"
            );
        }

        // Extract IP address from request
        const ipAddress =
            req.ip ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
            req.headers["x-forwarded-for"]?.split(",")[0] ||
            req.headers["x-real-ip"] ||
            "127.0.0.1";

        const result = await installationModel.registerUserAndActivateSerial(
            companyId,
            productKey,
            deviceId,
            username,
            pinNumber,
            ipAddress
        );

        if (result.success) {
            winston.info("User registered and serial activated successfully", {
                source: "pos-mgmt/installation.controller.js",
                function: "registerUserAndActivateSerial",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                companyId,
                productKey,
                username,
            });
            res.status(200).json(ResponseFormatter.success(result.data, result.msg));
        } else {
            res.status(400).json(ResponseFormatter.error(result.msg));
        }
    }),

    /**
     * Step 3: Confirm activation
     * Uses step 3 token (validates step 2 was completed)
     * Generates POS token for the activated company (before location creation)
     */
    confirmActivation: asyncHandler(async (req, res) => {
        const { productKey } = req.body;

        // Get installation token data from middleware (set by verifyStep3Token)
        const installation = req.installation;

        if (!productKey) {
            throw new BadRequestError("Product key is required");
        }

        // Verify product key matches token
        if (installation && installation.productKey !== productKey) {
            throw new BadRequestError("Product key mismatch with installation token");
        }

        winston.info("Confirming activation", {
            source: "pos-mgmt/installation.controller.js",
            function: "confirmActivation",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            productKey,
            companyId: installation?.companyId,
            deviceId: installation?.deviceId,
        });

        const result = await installationModel.confirmActivation({ productKey });

        if (result.success) {
            winston.info("Activation confirmed successfully", {
                source: "pos-mgmt/installation.controller.js",
                function: "confirmActivation",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                productKey,
            });

            // Get company data for POS token generation (location doesn't exist yet)
            const companyResult = await installationModel.getCompanyByProductKey(productKey);

            let responseData = {
                deviceId: result.deviceId,
                activated: result.activated,
            };

            if (companyResult.success && companyResult.data) {
                const companyData = companyResult.data;

                try {
                    // Generate company-level POS token
                    const posToken = await generatePOSToken({
                        companyname: companyData.companyname,
                        serialId: companyData.serial_id,
                        productKey: productKey,
                        companyId: companyData.companyid,
                        hardware_profile: companyData.hardware_id,
                        is_active: companyData.is_active,
                        activation_count: companyData.activation_count,
                    });
                    responseData.posToken = posToken;
                    responseData.companyData = {
                        companyId: companyData.companyid,
                        companyName: companyData.companyname,
                        serialId: companyData.serial_id,
                    };

                    winston.info(
                        "Company-level POS token generated after activation confirmation",
                        {
                            source: "pos-mgmt/installation.controller.js",
                            function: "confirmActivation",
                            endpoint: req.path,
                            method: req.method,
                            userId: req.user?.id,
                            productKey,
                            companyId: companyData.companyid,
                            companyName: companyData.companyname,
                        }
                    );
                } catch (tokenError) {
                    winston.error(`Message: ${tokenError.message}`, {
                        source: "installation.controller.js",
                        function: "confirmActivation",
                        productKey: productKey,
                        error: tokenError.message,
                        code: tokenError.code,
                        errno: tokenError.errno,
                        stack: tokenError.stack
                    });
                    // Continue without token - not critical for confirmation
                }
            } else {
                winston.warn("Company data not found for token generation", {
                    source: "installation.controller.js",
                    function: "confirmActivation",
                    endpoint: req.path,
                    method: req.method,
                    productKey
                });
            }

            res.status(200).json(ResponseFormatter.success(responseData, result.msg));
        } else {
            res.status(400).json(ResponseFormatter.error(result.msg));
        }
    }),

    /**
     * Step 4: Create or Update location for company
     * Works with OPTIONAL POS token
     * Determines registration vs existing flow based on location count
     * - No location exists: Registration flow (creates location + updates plan expiry)
     * - Location exists: Logged-in flow (creates/updates location, no plan update)
     */
    createLocationForCompany: asyncHandler(async (req, res) => {
        const {
            companyId,
            locationId, // Optional - present only for UPDATE
            locationName,
            gstNumber,
            panNumber,
            gstNotRegistered,
            licenseType,
            seedLicenseNumber,
            seedLicenseDate,
            fertilizerLicenseNumber,
            fertilizerLicenseDate,
            pesticidesLicenseNumber,
            pesticidesLicenseDate,
            contactNumber,
            email,
            address,
            countryId,
            stateId,
            cityId,
            areaCode,
            deviceId,
            ipAddress,
        } = req.body;

        winston.info(`createLocationForCompany controller called`, {
            source: "pos-mgmt/installation.controller.js",
            function: "createLocationForCompany",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            companyId,
            locationId,
            hasPos: !!req.pos,
            posLocationId: req.pos?.locationId,
        });

        if (!companyId || !locationName || !contactNumber) {
            throw new BadRequestError("Company ID, Location Name and Contact Number are required");
        }

        const input = {
            companyId,
            locationId, // Include locationId (optional)
            locationName,
            gstNumber,
            panNumber,
            gstNotRegistered,
            licenseType,
            seedLicenseNumber,
            seedLicenseDate,
            fertilizerLicenseNumber,
            fertilizerLicenseDate,
            pesticidesLicenseNumber,
            pesticidesLicenseDate,
            contactNumber,
            email,
            address,
            countryId,
            stateId,
            cityId,
            areaCode,
            deviceId,
            ipaddress: ipAddress || req.ip || req.connection?.remoteAddress,
        };

        // Model will determine if registration or existing flow based on location count
        const result = await installationModel.createLocationForCompany(input);

        if (result.success) {
            const action = locationId ? "updated" : "created";
            winston.info(`Location ${action} successfully`, {
                source: "pos-mgmt/installation.controller.js",
                function: "createLocationForCompany",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                companyId,
                locationName,
                locationId,
            });

            res.status(200).json(
                ResponseFormatter.success(
                    {
                        locationdata: result.locationdata,
                        dbscript: result.dbscript,
                        planUpdate: result.planUpdate,
                    },
                    result.msg
                )
            );
        } else {
            res.status(400).json(ResponseFormatter.error(result.msg));
        }
    }),

    // ========================================
    // INFORMATION & UTILITY APIS
    // ========================================

    /**
     * Get customers by product key
     */
    getCustomers: asyncHandler(async (req, res) => {
        const { productKey } = req.params;

        if (!productKey) {
            throw new BadRequestError("Product key is required");
        }

        const result = await installationModel.getCustomers(productKey);

        if (result.success) {
            res.status(200).json(
                ResponseFormatter.success(result.data, "Customer data retrieved successfully")
            );
        } else {
            res.status(404).json(ResponseFormatter.error(result.msg));
        }
    }),

    /**
     * Get installation status/info
     */
    getInstallationInfo: asyncHandler(async (req, res) => {
        const { productKey } = req.params;

        if (!productKey) {
            throw new BadRequestError("Product key is required");
        }

        // Get customer data which includes installation info
        const result = await installationModel.getCustomers(productKey);

        if (result.success) {
            res.status(200).json(
                ResponseFormatter.success(result.data, "Installation info retrieved successfully")
            );
        } else {
            res.status(404).json(ResponseFormatter.error(result.msg));
        }
    }),

    /**
     * Get database script
     */
    getDbScript: asyncHandler(async (req, res) => {
        const script = installationModel.getDbScript();

        if (script) {
            res.status(200).json(
                ResponseFormatter.success({ script }, "Database script retrieved successfully")
            );
        } else {
            res.status(404).json(ResponseFormatter.error("Database script not found"));
        }
    }),

    // ========================================
    // TOKEN MANAGEMENT
    // ========================================

    /**
     * Refresh POS token
     */
    refreshToken: asyncHandler(async (req, res) => {
        const { productKey, currentToken } = req.body;

        if (!productKey) {
            throw new BadRequestError("Product key is required");
        }

        if (!currentToken) {
            throw new BadRequestError("Current token is required");
        }

        // Verify the current token is valid (even if expired)
        if (currentToken) {
            try {
                // Decode without verification to get payload
                const decoded = jwt.decode(currentToken);

                if (!decoded || decoded.type !== "pos" || decoded.productKey !== productKey) {
                    throw new BadRequestError("Invalid token or product key mismatch");
                }
            } catch (error) {
                winston.error(`Message: ${error.message}`, {
                    source: "installation.controller.js",
                    function: "refreshToken",
                    productKey: productKey,
                    error: error.message,
                    code: error.code,
                    errno: error.errno,
                    stack: error.stack
                });
                throw new BadRequestError("Invalid current token");
            }
        }

        // Get location data for the product key
        const companyResult = await installationModel.getCompanyByProductKey(productKey);

        if (!companyResult.success || !companyResult.data) {
            throw new NotFoundError("Product key not found or inactive");
        }

        // Check if the location is active

        try {
            // Generate new token
            const posToken = await generatePOSToken({
                ...companyResult.data,
                productKey: productKey,
            });

            winston.info("POS token refreshed successfully", {
                source: "pos-mgmt/installation.controller.js",
                function: "refreshToken",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                productKey,
            });

            res.status(200).json(
                ResponseFormatter.success(
                    {
                        posToken: posToken,
                        comapnyData: {
                            companyName: companyResult.data.companyname,
                            companyId: companyResult.data.companyid,
                            serialId: companyResult.data.serialid,
                        },
                    },
                    "Token refreshed successfully"
                )
            );
        } catch (tokenError) {
            winston.error(`Message: ${tokenError.message}`, {
                source: "installation.controller.js",
                function: "refreshToken",
                productKey: productKey,
                error: tokenError.message,
                code: tokenError.code,
                errno: tokenError.errno,
                stack: tokenError.stack
            });
            throw new BadRequestError("Failed to generate new token");
        }
    }),

    // ========================================
    // TESTING & DEVELOPMENT
    // ========================================

    /**
     * Test mail functionality
     */
    testMail: asyncHandler(async (req, res) => {
        const testData = {
            locationdata: [
                {
                    location_name: "Alpha Traders",
                    contact_number: "+91-9876543210",
                    email: "contact@alphatraders.com",
                    cityname: "Mumbai",
                    statename: "Maharashtra",
                    ip_address: "192.168.1.100",
                    activation_count: "3",
                    supplier_name: "Techno Distributors",
                },
            ],
        };

        const productKey = "TPOS-ALPHA-1234";
        const activationDate = moment().format("DD-MMM-YYYY HH:mm:ss");
        const isReactivation = true;

        const result = await installationModel.sendPOSActivationEmail(
            testData,
            productKey,
            activationDate,
            isReactivation
        );

        if (result.success) {
            res.status(200).json(ResponseFormatter.success(null, result.msg));
        } else {
            res.status(500).json(ResponseFormatter.error(result.msg));
        }
    }),

    /**
     * DEVELOPMENT ONLY: Reset activation for testing
     */
    resetActivation: asyncHandler(async (req, res) => {
        const { productKey } = req.body;

        if (!productKey) {
            throw new BadRequestError("Product key is required");
        }

        winston.warn(`🔧 DEV RESET API called for product key: ${productKey}`, {
            source: "pos-mgmt/installation.controller.js",
            function: "resetActivation",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
        });

        const result = await installationModel.resetActivation(productKey);

        if (result.success) {
            res.status(200).json(ResponseFormatter.success(result.data, result.msg));
        } else {
            res.status(400).json(ResponseFormatter.error(result.msg));
        }
    }),
};
