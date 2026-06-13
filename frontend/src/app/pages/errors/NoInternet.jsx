import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { WifiIcon } from "@heroicons/react/24/outline";

const NoInternet = () => {
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = () => {
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
    }, 1000);
  };

  useEffect(() => {
    const handleOnline = () => {
      // No need to reload - let React handle the state change smoothly
      // The OfflineDetector component will automatically hide this page
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4 dark:from-gray-900 dark:to-gray-800">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl dark:bg-gray-800">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30"
          >
            <div className="relative">
              <WifiIcon className="h-12 w-12 text-red-500 dark:text-red-400" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-0.5 w-16 rotate-45 bg-red-500 dark:bg-red-400"></div>
              </div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100"
          >
            No Internet Connection
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-8 text-gray-600 dark:text-gray-400"
          >
            Please check your internet connection and try again. The page will
            automatically reload when connection is restored.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            <button
              onClick={checkConnection}
              disabled={isChecking}
              className="bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 flex w-full items-center justify-center space-x-2 rounded-lg px-6 py-3 font-semibold text-white transition-colors duration-200"
            >
              {isChecking ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Checking Connection...</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Retry Connection</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center">
                <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-red-500"></span>
                Offline
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700"
          >
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Troubleshooting Tips:
            </h3>
            <ul className="space-y-2 text-left text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start">
                <span className="text-primary-500 mr-2">•</span>
                Check your Wi-Fi or mobile data connection
              </li>
              <li className="flex items-start">
                <span className="text-primary-500 mr-2">•</span>
                Try restarting your router or modem
              </li>
              <li className="flex items-start">
                <span className="text-primary-500 mr-2">•</span>
                Disable airplane mode if enabled
              </li>
              <li className="flex items-start">
                <span className="text-primary-500 mr-2">•</span>
                Contact your internet service provider
              </li>
            </ul>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default NoInternet;
