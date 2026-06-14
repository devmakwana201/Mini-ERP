const db = require("../../../config/db");
const moment = require("moment");
const winston = require("../../../config/winston");

// ─── Permissions in new schema ──────────────────────────────
// Permissions are stored as a JSON column on the `roles` table.
// There is no separate permissionmaster table.
//
// Expected JSON structure inside roles.permissions:
// {
//   "users":       { "view": true, "create": true, "edit": true, "delete": false },
//   "sales":       { "view": true, "create": false, "edit": false, "delete": false },
//   "inventory":   { "view": true, "create": true, "edit": true, "delete": true },
//   ...
// }
// ────────────────────────────────────────────────────────────

module.exports = {
    /**
     * Get the permissions JSON for a specific role
     * @param {number} roleId
     * @returns {object|null}
     */
    getPermissions: async (roleId) => {
        try {
            const result = await db.getResults(
                `SELECT role_id, name, permissions FROM roles WHERE role_id = ? AND is_deleted = 0`,
                [roleId]
            );
            if (!result || result.length === 0) return null;

            const row = result[0];
            return {
                role_id: row.role_id,
                name: row.name,
                permissions: typeof row.permissions === "string"
                    ? JSON.parse(row.permissions)
                    : row.permissions || {},
            };
        } catch (error) {
            winston.error(`Error getting permissions for role ${roleId}: ${error.message}`, {
                source: "permission.model.js",
                function: "getPermissions",
                error: error.message,
                code: error.code,
            });
            return null;
        }
    },

    /**
     * Get permissions for all roles (for admin overview)
     * @returns {Array}
     */
    getAllPermissions: async () => {
        try {
            const result = await db.getResults(
                `SELECT role_id, name, permissions FROM roles WHERE is_deleted = 0 ORDER BY name ASC`
            );
            return result.map((row) => ({
                role_id: row.role_id,
                name: row.name,
                permissions: typeof row.permissions === "string"
                    ? JSON.parse(row.permissions)
                    : row.permissions || {},
            }));
        } catch (error) {
            winston.error(`Error getting all permissions: ${error.message}`, {
                source: "permission.model.js",
                function: "getAllPermissions",
                error: error.message,
                code: error.code,
            });
            return [];
        }
    },

    /**
     * Set (overwrite) the full permissions JSON for a role
     * @param {number} roleId
     * @param {object} permissions - full permissions object
     * @param {number} updatedBy   - user_id of the editor
     */
    setPermissions: async (roleId, permissions, updatedBy = null) => {
        try {
            const permJson = typeof permissions === "string"
                ? permissions
                : JSON.stringify(permissions);

            const result = await db.update(
                "roles",
                [
                    { column: "permissions", value: permJson },
                    { column: "updated_at", value: moment().format("YYYY-MM-DD HH:mm:ss") },
                    ...(updatedBy ? [{ column: "updated_by", value: updatedBy }] : []),
                ],
                [{ column: "role_id", value: roleId }, { column: "is_deleted", value: 0 }]
            );

            if (!result.affectedRows) {
                return { status: 404, success: 0, msg: "Role not found" };
            }

            return {
                status: 200,
                success: 1,
                msg: "Permissions updated successfully",
                data: { role_id: roleId, permissions },
            };
        } catch (error) {
            winston.error(`Error setting permissions for role ${roleId}: ${error.message}`, {
                source: "permission.model.js",
                function: "setPermissions",
                error: error.message,
                code: error.code,
            });
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Merge (patch) specific permission keys into an existing role's permissions
     * @param {number} roleId
     * @param {object} patch       - partial permissions to merge (e.g. { users: { delete: true } })
     * @param {number} updatedBy
     */
    patchPermissions: async (roleId, patch, updatedBy = null) => {
        try {
            // Fetch existing
            const existing = await module.exports.getPermissions(roleId);
            if (!existing) {
                return { status: 404, success: 0, msg: "Role not found" };
            }

            // Deep merge patch into existing
            const merged = { ...existing.permissions };
            for (const module_ of Object.keys(patch)) {
                merged[module_] = { ...(merged[module_] || {}), ...patch[module_] };
            }

            return await module.exports.setPermissions(roleId, merged, updatedBy);
        } catch (error) {
            winston.error(`Error patching permissions for role ${roleId}: ${error.message}`, {
                source: "permission.model.js",
                function: "patchPermissions",
                error: error.message,
                code: error.code,
            });
            return { status: 500, success: 0, msg: error.message };
        }
    },

    /**
     * Check if a role has a specific permission
     * @param {number} roleId
     * @param {string} module_   - e.g. "users"
     * @param {string} action    - e.g. "delete"
     * @returns {boolean}
     */
    hasPermission: async (roleId, module_, action) => {
        try {
            const data = await module.exports.getPermissions(roleId);
            if (!data) return false;
            return !!(data.permissions?.[module_]?.[action]);
        } catch (error) {
            winston.error(`Error checking permission: ${error.message}`, {
                source: "permission.model.js",
                function: "hasPermission",
                error: error.message,
            });
            return false;
        }
    },
};