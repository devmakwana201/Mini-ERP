const axios = require('axios');
const winston = require('../config/winston');
const config = require('../config/config');
const urlHelper = require('../helpers/urlHelper');
const notificationTemplates = require('../helpers/notificationTemplates');

/**
 * WhatsApp Notification Service
 * Handles sending notifications via WhatsApp API
 */
class WhatsAppService {
    constructor() {
        this.baseUrl = config.whatsapp.apiUrl;
        this.enabled = config.whatsapp.enabled;
        this.maxRetries = config.whatsapp.maxRetries;
        this.timeout = config.whatsapp.timeout;
        this.connectionTimeout = config.whatsapp.connectionTimeout;
        
        // Log configuration on startup
        winston.info('WhatsApp Service Configuration', {
            source: "whatsapp.service.js",
            function: "constructor",
            enabled: this.enabled,
            baseUrl: this.baseUrl,
            maxRetries: this.maxRetries,
            timeout: this.timeout,
            connectionTimeout: this.connectionTimeout
        });
        
        // Default configuration for external service
        this.defaultConfig = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'AgriPOS-Server/1.0'
            },
            timeout: this.connectionTimeout, // Use connection timeout instead of general timeout
            validateStatus: function (status) {
                // Accept any status code less than 500 (don't reject on 4xx errors)
                return status < 500;
            }
        };
    }

    /**
     * Check if WhatsApp service is enabled
     * @returns {boolean}
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Test connection to external WhatsApp service
     * @returns {Promise<object>} - Connection test result
     */
    async testConnection() {
        try {
            if (!this.isEnabled()) {
                return { 
                    success: false, 
                    message: 'WhatsApp service is disabled',
                    connected: false 
                };
            }

            winston.info('Testing connection to WhatsApp service', {
                source: "whatsapp.service.js",
                function: "testConnection",
                baseUrl: this.baseUrl,
                timeout: this.connectionTimeout
            });

            // Try a simple connection test with minimal timeout
            const testConfig = {
                ...this.defaultConfig,
                timeout: 5000 // 5 second timeout for connection test
            };

            const testPayload = {
                to: "test",
                type: "connection_test",
                content: { test: true }
            };

            const response = await axios.post(this.baseUrl, testPayload, testConfig);

            // Handle new queue service response format
            const responseData = response.data || {};
            const isServiceUp = response.status === 200; // Service is accessible

            winston.info('WhatsApp service connection test response', {
                source: "whatsapp.service.js",
                function: "testConnection",
                status: response.status,
                statusText: response.statusText,
                connected: isServiceUp,
                serviceResponse: responseData
            });

            return {
                success: isServiceUp,
                message: isServiceUp ? 'Connection successful' : 'Service not accessible',
                connected: isServiceUp,
                status: response.status,
                statusText: response.statusText,
                serviceResponse: responseData
            };

        } catch (error) {
            winston.error(`WhatsApp service connection test failed: ${error.message}`, {
                source: "whatsapp.service.js",
                function: "testConnection",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                baseUrl: this.baseUrl,
                connected: false
            });

            return {
                success: false,
                message: `Connection failed: ${error.message}`,
                connected: false,
                error: {
                    message: error.message,
                    code: error.code,
                    status: error.response?.status
                }
            };
        }
    }

    /**
     * Retry mechanism for external API calls
     * @param {function} apiCall - The API call function
     * @param {number} retries - Number of retries remaining
     * @param {number} delay - Delay between retries in ms
     * @returns {Promise} - API response
     */
    async retryApiCall(apiCall, retries = this.maxRetries, delay = config.whatsapp.retryDelay || 1000) {
        try {
            return await apiCall();
        } catch (error) {
            if (retries > 0 && this.shouldRetry(error)) {
                winston.warn(`WhatsApp API call failed, retrying in ${delay}ms. Retries left: ${retries}`, {
                    source: "whatsapp.service.js",
                    function: "retryApiCall",
                    error: error.message,
                    status: error.response?.status,
                    delay: delay,
                    retriesLeft: retries
                });
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.retryApiCall(apiCall, retries - 1, delay * 1.5); // Exponential backoff
            }
            throw error;
        }
    }

    /**
     * Determine if error should trigger a retry
     * @param {object} error - Error object
     * @returns {boolean} - Should retry
     */
    shouldRetry(error) {
        // Retry on network errors, timeouts, and 5xx server errors
        if (error.code === 'ECONNREFUSED' || 
            error.code === 'ETIMEDOUT' || 
            error.code === 'ENOTFOUND' || 
            error.code === 'ECONNRESET' ||
            error.code === 'EHOSTUNREACH') {
            
            winston.warn('Network error detected, will retry', {
                source: "whatsapp.service.js",
                function: "shouldRetry",
                code: error.code,
                message: error.message,
                baseUrl: this.baseUrl
            });
            
            return true;
        }
        
        if (error.response && error.response.status >= 500) {
            winston.warn('Server error detected, will retry', {
                source: "whatsapp.service.js",
                function: "shouldRetry",
                status: error.response.status,
                statusText: error.response.statusText,
                baseUrl: this.baseUrl
            });
            return true;
        }
        
        winston.info('Error will not trigger retry', {
            source: "whatsapp.service.js",
            function: "shouldRetry",
            code: error.code,
            status: error.response?.status,
            message: error.message
        });
        
        return false;
    }

    /**
     * Format phone number for WhatsApp
     * @param {string} phoneNumber - Phone number to format
     * @returns {string} - Formatted phone number
     */
    formatPhoneNumber(phoneNumber) {
        if (!phoneNumber) return null;
        
        // Remove all non-digit characters (including + sign)
        let cleaned = phoneNumber.replace(/\D/g, '');
        
        // Handle different input formats:
        // +919558535656 -> 919558535656 (remove +, already has country code)
        // 919558535656 -> 919558535656 (already formatted)
        // 9558535656 -> 919558535656 (add country code)
        
        if (cleaned.length === 10) {
            // 10 digits: add India country code +91
            cleaned = '91' + cleaned;
        } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
            // 12 digits starting with 91: already has country code, keep as is
            // This handles +919558535656 -> 919558535656
            return cleaned;
        } else if (cleaned.length === 13 && cleaned.startsWith('091')) {
            // Edge case: +0919558535656 -> 919558535656 (remove leading 0)
            cleaned = cleaned.substring(1);
        }
        
        return cleaned;
    }

    /**
     * Send WhatsApp notification to external service
     * @param {string} phoneNumber - Recipient phone number
     * @param {string} templateType - Template type (orderCreated, paymentConfirmed, etc.)
     * @param {object} data - Data to fill template
     * @param {object} options - Additional options
     * @returns {Promise<object>} - Send result
     */
    async sendNotification(phoneNumber, templateType, data = {}, options = {}) {
        try {
            if (!this.isEnabled()) {
                winston.info('WhatsApp service is disabled, skipping notification', {
                    source: "whatsapp.service.js",
                    function: "sendNotification"
                });
                return { success: false, message: 'WhatsApp service disabled' };
            }

            const formattedPhone = this.formatPhoneNumber(phoneNumber);
            if (!formattedPhone) {
                throw new Error('Invalid phone number provided');
            }

            // Get template content
            const templateContent = notificationTemplates.getTemplate(templateType, data);

            // Prepare request payload for external WhatsApp service
            const payload = {
                to: formattedPhone,
                type: 'template',
                content: templateContent,
                maxRetries: options.maxRetries || this.maxRetries
            };

            winston.info('Sending WhatsApp notification to external queue service', {
                source: "whatsapp.service.js",
                function: "sendNotification",
                phone: formattedPhone,
                templateType: templateType,
                templateName: templateContent.templateName,
                apiUrl: this.baseUrl,
                payload: {
                    to: payload.to,
                    type: payload.type,
                    templateName: templateContent.templateName
                }
            });

            // Send request to external WhatsApp service with retry mechanism
            const apiCall = () => axios.post(this.baseUrl, payload, this.defaultConfig);
            const response = await this.retryApiCall(apiCall);

            // Handle response from external service (new queue service format)
            if (response.status === 200 && response.data) {
                // New queue service returns: { success: true/false, message: string, data: {...}, timestamp: string }
                const responseData = response.data;
                const isSuccess = responseData.success === true;

                if (isSuccess) {
                    // Extract message details from nested data object
                    const messageData = responseData.data || {};
                    const messageId = messageData.messageId || 'unknown';

                    winston.info('WhatsApp notification queued successfully via external service', {
                        source: "whatsapp.service.js",
                        function: "sendNotification",
                        phone: formattedPhone,
                        templateType: templateType,
                        messageId: messageId,
                        status: messageData.status || 'queued',
                        externalResponse: responseData
                    });

                    return {
                        success: true,
                        message: responseData.message || 'Notification queued successfully',
                        messageId: messageId,
                        status: messageData.status || 'queued',
                        externalResponse: responseData,
                        data: messageData
                    };
                } else {
                    // Handle error response format: { success: false, message: string, statusCode: number, errors: array }
                    const errorMessage = responseData.message || 'External service returned error';
                    const errors = responseData.errors || [];

                    winston.warn('WhatsApp service returned error response', {
                        source: "whatsapp.service.js",
                        function: "sendNotification",
                        phone: formattedPhone,
                        templateType: templateType,
                        errorMessage: errorMessage,
                        statusCode: responseData.statusCode,
                        errors: errors,
                        externalResponse: responseData
                    });

                    throw new Error(errorMessage);
                }
            } else {
                throw new Error(`External service returned status: ${response.status}`);
            }

        } catch (error) {
            // Enhanced error handling for new queue service format
            let errorMessage = error.message || 'Failed to send notification to external service';
            let errorDetails = {
                message: error.message,
                status: error.response?.status,
                url: this.baseUrl
            };

            // If the error response has the new queue service format
            if (error.response?.data && typeof error.response.data === 'object') {
                const errorResponse = error.response.data;

                if (errorResponse.success === false) {
                    errorMessage = errorResponse.message || errorMessage;
                    errorDetails.errors = errorResponse.errors;
                    errorDetails.statusCode = errorResponse.statusCode;
                }

                errorDetails.data = errorResponse;
            } else {
                errorDetails.data = error.response?.data;
            }

            winston.error(`Failed to send WhatsApp notification via external service: ${error.message}`, {
                source: "whatsapp.service.js",
                function: "sendNotification",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                phone: phoneNumber,
                templateType: templateType,
                apiUrl: this.baseUrl,
                responseStatus: error.response?.status,
                responseData: errorDetails.data
            });

            return {
                success: false,
                message: errorMessage,
                error: errorDetails
            };
        }
    }

    /**
     * Send order creation notification
     * @param {object} orderData - Order data
     * @param {object} customerData - Customer data
     * @param {object} options - Additional options
     * @returns {Promise<object>} - Send result
     */
    async sendOrderNotification(orderData, customerData, options = {}) {
        try {
            if (!customerData?.phoneno && !customerData?.companycontactnumber) {
                winston.warn('No phone number found for order notification', {
                    source: "whatsapp.service.js",
                    function: "sendOrderNotification",
                    orderId: orderData.orderid,
                    uniquekey: orderData.uniquekey
                });
                return { success: false, message: 'No phone number available' };
            }

            const phoneNumber = customerData.phoneno || customerData.companycontactnumber;
            
            // Prepare invoice URL if base URL is provided
            let invoiceUrl = '';
            if (options.baseUrl && orderData.uniquekey) {
                const fullUrl = urlHelper.buildInvoiceUrl(options.baseUrl, orderData.uniquekey);
                invoiceUrl = await urlHelper.createShortUrl(fullUrl);
            }

            const templateData = {
                customerName: customerData.name || customerData.locationname || 'Valued Customer',
                companyName: options.companyName || 'AgriPOS',
                invoiceNumber: orderData.billno,
                totalAmount: orderData.amount,
                grandTotal: orderData.grandtotal,
                invoiceUrl: invoiceUrl
            };

            return await this.sendNotification(phoneNumber, 'orderCreated', templateData, options);

        } catch (error) {
            winston.error(`Failed to send order notification: ${error.message}`, {
                source: "whatsapp.service.js",
                function: "sendOrderNotification",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                orderId: orderData.orderid
            });
            return { success: false, message: error.message };
        }
    }

    /**
     * Send payment confirmation notification
     * @param {object} paymentData - Payment data
     * @param {object} customerData - Customer data
     * @param {object} orderData - Order data
     * @param {object} options - Additional options
     * @returns {Promise<object>} - Send result
     */
    async sendPaymentNotification(paymentData, customerData, orderData, options = {}) {
        try {
            if (!customerData?.phoneno && !customerData?.companycontactnumber) {
                winston.warn('No phone number found for payment notification', {
                    source: "whatsapp.service.js",
                    function: "sendPaymentNotification",
                    paymentId: paymentData.paymentid
                });
                return { success: false, message: 'No phone number available' };
            }

            const phoneNumber = customerData.phoneno || customerData.companycontactnumber;

            const templateData = {
                companyName: options.companyName || 'AgriPOS',
                customerName: customerData.name || customerData.locationname || 'Valued Customer',
                paymentAmount: paymentData.paymentamount
            };

            return await this.sendNotification(phoneNumber, 'paymentConfirmed', templateData, options);

        } catch (error) {
            winston.error(`Failed to send payment notification: ${error.message}`, {
                source: "whatsapp.service.js",
                function: "sendPaymentNotification",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                paymentId: paymentData.paymentid
            });
            return { success: false, message: error.message };
        }
    }

    /**
     * Send customer registration notification
     * @param {object} customerData - Customer data
     * @param {object} options - Additional options
     * @returns {Promise<object>} - Send result
     */
    async sendCustomerRegistrationNotification(customerData, options = {}) {
        try {
            if (!customerData?.phoneno) {
                winston.warn('No phone number found for customer registration notification', {
                    source: "whatsapp.service.js",
                    function: "sendCustomerRegistrationNotification",
                    customerId: customerData.customerid
                });
                return { success: false, message: 'No phone number available' };
            }

            const templateData = {
                customerName: customerData.name || 'Valued Customer',
                companyName: options.companyName || 'AgriPOS',
                customerCode: customerData.custmoercode,
                contactNumber: customerData.phoneno
            };

            return await this.sendNotification(customerData.phoneno, 'customerRegistered', templateData, options);

        } catch (error) {
            winston.error(`Failed to send customer registration notification: ${error.message}`, {
                source: "whatsapp.service.js",
                function: "sendCustomerRegistrationNotification",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                customerId: customerData.customerid
            });
            return { success: false, message: error.message };
        }
    }

    /**
     * Send generic notification
     * @param {string} phoneNumber - Phone number
     * @param {string} message - Message to send
     * @param {object} options - Additional options
     * @returns {Promise<object>} - Send result
     */
    async sendGenericNotification(phoneNumber, message, options = {}) {
        try {
            const templateData = {
                message: message,
                companyName: options.companyName || 'AgriPOS'
            };

            return await this.sendNotification(phoneNumber, 'generic', templateData, options);

        } catch (error) {
            winston.error(`Failed to send generic notification: ${error.message}`, {
                source: "whatsapp.service.js",
                function: "sendGenericNotification",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                phone: phoneNumber
            });
            return { success: false, message: error.message };
        }
    }

    /**
     * Get service status
     * @returns {object} - Service status information
     */
    getStatus() {
        return {
            enabled: this.enabled,
            baseUrl: this.baseUrl,
            maxRetries: this.maxRetries,
            timeout: this.timeout,
            connectionTimeout: this.connectionTimeout,
            availableTemplates: notificationTemplates.getAvailableTypes(),
            note: 'Use /test-connection endpoint to verify external service connectivity'
        };
    }
}

// Create singleton instance
const whatsAppService = new WhatsAppService();

module.exports = whatsAppService;