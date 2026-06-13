import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

import Logo from "assets/appLogo2.svg?react";
import { Button, Card, Input, InputErrorMsg } from "components/ui";
import { useAuthContext } from "app/contexts/auth/context";
import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";

// -------------------------------------------------------------------

export default function SignIn() {
  const toast = useRef(null);
  const { login, errorMessage, isAuthenticated, isLoading } = useAuthContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // "admin" or "user" mode — driven by ?mode=admin query param
  const mode = searchParams.get("mode") === "admin" ? "admin" : "user";
  const redirectUrl = searchParams.get("redirectUrl");

  const [showPassword, setShowPassword] = useState(false);
  const [formValues, setFormValues] = useState({ loginId: "", password: "" });
  const [formErrors, setFormErrors] = useState({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const safeRedirect =
        redirectUrl && redirectUrl !== "null" ? redirectUrl : "/dashboards/home";
      navigate(safeRedirect, { replace: true });
    }
  }, [isAuthenticated, redirectUrl, navigate]);

  // Show logout success message
  useEffect(() => {
    const logoutMessage = sessionStorage.getItem("logoutSuccess");
    if (logoutMessage) {
      toast.current?.show({
        severity: "success",
        summary: "Logged Out",
        detail: logoutMessage,
        life: 3000,
      });
      sessionStorage.removeItem("logoutSuccess");
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    // Clear field error on type
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!formValues.loginId.trim()) errors.loginId = "Login ID is required";
    if (!formValues.password) errors.password = "Password is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      // Pass loginId as email — backend accepts email for now
      // loginId can be either username or email
      await login({
        email: formValues.loginId.toLowerCase(),
        password: formValues.password,
        rememberMe: false,
      });
      sessionStorage.setItem("loginSuccess", "Logged In Successfully");
    } catch (err) {
      toast.current?.show({
        severity: "error",
        summary: "Login Failed",
        detail: "Invalid Login ID or Password",
        life: 4000,
      });
    }
  };

  const isAdmin = mode === "admin";

  return (
    <Page title={isAdmin ? "Admin Login" : "Login"}>
      <Toast ref={toast} />
      <main className="min-h-100vh grid w-full grow grid-cols-1 place-items-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="w-full max-w-[26rem] p-4 sm:px-5">

          {/* Logo */}
          <div className="text-center">
            <Link to="/">
              <Logo className="mx-auto size-16" />
            </Link>

            {/* Mode badge */}
            <div className="mt-4 flex flex-col items-center gap-2">
              {isAdmin ? (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <ShieldCheckIcon className="size-3.5" />
                  System Administrator
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  <UserIcon className="size-3.5" />
                  System User
                </div>
              )}
              <h2 className="dark:text-dark-100 text-2xl font-semibold text-gray-700">
                Welcome Back
              </h2>
              <p className="dark:text-dark-300 text-sm text-gray-400">
                {isAdmin
                  ? "Sign in to manage access rights"
                  : "Sign in to continue"}
              </p>
            </div>
          </div>

          {/* Card */}
          <Card className="mt-5 rounded-xl p-5 shadow-lg lg:p-7">
            <form onSubmit={handleSubmit} autoComplete="off" noValidate>
              <div className="space-y-4">
                {/* Login ID */}
                <Input
                  label="Login ID"
                  name="loginId"
                  value={formValues.loginId}
                  onChange={handleChange}
                  placeholder="Enter Login ID or Email"
                  disabled={isLoading}
                  prefix={<UserIcon className="size-5" strokeWidth="1" />}
                  error={formErrors.loginId}
                />

                {/* Password */}
                <Input
                  label="Password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formValues.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  placeholder="Enter Password"
                  prefix={
                    <LockClosedIcon className="size-5" strokeWidth="1" />
                  }
                  suffix={
                    <span
                      className="cursor-pointer"
                      onClick={() => !isLoading && setShowPassword((p) => !p)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="size-5" strokeWidth="1" />
                      ) : (
                        <EyeIcon className="size-5" strokeWidth="1" />
                      )}
                    </span>
                  }
                  error={formErrors.password}
                />
              </div>

              {/* Global auth error */}
              {errorMessage?.message && (
                <div className="mt-2">
                  <InputErrorMsg when={true}>
                    {errorMessage.message}
                  </InputErrorMsg>
                </div>
              )}

              {/* Forgot Password + Sign Up */}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                <Link
                  to="/forgot-password"
                  className="hover:text-gray-600 dark:hover:text-dark-100 transition-colors"
                >
                  Forget Password?
                </Link>
                <Link
                  to="/sign-up"
                  className="hover:text-gray-600 dark:hover:text-dark-100 transition-colors"
                >
                  Sign Up
                </Link>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="mt-5 w-full"
                color="primary"
                disabled={isLoading}
              >
                {isLoading && (
                  <span className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {isLoading ? "Signing In..." : "SIGN IN"}
              </Button>
            </form>
          </Card>

          {/* Toggle mode link */}
          <div className="mt-5 text-center">
            {isAdmin ? (
              <Link
                to="/login"
                className="text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors"
              >
                Login as User
              </Link>
            ) : (
              <Link
                to="/login?mode=admin"
                className="text-sm font-medium text-amber-500 hover:text-amber-600 transition-colors"
              >
                Login as System Administrator
              </Link>
            )}
          </div>

          {/* Footer links */}
          <div className="dark:text-dark-300 mt-6 flex justify-center gap-4 text-xs text-gray-400">
            <Link
              to="/privacy-notice"
              className="hover:text-gray-600 dark:hover:text-dark-100 transition-colors"
            >
              Privacy Notice
            </Link>
            <div className="dark:bg-dark-500 my-0.5 w-px bg-gray-200" />
            <Link
              to="/terms-of-service"
              className="hover:text-gray-600 dark:hover:text-dark-100 transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </main>
    </Page>
  );
}
