import React from "react";
import { Button } from "primereact/button";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { Page } from "components/shared/Page";
import ErrorIcon from "components/shared/ErrorIcon";

/**
 * Reusable error state component for bill pages
 * @param {Object} props
 * @param {Object} props.error - Error object with type, message, and description
 * @param {Function} props.onRetry - Callback for retry action (only shown for api_error type)
 * @param {string} props.title - Page title for error state
 */
export default function BillErrorState({ error, onRetry, title = "Error" }) {
  return (
    <Page title={title}>
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md text-center">
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <div className="mb-6">
              <ErrorIcon type={error.type} />
            </div>

            <h1 className="mb-2 text-xl font-bold text-gray-900">
              {error.message}
            </h1>

            <p className="text-sm text-gray-600">{error.description}</p>

            <div className="flex flex-col gap-3">
              {error.type === "api_error" && onRetry && (
                <Button
                  icon={<ArrowPathIcon className="h-4 w-4" />}
                  label="Retry"
                  onClick={onRetry}
                  className="w-full"
                  severity="info"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
