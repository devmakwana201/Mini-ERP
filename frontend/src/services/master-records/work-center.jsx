import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const WorkCenterService = {
  getFormattedWorkCenters: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  }) => {
    try {
      const response = await axios.get(`/work-centers`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (wc) => ({
        work_center_id: wc.work_center_id,
        name: wc.name,
        code: wc.code,
        description: wc.description,
        capacity_per_day: wc.capacity_per_day,
        cost_per_hour: wc.cost_per_hour,
        is_active: wc.is_active,
        created_at: wc.created_at,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  getActiveWorkCenters: async () => {
    try {
      const response = await axios.get(`/work-centers/active`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getWorkCenterById: async (workCenterId) => {
    try {
      const response = await axios.get(`/work-centers/${workCenterId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  createWorkCenter: async (formData) => {
    try {
      const payload = {
        name: formData.name,
        code: formData.code,
        description: formData.description || null,
        capacity_per_day: formData.capacity_per_day ?? 8.0,
        cost_per_hour: formData.cost_per_hour ?? 0.0,
        is_active: formData.is_active !== undefined ? formData.is_active : true,
      };

      const response = await axios.post("/work-centers", payload);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  updateWorkCenter: async (workCenterId, formData) => {
    try {
      const payload = {
        name: formData.name,
        code: formData.code,
        description: formData.description || null,
        capacity_per_day: formData.capacity_per_day,
        cost_per_hour: formData.cost_per_hour,
        is_active: formData.is_active,
      };

      const response = await axios.put(`/work-centers/${workCenterId}`, payload);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  deleteWorkCenter: async (workCenterId) => {
    try {
      const response = await axios.delete(`/work-centers/${workCenterId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};
