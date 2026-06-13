import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const EBillService = {
  getEBillById: async (id) => {
    try {
      const response = await axios.post(`/salesReceipts/ebill/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getSeedsBillById: async (id) => {
    try {
      const response = await axios.post(`/salesReceipts/ebill/seeds/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getPesticidesBillById: async (id) => {
    try {
      const response = await axios.post(`/salesReceipts/ebill/pesticides/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getFertilizersBillById: async (id) => {
    try {
      const response = await axios.post(`/salesReceipts/ebill/fertilizers/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  }
};