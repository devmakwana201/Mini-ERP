import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const PlanService = {
  getFormattedPlans: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  }) => {
    try {
      const response = await axios.get(`/plans`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (plan) => ({
        planid: plan.planid,
        planname: plan.planname,
        description: plan.description,
        price: plan.price,
        amc_charges: plan.amc_charges,
        duration: plan.duration,
        frequency: plan.frequency,
        is_trial: plan.is_trial,
        isactive: plan.isactive,
        startdate: plan.startdate,
        enddate: plan.enddate,
        created_at: plan.created_at,
        details: plan.details || [],
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  getActivePlans: async () => {
    try {
      const response = await axios.get(`/plans/active`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getPlanById: async (id) => {
    try {
      const response = await axios.get(`/plans/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  createPlan: async (formData) => {
    try {
      const response = await axios.post("/plans", formData);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  updatePlan: async (id, formData) => {
    try {
      const response = await axios.put(`/plans/${id}`, formData);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  deletePlan: async (id) => {
    try {
      const response = await axios.delete(`/plans/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};