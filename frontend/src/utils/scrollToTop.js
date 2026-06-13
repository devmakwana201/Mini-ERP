/**
 * Smoothly scrolls to the top of the page
 * @param {Object} options - Scroll options
 * @param {number} options.top - Target scroll position (default: 0)
 * @param {string} options.behavior - Scroll behavior (default: 'smooth')
 */
export const scrollToTop = (options = {}) => {
  const { top = 0, behavior = "smooth" } = options;

  window.scrollTo({
    top,
    behavior,
  });
};

/**
 * Scrolls to a specific element
 * @param {string|Element} element - Element selector or element reference
 * @param {Object} options - Scroll options
 */
export const scrollToElement = (element, options = {}) => {
  const { behavior = "smooth", block = "start" } = options;

  const targetElement =
    typeof element === "string" ? document.querySelector(element) : element;

  if (targetElement) {
    targetElement.scrollIntoView({
      behavior,
      block,
    });
  }
};
