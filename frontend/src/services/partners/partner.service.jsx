import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const PartnerService = {
  // LIST
  getAll: async (params = {}) => {
    try {
      const response = await axios.get("/partners", { params });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getVendors: async (params = {}) => {
    try {
      const response = await axios.get("/partners/vendors", { params });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getCustomers: async (params = {}) => {
    try {
      const response = await axios.get("/partners/customers", { params });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`/partners/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  create: async (payload) => {
    try {
      const response = await axios.post("/partners", payload);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  update: async (id, payload) => {
    try {
      const response = await axios.put(`/partners/${id}`, payload);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  delete: async (id) => {
    try {
      const response = await axios.delete(`/partners/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  // Product-vendor links
  getPartnerProducts: async (partnerId) => {
    try {
      const response = await axios.get(`/partners/${partnerId}/products`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  addProductLink: async (partnerId, payload) => {
    try {
      const response = await axios.post(`/partners/${partnerId}/products`, payload);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  removeProductLink: async (partnerId, productId) => {
    try {
      const response = await axios.delete(`/partners/${partnerId}/products/${productId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};
