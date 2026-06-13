import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { EnvelopeIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

import Logo from "assets/appLogo2.svg?react";
import { Button, Card, Input } from "components/ui";
import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { AuthService } from "services/auth/auth.service";

// ─── Component ─────────────────────────────────────────────────────────────

export default function ForgotPassword() {
  const toast = useRef(null);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      setEmailError("Email is required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (emailError) setEmailError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const res = await AuthService.forgotPassword(email.trim());

      // Always show success (backend doesn't reveal if email exists)
      setSubmitted(true);
      toast.current?.show({
        severity: "success",
        summary: "Email Sent",
        detail: "If this email is registered, a password reset link has been sent.",
        life: 5000,
      });
    } catch (err) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: err?.message || "An unexpected error occurred. Please try again.",
        life: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Page title="Forgot Password">
      <Toast ref={toast} />
      <main className="min-h-100vh grid w-full grow grid-cols-1 place-items-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="w-full max-w-[26rem] p-4 sm:px-5">

          {/* Logo */}
          <div className="text-center">
            <Link to="/">
              <Logo className="mx-auto size-16" />
            </Link>
            <div className="mt-4">
              <h2 className="dark:text-dark-100 text-2xl font-semibold text-gray-700">
                Forgot Password
              </h2>
              <p className="dark:text-dark-300 text-sm text-gray-400 mt-1">
                Enter your registered email address and we&apos;ll send you a reset link.
              </p>
            </div>
          </div>

          {/* Card */}
          <Card className="mt-5 rounded-xl p-5 shadow-lg lg:p-7">
            {submitted ? (
              /* ── Success state ── */
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircleIcon className="size-12 text-green-500" />
                <p className="text-sm font-medium text-gray-700 dark:text-dark-100">
                  Check your inbox
                </p>
                <p className="text-xs text-gray-400 dark:text-dark-300">
                  If <span className="font-medium text-gray-600 dark:text-dark-200">{email}</span>{" "}
                  is registered, a password reset link has been sent. Check your spam folder if you don&apos;t see it.
                </p>
                <Button
                  type="button"
                  className="mt-2 w-full"
                  color="primary"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                  }}
                >
                  Try another email
                </Button>
              </div>
            ) : (
              /* ── Form state ── */
              <form onSubmit={handleSubmit} autoComplete="off" noValidate>
                <div className="space-y-4">
                  <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    value={email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    disabled={isLoading}
                    prefix={<EnvelopeIcon className="size-5" strokeWidth="1" />}
                    error={emailError}
                  />
                </div>

                <Button
                  type="submit"
                  className="mt-6 w-full"
                  color="primary"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <span className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            )}
          </Card>

          {/* Back to login */}
          <p className="mt-5 text-center text-sm text-gray-400">
            Remember your password?{" "}
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
