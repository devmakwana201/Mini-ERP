import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

// Font family constant used across all bill components
export const BILL_FONT_FAMILY =
  '"Noto Sans Gujarati", "Shruti", "Gujarati MT", "Kalinga", "Nirmala UI", Arial, sans-serif';

// OKLCH color fixes applied during export
export const OKLCH_COLOR_FIXES = [
  { from: "oklch(0.4531 0.1843 269.01)", to: "#2563eb" }, // blue-600
  { from: "oklch(0.9273 0.0132 269.01)", to: "#eff6ff" }, // blue-50
  { from: "oklch(1 0 0)", to: "#ffffff" }, // white
  { from: "oklch(0 0 0)", to: "#000000" }, // black
  { from: "oklch(0.2392 0 0)", to: "#374151" }, // gray-700
  { from: "oklch(0.4392 0 0)", to: "#6b7280" }, // gray-500
  { from: "oklch(0.5824 0 0)", to: "#9ca3af" }, // gray-400
  { from: "oklch(0.9273 0 0)", to: "#f3f4f6" }, // gray-100
];

/**
 * Apply OKLCH color fixes to an element during export
 * @param {HTMLElement} element - Element to fix colors for
 */
const applyColorFixes = (element) => {
  const computedStyle = window.getComputedStyle(element);

  // Fix oklch colors that might not render properly
  [
    "color",
    "backgroundColor",
    "borderColor",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
  ].forEach((prop) => {
    const value = computedStyle[prop];
    if (value && value.includes("oklch")) {
      const colorFix = OKLCH_COLOR_FIXES.find((fix) =>
        value.includes(fix.from),
      );
      if (colorFix) {
        element.style[prop] = colorFix.to;
      } else {
        // Fallback for other oklch values
        element.style[prop] = "#000000";
      }
    }
  });

  // Ensure text is visible
  if (
    element.tagName &&
    !element.classList.contains("text-blue-600") &&
    !element.classList.contains("text-blue-500")
  ) {
    const textColor = computedStyle.color;
    if (textColor.includes("oklch")) {
      element.style.color = "#000000";
    }
  }
};

/**
 * Common configuration for html-to-image
 * @param {HTMLElement} element - Element to export
 * @param {number} pixelRatio - Pixel ratio for quality
 * @returns {Object} html-to-image configuration
 */
const getImageConfig = (element, pixelRatio = 2) => ({
  quality: 1.0,
  pixelRatio,
  backgroundColor: "#ffffff",
  width: element.scrollWidth,
  height: element.scrollHeight,
  style: {
    // Ensure fonts are applied properly
    fontFamily: BILL_FONT_FAMILY,
    transform: "none",
    webkitTransform: "none",
  },
  filter: (node) => {
    // Filter out any unwanted elements (tooltips, etc.)
    if (node.classList && node.classList.contains("p-tooltip")) {
      return false;
    }
    return true;
  },
  preferredFontFormat: "woff2",
  onClone: (clonedDocument, clonedElement) => {
    // Ensure minimum width is maintained
    clonedElement.style.minWidth = "800px";
    clonedElement.style.width = "800px";

    // Fix any display issues
    const allElements = clonedElement.querySelectorAll("*");
    allElements.forEach((el) => {
      // Ensure proper font family is applied
      const computedStyle = window.getComputedStyle(el);
      if (
        computedStyle.fontFamily.includes("Noto Sans Gujarati") ||
        el.style.fontFamily.includes("Noto Sans Gujarati")
      ) {
        el.style.fontFamily = BILL_FONT_FAMILY;
      }

      // Apply color fixes
      applyColorFixes(el);
    });

    return clonedElement;
  },
});

/**
 * Generate and download PDF from HTML element
 * @param {HTMLElement} element - Element to convert to PDF
 * @param {string} filename - Name for the PDF file
 * @param {Object} toast - Toast notification reference
 * @returns {Promise<void>}
 */
