import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const AddonService = {
  getFormattedAddons: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  }) => {
    try {
      const response = await axios.get(`/addons`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (addon) => ({
        addonid: addon.addonid,
        addonname: addon.addonname,
        description: addon.description,
        limitation: addon.limitation,
        price: addon.price,
        duration: addon.duration,
        particularid: addon.particularid,
        particularname: addon.particularname,
        isactive: addon.isactive,
        created_at: addon.created_at,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  getActiveAddons: async () => {
    try {
      const response = await axios.get(`/addons/active`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getAddonById: async (id) => {
    try {
      const response = await axios.get(`/addons/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  createAddon: async (formData) => {
    try {
      const response = await axios.post("/addons", formData);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  updateAddon: async (id, formData) => {
    try {
      const response = await axios.put(`/addons/${id}`, formData);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  deleteAddon: async (id) => {
    try {
      const response = await axios.delete(`/addons/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  bulkDelete: async (addonIds) => {
    try {
      const response = await axios.post("/addons/bulk-delete", { addonIds });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};