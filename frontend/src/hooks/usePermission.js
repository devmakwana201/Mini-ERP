// hooks/usePermission.js
// MASTER_PROMPT Section 9.4 — RULE-13: all action buttons that modify data MUST
// check hasPermission(module, action) before rendering.
//
// This hook reads permissions from the auth context (Provider.jsx).
// Usage: const { hasPermission } = usePermission();
//        {hasPermission('partners', 'create') && <Button label="New" />}

import { useContext } from 'react';
import { AuthContext } from '../app/contexts/auth/context';

/**
 * Returns a hasPermission helper that checks the current user's role permissions.
 * Permissions JSON structure (stored in roles.permissions):
 *   { "partners": { "view": true, "create": true, "update": true, "delete": true }, ... }
 */
export function usePermission() {
    const { user } = useContext(AuthContext);

    /**
     * @param {string} module  — e.g. 'partners', 'sales', 'manufacturing'
     * @param {string} action  — e.g. 'view', 'create', 'update', 'delete'
     * @returns {boolean}
     */
    const hasPermission = (module, action) => {
        // Admins always have all permissions (role_id=1)
        if (!user) return false;

        const permissions = user.permissions || user.role?.permissions || {};

        // Handle both parsed objects and JSON strings
        const perms = typeof permissions === 'string'
            ? (() => { try { return JSON.parse(permissions); } catch { return {}; } })()
            : permissions;

        return perms?.[module]?.[action] === true;
    };

    return { hasPermission };
}

export default usePermission;
