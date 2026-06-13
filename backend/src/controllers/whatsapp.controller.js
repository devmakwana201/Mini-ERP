const whatsAppService = require('../services/whatsapp.service');
const ResponseFormatter = require('../utils/responseFormatter');
const { asyncHandler } = require('../utils/asyncHandler');
const { BadRequestError } = require('../utils/customErrors');
const winston = require('../config/winston');

module.exports = {
    /**
     * Get WhatsApp service status
     */
    getStatus: asyncHandler(async (req, res) => {
        const status = whatsAppService.getStatus();
        res.status(200).json(ResponseFormatter.success(status, 'WhatsApp service status retrieved'));
    }),

    /**
     * Test connection to external WhatsApp service
     */
    testConnection: asyncHandler(async (req, res) => {
        const connectionResult = await whatsAppService.testConnection();
        
        if (connectionResult.connected) {
            res.status(200).json(ResponseFormatter.success(connectionResult, 'Connection test successful'));
        } else {
            res.status(400).json(ResponseFormatter.error(connectionResult.message, connectionResult));
        }
    }),

    /**
     * Send test notification
     */
    sendTestNotification: asyncHandler(async (req, res) => {
        const { phoneNumber, templateType, testData } = req.body;

        if (!phoneNumber) {
            throw new BadRequestError('Phone number is required');
        }

        if (!templateType) {
            throw new BadRequestError('Template type is required');
        }

        // Template-specific test data configurations
        // These match the exact field mappings in notificationTemplates.js
        const templateTestData = {
            orderCreated: {
                // invoice template: customerName, companyName, invoiceNumber|billno, totalAmount, grandTotal, invoiceUrl
                customerName: 'Test Customer',
                companyName: 'AgriPOS',
                invoiceNumber: 'TEST-INV-001',
                billno: 'TEST-BILL-001', // Alternative field name
                totalAmount: 500,
                grandTotal: 525,
                invoiceUrl: 'https://example.com/invoice/test-001'
            },
            paymentConfirmed: {
                // payment_cofirmation template: companyName, customerName, paymentAmount
                companyName: 'AgriPOS',
                customerName: 'Test Customer',
                paymentAmount: 525
            },
            customerRegistered: {
                // welcome_message template: customerName|locationName, companyName
                customerName: 'New Test Customer',
                locationName: 'Test Location', // Alternative field
                companyName: 'AgriPOS'
            }
        };

        // Use template-specific test data or provided testData or fallback to orderCreated
        const finalTestData = testData || templateTestData[templateType] || templateTestData.orderCreated;

        winston.info("Sending test notification", {
            source: "whatsapp.controller.js",
            function: "sendTestNotification",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            phoneNumber,
            templateType,
            testData: finalTestData
        });

        const result = await whatsAppService.sendNotification(
            phoneNumber,
            templateType,
            finalTestData
        );

        if (result.success) {
            res.status(200).json(ResponseFormatter.success({
                ...result,
                templateType: templateType,
                testDataUsed: finalTestData
            }, `Test notification sent successfully for template: ${templateType}`));
        } else {
            res.status(400).json(ResponseFormatter.error(result.message, {
                ...result,
                templateType: templateType,
                testDataUsed: finalTestData
            }));
        }
    }),

    /**
     * Send generic notification
     */
    sendGenericNotification: asyncHandler(async (req, res) => {
        const { phoneNumber, message, companyName } = req.body;

        if (!phoneNumber || !message) {
            throw new BadRequestError('Phone number and message are required');
        }

        const result = await whatsAppService.sendGenericNotification(phoneNumber, message, {
            companyName: companyName || 'AgriPOS'
        });

        if (result.success) {
            res.status(200).json(ResponseFormatter.success(result, 'Generic notification sent successfully'));
        } else {
            res.status(400).json(ResponseFormatter.error(result.message, result));
        }
    }),

    /**
     * Resend order notification
     */
    resendOrderNotification: asyncHandler(async (req, res) => {
        const { uniquekey } = req.params;
        const { phoneNumber, companyName } = req.body;

        if (!uniquekey) {
            throw new BadRequestError('Order unique key is required');
        }

        // Get order data from database
        const db = require('../config/db');

        // Get order data
        const [orders] = await db.getResults(
            'SELECT * FROM ordermaster WHERE uniquekey = ? AND isdeleted = 0',
            [uniquekey]
        );

        if (orders.length === 0) {
            throw new BadRequestError('Order not found');
        }

        const orderData = orders[0];

        // Get customer data
        let customerData = null;
        if (phoneNumber) {
            // Use provided phone number
            customerData = { phoneno: phoneNumber, name: 'Customer' };
        } else if (orderData.customerid) {
            const [customers] = await db.getResults(
                'SELECT * FROM customermaster WHERE customerid = ? AND isdeleted = 0',
                [orderData.customerid]
            );
            if (customers.length > 0) {
                customerData = customers[0];
            }
        }

        if (!customerData) {
            throw new BadRequestError('Customer data not found and no phone number provided');
        }

        // Send notification
        const config = require('../config/config');
        const result = await whatsAppService.sendOrderNotification(orderData, customerData, {
            baseUrl: config.whatsapp.frontendBaseUrl,
            companyName: companyName || config.whatsapp.companyName
        });

        if (result.success) {
            winston.info("Order notification resent successfully", {
                source: "whatsapp.controller.js",
                function: "resendOrderNotification",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                uniquekey,
                phone: customerData.phoneno
            });
            res.status(200).json(ResponseFormatter.success(result, 'Order notification sent successfully'));
        } else {
            res.status(400).json(ResponseFormatter.error(result.message, result));
        }
    }),

    /**
     * Get available notification templates
     */
    getTemplates: asyncHandler(async (req, res) => {
        const notificationTemplates = require('../helpers/notificationTemplates');
        const templates = notificationTemplates.getAvailableTypes();

        res.status(200).json(ResponseFormatter.success({ templates }, 'Available templates retrieved'));
    }),

    /**
     * Test all templates
     */
    testAllTemplates: asyncHandler(async (req, res) => {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            throw new BadRequestError('Phone number is required');
        }

        const notificationTemplates = require('../helpers/notificationTemplates');
        const templateTypes = notificationTemplates.getAvailableTypes();

        const results = [];
        const errors = [];

        winston.info("Testing all templates", {
            source: "whatsapp.controller.js",
            function: "testAllTemplates",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            phoneNumber,
            templateCount: templateTypes.length,
            templates: templateTypes
        });

        for (const templateType of templateTypes) {
            try {
                // Use the same test data logic from sendTestNotification
                // These match the exact field mappings in notificationTemplates.js
                const templateTestData = {
                    orderCreated: {
                        // invoice template: customerName, companyName, invoiceNumber|billno, totalAmount, grandTotal, invoiceUrl
                        customerName: 'Test Customer',
                        companyName: 'AgriPOS',
                        invoiceNumber: 'TEST-INV-001',
                        totalAmount: 500,
                        grandTotal: 525,
                        invoiceUrl: 'https://example.com/invoice/test-001'
                    },
                    paymentConfirmed: {
                        // payment_cofirmation template: companyName, customerName, paymentAmount
                        companyName: 'AgriPOS',
                        customerName: 'Test Customer',
                        paymentAmount: 525
                    },
                    customerRegistered: {
                        // welcome_message template: customerName|locationName, companyName
                        customerName: 'Test Customer',
                        companyName: 'AgriPOS'
                    }
                };

                const testData = templateTestData[templateType] || templateTestData.orderCreated;

                const result = await whatsAppService.sendNotification(
                    phoneNumber,
                    templateType,
                    testData
                );

                results.push({
                    templateType: templateType,
                    success: result.success,
                    messageId: result.messageId,
                    externalMessageId: result.externalMessageId,
                    message: result.message,
                    testData: testData
                });

                // Wait between template tests to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 3000));

            } catch (error) {
                winston.error(`Error testing template ${templateType}: ${error.message}`, {
                    source: "whatsapp.controller.js",
                    function: "testAllTemplates",
                    endpoint: req.path,
                    method: req.method,
                    userId: req.user?.id,
                    phoneNumber,
                    templateType,
                    error: error.message,
                    stack: error.stack
                });

                errors.push({
                    templateType: templateType,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;

        winston.info("Template testing completed", {
            source: "whatsapp.controller.js",
            function: "testAllTemplates",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            phoneNumber,
            totalTemplates: templateTypes.length,
            successful: successCount,
            failed: failureCount + errors.length
        });

        res.status(200).json(ResponseFormatter.success({
            phoneNumber: phoneNumber,
            totalTemplates: templateTypes.length,
            successful: successCount,
            failed: failureCount + errors.length,
            results: results,
            errors: errors,
            summary: {
                successRate: `${Math.round((successCount / templateTypes.length) * 100)}%`,
                recommendation: successCount === templateTypes.length
                    ? 'All templates are working correctly!'
                    : 'Some templates failed - check WhatsApp Business Manager for template approval status'
            }
        }, `Template testing completed: ${successCount}/${templateTypes.length} successful`));
    })
};