import React from "react";
import { Button } from "primereact/button";

/**
 * Reusable action bar component for bill pages with PDF and Image download buttons
 * @param {Object} props
 * @param {Function} props.onDownloadPDF - Callback for PDF download
 * @param {Function} props.onDownloadImage - Callback for image download
 * @param {string} props.className - Additional CSS classes
 */
export default function BillActionBar({
  onDownloadPDF,
  onDownloadImage,
  className = "",
}) {
  return (
    <div
      className={`fixed top-2 right-2 z-50 sm:top-4 sm:right-4 print:hidden ${className}`}
    >
      {/* Download Buttons */}
      <div className="flex gap-1 sm:gap-2">
        <Button
          type="button"
          icon="pi pi-file-pdf"
          rounded
          size="small"
          severity="warning"
          onClick={onDownloadPDF}
          title="Download as PDF"
        />
        <Button
          type="button"
          icon="pi pi-image"
          rounded
          size="small"
          severity="info"
          onClick={onDownloadImage}
          title="Download as Image"
        />
      </div>
    </div>
  );
}
