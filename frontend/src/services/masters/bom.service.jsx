import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const BomService = {
  getAll: async (params = {}) => {
    try { const r = await axios.get("/bom-v4", { params }); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getById: async (id) => {
    try { const r = await axios.get(`/bom-v4/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getByProduct: async (productId) => {
    try { const r = await axios.get(`/bom-v4/product/${productId}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  create: async (payload) => {
    try { const r = await axios.post("/bom-v4", payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  update: async (id, payload) => {
    try { const r = await axios.put(`/bom-v4/${id}`, payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  delete: async (id) => {
    try { const r = await axios.delete(`/bom-v4/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  addLine: async (id, payload) => {
    try { const r = await axios.post(`/bom-v4/${id}/lines`, payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  updateLine: async (id, lineId, payload) => {
    try { const r = await axios.put(`/bom-v4/${id}/lines/${lineId}`, payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  removeLine: async (id, lineId) => {
    try { const r = await axios.delete(`/bom-v4/${id}/lines/${lineId}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
};
