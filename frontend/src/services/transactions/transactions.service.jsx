import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const SalesOrderService = {
  getAll: async (params = {}) => {
    try { const r = await axios.get("/sales-orders", { params }); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getStats: async () => {
    try { const r = await axios.get("/sales-orders/stats"); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getById: async (id) => {
    try { const r = await axios.get(`/sales-orders/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  create: async (payload) => {
    try { const r = await axios.post("/sales-orders", payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  update: async (id, payload) => {
    try { const r = await axios.put(`/sales-orders/${id}`, payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  delete: async (id) => {
    try { const r = await axios.delete(`/sales-orders/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  confirm: async (id) => {
    try { const r = await axios.post(`/sales-orders/${id}/confirm`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  deliver: async (id, delivery_lines) => {
    try { const r = await axios.post(`/sales-orders/${id}/deliver`, { delivery_lines }); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  cancel: async (id) => {
    try { const r = await axios.post(`/sales-orders/${id}/cancel`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  addLine: async (id, payload) => {
    try { const r = await axios.post(`/sales-orders/${id}/lines`, payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  updateLine: async (id, solId, payload) => {
    try { const r = await axios.put(`/sales-orders/${id}/lines/${solId}`, payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  removeLine: async (id, solId) => {
    try { const r = await axios.delete(`/sales-orders/${id}/lines/${solId}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  createFromPO: async (poId) => {
    try { const r = await axios.post(`/sales-orders/from-po/${poId}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
};

export const PurchaseOrderService = {
  getAll: async (params = {}) => {
    try { const r = await axios.get("/purchase-orders", { params }); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getStats: async () => {
    try { const r = await axios.get("/purchase-orders/stats"); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getById: async (id) => {
    try { const r = await axios.get(`/purchase-orders/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  create: async (payload) => {
    try { const r = await axios.post("/purchase-orders", payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  update: async (id, payload) => {
    try { const r = await axios.put(`/purchase-orders/${id}`, payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  delete: async (id) => {
    try { const r = await axios.delete(`/purchase-orders/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  send: async (id) => {
    try { const r = await axios.post(`/purchase-orders/${id}/send`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  confirm: async (id) => {
    try { const r = await axios.post(`/purchase-orders/${id}/confirm`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  receive: async (id, receive_lines) => {
    try { const r = await axios.post(`/purchase-orders/${id}/receive`, { receive_lines }); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  cancel: async (id) => {
    try { const r = await axios.post(`/purchase-orders/${id}/cancel`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
};

export const ManufacturingOrderService = {
  getAll: async (params = {}) => {
    try { const r = await axios.get("/manufacturing-orders", { params }); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getStats: async () => {
    try { const r = await axios.get("/manufacturing-orders/stats"); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getById: async (id) => {
    try { const r = await axios.get(`/manufacturing-orders/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  create: async (payload) => {
    try { const r = await axios.post("/manufacturing-orders", payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  update: async (id, payload) => {
    try { const r = await axios.put(`/manufacturing-orders/${id}`, payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  delete: async (id) => {
    try { const r = await axios.delete(`/manufacturing-orders/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  confirm: async (id) => {
    try { const r = await axios.post(`/manufacturing-orders/${id}/confirm`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  start: async (id) => {
    try { const r = await axios.post(`/manufacturing-orders/${id}/start`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  produce: async (id, qty_to_produce) => {
    try { const r = await axios.post(`/manufacturing-orders/${id}/produce`, { qty_to_produce }); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  cancel: async (id) => {
    try { const r = await axios.post(`/manufacturing-orders/${id}/cancel`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
};

export const WorkOrderService = {
  getAll: async (params = {}) => {
    try { const r = await axios.get("/work-orders", { params }); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getById: async (id) => {
    try { const r = await axios.get(`/work-orders/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  update: async (id, payload) => {
    try { const r = await axios.put(`/work-orders/${id}`, payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  start: async (id) => {
    try { const r = await axios.post(`/work-orders/${id}/start`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  complete: async (id) => {
    try { const r = await axios.post(`/work-orders/${id}/complete`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  cancel: async (id) => {
    try { const r = await axios.post(`/work-orders/${id}/cancel`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
};
