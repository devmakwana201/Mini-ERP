import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const ProductService = {
  getAll: async (params = {}) => {
    try {
      const response = await axios.get("/products", { params });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getLowStock: async (params = {}) => {
    try {
      const response = await axios.get("/products/low-stock", { params });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`/products/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  create: async (payload) => {
    try {
      const response = await axios.post("/products", payload);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  update: async (id, payload) => {
    try {
      const response = await axios.put(`/products/${id}`, payload);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  delete: async (id) => {
    try {
      const response = await axios.delete(`/products/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  adjustStock: async (id, payload) => {
    try {
      const response = await axios.put(`/products/${id}/stock`, payload);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  // Vendor links
  getVendors: async (id) => {
    try {
      const response = await axios.get(`/products/${id}/vendors`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  addVendor: async (id, payload) => {
    try {
      const response = await axios.post(`/products/${id}/vendors`, payload);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  updateVendor: async (id, pvId, payload) => {
    try {
      const response = await axios.put(`/products/${id}/vendors/${pvId}`, payload);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  deactivateVendor: async (id, pvId) => {
    try {
      const response = await axios.delete(`/products/${id}/vendors/${pvId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};
