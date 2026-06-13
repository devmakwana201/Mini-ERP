// Import Dependencies
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import Logo from "assets/appLogo2.svg?react";
import { Button, Card, Checkbox, Input, InputErrorMsg } from "components/ui";
import { useAuthContext } from "app/contexts/auth/context";
import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
// ----------------------------------------------------------------------

export default function SignIn() {
  const toast = useRef(null);
  const { login, errorMessage, isAuthenticated, isLoading } = useAuthContext();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const redirectUrl = searchParams.get("redirectUrl");

  // Navigate only in an effect to avoid flicker/remounts during render
  useEffect(() => {
    if (isAuthenticated) {
      const safeRedirect =
        redirectUrl && redirectUrl !== "null"
          ? redirectUrl
          : "/dashboards/home";
      navigate(safeRedirect, { replace: true });
    }
  }, [isAuthenticated, redirectUrl, navigate]);

  useEffect(() => {
    const logoutMessage = sessionStorage.getItem("logoutSuccess");
    if (logoutMessage) {
      toast.current?.show({
        severity: "success",
        summary: "Logged Out",
        detail: logoutMessage,
        life: 3000,
      });

      sessionStorage.removeItem("logoutSuccess"); // Show only once
    }
  }, []);

  const [rememberMe, setRememberMe] = useState(false);

  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
  });

  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validate = () => {
    const errors = {};
    if (!formValues.email) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formValues.email))
      errors.email = "Invalid email";

    if (!formValues.password) errors.password = "Password is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await login({
        email: formValues.email.toLowerCase(),
        password: formValues.password,
        rememberMe,
      });

      sessionStorage.setItem("loginSuccess", "Logged In Successfully");

      toast.current?.show({
        severity: "success",
        summary: "Login Successful",
        detail: "Welcome back!",
        life: 3000,
      });
    } catch (err) {
      toast.current?.show({
        severity: "error",
        summary: "Login Failed",
        detail:
          err?.message != "Login failed"
            ? err?.message
            : "Invalid Email or Password.",
        life: 4000,
      });
    }
  };

  return (
    <Page title="Login">
      <Toast ref={toast} />
      <main className="min-h-100vh grid w-full grow grid-cols-1 place-items-center">
        <div className="w-full max-w-[26rem] p-4 sm:px-5">
          <div className="text-center">
            <Link to="/">
              <Logo className="mx-auto size-16" />
            </Link>
            <div className="mt-4">
              <h2 className="dark:text-dark-100 text-2xl font-semibold text-gray-600">
                Welcome Back
              </h2>
              <p className="dark:text-dark-300 text-gray-400">
                Please sign in to continue
              </p>
            </div>
          </div>

          <Card className="mt-5 rounded-lg p-5 lg:p-7">
            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="space-y-4">
                <Input
                  label="Email"
                  name="email"
                  value={formValues.email}
                  onChange={handleChange}
                  placeholder="Enter Email"
                  disabled={isLoading}
                  prefix={<EnvelopeIcon className="size-5" strokeWidth="1" />}
                  error={formErrors.email}
                />

                <Input
                  label="Password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formValues.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  placeholder="Enter Password"
                  prefix={
                    <LockClosedIcon
                      className="size-5 transition-colors duration-200"
                      strokeWidth="1"
                    />
                  }
                  suffix={
                    <span
                      className="cursor-pointer"
                      aria-disabled={isLoading}
                      onClick={() =>
                        !isLoading && setShowPassword((prev) => !prev)
                      }
                    >
                      {showPassword ? (
                        <EyeSlashIcon
                          className="size-5 transition-colors duration-200"
                          strokeWidth="1"
                        />
                      ) : (
                        <EyeIcon
                          className="size-5 transition-colors duration-200"
                          strokeWidth="1"
                        />
                      )}
                    </span>
                  }
                  error={formErrors.password}
                />
              </div>

              <div className="mt-2">
                <InputErrorMsg
                  when={errorMessage && errorMessage?.message !== ""}
                >
                  {errorMessage?.message}
                </InputErrorMsg>
              </div>

              <div className="mt-4 flex items-center justify-between space-x-2">
                <Checkbox
                  label="Remember me"
                  checked={rememberMe}
                  onChange={(e) =>
                    !isLoading && setRememberMe(e.target.checked)
                  }
                  disabled={isLoading}
                />
                <a
                  href="##"
                  className="dark:text-dark-300 dark:hover:text-dark-100 dark:focus:text-dark-100 text-xs text-gray-400 transition-colors hover:text-gray-800 focus:text-gray-800"
                >
                  Forgot Password?
                </a>
              </div>

              <Button
                type="submit"
                className="mt-5 w-full"
                color="primary"
                disabled={isLoading}
              >
                {isLoading && (
                  <span className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </Card>

          <div className="dark:text-dark-300 mt-8 flex justify-center text-xs text-gray-400">
            <Link to="/privacy-notice" className="hover:text-gray-600 dark:hover:text-dark-100 transition-colors">
              Privacy Notice
            </Link>
            <div className="dark:bg-dark-500 mx-2.5 my-0.5 w-px bg-gray-200"></div>
            <Link to="/terms-of-service" className="hover:text-gray-600 dark:hover:text-dark-100 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </main>
    </Page>
  );
}
