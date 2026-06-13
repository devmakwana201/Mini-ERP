import axios from "../../utils/axios";
import { responseHandler } from "../../utils/responseHandler";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const MaintenanceService = {
  checkMaintenanceStatus: async () => {
    try {
      // const response = await axios.get(`${BASE_URL}/maintenance/status`);

      const response = {
        success: 1,
        data: {
          maintenanceMode: false,
          message: "System is operational",
          timestamp: "2025-08-21T06:16:53.375Z",
        },
      };

      if (response.success === 1) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: { message: "Unable to check maintenance status" },
          maintenanceMode: false,
        };
      }
    } catch (error) {
      const result = responseHandler.handleError(error);
      console.error("Error checking maintenance status:", result.error);
      // If maintenance endpoint fails, assume system is operational
      return {
        success: false,
        error: result.error,
        maintenanceMode: false,
      };
    }
  },
};
