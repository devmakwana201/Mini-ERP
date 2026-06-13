// Import Dependencies
import { useEffect, useReducer } from "react";
import isObject from "lodash/isObject";
import PropTypes from "prop-types";
import isString from "lodash/isString";
import axios from "axios";
import { Toast } from "primereact/toast"; // Add this import for PrimeReact toast notifications
import { useRef } from "react"; // Add useRef for toast reference
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Local Imports
import { isTokenValid, setSession } from "utils/jwt";
import { AuthContext } from "./context";
import { t } from "i18next";
import { jwtDecode } from "jwt-decode";

// ----------------------------------------------------------------------

const initialState = {
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  errorMessage: null,
  user: null,
  token: null,
  refreshToken: null, // Add refresh token to state
};

const reducerHandlers = {
  INITIALIZE: (state, action) => {
    const { isAuthenticated, user } = action.payload;
    return {
      ...state,
      isAuthenticated,
      isInitialized: true,
      user,
    };
  },

  LOGIN_REQUEST: (state) => {
    return {
      ...state,
      isLoading: true,
      errorMessage: null, // Clear previous errors
    };
  },

  LOGIN_SUCCESS: (state, action) => {
    const { user, token, refreshToken } = action.payload;
    return {
      ...state,
      isAuthenticated: true,
      isLoading: false,
      user,
      token,
      refreshToken,
      errorMessage: null,
    };
  },

  LOGIN_ERROR: (state, action) => {
    const { errorMessage } = action.payload;

    return {
      ...state,
      errorMessage,
      isLoading: false,
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
    };
  },

  LOGOUT: (state) => ({
    ...state,
    isAuthenticated: false,
    user: null,
    token: null,
    refreshToken: null,
    errorMessage: null,
  }),
};

const reducer = (state, action) => {
  const handler = reducerHandlers[action.type];
  if (handler) {
    return handler(state, action);
  }
  return state;
};

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toast = useRef(null); // Create toast reference

  useEffect(() => {
    const init = async () => {
      try {
        const authToken = window.localStorage.getItem("authToken");
        const isSessionOnly = window.sessionStorage.getItem("isSessionOnly");

        // Clear session-only tokens on browser restart
        if (!isSessionOnly && authToken) {
          // This is a fresh browser session, clear non-persistent tokens
          const isRemembered = !window.sessionStorage.getItem("isSessionOnly");
          if (!isRemembered) {
            setSession(null);
            dispatch({
              type: "INITIALIZE",
              payload: {
                isAuthenticated: false,
                user: null,
              },
            });
            return;
          }
        }

        if (authToken && isTokenValid(authToken)) {
          setSession(authToken);

          // Real API call to get user profile
          try {
            const response = await axios.get(`${BASE_URL}/users/profile/me`, {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            });

            if (response.data.success === 1) {
              const user = response.data.data;

              dispatch({
                type: "INITIALIZE",
                payload: {
                  isAuthenticated: true,
                  user,
                },
              });
            } else {
              // Invalid token or user not found
              setSession(null);
              dispatch({
                type: "INITIALIZE",
                payload: {
                  isAuthenticated: false,
                  user: null,
                },
              });
            }
          } catch (profileError) {
            // Token might be expired or invalid
            setSession(null);
            dispatch({
              type: "INITIALIZE",
              payload: {
                isAuthenticated: false,
                user: null,
              },
            });
          }
        } else {
          dispatch({
            type: "INITIALIZE",
            payload: {
              isAuthenticated: false,
              user: null,
            },
          });
        }
      } catch (err) {
        dispatch({
          type: "INITIALIZE",
          payload: {
            isAuthenticated: false,
            user: null,
          },
        });
      }
    };

    init();

    // Listen for storage changes to sync auth state across tabs
    const handleStorageChange = (event) => {
      if (event.key === "authToken") {
        if (event.newValue) {
          // Token was set in another tab - reinitialize
          init();
        } else {
          // Token was removed in another tab - logout
          dispatch({
            type: "LOGOUT",
          });
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const login = async ({ email, password, rememberMe }) => {
    dispatch({ type: "LOGIN_REQUEST" });

    try {
      // Real API call for login
      const response = await axios.post(`${BASE_URL}/auth/userLogin`, {
        email,
        password,
      });

      const { success, data, error } = response.data;

      if (success === 1 && data) {
        const { token, refreshToken, user } = data;

        if (!token) {
          throw new Error("No token received from server");
        }

        // Store token with remember me preference
        setSession(token, rememberMe);

        // Store refresh token if needed
        if (refreshToken) {
          window.localStorage.setItem("refreshToken", refreshToken);
        }

        // Set default authorization header
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;

        // Fetch complete user profile
        try {
          const profileResponse = await axios.get(
            `${BASE_URL}/users/profile/me`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          if (profileResponse.data.success === 1) {
            const fullUserProfile = profileResponse.data.data;

            dispatch({
              type: "LOGIN_SUCCESS",
              payload: {
                user: fullUserProfile,
                token,
                refreshToken,
              },
            });

            // Show success toast
            toast.current?.show({
              severity: "success",
              summary: "Success",
              detail: "Login successful! Welcome back.",
              life: 3000,
            });

            return { success: true };
          } else {
            throw new Error("Failed to fetch user profile");
          }
        } catch (profileError) {
          // Use basic user info from login response if profile fetch fails
          dispatch({
            type: "LOGIN_SUCCESS",
            payload: {
              user,
              token,
              refreshToken,
            },
          });

          toast.current?.show({
            severity: "warn",
            summary: "Warning",
            detail: "Login successful, but couldn't fetch complete profile.",
            life: 4000,
          });
          return { success: true };
        }
      } else {
        // Handle API error response
        const errorMessage = error?.message || "Login failed";

        dispatch({
          type: "LOGIN_ERROR",
          payload: {
            errorMessage,
          },
        });

        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: errorMessage,
          life: 5000,
        });
        throw new Error(errorMessage);
      }
    } catch (err) {
      let errorMessage = "Login failed. Please try again.";

      if (err.response) {
        // API responded with an error
        const { data } = err.response;
        if (data?.success === 0 && data?.error?.message) {
          errorMessage = data.error.message;
        } else if (data?.message) {
          errorMessage = data.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      dispatch({
        type: "LOGIN_ERROR",
        payload: {
          errorMessage,
        },
      });

      // Show error toast
      toast.current?.show({
        severity: "error",
        summary: "Login Failed",
        detail: errorMessage,
        life: 5000,
      });

      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      // Clear tokens from storage
      setSession(null);
      window.localStorage.removeItem("refreshToken");

      // Clear authorization header
      delete axios.defaults.headers.common.Authorization;

      dispatch({ type: "LOGOUT" });

      // toast.current?.show({
      //   severity: "success",
      //   summary: "Success",
      //   detail: "Logged out successfully",
      //   life: 3000,
      // });
    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Error during logout",
        life: 4000,
      });
    }
  };

  if (!children) {
    return null;
  }

  return (
    <>
      <Toast ref={toast} />
      <AuthContext
        value={{
          ...state,
          login,
          logout,
          token: state.token,
          refreshToken: state.refreshToken,
        }}
      >
        {children}
      </AuthContext>
    </>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node,
};
