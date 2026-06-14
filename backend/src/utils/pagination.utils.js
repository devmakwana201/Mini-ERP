// utils/pagination.utils.js
// Pagination helpers for list endpoints.
// MASTER_PROMPT Section 9.5 / Section 12 model template uses these.

/**
 * Parse page + limit from query params and compute SQL offset.
 * @param {object} params
 * @param {number|string} params.page   — 1-indexed page number (default 1)
 * @param {number|string} params.limit  — records per page (default 20, max 100)
 * @returns {{ page: number, limit: number, offset: number }}
 */
function parsePagination({ page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    return { page: p, limit: l, offset: (p - 1) * l };
}

/**
 * Build pagination meta object returned in every list response.
 * @param {number} page
 * @param {number} limit
 * @param {number} total  — total number of records (from COUNT query)
 * @returns {{ page, limit, total, totalPages, hasNext, hasPrev }}
 */
function buildMeta(page, limit, total) {
    const totalPages = Math.ceil(total / limit) || 1;
    return {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
}

module.exports = { parsePagination, buildMeta };
