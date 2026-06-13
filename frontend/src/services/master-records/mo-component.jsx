import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const MOComponentService = {
  /**
   * Get all components for a Manufacturing Order
   */
  getMOComponents: async (moId) => {
    try {
      const response = await axios.get(`/mo/${moId}/components`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  /**
   * Manually add a single component to an MO
   */
  createMOComponent: async (moId, formData) => {
    try {
      const payload = {
        product_id: formData.product_id,
        qty_planned: formData.qty_planned,
        uom: formData.uom || "Unit",
        notes: formData.notes || null,
        is_available: formData.is_available || false,
      };

      const response = await axios.post(`/mo/${moId}/components`, payload);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  /**
   * Auto-create all components by exploding the BOM linked to this MO
   */
  explodeBOM: async (moId) => {
    try {
      const response = await axios.post(`/mo/${moId}/components/explode`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  /**
   * Record actual material consumed for a component
   */
  updateConsumedQty: async (moId, componentId, qtyConsumed) => {
    try {
      const response = await axios.put(`/mo/${moId}/components/${componentId}`, {
        qty_consumed: qtyConsumed,
      });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  /**
   * Remove a component from an MO
   */
  deleteMOComponent: async (moId, componentId) => {
    try {
      const response = await axios.delete(`/mo/${moId}/components/${componentId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};
