const cron = require("node-cron");
const procurementService = require("../services/procurement.service");
const winston = require("../config/winston");

/**
 * Procurement Cron Job
 * Runs daily at 6:00 AM to check all active procurement rules
 * and trigger auto-replenishment for MTS products below min_stock_qty.
 */
const initializeProcurementCron = () => {
    const task = cron.schedule("0 6 * * *", async () => {
        winston.info("Procurement cron: Starting daily procurement check", {
            source: "procurement-cron.js",
        });

        try {
            const result = await procurementService.checkAndTriggerProcurement(null);
            winston.info(`Procurement cron: Completed — ${result.posCreated} POs, ${result.mosCreated} MOs created`, {
                source: "procurement-cron.js",
                posCreated: result.posCreated,
                mosCreated: result.mosCreated,
            });
        } catch (error) {
            winston.error(`Procurement cron failed: ${error.message}`, {
                source: "procurement-cron.js",
                error: error.message,
                stack: error.stack,
            });
        }
    }, {
        timezone: "Asia/Kolkata",
    });

    return task;
};

const stopProcurementCron = (task) => {
    if (task) task.stop();
};

module.exports = { initializeProcurementCron, stopProcurementCron };
