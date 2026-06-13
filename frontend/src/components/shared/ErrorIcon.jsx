import React from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

/**
 * ErrorIcon component with buzzer animation effect
 * @param {Object} props
 * @param {'not_found' | 'api_error'} props.type - The type of error to display
 * @param {string} props.className - Additional CSS classes
 */
export default function ErrorIcon({ type = "api_error", className = "" }) {
  const isNotFound = type === "not_found";

  return (
    <div
      className={`relative mx-auto flex h-16 w-16 items-center justify-center ${className}`}
    >
      <div
        className={`absolute inset-0 animate-ping rounded-full ${isNotFound ? "bg-yellow-100" : "bg-red-100"}`}
      ></div>
      <div
        className={`animation-delay-75 absolute inset-2 animate-ping rounded-full ${isNotFound ? "bg-yellow-200" : "bg-red-200"}`}
      ></div>
      <div
        className={`relative flex h-16 w-16 items-center justify-center rounded-full ${isNotFound ? "bg-yellow-100" : "bg-red-100"}`}
      >
        <ExclamationTriangleIcon
          className={`h-8 w-8 ${isNotFound ? "text-yellow-600" : "text-red-600"}`}
        />
      </div>
    </div>
  );
}
