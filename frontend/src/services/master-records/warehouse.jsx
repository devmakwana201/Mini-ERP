import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const WarehouseService = {
  getFormattedWarehouses: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  }) => {
    try {
      const response = await axios.get(`/warehouses`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (warehouse) => ({
        warehouseid: warehouse.warehouseid,
        warehousename: warehouse.warehousename,
        locationid: warehouse.locationid,
        locationname: warehouse.locationname,
        isdefaultwarehouse: warehouse.isdefaultwarehouse,
        createddate: warehouse.createddate,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  createWarehouse: async (formData) => {
    try {
      const payload = {
        warehousename: formData.warehouseName,
        locationid: formData.locationId,
        isdefaultwarehouse: formData.isDefaultWarehouse ? 1 : 0,
      };

      const response = await axios.post("/warehouses", payload);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  updateWarehouse: async (warehouseId, formData) => {
    try {
      const payload = {
        warehousename: formData.warehouseName,
        locationid: formData.locationId,
        isdefaultwarehouse: formData.isDefaultWarehouse ? 1 : 0,
      };

      const response = await axios.put(`/warehouses/${warehouseId}`, payload);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getWarehouseById: async (warehouseId) => {
    try {
      const response = await axios.get(`/warehouses/${warehouseId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  deleteWarehouse: async (warehouseId) => {
    try {
      const response = await axios.delete(`/warehouses/${warehouseId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};
