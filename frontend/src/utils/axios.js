import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const axiosInstance = axios.create({
  baseURL: BASE_URL,
});

axiosInstance.interceptors.request.use(
  (config) => {
    // Check both storages for "authToken"
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle error responses globally
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check for 401 unauthorized errors
    if (error.response?.status === 401) {
      // Clear tokens from storage
      localStorage.removeItem("authToken");
      sessionStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      sessionStorage.removeItem("isSessionOnly");

      // Clear authorization header
      delete axiosInstance.defaults.headers.common.Authorization;

      // Redirect to login page
      window.location.href = "/login";

      return Promise.reject({
        message: "Session expired. Please login again.",
        statusCode: 401
      });
    }

    return Promise.reject((error.response && error.response.data) || "Something went wrong");
  }
);

export default axiosInstance;
