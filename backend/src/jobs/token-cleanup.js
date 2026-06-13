const cron = require("node-cron");
const db = require("../config/db");
const winston = require("../config/winston");
const { cron: cronConfig, app, jwt } = require("../config/config");

// Token cleanup function
const cleanupExpiredTokens = async () => {
    try {
        let totalDeleted = 0;
        let deleted;

        do {
            const deleteQuery = `
                DELETE FROM user_jwt_tokens
                WHERE expiry IS NOT NULL AND expiry < NOW()
                LIMIT 100
            `;

            const result = await db.getResults(deleteQuery);
            deleted = result.affectedRows || 0;
            totalDeleted += deleted;
        } while (deleted > 0);

        if (totalDeleted > 0) {
            winston.info(`Token cleanup completed. Removed ${totalDeleted} expired tokens`, {
                source: "token-cleanup.js",
                function: "cleanupExpiredTokens",
                deletedCount: totalDeleted,
            });
        } else {
            winston.debug("Token cleanup: No expired tokens to remove", {
                source: "token-cleanup.js",
                function: "cleanupExpiredTokens",
            });
        }

        return { deletedCount: totalDeleted };
    } catch (error) {
        winston.error(`Token cleanup failed: ${error.message}`, {
            source: "token-cleanup.js",
            function: "cleanupExpiredTokens",
            error: error.message,
            code: error.code,
            errno: error.errno,
            stack: error.stack,
        });
        throw error;
    }
};

// Also clean up orphaned tokens (tokens without corresponding users)
const cleanupOrphanedTokens = async () => {
    try {
        const orphanCleanupQuery = `
            DELETE ujt FROM user_jwt_tokens ujt
            LEFT JOIN usermaster u ON ujt.userid = u.userid
            WHERE u.userid IS NULL
        `;

        const orphanResult = await db.getResults(orphanCleanupQuery);

        if (orphanResult.affectedRows > 0) {
            winston.info(`Removed ${orphanResult.affectedRows} orphaned tokens`, {
                source: "token-cleanup.js",
                function: "cleanupOrphanedTokens",
                deletedCount: orphanResult.affectedRows,
            });
            return { deletedCount: orphanResult.affectedRows };
        }

        return { deletedCount: 0 };
    } catch (error) {
        winston.error(`Orphaned token cleanup failed: ${error.message}`, {
            source: "token-cleanup.js",
            function: "cleanupOrphanedTokens",
            error: error.message,
            code: error.code,
            errno: error.errno,
            stack: error.stack,
        });
        throw error;
    }
};

// Start token cleanup cron job - runs every hour
const startTokenCleanup = () => {
    // Schedule to run every hour at minute 0
    // 0 * * * * means at minute 0 of every hour
    const task = cron.schedule(
        "0 * * * *",
        async () => {
            try {
                const expiredResult = await cleanupExpiredTokens();
                const orphanResult = await cleanupOrphanedTokens();

                const totalDeleted = expiredResult.deletedCount + orphanResult.deletedCount;

                if (totalDeleted > 0) {
                    console.log(`Token cleanup completed: ${totalDeleted} tokens deleted`);
                    console.log(`  - Expired: ${expiredResult.deletedCount}`);
                    console.log(`  - Orphaned: ${orphanResult.deletedCount}`);
                }
            } catch (error) {
                console.error("Token cleanup job failed:", error);
            }
        },
        {
            scheduled: false,
            timezone: app.timezone, // Configurable timezone
        }
    );

    return task;
};

// Main initialization function
const initializeTokenCleanup = () => {
    const task = startTokenCleanup();
    task.start();
    return task;
};

// Graceful shutdown
const stopTokenCleanup = (task) => {
    if (task) {
        task.stop();
    }
};

module.exports = {
    initializeTokenCleanup,
    stopTokenCleanup,
    cleanupExpiredTokens,
    cleanupOrphanedTokens,
};