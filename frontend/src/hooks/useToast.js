// hooks/useToast.js
// MASTER_PROMPT Section 9.1 — toast notification hook used across all list/form pages.
// Uses PrimeReact's global toast (must have <Toast ref={toastRef} /> in layout).

import { useRef, useCallback } from 'react';

// Singleton toast ref shared across the app (set by AppLayout)
let _toastRef = null;

export function setGlobalToastRef(ref) {
    _toastRef = ref;
}

/**
 * Returns toast helper functions.
 * Usage in pages:
 *   const { showSuccess, showError, showWarn, showInfo } = useToast();
 *   showSuccess('Partner created successfully');
 */
export function useToast() {
    const showToast = useCallback((severity, summary, detail, life = 4000) => {
        if (_toastRef?.current) {
            _toastRef.current.show({ severity, summary, detail, life });
        } else {
            // Fallback to console in development
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[Toast ${severity}] ${summary}: ${detail}`);
            }
        }
    }, []);

    const showSuccess = useCallback((message, title = 'Success') => {
        showToast('success', title, message);
    }, [showToast]);

    const showError = useCallback((message, title = 'Error') => {
        showToast('error', title, message, 6000);
    }, [showToast]);

    const showWarn = useCallback((message, title = 'Warning') => {
        showToast('warn', title, message, 5000);
    }, [showToast]);

    const showInfo = useCallback((message, title = 'Info') => {
        showToast('info', title, message);
    }, [showToast]);

    return { showSuccess, showError, showWarn, showInfo };
}

export default useToast;
