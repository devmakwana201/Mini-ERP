import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const ParticularService = {
  getFormattedParticulars: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  }) => {
    try {
      const response = await axios.get(`/particulars`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (particular) => ({
        particularid: particular.particularid,
        name: particular.name,
        isactive: particular.isactive,
        created_at: particular.created_at,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  getActiveParticulars: async () => {
    try {
      const response = await axios.get(`/particulars/active`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getParticularById: async (id) => {
    try {
      const response = await axios.get(`/particulars/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  createParticular: async (formData) => {
    try {
      const response = await axios.post("/particulars", formData);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  updateParticular: async (id, formData) => {
    try {
      const response = await axios.put(`/particulars/${id}`, formData);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  deleteParticular: async (id) => {
    try {
      const response = await axios.delete(`/particulars/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};