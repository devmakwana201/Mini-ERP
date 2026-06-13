const winston = require("../config/winston");
const path = require("path");

/**
 * Create a logger instance with source file context
 * @param {string} filename - The __filename of the calling module
 * @returns {Object} Logger instance with contextual methods
 */
const createLogger = (filename) => {
    const source = path.basename(filename);

    return {
        /**
         * Log info level message
         * @param {string} message - Log message
         * @param {string} functionName - Function name where log is called
         * @param {Object} meta - Additional metadata
         */
        info: (message, functionName = null, meta = {}) => {
            winston.info(message, {
                source,
                function: functionName,
                ...meta,
            });
        },

        /**
         * Log debug level message
         * @param {string} message - Log message
         * @param {string} functionName - Function name where log is called
         * @param {Object} meta - Additional metadata
         */
        debug: (message, functionName = null, meta = {}) => {
            winston.debug(message, {
                source,
                function: functionName,
                ...meta,
            });
        },

        /**
         * Log warning level message
         * @param {string} message - Log message
         * @param {string} functionName - Function name where log is called
         * @param {Object} meta - Additional metadata
         */
        warn: (message, functionName = null, meta = {}) => {
            winston.warn(message, {
                source,
                function: functionName,
                ...meta,
            });
        },

        /**
         * Log error level message
         * @param {string} message - Log message
         * @param {string} functionName - Function name where log is called
         * @param {Error|Object} error - Error object or metadata
         */
        error: (message, functionName = null, error = null) => {
            const meta = {
                source,
                function: functionName,
            };

            if (error) {
                if (error instanceof Error) {
                    meta.error = error.message;
                    meta.code = error.code;
                    meta.errno = error.errno;
                    meta.stack = error.stack;
                } else {
                    Object.assign(meta, error);
                }
            }

            winston.error(message, meta);
        },
    };
};

module.exports = createLogger;
