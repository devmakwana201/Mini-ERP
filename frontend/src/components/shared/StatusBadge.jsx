// components/shared/StatusBadge.jsx
// MASTER_PROMPT Section 9.3 — color-coded PrimeReact Tag for all entity statuses.
// Usage: <StatusBadge status={row.status} />

import { Tag } from 'primereact/tag';

/**
 * Status severity map from MASTER_PROMPT Section 9.3
 * Maps every status ENUM value to a PrimeReact Tag severity.
 */
const STATUS_SEVERITY = {
    // Order statuses (SO, PO, MO)
    draft:        'secondary',
    confirmed:    'info',
    in_progress:  'warning',
    done:         'success',
    cancelled:    'danger',

    // PO-only statuses
    sent:         'info',
    received:     'success',

    // Work Order statuses
    pending:      'secondary',

    // User account statuses
    active:       'success',
    inactive:     'secondary',
    suspended:    'danger',

    // MO component availability
    available:    'success',
    unavailable:  'danger',

    // Stock reservation statuses
    active_reservation: 'info',
    released:     'secondary',
    consumed:     'success',
};

/**
 * Human-readable label overrides (optional, improves display)
 */
const STATUS_LABEL = {
    in_progress:        'In Progress',
    draft:              'Draft',
    confirmed:          'Confirmed',
    done:               'Done',
    cancelled:          'Cancelled',
    sent:               'Sent',
    received:           'Received',
    pending:            'Pending',
    active:             'Active',
    inactive:           'Inactive',
    suspended:          'Suspended',
    available:          'Available',
    unavailable:        'Unavailable',
    released:           'Released',
    consumed:           'Consumed',
};

/**
 * @param {object} props
 * @param {string} props.status  — any status ENUM value
 * @param {string} [props.className]
 */
export default function StatusBadge({ status, className }) {
    if (!status) return null;

    const severity = STATUS_SEVERITY[status] || 'secondary';
    const label    = STATUS_LABEL[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return (
        <Tag
            value={label}
            severity={severity}
            className={className}
        />
    );
}
