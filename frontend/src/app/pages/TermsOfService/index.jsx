// Import Dependencies
import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeftIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { motion } from "motion/react";

// Local Imports
import { Page } from "components/shared/Page";
import Logo from "assets/appLogo2.svg?react";

// ----------------------------------------------------------------------

export default function TermsOfService() {
  return (
    <Page title="Terms of Service - Agro Manager">
      <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="mx-auto max-w-5xl px-4 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <Link
              to="/login"
              className="inline-block transition-transform hover:scale-105"
            >
              <Logo className="mx-auto mb-8 size-20 drop-shadow-lg" />
            </Link>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
            >
              <DocumentTextIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-4 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-4xl font-bold text-transparent dark:from-green-400 dark:to-blue-400"
            >
              Terms of Service
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-gray-600 dark:text-gray-300"
            >
              Your agreement with us • Last updated:{" "}
              {new Date().toLocaleDateString()}
            </motion.p>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="rounded-3xl bg-white/80 p-4 shadow-2xl backdrop-blur-sm lg:p-6 dark:bg-gray-800/80"
          >
            {/* Quick Summary */}
            <div className="mb-8 rounded-2xl bg-green-50 p-3 dark:bg-green-900/20">
              <h3 className="mb-4 text-xl font-semibold text-green-700 dark:text-green-400">
                📜 Terms at a Glance
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="mb-2 text-2xl">🤝</div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fair and transparent terms designed for agricultural
                    professionals
                  </div>
                </div>
                <div className="text-center">
                  <div className="mb-2 text-2xl">⚖️</div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Governed by Indian laws with dispute resolution in Delhi
                    courts
                  </div>
                </div>
                <div className="text-center">
                  <div className="mb-2 text-2xl">🔄</div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Flexible terms that can be terminated by either party
                    anytime
                  </div>
                </div>
              </div>
            </div>

            {/* Table of Contents */}
            <div className="mb-8 rounded-xl bg-gray-50 p-3 dark:bg-gray-700/50">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                📋 Table of Contents
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                {[
                  "Acceptance & Service Description",
                  "User Accounts & Responsibilities",
                  "Acceptable Use Policy",
                  "Intellectual Property Rights",
                  "Payment & Billing Terms",
                  "Service Availability",
                  "Agricultural Advice Disclaimer",
                  "Limitation of Liability",
                  "Termination & Changes",
                  "Legal & Contact Information",
                ].map((item, index) => (
                  <a
                    key={index}
                    href={`#tos-section-${index + 1}`}
                    className="text-sm text-green-600 hover:text-green-700 hover:underline dark:text-green-400 dark:hover:text-green-300"
                  >
                    {index + 1}. {item}
                  </a>
                ))}
              </div>
            </div>

            {/* Content Sections */}
            <div className="space-y-8">
              {/* Section 1 */}
              <section
                id="tos-section-1"
                className="rounded-xl border border-gray-200 p-3 dark:border-gray-600"
              >
                <h2 className="mb-4 flex items-center gap-3 text-2xl font-bold text-green-700 dark:text-green-400">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm dark:bg-green-900/50">
                    1
                  </span>
                  Acceptance & Service Description
                </h2>
                <div className="space-y-6">
                  <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                    <h4 className="mb-2 font-semibold text-green-700 dark:text-green-400">
                      ✅ Agreement Acceptance
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      By using Agro Manager, you agree to be bound by these
                      Terms of Service and all applicable laws and regulations.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                      <h4 className="mb-2 font-semibold text-blue-700 dark:text-blue-400">
                        🌾 Agricultural Tools
                      </h4>
                      <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        <li>• Crop monitoring and management</li>
                        <li>• Yield prediction and optimization</li>
                        <li>• Weather alerts and advisory</li>
                      </ul>
                    </div>
                    <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
                      <h4 className="mb-2 font-semibold text-purple-700 dark:text-purple-400">
                        📊 Business Management
                      </h4>
                      <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        <li>• Inventory and supply chain tracking</li>
                        <li>• Financial reporting and analysis</li>
                        <li>• Market insights and trends</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2 */}
              <section
                id="tos-section-2"
                className="rounded-xl border border-gray-200 p-3 dark:border-gray-600"
              >
                <h2 className="mb-4 flex items-center gap-3 text-2xl font-bold text-green-700 dark:text-green-400">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm dark:bg-green-900/50">
                    2
                  </span>
                  User Accounts & Responsibilities
                </h2>
                <div className="space-y-4">
                  <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                    <h4 className="mb-2 font-semibold text-blue-700 dark:text-blue-400">
                      🔐 Account Security
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Your Responsibilities:</strong>
                        <ul className="mt-2 space-y-1">
                          <li>• Keep login credentials secure</li>
                          <li>• Use strong, unique passwords</li>
                          <li>• Monitor account activity regularly</li>
                        </ul>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Immediate Actions Required:</strong>
                        <ul className="mt-2 space-y-1">
                          <li>• Report unauthorized access</li>
                          <li>• Update contact information</li>
                          <li>• Verify account details accuracy</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 3 */}
              <section
                id="tos-section-3"
                className="rounded-xl border border-gray-200 p-3 dark:border-gray-600"
              >
                <h2 className="mb-4 flex items-center gap-3 text-2xl font-bold text-green-700 dark:text-green-400">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm dark:bg-green-900/50">
                    3
                  </span>
                  Acceptable Use Policy
                </h2>
                <div className="space-y-4">
                  <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                    <h4 className="mb-2 font-semibold text-green-700 dark:text-green-400">
                      ✅ Allowed Activities
                    </h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        • Agricultural data management and analysis
                        <br />
                        • Farm planning and crop optimization
                        <br />• Educational and research purposes
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        • Collaboration with agricultural professionals
                        <br />
                        • Compliance with local farming regulations
                        <br />• Data export for personal use
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                    <h4 className="mb-2 font-semibold text-red-700 dark:text-red-400">
                      🚫 Prohibited Activities
                    </h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        • Violating any applicable laws
                        <br />
                        • Interfering with service operations
                        <br />• Unauthorized access attempts
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        • Uploading malicious content
                        <br />
                        • Spam or phishing activities
                        <br />• Sharing false agricultural information
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section
                id="tos-section-4"
                className="rounded-xl border border-gray-200 p-3 dark:border-gray-600"
              >
                <h2 className="mb-4 flex items-center gap-3 text-2xl font-bold text-green-700 dark:text-green-400">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm dark:bg-green-900/50">
                    4
                  </span>
                  Intellectual Property Rights
                </h2>
                <div className="space-y-4">
                  <div className="rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20">
                    <h4 className="mb-2 font-semibold text-orange-700 dark:text-orange-400">
                      ⚖️ Our Rights
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Agro Manager platform, algorithms, and proprietary
                      agricultural insights are protected by intellectual
                      property laws.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                      <h5 className="font-medium text-red-700 dark:text-red-400">
                        ❌ You May Not:
                      </h5>
                      <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        <li>• Reverse engineer our algorithms</li>
                        <li>• Copy or redistribute our content</li>
                        <li>• Remove proprietary notices</li>
                      </ul>
                    </div>
                    <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                      <h5 className="font-medium text-green-700 dark:text-green-400">
                        ✅ Your Data Rights:
                      </h5>
                      <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        <li>• You own your agricultural data</li>
                        <li>• Export data at any time</li>
                        <li>• Control sharing permissions</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 5 */}
              <section
                id="tos-section-5"
                className="rounded-xl border border-gray-200 p-3 dark:border-gray-600"
              >
                <h2 className="mb-4 flex items-center gap-3 text-2xl font-bold text-green-700 dark:text-green-400">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm dark:bg-green-900/50">
                    5
                  </span>
                  Payment & Billing Terms
                </h2>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-900/20">
                      <div className="mb-2 text-2xl">💳</div>
                      <h4 className="font-semibold text-blue-700 dark:text-blue-400">
                        Billing Cycles
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Monthly or Annual payment options
                      </p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
                      <div className="mb-2 text-2xl">🔄</div>
                      <h4 className="font-semibold text-green-700 dark:text-green-400">
                        Auto-Renewal
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Cancel anytime before next billing cycle
                      </p>
                    </div>
                    <div className="rounded-lg bg-purple-50 p-4 text-center dark:bg-purple-900/20">
                      <div className="mb-2 text-2xl">💰</div>
                      <h4 className="font-semibold text-purple-700 dark:text-purple-400">
                        Refunds
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        30-day money-back guarantee
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 6 - Agricultural Disclaimer */}
              <section
                id="tos-section-7"
                className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-600 dark:bg-yellow-900/20"
              >
                <h2 className="mb-4 flex items-center gap-3 text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-sm dark:bg-yellow-900/50">
                    ⚠️
                  </span>
                  Agricultural Advice Disclaimer
                </h2>
                <div className="rounded-lg bg-yellow-100 p-4 dark:bg-yellow-900/30">
                  <h4 className="mb-2 font-semibold text-yellow-700 dark:text-yellow-400">
                    🌾 Important Notice
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Information provided through our platform is for general
                    guidance only. Always consult with qualified agricultural
                    experts for specific farming decisions. Local conditions,
                    regulations, and best practices may vary.
                  </p>
                  <div className="mt-3 text-xs text-yellow-600 dark:text-yellow-400">
                    <strong>Remember:</strong> Agro Manager is a tool to assist
                    decision-making, not replace professional agricultural
                    consultation.
                  </div>
                </div>
              </section>

              {/* Contact Section */}
              <section
                id="tos-section-10"
                className="rounded-xl border border-gray-200 p-3 dark:border-gray-600"
              >
                <h2 className="mb-4 flex items-center gap-3 text-2xl font-bold text-green-700 dark:text-green-400">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm dark:bg-green-900/50">
                    10
                  </span>
                  Legal & Contact Information
                </h2>
                <div className="space-y-4">
                  <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                    <h4 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                      ⚖️ Governing Law
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      These terms are governed by Indian laws. Disputes will be
                      resolved in Delhi courts.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <a
                      href="mailto:sales@accreteinfo.com"
                      className="rounded-lg bg-green-50 p-4 text-center transition-all duration-200 hover:bg-green-100 hover:shadow-md dark:bg-green-900/20 dark:hover:bg-green-900/30"
                    >
                      <div className="mb-2 text-2xl">📧</div>
                      <h4 className="font-semibold text-green-700 dark:text-green-400">
                        Legal Inquiries
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        sales@accreteinfo.com
                      </p>
                    </a>
                    <a
                      href="tel:+919714774449"
                      className="rounded-lg bg-blue-50 p-4 text-center transition-all duration-200 hover:bg-blue-100 hover:shadow-md dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
                    >
                      <div className="mb-2 text-2xl">📞</div>
                      <h4 className="font-semibold text-blue-700 dark:text-blue-400">
                        Phone Support
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        +91 9714774449
                      </p>
                    </a>
                    <a
                      href="https://www.google.com/maps?q=23.193425,72.6380308"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-purple-50 p-4 text-center transition-all duration-200 hover:bg-purple-100 hover:shadow-md dark:bg-purple-900/20 dark:hover:bg-purple-900/30"
                    >
                      <div className="mb-2 text-2xl">📍</div>
                      <h4 className="font-semibold text-purple-700 dark:text-purple-400">
                        Office
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Ground Floor, Infocity Tower 1<br />
                        Gandhinagar, India
                      </p>
                    </a>
                  </div>
                </div>
              </section>
            </div>
          </motion.div>

          {/* Back to Login */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 text-center"
          >
            <Link
              to="/login"
              className="group inline-flex items-center gap-3 rounded-full bg-green-600 px-6 py-3 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-green-700 hover:shadow-xl dark:bg-green-500 dark:hover:bg-green-600"
            >
              <ArrowLeftIcon className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
              <span className="font-medium">Back to Login</span>
            </Link>
          </motion.div>
        </div>
      </main>
    </Page>
  );
}
