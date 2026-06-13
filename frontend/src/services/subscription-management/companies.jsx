import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const CompanyService = {
  getFormattedCompanies: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  }) => {
    try {
      const response = await axios.get(`/companies`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (company) => ({
        companyid: company.companyid,
        companyname: company.companyname,
        companyemailid: company.companyemailid,
        companycontactnumber: company.companycontactnumber,
        address: company.address,
        planname: company.planname,
        expirydate: company.expirydate,
        serialKey: company.serialKey,
        isactive: company.isactive,
        created_at: company.created_at,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  getCompanyById: async (id) => {
    try {
      const response = await axios.get(`/companies/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  registerCompany: async (formData) => {
    try {
      const response = await axios.post("/companies/register", formData);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  updateCompany: async (id, formData) => {
    try {
      const response = await axios.put(`/companies/${id}`, formData);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  updateCompanyPlan: async (id, planData) => {
    try {
      const response = await axios.put(`/companies/${id}/plan`, planData);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getCompanyPlanHistory: async (id) => {
    try {
      const response = await axios.get(`/companies/${id}/plan-history`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  deleteCompany: async (id) => {
    try {
      const response = await axios.delete(`/companies/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getExpiringPlans: async (days = 30) => {
    try {
      const response = await axios.get(`/companies/expiring-plans?days=${days}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};