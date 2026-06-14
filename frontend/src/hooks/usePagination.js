// hooks/usePagination.js
// MASTER_PROMPT Section 9.5 — pagination state helper used by all list pages.

import { useState, useCallback } from 'react';

/**
 * Pagination state hook.
 * @param {number} defaultLimit — records per page (default 20)
 * @returns {{ page, limit, offset, setPage, setLimit, reset }}
 */
export function usePagination(defaultLimit = 20) {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(defaultLimit);

    const offset = (page - 1) * limit;

    const reset = useCallback(() => {
        setPage(1);
    }, []);

    const handleSetLimit = useCallback((newLimit) => {
        setLimit(newLimit);
        setPage(1); // reset to page 1 when limit changes
    }, []);

    return {
        page,
        limit,
        offset,
        setPage,
        setLimit: handleSetLimit,
        reset,
    };
}

export default usePagination;
