import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const WorkCenterService = {
  getAll: async (params = {}) => {
    try { const r = await axios.get("/work-centers", { params }); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getById: async (id) => {
    try { const r = await axios.get(`/work-centers/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  create: async (payload) => {
    try { const r = await axios.post("/work-centers", payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  update: async (id, payload) => {
    try { const r = await axios.put(`/work-centers/${id}`, payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  delete: async (id) => {
    try { const r = await axios.delete(`/work-centers/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
};

export const OperationService = {
  getAll: async (params = {}) => {
    try { const r = await axios.get("/operations", { params }); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getById: async (id) => {
    try { const r = await axios.get(`/operations/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  create: async (payload) => {
    try { const r = await axios.post("/operations", payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  update: async (id, payload) => {
    try { const r = await axios.put(`/operations/${id}`, payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  delete: async (id) => {
    try { const r = await axios.delete(`/operations/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
};
