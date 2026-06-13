const cron = require("node-cron");
const { cleanupOldTempImages } = require("../helpers/s3Helper");
const { cron: cronConfig, app } = require("../config/config");

// PRODUCTION VERSION - Once daily at 2:00 AM
const startCleanup = () => {
    //*/5 * * * * *      //every 5 seconds
    //0 2 * * *          //2 AM everyday
    const task = cron.schedule(
        cronConfig.cleanupSchedule,
        async () => {
            try {
                const result = await cleanupOldTempImages(cronConfig.cleanupAge); // Configurable cleanup age
                console.log(`Daily cleanup completed: ${result.deletedCount} files deleted`);
            } catch (error) {
                console.error("Daily cleanup failed:", error);
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
const initializeCleanup = () => {
    const task = startCleanup();
    task.start();
    return task;
};

// Graceful shutdown
const stopCleanup = (task) => {
    if (task) {
        task.stop();
    }
};

module.exports = {
    initializeCleanup,
    stopCleanup,
};
