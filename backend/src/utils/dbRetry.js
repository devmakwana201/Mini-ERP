const winston = require("../config/winston");

/**
 * Retry logic for database operations with exponential backoff
 * Handles deadlocks, lock timeouts, and connection errors
 */

// Error codes that should trigger a retry
const RETRYABLE_ERROR_CODES = [
    "ER_LOCK_DEADLOCK", // Deadlock detected
    "ER_LOCK_WAIT_TIMEOUT", // Lock wait timeout exceeded
    "ER_LOCK_ABORTED", // Lock aborted
    "ECONNRESET", // Connection reset
    "ETIMEDOUT", // Operation timeout
    "ER_CON_COUNT_ERROR", // Too many connections
    "ER_QUERY_INTERRUPTED", // Query interrupted
];

/**
 * Check if error is retryable
 * @param {Error} error - The error to check
 * @returns {boolean} - True if error is retryable
 */
const isRetryableError = (error) => {
    if (!error) return false;

    // Check error code
    if (error.code && RETRYABLE_ERROR_CODES.includes(error.code)) {
        return true;
    }

    // Check errno (MySQL error numbers)
    if (error.errno) {
        const retryableErrno = [
            1205, // ER_LOCK_WAIT_TIMEOUT
            1213, // ER_LOCK_DEADLOCK
            1614, // ER_TRANSACTION_ROLLBACK_DURING_COMMIT
        ];
        if (retryableErrno.includes(error.errno)) {
            return true;
        }
    }

    // Check error message for common patterns
    const message = error.message ? error.message.toLowerCase() : "";
    const retryableMessages = [
        "deadlock",
        "lock wait timeout",
        "connection",
        "too many connections",
        "broken pipe",
    ];

    return retryableMessages.some((msg) => message.includes(msg));
};

/**
 * Calculate exponential backoff delay with jitter
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in milliseconds (default: 100ms)
 * @param {number} maxDelay - Maximum delay in milliseconds (default: 5000ms)
 * @returns {number} - Delay in milliseconds
 */
const calculateBackoffDelay = (attempt, baseDelay = 100, maxDelay = 5000) => {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = baseDelay * Math.pow(2, attempt);

    // Cap at maxDelay
    const cappedDelay = Math.min(exponentialDelay, maxDelay);

    // Add jitter (random 0-25% of delay) to prevent thundering herd
    const jitter = Math.random() * 0.25 * cappedDelay;

    return Math.floor(cappedDelay + jitter);
};

/**
 * Retry database operation with exponential backoff
 * @param {Function} operation - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 100)
 * @param {number} options.maxDelay - Max delay in ms (default: 5000)
 * @param {string} options.operationName - Name for logging (default: 'Database operation')
 * @returns {Promise<*>} - Result of the operation
 */
const retryOperation = async (
    operation,
    options = {}
) => {
    const {
        maxRetries = 3,
        baseDelay = 100,
        maxDelay = 5000,
        operationName = "Database operation",
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Execute the operation
            const result = await operation();

            // Log success if it was a retry
            if (attempt > 0) {
                winston.info(`${operationName} succeeded after ${attempt} retries`, {
                    source: "dbRetry.js",
                    function: "retryOperation",
                    operationName: operationName,
                    attempts: attempt
                });
            }

            return result;
        } catch (error) {
            lastError = error;

            // Check if this is the last attempt
            const isLastAttempt = attempt === maxRetries;

            // Check if error is retryable
            const shouldRetry = isRetryableError(error) && !isLastAttempt;

            if (shouldRetry) {
                const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay);

                winston.warn(`${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1})`, {
                    source: "dbRetry.js",
                    function: "retryOperation",
                    operationName: operationName,
                    error: error.message,
                    errorCode: error.code,
                    errno: error.errno,
                    retryAfter: `${delay}ms`,
                    attempt: attempt + 1,
                    maxRetries: maxRetries + 1
                });

                // Wait before retrying
                await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
                // Not retryable or last attempt - throw error
                if (!shouldRetry && !isLastAttempt) {
                    winston.error(`${operationName} failed with non-retryable error: ${error.message}`, {
                        source: "dbRetry.js",
                        function: "retryOperation",
                        error: error.message,
                        code: error.code,
                        errno: error.errno,
                        stack: error.stack,
                        operationName: operationName,
                        attempt: attempt + 1
                    });
                } else {
                    winston.error(`${operationName} failed after ${maxRetries} retries: ${error.message}`, {
                        source: "dbRetry.js",
                        function: "retryOperation",
                        error: error.message,
                        code: error.code,
                        errno: error.errno,
                        stack: error.stack,
                        operationName: operationName,
                        maxRetries: maxRetries
                    });
                }

                throw error;
            }
        }
    }

    // Should never reach here, but just in case
    throw lastError;
};

/**
 * Retry a transaction with automatic rollback on failure
 * @param {Function} transactionFn - Async function that performs transaction operations
 * @param {Object} options - Retry options (same as retryOperation)
 * @returns {Promise<*>} - Result of the transaction
 */
const retryTransaction = async (transactionFn, options = {}) => {
    const db = require("../config/db");

    return retryOperation(
        async () => {
            return await db.runInTransaction(transactionFn);
        },
        {
            ...options,
            operationName: options.operationName || "Transaction",
        }
    );
};

module.exports = {
    retryOperation,
    retryTransaction,
    isRetryableError,
    calculateBackoffDelay,
};
