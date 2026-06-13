import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const AuthService = {
  /**
   * Register a new user account
   * @param {{ username: string, email: string, password: string, confirmPassword: string }} payload
   */
  signup: async (payload) => {
    try {
      const response = await axios.post(`/auth/signup`, {
        username: payload.username,
        email: payload.email.toLowerCase(),
        password: payload.password,
        confirmPassword: payload.confirmPassword,
      });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  /**
   * Send password reset email
   * @param {string} email
   */
  forgotPassword: async (email) => {
    try {
      const response = await axios.post(`/auth/forgot-password`, { email: email.toLowerCase() });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};
