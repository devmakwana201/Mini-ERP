import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const SerialKeyService = {
  getFormattedSerialKeys: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  }) => {
    try {
      const response = await axios.get(`/serial/list`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (serialKey) => ({
        id: serialKey.id,
        serial_number: serialKey.serial_number,
        product_key: serialKey.product_key,
        client_mysql_password: serialKey.client_mysql_password,
        is_nfs: serialKey.is_nfs,
        free_demo: serialKey.free_demo,
        location_name: serialKey.location_name,
        is_active: serialKey.is_active,
        payment_pending: serialKey.payment_pending,
        activation_date: serialKey.activation_date,
        created_at: serialKey.created_at,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  createSerialKey: async (formData) => {
    try {
      const response = await axios.post("/serial/create", formData);

      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getSerialKeyReports: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  }) => {
    try {
      const response = await axios.get(`/serial/report`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (report) => ({
        serialid: report.serialid,
        is_nfs: report.is_nfs,
        locationname: report.locationname,
        contactno: report.contactno,
        createddate: report.createddate,
        is_active: report.is_active,
        suppliername: report.suppliername,
        serial_number: report.serial_number,
        product_key: report.product_key,
        activation_date: report.activation_date,
        activation_count: report.activation_count,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  getKeyCount: async () => {
    try {
      const response = await axios.get(`/serial/keycount`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};
