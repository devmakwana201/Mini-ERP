/**
 * Concurrency Control Utilities
 * Helps manage parallel execution of async operations with limits
 */

/**
 * Execute promises with concurrency limit
 * @param {Array} items - Array of items to process
 * @param {Function} asyncFn - Async function to execute for each item
 * @param {number} concurrencyLimit - Maximum number of concurrent executions (default: 5)
 * @returns {Promise<Array>} - Array of results
 */
const executeWithConcurrencyLimit = async (items, asyncFn, concurrencyLimit = 5) => {
    const results = [];
    const executing = [];

    for (const [index, item] of items.entries()) {
        // Create promise for this item
        const promise = Promise.resolve().then(() => asyncFn(item, index));
        results.push(promise);

        // If we've reached the concurrency limit, wait for one to complete
        if (concurrencyLimit <= items.length) {
            const executingPromise = promise.then(() => {
                executing.splice(executing.indexOf(executingPromise), 1);
            });
            executing.push(executingPromise);

            if (executing.length >= concurrencyLimit) {
                await Promise.race(executing);
            }
        }
    }

    // Wait for all remaining promises
    return Promise.all(results);
};

/**
 * Execute promises in batches
 * @param {Array} items - Array of items to process
 * @param {Function} asyncFn - Async function to execute for each item
 * @param {number} batchSize - Number of items per batch (default: 10)
 * @returns {Promise<Array>} - Array of results
 */
const executeInBatches = async (items, asyncFn, batchSize = 10) => {
    const results = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map((item, index) => asyncFn(item, i + index))
        );
        results.push(...batchResults);
    }

    return results;
};

/**
 * Execute promises with retry on failure
 * @param {Array} items - Array of items to process
 * @param {Function} asyncFn - Async function to execute for each item
 * @param {Object} options - Options
 * @param {number} options.concurrencyLimit - Max concurrent executions (default: 5)
 * @param {number} options.maxRetries - Max retries per item (default: 2)
 * @returns {Promise<Object>} - Object with successes and failures arrays
 */
const executeWithRetry = async (items, asyncFn, options = {}) => {
    const { concurrencyLimit = 5, maxRetries = 2 } = options;
    const successes = [];
    const failures = [];

    const processItem = async (item, index) => {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const result = await asyncFn(item, index);
                return { success: true, item, result, index };
            } catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    // Wait before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
                }
            }
        }
        return { success: false, item, error: lastError, index };
    };

    const results = await executeWithConcurrencyLimit(items, processItem, concurrencyLimit);

    results.forEach(result => {
        if (result.success) {
            successes.push(result);
        } else {
            failures.push(result);
        }
    });

    return { successes, failures };
};

/**
 * Map items with concurrency limit (like Promise.all but with limit)
 * @param {Array} items - Array of items
 * @param {Function} asyncFn - Async function
 * @param {number} limit - Concurrency limit (default: 5)
 * @returns {Promise<Array>} - Results array
 */
const pMapLimit = async (items, asyncFn, limit = 5) => {
    return executeWithConcurrencyLimit(items, asyncFn, limit);
};

/**
 * Process queue with concurrency limit
 * Useful for long-running queues
 */
class ConcurrencyQueue {
    constructor(concurrencyLimit = 5) {
        this.concurrencyLimit = concurrencyLimit;
        this.queue = [];
        this.running = 0;
        this.paused = false;
    }

    /**
     * Add task to queue
     * @param {Function} asyncFn - Async function to execute
     * @returns {Promise} - Promise that resolves when task completes
     */
    add(asyncFn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ asyncFn, resolve, reject });
            this.process();
        });
    }

    /**
     * Add multiple tasks to queue
     * @param {Array<Function>} asyncFns - Array of async functions
     * @returns {Promise<Array>} - Promise that resolves with all results
     */
    addAll(asyncFns) {
        return Promise.all(asyncFns.map(fn => this.add(fn)));
    }

    /**
     * Process queue
     */
    async process() {
        if (this.paused || this.running >= this.concurrencyLimit || this.queue.length === 0) {
            return;
        }

        this.running++;
        const { asyncFn, resolve, reject } = this.queue.shift();

        try {
            const result = await asyncFn();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.running--;
            this.process(); // Process next task
        }
    }

    /**
     * Pause queue processing
     */
    pause() {
        this.paused = true;
    }

    /**
     * Resume queue processing
     */
    resume() {
        this.paused = false;
        this.process();
    }

    /**
     * Get queue status
     * @returns {Object} - Status object
     */
    getStatus() {
        return {
            queued: this.queue.length,
            running: this.running,
            paused: this.paused,
            concurrencyLimit: this.concurrencyLimit,
        };
    }

    /**
     * Clear queue
     */
    clear() {
        this.queue = [];
    }
}

module.exports = {
    executeWithConcurrencyLimit,
    executeInBatches,
    executeWithRetry,
    pMapLimit,
    ConcurrencyQueue,
};
