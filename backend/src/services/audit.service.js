const db = require("../config/db");
const winston = require("../config/winston");

/**
 * Audit Service
 * Appends immutable log entries to audit_logs.
 * Call BEFORE commit inside every write transaction.
 */
const auditService = {
    /**
     * Log an audit entry.
     * @param {Object} params
     * @param {number|null} params.user_id
     * @param {string} params.table_name
     * @param {number} params.record_id
     * @param {'INSERT'|'UPDATE'|'DELETE'} params.action
     * @param {Object|null} params.old_values
     * @param {Object|null} params.new_values
     * @param {string|null} params.ip_address
     */
    async logAudit({ user_id, table_name, record_id, action, old_values = null, new_values = null, ip_address = null }) {
        try {
            const sql = `
                INSERT INTO audit_logs
                    (user_id, table_name, record_id, action, old_values, new_values, ip_address)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            await db.getResults(sql, [
                user_id || null,
                table_name,
                record_id,
                action,
                old_values ? JSON.stringify(old_values) : null,
                new_values ? JSON.stringify(new_values) : null,
                ip_address || null,
            ]);
        } catch (error) {
            // Audit failure must not crash the transaction — log and continue
            winston.error(`Audit log failed: ${error.message}`, {
                source: "audit.service.js",
                function: "logAudit",
                table_name,
                record_id,
                action,
                error: error.message,
            });
        }
    },
};

module.exports = auditService;
