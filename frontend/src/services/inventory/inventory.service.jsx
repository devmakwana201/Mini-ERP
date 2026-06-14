import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const InventoryService = {
  getTransactions: async (params = {}) => {
    try { const r = await axios.get("/inventory/transactions", { params }); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getTransaction: async (id) => {
    try { const r = await axios.get(`/inventory/transactions/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getLedger: async (productId) => {
    try { const r = await axios.get(`/inventory/ledger/${productId}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getReservations: async (params = {}) => {
    try { const r = await axios.get("/inventory/reservations", { params }); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
};

export const WarehouseService = {
  getAll: async () => {
    try { const r = await axios.get("/warehouses"); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getById: async (id) => {
    try { const r = await axios.get(`/warehouses/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  create: async (payload) => {
    try { const r = await axios.post("/warehouses", payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  update: async (id, payload) => {
    try { const r = await axios.put(`/warehouses/${id}`, payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  delete: async (id) => {
    try { const r = await axios.delete(`/warehouses/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  // Locations
  getLocations: async (params = {}) => {
    try { const r = await axios.get("/warehouses/locations/all", { params }); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  createLocation: async (payload) => {
    try { const r = await axios.post("/warehouses/locations", payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  updateLocation: async (id, payload) => {
    try { const r = await axios.put(`/warehouses/locations/${id}`, payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  deleteLocation: async (id) => {
    try { const r = await axios.delete(`/warehouses/locations/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
};

export const ProcurementRuleService = {
  getAll: async (params = {}) => {
    try { const r = await axios.get("/procurement-rules", { params }); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getById: async (id) => {
    try { const r = await axios.get(`/procurement-rules/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  create: async (payload) => {
    try { const r = await axios.post("/procurement-rules", payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  update: async (id, payload) => {
    try { const r = await axios.put(`/procurement-rules/${id}`, payload); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  delete: async (id) => {
    try { const r = await axios.delete(`/procurement-rules/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  runCheck: async () => {
    try { const r = await axios.post("/procurement-rules/run"); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
};

export const DashboardService = {
  getSummary: async () => {
    try { const r = await axios.get("/dashboard"); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getSalesChart: async (period = 30) => {
    try { const r = await axios.get("/dashboard/sales-chart", { params: { period } }); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getInventorySummary: async () => {
    try { const r = await axios.get("/dashboard/inventory-summary"); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
};

export const AuditLogService = {
  getAll: async (params = {}) => {
    try { const r = await axios.get("/audit-logs", { params }); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
  getById: async (id) => {
    try { const r = await axios.get(`/audit-logs/${id}`); return responseHandler.handleSuccess(r); }
    catch (error) { return responseHandler.handleError(error); }
  },
};
