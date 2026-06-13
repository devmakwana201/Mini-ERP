import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const OperationService = {
  getFormattedOperations: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  }) => {
    try {
      const response = await axios.get(`/operations`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (op) => ({
        operation_id: op.operation_id,
        name: op.name,
        code: op.code,
        work_center_id: op.work_center_id,
        work_center_name: op.work_center_name,
        work_center_code: op.work_center_code,
        description: op.description,
        duration_minutes: op.duration_minutes,
        is_active: op.is_active,
        created_at: op.created_at,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  /**
   * Get all active operations for dropdowns.
   * @param {number|null} workCenterId - Optional: filter by work center
   */
  getActiveOperations: async (workCenterId = null) => {
    try {
      const response = await axios.get(`/operations/active`, {
        params: workCenterId ? { work_center_id: workCenterId } : {},
      });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getOperationById: async (operationId) => {
    try {
      const response = await axios.get(`/operations/${operationId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  createOperation: async (formData) => {
    try {
      const payload = {
        work_center_id: formData.work_center_id,
        name: formData.name,
        code: formData.code,
        description: formData.description || null,
        duration_minutes: formData.duration_minutes ?? 0.0,
        is_active: formData.is_active !== undefined ? formData.is_active : true,
      };

      const response = await axios.post("/operations", payload);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  updateOperation: async (operationId, formData) => {
    try {
      const payload = {
        work_center_id: formData.work_center_id,
        name: formData.name,
        code: formData.code,
        description: formData.description || null,
        duration_minutes: formData.duration_minutes,
        is_active: formData.is_active,
      };

      const response = await axios.put(`/operations/${operationId}`, payload);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  deleteOperation: async (operationId) => {
    try {
      const response = await axios.delete(`/operations/${operationId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};
