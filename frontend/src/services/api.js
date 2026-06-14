// services/api.js
// MASTER_PROMPT Section 9.2 — Axios instance with JWT injection + refresh interceptor.
// RULE-14: NEVER call fetch() directly. Always use this Axios instance.

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8003/api/v1';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ─── Request Interceptor ─────────────────────────────────────────────────────
// Inject access token from localStorage on every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ─── Response Interceptor ────────────────────────────────────────────────────
// Handle 401 → attempt refresh → retry once → logout on failure
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        // Only attempt refresh on 401 and only once per request
        if (error.response?.status === 401 && !original._retry) {
            if (isRefreshing) {
                // Queue the request until refresh completes
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    original.headers.Authorization = `Bearer ${token}`;
                    return api(original);
                }).catch((err) => Promise.reject(err));
            }

            original._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refreshToken');

            if (!refreshToken) {
                // No refresh token — force logout
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
                const newAccessToken = data.data?.accessToken;
                const newRefreshToken = data.data?.refreshToken;

                if (!newAccessToken) throw new Error('Refresh failed: no new token');

                localStorage.setItem('accessToken', newAccessToken);
                if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);

                api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
                original.headers.Authorization = `Bearer ${newAccessToken}`;

                processQueue(null, newAccessToken);
                return api(original);
            } catch (refreshError) {
                processQueue(refreshError, null);
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
