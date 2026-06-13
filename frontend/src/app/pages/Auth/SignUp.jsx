import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

import Logo from "assets/appLogo2.svg?react";
import { Button, Card, Input } from "components/ui";
import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { AuthService } from "services/auth/auth.service";

// ─── Password strength helpers ─────────────────────────────────────────────

const rules = [
  { id: "length",   label: "At least 8 characters",          test: (p) => p.length >= 8 },
  { id: "lower",    label: "One lowercase letter",            test: (p) => /[a-z]/.test(p) },
  { id: "upper",    label: "One uppercase letter",            test: (p) => /[A-Z]/.test(p) },
  { id: "special",  label: "One special character (!@#$…)",   test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
];

function PasswordRules({ password }) {
  if (!password) return null;
  return (
    <ul className="mt-1.5 space-y-0.5 text-xs">
      {rules.map((r) => {
        const ok = r.test(password);
        return (
          <li key={r.id} className={`flex items-center gap-1.5 ${ok ? "text-green-500" : "text-gray-400"}`}>
            {ok
              ? <CheckCircleIcon className="size-3.5 flex-shrink-0" />
              : <XCircleIcon className="size-3.5 flex-shrink-0" />}
            {r.label}
          </li>
        );
      })}
    </ul>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function SignUp() {
  const toast = useRef(null);
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formValues, setFormValues] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // ── Frontend validation ──────────────────────────────────────────────────
  const validate = () => {
    const errors = {};

    // Login ID: 6-12 alphanumeric
    if (!formValues.username.trim()) {
      errors.username = "Login ID is required";
    } else if (!/^[a-zA-Z0-9]{6,12}$/.test(formValues.username.trim())) {
      errors.username = "Login ID must be 6–12 alphanumeric characters";
    }

    // Email
    if (!formValues.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formValues.email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    // Password strength
    const pwd = formValues.password;
    if (!pwd) {
      errors.password = "Password is required";
    } else if (pwd.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!rules.every((r) => r.test(pwd))) {
      errors.password = "Password does not meet all requirements";
    }

    // Confirm password
    if (!formValues.confirmPassword) {
      errors.confirmPassword = "Please re-enter your password";
    } else if (formValues.confirmPassword !== formValues.password) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const res = await AuthService.signup(formValues);

      if (res.success) {
        toast.current?.show({
          severity: "success",
          summary: "Account Created!",
          detail: res.message || "Your account has been created. You can now log in.",
          life: 4000,
        });
        // Short delay so user sees the toast, then redirect to login
        setTimeout(() => navigate("/login"), 1800);
      } else {
        const detail =
          res.error?.details?.[0]?.message ||
          res.error?.message ||
          res.message ||
          "Sign up failed. Please try again.";
        toast.current?.show({ severity: "error", summary: "Sign Up Failed", detail, life: 5000 });
      }
    } catch (err) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: err?.message || "An unexpected error occurred.",
        life: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const allRulesMet = rules.every((r) => r.test(formValues.password));

  return (
    <Page title="Sign Up">
      <Toast ref={toast} />
      <main className="min-h-100vh grid w-full grow grid-cols-1 place-items-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="w-full max-w-[28rem] p-4 sm:px-5">

          {/* Logo */}
          <div className="text-center">
            <Link to="/">
              <Logo className="mx-auto size-16" />
            </Link>
            <div className="mt-4">
              <h2 className="dark:text-dark-100 text-2xl font-semibold text-gray-700">
                Create Account
              </h2>
              <p className="dark:text-dark-300 text-sm text-gray-400">
                Fill in the details below to get started
              </p>
            </div>
          </div>

          {/* Card */}
          <Card className="mt-5 rounded-xl p-5 shadow-lg lg:p-7">
            <form onSubmit={handleSubmit} autoComplete="off" noValidate>
              <div className="space-y-4">

                {/* Login ID */}
                <Input
                  label="Enter Login ID"
                  name="username"
                  value={formValues.username}
                  onChange={handleChange}
                  placeholder="6–12 characters, letters & numbers"
                  disabled={isLoading}
                  prefix={<UserIcon className="size-5" strokeWidth="1" />}
                  error={formErrors.username}
                />

                {/* Email */}
                <Input
                  label="Enter Email ID"
                  name="email"
                  type="email"
                  value={formValues.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  disabled={isLoading}
                  prefix={<EnvelopeIcon className="size-5" strokeWidth="1" />}
                  error={formErrors.email}
                />

                {/* Password */}
                <div>
                  <Input
                    label="Enter Password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formValues.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    disabled={isLoading}
                    prefix={<LockClosedIcon className="size-5" strokeWidth="1" />}
                    suffix={
                      <span
                        className="cursor-pointer"
                        onClick={() => !isLoading && setShowPassword((p) => !p)}
                      >
                        {showPassword
                          ? <EyeSlashIcon className="size-5" strokeWidth="1" />
                          : <EyeIcon className="size-5" strokeWidth="1" />}
                      </span>
                    }
                    error={formErrors.password}
                  />
                  {/* Live password strength checklist */}
                  <PasswordRules password={formValues.password} />
                </div>

                {/* Confirm Password */}
                <Input
                  label="Re-Enter Password"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={formValues.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  disabled={isLoading}
                  prefix={<LockClosedIcon className="size-5" strokeWidth="1" />}
                  suffix={
                    <span
                      className="cursor-pointer"
                      onClick={() => !isLoading && setShowConfirm((p) => !p)}
                    >
                      {showConfirm
                        ? <EyeSlashIcon className="size-5" strokeWidth="1" />
                        : <EyeIcon className="size-5" strokeWidth="1" />}
                    </span>
                  }
                  error={formErrors.confirmPassword}
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="mt-6 w-full"
                color="primary"
                disabled={isLoading}
              >
                {isLoading && (
                  <span className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {isLoading ? "Creating Account..." : "SIGN UP"}
              </Button>
            </form>
          </Card>

          {/* Back to login */}
          <p className="mt-5 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-blue-500 hover:text-blue-600 transition-colors"
            >
              Sign In
            </Link>
          </p>

          {/* Footer links */}
          <div className="dark:text-dark-300 mt-4 flex justify-center gap-4 text-xs text-gray-400">
            <Link to="/privacy-notice" className="hover:text-gray-600 dark:hover:text-dark-100 transition-colors">
              Privacy Notice
            </Link>
            <div className="dark:bg-dark-500 my-0.5 w-px bg-gray-200" />
            <Link to="/terms-of-service" className="hover:text-gray-600 dark:hover:text-dark-100 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </main>
    </Page>
  );
}
