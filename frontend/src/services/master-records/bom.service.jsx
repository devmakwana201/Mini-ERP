import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const BomService = {
  getAll: async (params = {}) => {
    try {
      const response = await axios.get("/bom", {
        params: {
          start: params.start ?? Math.max(0, ((params.page || 1) - 1) * (params.limit || params.length || 20)),
          length: params.length || params.limit || 20,
          ...(params.filters && { filters: JSON.stringify(params.filters) }),
        },
      });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`/bom/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getItems: async (search = "") => {
    try {
      const response = await axios.get("/bom/items/search", { params: { search } });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  create: async (payload) => {
    try {
      const response = await axios.post("/bom", payload);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  update: async (id, payload) => {
    try {
      const response = await axios.put(`/bom/${id}`, payload);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  delete: async (id) => {
    try {
      const response = await axios.delete(`/bom/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};
