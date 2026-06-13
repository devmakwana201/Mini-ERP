import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const UOMService = {
  getFormattedUOMs: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  }) => {
    try {
      const response = await axios.get(`/uoms`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (uom) => ({
        uomid: uom.uomid,
        uomname: uom.uomname,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  createUOM: async (uomData) => {
    try {
      const response = await axios.post(`/uoms`, {
        uomname: uomData.uomName,
      });

      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getUOMById: async (uomId) => {
    try {
      const response = await axios.get(`/uoms/${uomId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  updateUOM: async (uomId, uomData) => {
    try {
      const response = await axios.put(`/uoms/${uomId}`, {
        uomname: uomData.uomName,
      });

      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  deleteUOM: async (uomId) => {
    try {
      const response = await axios.delete(`/uoms/${uomId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};
