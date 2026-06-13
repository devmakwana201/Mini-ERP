/**
 * Async handler wrapper for Express routes
 * Catches errors in async route handlers and passes them to Express error handler
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Try-catch wrapper for async operations
 * Returns [error, result] tuple
 */
const asyncWrapper = async (promise) => {
    try {
        const result = await promise;
        return [null, result];
    } catch (error) {
        return [error, null];
    }
};

/**
 * Retry wrapper for async operations with exponential backoff
 */
const asyncRetry = async (fn, options = {}) => {
    const {
        retries = 3,
        delay = 1000,
        backoff = 2,
        onRetry = null,
    } = options;

    let lastError;
    
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (i < retries - 1) {
                if (onRetry) {
                    onRetry(error, i + 1);
                }
                
                const waitTime = delay * Math.pow(backoff, i);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    throw lastError;
};

/**
 * Timeout wrapper for async operations
 */
const asyncTimeout = (promise, timeoutMs, timeoutError = new Error("Operation timed out")) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(timeoutError), timeoutMs)
        ),
    ]);
};

module.exports = {
    asyncHandler,
    asyncWrapper,
    asyncRetry,
    asyncTimeout,
};