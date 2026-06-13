import { jwtDecode } from "jwt-decode";
import axios from "./axios";

/**
 * Checks if the provided JWT token is valid (not expired).
 *
 * @param {string} authToken - The JWT token to validate.
 * @returns {boolean} - Returns `true` if the token is valid, otherwise `false`.
 */
const isTokenValid = (authToken) => {
  if (typeof authToken !== "string") {
    console.error("Invalid token format.");
    return false;
  }

  try {
    const decoded = jwtDecode(authToken);
    const currentTime = Date.now() / 1000; // Current time in seconds since epoch

    return decoded.exp > currentTime;
  } catch (err) {
    console.error("Failed to decode token:", err);
    return false;
  }
};

/**
 * Sets or removes the authentication token in local storage and axios headers.
 *
 * @param {string} [authToken] - The JWT token to set. If `undefined` or `null`, the session will be cleared.
 */
const setSession = (authToken, rememberme = 0) => {
  if (typeof authToken === "string" && authToken.trim() !== "") {
    // Always use localStorage for tab synchronization
    localStorage.setItem("authToken", authToken);
    if (!rememberme) {
      // Set a session flag to clear token on browser close
      sessionStorage.setItem("isSessionOnly", "true");
    } else {
      sessionStorage.removeItem("isSessionOnly");
    }
    axios.defaults.headers.common.Authorization = `Bearer ${authToken}`;
  } else {
    // Remove token from local storage and delete authorization header from axios
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("isSessionOnly");
    delete axios.defaults.headers.common.Authorization;
  }
};

export { isTokenValid, setSession };
