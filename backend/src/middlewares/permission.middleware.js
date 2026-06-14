// middlewares/permission.middleware.js
// MASTER_PROMPT Section 5.6 — RULE-06 + RULE-13
// Reads the role's JSON permissions from the DB and enforces module.action access.

const db = require('../config/db');
const { ForbiddenError } = require('../constants/errors');

/**
 * checkPermission(module, action)
 * Middleware factory — attach after authMiddleware on every protected route.
 *
 * Usage:
 *   router.get('/', authMiddleware, checkPermission('partners', 'view'), controller.list);
 *
 * @param {string} module  — e.g. 'partners', 'sales', 'manufacturing'
 * @param {string} action  — e.g. 'view', 'create', 'update', 'delete'
 */
function checkPermission(module, action) {
    return async (req, res, next) => {
        try {
            const [rows] = await db.connection.query(
                'SELECT permissions FROM roles WHERE role_id = ? AND is_deleted = FALSE',
                [req.user.role_id]
            );

            if (!rows.length) {
                return next(new ForbiddenError('Role not found or has been deleted'));
            }

            let permissions = rows[0].permissions;

            // MySQL returns JSON columns as parsed objects in mysql2/promise
            if (typeof permissions === 'string') {
                try { permissions = JSON.parse(permissions); } catch { permissions = {}; }
            }

            if (!permissions?.[module]?.[action]) {
                return next(new ForbiddenError(`No '${action}' permission for module '${module}'`));
            }

            // Attach permissions to request for downstream use (e.g. field filtering)
            req.permissions = permissions;
            next();
        } catch (err) {
            next(err);
        }
    };
}

module.exports = { checkPermission };