export const generatePDF = async (element, filename, toast) => {
  try {
    if (!element) return;

    // Show loading toast
    toast.current?.show({
      severity: "info",
      summary: "Processing",
      detail: "Generating PDF...",
      life: 2000,
    });

    // Use html-to-image to capture the bill as PNG with good quality for PDF
    const dataUrl = await toPng(element, getImageConfig(element, 2));

    // Create image element to get dimensions
    const img = new Image();

    img.onload = () => {
      // Create PDF with A4 dimensions
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      // A4 dimensions in mm
      const pdfWidth = 210;
      const pdfHeight = 297;

      // Calculate image dimensions to fit A4 with margins
      const margin = 10; // 10mm margin
      const maxWidth = pdfWidth - 2 * margin;
      const maxHeight = pdfHeight - 2 * margin;

      // Calculate scaling to fit within margins
      const widthRatio = maxWidth / (img.width * 0.264583); // Convert px to mm (96 DPI)
      const heightRatio = maxHeight / (img.height * 0.264583);
      const scale = Math.min(widthRatio, heightRatio, 1); // Don't scale up

      const finalWidth = img.width * 0.264583 * scale;
      const finalHeight = img.height * 0.264583 * scale;

      // Center the image on the page
      const xPosition = (pdfWidth - finalWidth) / 2;
      const yPosition = margin;

      // Add the image to PDF
      pdf.addImage(
        dataUrl,
        "PNG",
        xPosition,
        yPosition,
        finalWidth,
        finalHeight,
        undefined,
        "FAST",
      );

      // Handle multi-page content if needed
      if (finalHeight > maxHeight) {
        let remainingHeight = finalHeight - maxHeight;
        let currentY = maxHeight + margin;

        while (remainingHeight > 0) {
          pdf.addPage();

          const pageHeight = Math.min(remainingHeight, maxHeight);

          // Create a cropped version for additional pages
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = img.width;
          canvas.height = (pageHeight / finalHeight) * img.height;

          ctx.drawImage(
            img,
            0,
            (currentY - margin) / scale / 0.264583,
            img.width,
            canvas.height,
            0,
            0,
            canvas.width,
            canvas.height,
          );

          const pageDataUrl = canvas.toDataURL("image/png", 1.0);

          pdf.addImage(
            pageDataUrl,
            "PNG",
            xPosition,
            margin,
            finalWidth,
            pageHeight,
            undefined,
            "FAST",
          );

          remainingHeight -= maxHeight;
          currentY += maxHeight;
        }
      }

      // Save the PDF
      pdf.save(filename);

      toast.current?.show({
        severity: "success",
        summary: "Success",
        detail: "PDF downloaded successfully!",
        life: 3000,
      });
    };

    img.onerror = () => {
      throw new Error("Failed to load image for PDF generation");
    };

    img.src = dataUrl;
  } catch (error) {
    console.error("PDF generation error:", error);
    toast.current?.show({
      severity: "error",
      summary: "Error",
      detail: "Failed to generate PDF. Please try again.",
      life: 3000,
    });
  }
};

/**
 * Generate and download PNG image from HTML element
 * @param {HTMLElement} element - Element to convert to image
 * @param {string} filename - Name for the image file
 * @param {Object} toast - Toast notification reference
 * @returns {Promise<void>}
 */
export const generateImage = async (element, filename, toast) => {
  try {
    if (!element) return;

    // Show loading toast
    toast.current?.show({
      severity: "info",
      summary: "Processing",
      detail: "Generating image...",
      life: 2000,
    });

    // Use html-to-image library for high resolution crisp quality
    const dataUrl = await toPng(element, getImageConfig(element, 3));

    // Create download link
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.current?.show({
      severity: "success",
      summary: "Success",
      detail: "Image downloaded successfully!",
      life: 3000,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    toast.current?.show({
      severity: "error",
      summary: "Error",
      detail: "Failed to download image. Please try again.",
      life: 3000,
    });
  }
};
