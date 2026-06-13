import { useState } from "react";

/**
 * Custom hook for loading Google Fonts required by bill components
 * @returns {Object} { fontLoaded, preloadFont }
 */
export const useBillFontLoader = () => {
  const [fontLoaded, setFontLoaded] = useState(false);

  const preloadFont = async () => {
    try {
      // Create link element for Google Font
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = "https://fonts.googleapis.com";
      document.head.appendChild(link);

      const link2 = document.createElement("link");
      link2.rel = "preconnect";
      link2.href = "https://fonts.gstatic.com";
      link2.crossOrigin = "anonymous";
      document.head.appendChild(link2);

      const fontLink = document.createElement("link");
      fontLink.rel = "stylesheet";
      fontLink.href =
        "https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@100..900&family=Rasa:ital,wght@0,300..700;1,300..700&display=swap";
      document.head.appendChild(fontLink);

      // Wait for font to load using FontFaceSet API
      if (document.fonts) {
        await document.fonts.load('16px "Noto Sans Gujarati"');
        await document.fonts.ready;
      } else {
        // Fallback: wait a bit for font to load
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      setFontLoaded(true);
    } catch (error) {
      console.error("Font loading error:", error);
      // Even if font loading fails, show the content
      setFontLoaded(true);
    }
  };

  return { fontLoaded, preloadFont };
};
