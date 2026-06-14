// middlewares/permission.middleware.js
// MASTER_PROMPT Section 5.6 — RULE-06 + RULE-13
// Reads the role's JSON permissions from the DB and enforces module.action access.
// Supports two formats:
//   1. Full-access token:  { "access": "full" }  → grants all permissions
//   2. Granular format:    { "partners": { "view": true, "create": true } }
//   3. Legacy flat format: { "partners": "full" } → grants all actions for that module

const db = require('../config/db');
const { ForbiddenError } = require('../constants/errors');

/**
 * checkPermission(module, action)
 * Middleware factory — attach after authMiddleware on every protected route.
 *
 * Usage:
 *   router.get('/', authMiddleware, checkPermission('partners', 'view'), controller.list)
 *
 * @param {string} module  — e.g. 'partners', 'sales', 'manufacturing'
 * @param {string} action  — e.g. 'view', 'create', 'update', 'delete'
 */
function checkPermission(module, action) {
    return async (req, res, next) => {
        try {
            // permissions are already attached by authMiddleware
            let permissions = req.user?.permissions;

            // If not on req.user, fetch from DB (fallback)
            if (!permissions) {
                const [rows] = await db.connection.query(
                    'SELECT permissions FROM roles WHERE role_id = ? AND is_deleted = FALSE',
                    [req.user?.role_id]
                );
                if (!rows.length) {
                    return next(new ForbiddenError('Role not found'));
                }
                permissions = rows[0].permissions;
                if (typeof permissions === 'string') {
                    try { permissions = JSON.parse(permissions); } catch { permissions = {}; }
                }
            }

            // ── Grant check ──────────────────────────────────────────────

            // 1. Full admin bypass: { "access": "full" }
            if (permissions?.access === 'full') {
                req.permissions = permissions;
                return next();
            }

            const modPerm = permissions?.[module];

            // 2. Module-level full access: { "partners": "full" }
            if (modPerm === 'full') {
                req.permissions = permissions;
                return next();
            }

            // 3. Granular object: { "partners": { "view": true } }
            if (modPerm && typeof modPerm === 'object' && modPerm[action]) {
                req.permissions = permissions;
                return next();
            }

            // 4. Denied
            return next(new ForbiddenError(`No '${action}' permission for module '${module}'`));

        } catch (err) {
            next(err);
        }
    };
}

module.exports = { checkPermission };
