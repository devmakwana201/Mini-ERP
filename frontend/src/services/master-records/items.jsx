import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const ItemService = {
  getFormattedItems: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  }) => {
    try {
      const response = await axios.get(`/items`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (item) => ({
        itemid: item.itemid,
        itemname: item.itemname,
        itemdisplayname: item.itemdisplayname,
        genericname: item.genericname,
        itemcode: item.itemcode,
        sellingprice: item.sellingprice,
        brandname: item.brandname,
        taxprofilename: item.taxprofilename,
        mastercatname: item.mastercatname,
        catname: item.catname,
        subcatname: item.subcatname,
        imgpath: item.imgpath,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  createItem: async (formData) => {
    try {
      const response = await axios.post("/items", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getItemById: async (itemId) => {
    try {
      const response = await axios.get(`/items/${itemId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  updateItem: async (itemId, formData) => {
    try {
      const response = await axios.put(`/items/${itemId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  deleteItem: async (itemId) => {
    try {
      const response = await axios.delete(`/items/${itemId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  downloadSampleExcel: async () => {
    try {
      const response = await axios.get('/items/import/sample', {
        responseType: 'blob',
      });

      // Get filename from headers
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : 'product_import_template.xlsx';

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Sample template downloaded successfully' };
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  validateImport: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/items/import/validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  confirmImport: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/items/import/confirm', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};