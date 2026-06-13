import { useState, useEffect } from "react";
import { EBillService } from "services/reports/ebill";

// Map bill types to their respective API service methods
const serviceMap = {
  ebill: EBillService.getEBillById,
  seeds: EBillService.getSeedsBillById,
  pesticides: EBillService.getPesticidesBillById,
  fertilizers: EBillService.getFertilizersBillById,
};

/**
 * Custom hook for fetching bill data across different bill types
 * @param {string} billType - Type of bill ('ebill', 'seeds', 'pesticides', 'fertilizers')
 * @param {string} id - Bill ID
 * @param {Function} transformer - Function to transform API response to component format
 * @returns {Object} { billData, isLoading, error, retryFetch }
 */
export const useBillData = (billType, id, transformer) => {
  const [billData, setBillData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchBillData = async () => {
      try {
        setError(null);

        const service = serviceMap[billType];
        if (!service) {
          throw new Error(`Unknown bill type: ${billType}`);
        }

        const response = await service(id);

        if (response.success && response.data) {
          const { locationData, orderData, itemdetails } = response.data;

          // Check if we have empty data (equivalent to bill not found)
          const hasLocationData =
            locationData && Object.keys(locationData).length > 0;
          const hasOrderData = orderData && Object.keys(orderData).length > 0;

          // Check for item data based on bill type
          let hasItemData = false;
          if (billType === "ebill") {
            hasItemData =
              itemdetails &&
              ((itemdetails.seed && itemdetails.seed.length > 0) ||
                (itemdetails.fertilizer && itemdetails.fertilizer.length > 0) ||
                (itemdetails.pesticide && itemdetails.pesticide.length > 0) ||
                (itemdetails.otherproduct &&
                  itemdetails.otherproduct.length > 0));
          } else if (billType === "seeds") {
            hasItemData =
              itemdetails && itemdetails.seed && itemdetails.seed.length > 0;
          } else if (billType === "pesticides") {
            hasItemData =
              itemdetails &&
              itemdetails.pesticide &&
              itemdetails.pesticide.length > 0;
          } else if (billType === "fertilizers") {
            hasItemData =
              itemdetails &&
              itemdetails.fertilizer &&
              itemdetails.fertilizer.length > 0;
          }

          if (!hasLocationData && !hasOrderData && !hasItemData) {
            // Empty data means bill not found
            setError({
              type: "not_found",
              message: `Bill #${id} not found`,
              description:
                "The requested bill could not be found in our records. Please check the bill number and try again.",
            });
            return;
          }

          // Transform API response using provided transformer function
          const transformedData = transformer
            ? transformer(response.data)
            : response.data;
          setBillData(transformedData);
        } else {
          // API returned success: false or no data
          setError({
            type: "not_found",
            message: `Bill #${id} not found`,
            description:
              response.message ||
              "The requested bill could not be found in our records. Please check the bill number and try again.",
          });
        }
      } catch (err) {
        console.error("Error fetching bill data:", err);

        // Handle different types of errors using responseHandler structure
        if (err.success === false) {
          // This is a handled error from responseHandler
          if (
            err.message.includes("404") ||
            err.message.toLowerCase().includes("not found")
          ) {
            setError({
              type: "not_found",
              message: `Bill #${id} not found`,
              description:
                "The requested bill could not be found in our records. Please check the bill number and try again.",
            });
          } else if (
            err.message.includes("500") ||
            err.message.toLowerCase().includes("server error")
          ) {
            setError({
              type: "api_error",
              message: "Server error: Unable to connect to the database",
              description:
                "There was a problem with the server. Please try again later.",
            });
          } else if (
            err.message.toLowerCase().includes("timeout") ||
            err.message.toLowerCase().includes("network")
          ) {
            setError({
              type: "api_error",
              message: "Network timeout: Please check your internet connection",
              description:
                "The request timed out. Please check your internet connection and try again.",
            });
          } else {
            setError({
              type: "api_error",
              message: "Failed to fetch bill data",
              description:
                err.message ||
                "An unexpected error occurred while fetching the bill. Please try again.",
            });
          }
        } else {
          // Fallback for unexpected errors
          setError({
            type: "api_error",
            message: "Failed to fetch bill data",
            description:
              "An unexpected error occurred while fetching the bill. Please try again.",
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillData();
  }, [billType, id, retryCount, transformer]);

  const retryFetch = () => {
    setIsLoading(true);
    setError(null);
    setBillData(null);
    setRetryCount((prev) => prev + 1);
  };

  return {
    billData,
    isLoading,
    error,
    retryFetch,
  };
};
