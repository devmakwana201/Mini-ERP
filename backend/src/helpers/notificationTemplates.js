/**
 * WhatsApp Notification Templates
 * Define all notification templates for different events
 */

const notificationTemplates = {
    /**
     * Order Creation Template
     */
    orderCreated: {
        templateName: 'invoice_farmer',
        languageCode: 'en',
        getParameters: (data) => [
            {
                type: 'text',
                text: data.customerName || 'Valued Customer'
            },
            {
                type: 'text',
                text: data.companyName || 'AgriPOS'
            },
            {
                type: 'text',
                text: data.invoiceNumber || data.billno || 'N/A'
            },
            {
                type: 'text',
                text: data.totalAmount ? data.totalAmount.toString() : '0'
            },
            {
                type: 'text',
                text: data.grandTotal ? data.grandTotal.toString() : '0'
            },
            {
                type: 'text',
                text: data.invoiceUrl || ''
            }
        ]
    },

    /**
     * Payment Confirmation Template
     */
    paymentConfirmed: {
        templateName: 'payment_cofirmation_farmer',
        languageCode: 'en',
        getParameters: (data) => [
            {
                type: 'text',
                text: data.companyName || 'AgriPOS'
            },
            {
                type: 'text',
                text: data.customerName || 'Valued Customer'
            },
            {
                type: 'text',
                text: data.paymentAmount ? data.paymentAmount.toString() : '0'
            }
        ]
    },

    /**
     * Customer Registration Template
     */
    customerRegistered: {
        templateName: 'welcome_farmer',
        languageCode: 'en',
        getParameters: (data) => [
            {
                type: 'text',
                text: data.customerName || data.locationName || 'Valued Customer'
            },
            {
                type: 'text',
                text: data.companyName || 'AgriPOS'
            }
        ]
    },

    /**
     * OTP Verification Template
     * Template: agro_otp
     * Has 2 components:
     * 1. Body parameter: {{1}} = OTP code
     * 2. Button URL parameter: {{1}} = OTP code
     */
    otpVerification: {
        templateName: 'agro_otp',
        languageCode: 'en',
        getParameters: (data) => [
            {
                type: 'text',
                text: String(data.otp || '000000')
            }
        ],
        // Special handling for agro_otp template with button
        hasButton: true,
        getComponents: (data) => {
            const otpText = String(data.otp || '000000');
            return [
                {
                    type: 'body',
                    parameters: [
                        {
                            type: 'text',
                            text: otpText
                        }
                    ]
                },
                {
                    type: 'button',
                    sub_type: 'url',
                    index: '0',
                    parameters: [
                        {
                            type: 'text',
                            text: otpText
                        }
                    ]
                }
            ]
        }
    },

    /**
     * Get template by type
     * @param {string} type - Template type (orderCreated, paymentConfirmed, etc.)
     * @param {object} data - Data to fill template parameters
     * @returns {object} - Template object with filled parameters
     */
    getTemplate: (type, data = {}) => {
        const template = notificationTemplates[type];
        if (!template) {
            throw new Error(`Template type '${type}' not found`);
        }

        // Check if template has custom components (like OTP with button)
        if (template.getComponents) {
            return {
                templateName: template.templateName,
                languageCode: template.languageCode,
                components: template.getComponents(data)
            };
        }

        // Default: only body component
        return {
            templateName: template.templateName,
            languageCode: template.languageCode,
            components: [
                {
                    type: 'body',
                    parameters: template.getParameters(data)
                }
            ]
        };
    },

    /**
     * Get available template types
     * @returns {array} - Array of available template types
     */
    getAvailableTypes: () => {
        return Object.keys(notificationTemplates).filter(key => 
            typeof notificationTemplates[key] === 'object' && 
            notificationTemplates[key].templateName
        );
    }
};

module.exports = notificationTemplates;