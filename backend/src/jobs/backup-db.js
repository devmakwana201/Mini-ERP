const cron = require("node-cron");
const { backupDatabase } = require("../helpers/dbHelper");
const winston = require("../config/winston");
const { cron: cronConfig, app } = require("../config/config");

const startBackup = () => {
    const task = cron.schedule(
        // "30 5 17 * * *",
        cronConfig.backupSchedule, // Configurable backup schedule
        async () => {
            try {
                const fileName = await backupDatabase();
                console.log(`[CRON] ✅ DB backup created: ${fileName}`);
                winston.info(`[CRON] DB backup created: ${fileName}`, {
                    source: "backup-db.js",
                    function: "startBackup",
                    fileName: fileName
                });
            } catch (err) {
                console.error("[CRON] ❌ DB backup failed:", err);
                winston.error(`DB backup failed: ${err.message}`, {
                    source: "backup-db.js",
                    function: "startBackup",
                    error: err.message,
                    code: err.code,
                    errno: err.errno,
                    stack: err.stack
                });
            }
        },
        {
            scheduled: false,
            timezone: app.timezone,
        }
    );

    return task;
};

const initializeBackup = () => {
    const task = startBackup();
    task.start();
    return task;
};

const stopBackup = (task) => {
    if (task) {
        task.stop();
    }
};

module.exports = {
    initializeBackup,
    stopBackup,
};
