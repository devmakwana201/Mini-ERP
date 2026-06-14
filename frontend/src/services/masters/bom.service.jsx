import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

// BOM service — uses /bom endpoint (bom-v4 was old legacy path)
export const BomService = {
  getAll: async (params = {}) => {
    try { const r = await axios.get("/bom", { params }); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getById: async (id) => {
    try { const r = await axios.get(`/bom/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getByProduct: async (productId) => {
    try { const r = await axios.get(`/bom/product/${productId}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  create: async (payload) => {
    try { const r = await axios.post("/bom", payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  update: async (id, payload) => {
    try { const r = await axios.put(`/bom/${id}`, payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  delete: async (id) => {
    try { const r = await axios.delete(`/bom/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  addLine: async (id, payload) => {
    try { const r = await axios.post(`/bom/${id}/lines`, payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  updateLine: async (id, lineId, payload) => {
    try { const r = await axios.put(`/bom/${id}/lines/${lineId}`, payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  removeLine: async (id, lineId) => {
    try { const r = await axios.delete(`/bom/${id}/lines/${lineId}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
};
