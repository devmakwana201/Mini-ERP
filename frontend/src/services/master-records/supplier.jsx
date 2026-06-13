import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const SupplierService = {
  getFormattedSuppliers: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  }) => {
    try {
      const response = await axios.get(`/suppliers`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (supplier) => ({
        id: supplier.id,
        supplierid: supplier.supplierid,
        suppliername: supplier.suppliername,
        cityid: supplier.cityid,
        stateid: supplier.stateid,
        cityname: supplier.cityname,
        statename: supplier.statename,
        supplierimage: supplier.supplierimage,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  createSupplier: async (supplierData) => {
    try {
      const response = await axios.post(`/suppliers`, supplierData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getSupplierById: async (id) => {
    try {
      const response = await axios.get(`/suppliers/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  updateSupplier: async (id, supplierData) => {
    try {
      const response = await axios.put(`/suppliers/${id}`, supplierData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  deleteSupplier: async (id) => {
    try {
      const response = await axios.delete(`/suppliers/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};
