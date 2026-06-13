const customerModel = require("../../models/pos-mgmt/customer.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError, NotFoundError } = require("../../utils/customErrors");
const winston = require("../../config/winston");
const whatsAppService = require("../../services/whatsapp.service");

/**
 * Send welcome notification to new customers
 * @param {Array} customers - Array of customer objects
 * @param {Object} options - Additional options like company name
 */
const sendCustomerWelcomeNotifications = async (customers, options = {}) => {
    if (!whatsAppService.isEnabled()) {
        winston.info("WhatsApp service disabled, skipping customer welcome notifications", {
            source: "pos-mgmt/customer.controller.js",
            function: "sendCustomerWelcomeNotifications",
        });
        return;
    }

    for (const customer of customers) {
        try {
            // Check if customer has phone number
            if (!customer.phoneno) {
                winston.debug("No phone number found for customer, skipping welcome notification", {
                    source: "pos-mgmt/customer.controller.js",
                    function: "sendCustomerWelcomeNotifications",
                    customerId: customer.customerid,
                    customerName: customer.name,
                });
                continue;
            }

            const phoneNumber = customer.phoneno;

            // Send welcome notification using posActivated template (welcome_farmer)
            const result = await whatsAppService.sendCustomerRegistrationNotification(customer, {
                companyName: options.companyName || "AgriPOS",
            });

            if (result.success) {
                winston.info("Welcome notification sent successfully", {
                    source: "pos-mgmt/customer.controller.js",
                    function: "sendCustomerWelcomeNotifications",
                    customerId: customer.customerid,
                    customerName: customer.name,
                    phone: phoneNumber,
                });
            } else {
                winston.warn("Failed to send welcome notification", {
                    source: "pos-mgmt/customer.controller.js",
                    function: "sendCustomerWelcomeNotifications",
                    customerId: customer.customerid,
                    customerName: customer.name,
                    phone: phoneNumber,
                    error: result.message,
                });
            }
        } catch (error) {
            winston.error(`Message: ${error.message}`, {
                source: "customer.controller.js",
                function: "sendCustomerWelcomeNotifications",
                customerId: customer.customerid,
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
        }
    }
};

module.exports = {
    /**
     * Save customers data from POS
     * POST /api/v1/pos/customer/save-customers
     */
    saveCustomers: asyncHandler(async (req, res) => {
        const { customers } = req.body;

        if (!customers || !Array.isArray(customers) || customers.length === 0) {
            throw new BadRequestError("Customers array is required and cannot be empty");
        }

        // Validate required fields for each customer
        for (let i = 0; i < customers.length; i++) {
            const customer = customers[i];
            if (!customer.customerid || !customer.companyid) {
                throw new BadRequestError(
                    `Customer at index ${i} missing required fields: customerid, companyid`
                );
            }
        }

        winston.debug(`Processing ${customers.length} customers`, {
            source: "pos-mgmt/customer.controller.js",
            function: "saveCustomers",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            locationId: req.pos?.locationId,
            productKey: req.pos?.productKey,
        });

        const result = await customerModel.saveCustomers(customers);

        if (result.success) {
            const syncedCount = result.data.filter((c) => c.issynced === 1).length;

            // Send welcome notifications for newly synced customers (async, don't wait)
            const newCustomers = result.data.filter((c) => c.issynced === 1);
            if (newCustomers.length > 0) {
                // Get company name from POS token or use default
                const companyName = req.pos?.companyName || "AgriPOS";

                // Send notifications asynchronously
                sendCustomerWelcomeNotifications(newCustomers, { companyName }).catch((error) => {
                    winston.error(`Message: ${error.message}`, {
                        source: "customer.controller.js",
                        function: "saveCustomers",
                        error: error.message,
                        code: error.code,
                        errno: error.errno,
                        stack: error.stack
                    });
                });
            }

            res.status(200).json(
                ResponseFormatter.success(
                    result.data,
                    `Successfully processed ${customers.length} customers. ${syncedCount} synced successfully.`
                )
            );
        } else {
            res.status(400).json(ResponseFormatter.error("Failed to save customers"));
        }
    }),

    /**
     * Save customer details (account details) from POS
     * POST /api/v1/pos/customer/save-customer-details
     */
    saveCustomerDetails: asyncHandler(async (req, res) => {
        const { customerDetails } = req.body;

        if (!customerDetails || !Array.isArray(customerDetails) || customerDetails.length === 0) {
            throw new BadRequestError("Customer details array is required and cannot be empty");
        }

        // Validate required fields for each customer detail
        for (let i = 0; i < customerDetails.length; i++) {
            const detail = customerDetails[i];
            if (!detail.uniquekey || !detail.customerid || !detail.locationid) {
                throw new BadRequestError(
                    `Customer detail at index ${i} missing required fields: uniquekey, customerid, locationid`
                );
            }
        }

        winston.debug(`Processing ${customerDetails.length} customer details`, {
            source: "pos-mgmt/customer.controller.js",
            function: "saveCustomerDetails",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            locationId: req.pos?.locationId,
            productKey: req.pos?.productKey,
        });

        const result = await customerModel.saveCustomerDetails(customerDetails);

        if (result.success) {
            const syncedCount = result.data.filter((c) => c.issynced === 1).length;

            res.status(200).json(
                ResponseFormatter.success(
                    result.data,
                    `Successfully processed ${customerDetails.length} customer details. ${syncedCount} synced successfully.`
                )
            );
        } else {
            res.status(400).json(ResponseFormatter.error("Failed to save customer details"));
        }
    }),

    /**
     * Get customer by ID
     * GET /api/v1/pos/customer/:customerId
     */
    getCustomerById: asyncHandler(async (req, res) => {
        const { customerId } = req.params;
        const { companyid } = req.query;

        if (!customerId) {
            throw new BadRequestError("Customer ID is required");
        }

        if (!companyid) {
            throw new BadRequestError("Company ID is required");
        }

        const customer = await customerModel.getCustomerById(customerId, companyid);

        if (!customer) {
            throw new NotFoundError("Customer not found");
        }

        res.status(200).json(
            ResponseFormatter.success(customer, "Customer retrieved successfully")
        );
    }),

    /**
     * Get customers by company
     * GET /api/v1/pos/customer/company/:companyId
     */
    getCustomersByCompany: asyncHandler(async (req, res) => {
        const { companyId } = req.params;
        const { modifieddate } = req.query;

        if (!companyId) {
            throw new BadRequestError("Company ID is required");
        }

        const customers = await customerModel.getCustomersByCompany(companyId, modifieddate);

        res.status(200).json(
            ResponseFormatter.success(
                customers,
                `Retrieved ${customers.length} customers for company ${companyId}`
            )
        );
    }),

    /**
     * Get customer account details
     * GET /api/v1/pos/customer/:customerId/account-details
     */
    getCustomerAccountDetails: asyncHandler(async (req, res) => {
        const { customerId } = req.params;
        const { locationid } = req.query;

        if (!customerId) {
            throw new BadRequestError("Customer ID is required");
        }

        if (!locationid) {
            throw new BadRequestError("Location ID is required");
        }

        const accountDetails = await customerModel.getCustomerAccountDetails(
            customerId,
            locationid
        );

        res.status(200).json(
            ResponseFormatter.success(
                accountDetails,
                `Retrieved ${accountDetails.length} account details for customer ${customerId}`
            )
        );
    }),

    /**
     * Get customer statistics for a company
     * GET /api/v1/pos/customer/stats/:companyId
     */
    getCustomerStats: asyncHandler(async (req, res) => {
        const { companyId } = req.params;

        if (!companyId) {
            throw new BadRequestError("Company ID is required");
        }

        const stats = await customerModel.getCustomerStats(companyId);

        if (!stats) {
            throw new NotFoundError("No customer statistics found for this company");
        }

        res.status(200).json(
            ResponseFormatter.success(stats, "Customer statistics retrieved successfully")
        );
    }),

    /**
     * Sync customers from POS
     * POST /api/v1/pos/customer/sync
     */
    syncCustomers: asyncHandler(async (req, res) => {
        const { customers } = req.body;

        if (!customers || !Array.isArray(customers) || customers.length === 0) {
            throw new BadRequestError("Customers array is required and cannot be empty");
        }

        // Validate required fields for each customer
        for (let i = 0; i < customers.length; i++) {
            const customer = customers[i];
            if (!customer.customerid || !customer.companyid) {
                throw new BadRequestError(
                    `Customer at index ${i} missing required fields: customerid, companyid`
                );
            }
        }

        // Log the sync request
        if (req.pos) {
            winston.debug(`Customer sync request with token`, {
                source: "pos-mgmt/customer.controller.js",
                function: "syncCustomers",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                locationId: req.pos.locationId,
                customersCount: customers.length,
                productKey: req.pos.productKey,
            });
        } else {
            winston.debug(`Customer sync request without token`, {
                source: "pos-mgmt/customer.controller.js",
                function: "syncCustomers",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                customersCount: customers.length,
                ip: req.ip,
            });
        }

        const result = await customerModel.saveCustomers(customers);

        if (result.success) {
            const syncedCount = result.data.filter((c) => c.issynced === 1).length;

            // Send welcome notifications for newly synced customers (async, don't wait)
            const newCustomers = result.data.filter((c) => c.issynced === 1 && c.isnew === 1);
            if (newCustomers.length > 0) {
                // Get company name from POS token or use default
                const companyName = req.pos?.companyName || "AgriPOS";

                // Send notifications asynchronously
                sendCustomerWelcomeNotifications(newCustomers, { companyName }).catch((error) => {
                    winston.error(`Message: ${error.message}`, {
                        source: "customer.controller.js",
                        function: "syncCustomers",
                        error: error.message,
                        code: error.code,
                        errno: error.errno,
                        stack: error.stack
                    });
                });
            }

            winston.debug(
                `Customer sync completed: ${syncedCount}/${customers.length} customers synced`, {
                    source: "pos-mgmt/customer.controller.js",
                    function: "syncCustomers",
                    endpoint: req.path,
                    method: req.method,
                    userId: req.user?.id,
                }
            );

            res.status(200).json(
                ResponseFormatter.success(
                    result.data,
                    `Successfully synced ${syncedCount}/${customers.length} customers.`
                )
            );
        } else {
            res.status(400).json(ResponseFormatter.error("Failed to sync customers"));
        }
    }),

    /**
     * Sync customer details from POS
     * POST /api/v1/pos/customer/sync-details
     */
    syncCustomerDetails: asyncHandler(async (req, res) => {
        const { customerDetails } = req.body;

        if (!customerDetails || !Array.isArray(customerDetails) || customerDetails.length === 0) {
            throw new BadRequestError("Customer details array is required and cannot be empty");
        }

        // Validate required fields for each customer detail
        for (let i = 0; i < customerDetails.length; i++) {
            const detail = customerDetails[i];
            if (!detail.uniquekey || !detail.customerid || !detail.locationid) {
                throw new BadRequestError(
                    `Customer detail at index ${i} missing required fields: uniquekey, customerid, locationid`
                );
            }
        }

        // Log the sync request
        if (req.pos) {
            winston.debug(`Customer details sync request with token`, {
                source: "pos-mgmt/customer.controller.js",
                function: "syncCustomerDetails",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                locationId: req.pos.locationId,
                customerDetailsCount: customerDetails.length,
                productKey: req.pos.productKey,
            });
        } else {
            winston.debug(`Customer details sync request without token`, {
                source: "pos-mgmt/customer.controller.js",
                function: "syncCustomerDetails",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                customerDetailsCount: customerDetails.length,
                ip: req.ip,
            });
        }

        const result = await customerModel.saveCustomerDetails(customerDetails);

        if (result.success) {
            const syncedCount = result.data.filter((c) => c.issynced === 1).length;

            winston.debug(
                `Customer details sync completed: ${syncedCount}/${customerDetails.length} details synced`, {
                    source: "pos-mgmt/customer.controller.js",
                    function: "syncCustomerDetails",
                    endpoint: req.path,
                    method: req.method,
                    userId: req.user?.id,
                }
            );

            res.status(200).json(
                ResponseFormatter.success(
                    result.data,
                    `Successfully synced ${syncedCount}/${customerDetails.length} customer details.`
                )
            );
        } else {
            res.status(400).json(ResponseFormatter.error("Failed to sync customer details"));
        }
    }),
};
