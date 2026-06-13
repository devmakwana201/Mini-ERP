/**
 * Global auto-focus functionality for PrimeReact dropdowns with filter/search capability
 * This utility automatically focuses the search input when a dropdown with filter is opened
 */

class DropdownAutoFocus {
  constructor() {
    this.observer = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    // Use MutationObserver to detect when dropdown panels are added to DOM
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.handleNewNode(node);
            }
          });
        }
      });
    });

    // Start observing the document
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.isInitialized = true;
  }

  handleNewNode(node) {
    // Check if it's a dropdown panel
    if (node.classList && node.classList.contains("p-dropdown-panel")) {
      this.focusFilterInput(node);
    }

    // Also check for MultiSelect panels
    if (node.classList && node.classList.contains("p-multiselect-panel")) {
      this.focusFilterInput(node);
    }

    // Check for nested dropdown/multiselect panels
    const dropdownPanels = node.querySelectorAll(".p-dropdown-panel");
    const multiselectPanels = node.querySelectorAll(".p-multiselect-panel");

    [...dropdownPanels, ...multiselectPanels].forEach((panel) => {
      this.focusFilterInput(panel);
    });
  }

  focusFilterInput(panel) {
    // Look for different types of filter inputs
    const selectors = [
      ".p-dropdown-filter", // Dropdown filter
      ".p-multiselect-filter", // MultiSelect filter
      ".p-dropdown-filter-input", // Alternative dropdown filter
      ".p-multiselect-filter-input", // Alternative multiselect filter
      'input[placeholder*="Search"]', // Generic search input
      'input[placeholder*="Filter"]', // Generic filter input
    ];

    for (const selector of selectors) {
      const filterInput = panel.querySelector(selector);
      if (filterInput) {
        // Small delay to ensure panel is fully rendered and positioned
        setTimeout(() => {
          try {
            filterInput.focus();
            // Optional: Select all text if there's any
            if (filterInput.value) {
              filterInput.select();
            }

            // Keep focus on filter input and prevent focus loss to options
            this.maintainFilterFocus(filterInput, panel);
          } catch (error) {
            // Silently handle any focus errors
            console.debug("Auto-focus failed for dropdown filter:", error);
          }
        }, 100);
        break; // Stop after first successful match
      }
    }
  }

  maintainFilterFocus(filterInput, panel) {
    // Prevent focus loss when hovering over dropdown options
    const handleFocusOut = (event) => {
      // Only refocus if focus is moving to a dropdown option within the same panel
      const relatedTarget = event.relatedTarget;

      if (relatedTarget && panel.contains(relatedTarget)) {
        // Check if focus is moving to a dropdown option
        if (
          relatedTarget.matches(
            '.p-dropdown-item, .p-multiselect-item, [role="option"]',
          )
        ) {
          // Prevent the focus change and keep it on filter input
          setTimeout(() => {
            if (document.contains(filterInput)) {
              filterInput.focus();
            }
          }, 0);
        }
      }
    };

    // Handle mouse hover over options (which triggers focus change)
    const handleOptionHover = (event) => {
      const target = event.target;
      if (
        target.matches('.p-dropdown-item, .p-multiselect-item, [role="option"]')
      ) {
        // Immediately refocus the filter input
        setTimeout(() => {
          if (document.contains(filterInput)) {
            filterInput.focus();
          }
        }, 0);
      }
    };

    // Handle clicks on options (we should allow this to work normally)
    const handleOptionClick = (event) => {
      const target = event.target;
      if (
        target.matches('.p-dropdown-item, .p-multiselect-item, [role="option"]')
      ) {
        // Remove event listeners as option is being selected
        this.removeFocusListeners(
          filterInput,
          panel,
          handleFocusOut,
          handleOptionHover,
          handleOptionClick,
        );
      }
    };

    // Add event listeners
    filterInput.addEventListener("focusout", handleFocusOut);
    panel.addEventListener("mouseover", handleOptionHover);
    panel.addEventListener("click", handleOptionClick);

    // Store listeners for cleanup
    filterInput._autoFocusListeners = {
      handleFocusOut,
      handleOptionHover,
      handleOptionClick,
      panel,
    };

    // Auto-cleanup when panel is removed from DOM
    const panelObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node === panel || (node.contains && node.contains(panel))) {
            this.removeFocusListeners(
              filterInput,
              panel,
              handleFocusOut,
              handleOptionHover,
              handleOptionClick,
            );
            panelObserver.disconnect();
          }
        });
      });
    });

    panelObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  removeFocusListeners(
    filterInput,
    panel,
    handleFocusOut,
    handleOptionHover,
    handleOptionClick,
  ) {
    if (filterInput && handleFocusOut) {
      filterInput.removeEventListener("focusout", handleFocusOut);
    }
    if (panel && handleOptionHover) {
      panel.removeEventListener("mouseover", handleOptionHover);
    }
    if (panel && handleOptionClick) {
      panel.removeEventListener("click", handleOptionClick);
    }

    // Clear stored listeners
    if (filterInput._autoFocusListeners) {
      delete filterInput._autoFocusListeners;
    }
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isInitialized = false;
  }
}

// Create global instance
const dropdownAutoFocus = new DropdownAutoFocus();

// Auto-initialize when DOM is ready
function initializeDropdownAutoFocus() {
  dropdownAutoFocus.init();
}

// Initialize based on document state
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeDropdownAutoFocus);
} else {
  initializeDropdownAutoFocus();
}

// Export for manual control if needed
export default dropdownAutoFocus;
