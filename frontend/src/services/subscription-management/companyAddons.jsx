import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const CompanyAddonService = {
  getFormattedCompanyAddons: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  }) => {
    try {
      const response = await axios.get(`/company-addons`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (companyAddon) => ({
        companyaddonid: companyAddon.companyaddonid,
        companyid: companyAddon.companyid,
        companyname: companyAddon.companyname,
        addonid: companyAddon.addonid,
        addonname: companyAddon.addonname,
        price: companyAddon.price,
        startdate: companyAddon.startdate,
        enddate: companyAddon.enddate,
        isactive: companyAddon.isactive,
        created_at: companyAddon.created_at,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  getCompanyAddons: async (companyid, {
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  } = {}) => {
    try {
      const response = await axios.get(`/company-addons/company/${companyid}`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (companyAddon) => ({
        companyaddonid: companyAddon.companyaddonid,
        addonname: companyAddon.addonname,
        price: companyAddon.price,
        startdate: companyAddon.startdate,
        enddate: companyAddon.enddate,
        isactive: companyAddon.isactive,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  getAvailableAddons: async (companyid) => {
    try {
      const response = await axios.get(`/company-addons/company/${companyid}/available`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getCompanyAddonById: async (id) => {
    try {
      const response = await axios.get(`/company-addons/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  addAddonToCompany: async (companyid, formData) => {
    try {
      const response = await axios.post(`/company-addons/company/${companyid}/addons`, formData);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  updateCompanyAddon: async (id, formData) => {
    try {
      const response = await axios.put(`/company-addons/${id}`, formData);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  renewCompanyAddon: async (id, extensionDays) => {
    try {
      const response = await axios.put(`/company-addons/${id}/renew`, { extensionDays });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  deactivateCompanyAddon: async (id) => {
    try {
      const response = await axios.delete(`/company-addons/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getExpiringCompanyAddons: async (days = 7) => {
    try {
      const response = await axios.get(`/company-addons/expiring?days=${days}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  bulkDeactivateCompanyAddons: async (companyaddonIds) => {
    try {
      const response = await axios.post("/company-addons/bulk-deactivate", { companyaddonIds });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};