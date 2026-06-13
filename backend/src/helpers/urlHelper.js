const axios = require('axios');
const winston = require('../config/winston');

/**
 * URL Helper utilities
 */
const urlHelper = {
    /**
     * Create tiny URL using TinyURL service with enhanced error handling
     * @param {string} url - The URL to shorten
     * @returns {Promise<string>} - The shortened URL or original URL if shortening fails
     */
    async getTinyUrl(url) {
        try {
            if (!url || typeof url !== 'string') {
                winston.warn('Invalid URL provided to getTinyUrl', {
                    source: "urlHelper.js",
                    function: "getTinyUrl",
                    url: url
                });
                return url || '';
            }

            // Validate URL format first
            if (!this.isValidUrl(url)) {
                winston.warn('Invalid URL format, skipping shortening', {
                    source: "urlHelper.js",
                    function: "getTinyUrl",
                    url: url
                });
                return url;
            }

            winston.debug('Attempting to create tiny URL', {
                source: "urlHelper.js",
                function: "getTinyUrl",
                originalUrl: url
            });

            const response = await axios.get(`http://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, {
                timeout: 3000, // Reduced timeout for faster fallback
                headers: {
                    'User-Agent': 'AgriPOS-Server/1.0'
                },
                validateStatus: function (status) {
                    return status < 500; // Don't throw on 4xx errors
                }
            });

            // Check response status
            if (response.status === 503) {
                winston.warn('TinyURL service unavailable (503), using original URL', {
                    source: "urlHelper.js",
                    function: "getTinyUrl",
                    originalUrl: url,
                    statusCode: 503
                });
                return url;
            }

            if (response.status !== 200) {
                winston.warn('TinyURL service returned non-200 status, using original URL', {
                    source: "urlHelper.js",
                    function: "getTinyUrl",
                    status: response.status,
                    originalUrl: url
                });
                return url;
            }

            if (response.data && response.data !== 'Error' && response.data.startsWith('http')) {
                winston.debug('Successfully created tiny URL', {
                    source: "urlHelper.js",
                    function: "getTinyUrl",
                    originalUrl: url,
                    tinyUrl: response.data
                });
                return response.data;
            } else {
                winston.warn('TinyURL service returned invalid response, using original URL', {
                    source: "urlHelper.js",
                    function: "getTinyUrl",
                    response: response.data,
                    originalUrl: url
                });
                return url;
            }
        } catch (error) {
            // Enhanced error logging
            winston.error(`Failed to create tiny URL: ${error.message}`, {
                source: "urlHelper.js",
                function: "getTinyUrl",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                status: error.response?.status,
                statusText: error.response?.statusText,
                originalUrl: url
            });
            return url; // Always return original URL as fallback
        }
    },

    /**
     * Create short URL with multiple service fallbacks
     * @param {string} url - The URL to shorten
     * @returns {Promise<string>} - The shortened URL or original URL if all services fail
     */
    async createShortUrl(url) {
        if (!url || typeof url !== 'string') {
            return url || '';
        }

        // For local/development URLs, don't attempt shortening
        if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('192.168.')) {
            winston.debug('Local URL detected, skipping shortening', {
                source: "urlHelper.js",
                function: "createShortUrl",
                url: url
            });
            return url;
        }

        // Try TinyURL first
        try {
            const shortUrl = await this.getTinyUrl(url);
            if (shortUrl !== url) { // Successfully shortened
                return shortUrl;
            }
        } catch (error) {
            winston.debug('TinyURL failed, using original URL', {
                source: "urlHelper.js",
                function: "createShortUrl",
                error: error.message,
                url: url
            });
        }

        // If all services fail, return original URL
        winston.info('All URL shortening services failed, using original URL', {
            source: "urlHelper.js",
            function: "createShortUrl",
            url: url
        });
        return url;
    },

    /**
     * Validate URL format
     * @param {string} url - The URL to validate
     * @returns {boolean} - True if URL is valid
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Build invoice URL
     * @param {string} baseUrl - Base URL of the application
     * @param {string} orderId - Order ID or unique key
     * @returns {string} - Complete invoice URL
     */
    buildInvoiceUrl(baseUrl, orderId) {
        if (!baseUrl || !orderId) {
            throw new Error('Base URL and Order ID are required');
        }
        
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        return `${cleanBaseUrl}/ebill/${orderId}`;
    },

    /**
     * Build order details URL
     * @param {string} baseUrl - Base URL of the application
     * @param {string} orderId - Order ID or unique key
     * @returns {string} - Complete order details URL
     */
    buildOrderUrl(baseUrl, orderId) {
        if (!baseUrl || !orderId) {
            throw new Error('Base URL and Order ID are required');
        }
        
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        return `${cleanBaseUrl}/order/${orderId}`;
    }
};

module.exports = urlHelper;