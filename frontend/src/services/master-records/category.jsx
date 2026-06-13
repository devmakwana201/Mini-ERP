import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const ItemCategoryService = {
  getFormattedItemCategories: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  }) => {
    try {
      const response = await axios.get(`/itemcategories`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (category) => ({
        itemcategoryid: category.itemcategoryid,
        itemcategoryname: category.itemcategoryname,
        displayname: category.displayname,
        gujratiname: category.gujratiname,
        parentcategoryid: category.parentcategoryid,
        itemcategorydesc: category.itemcategorydesc,
        itemcategoryorder: category.itemcategoryorder,
        itemcategoryimage: category.itemcategoryimage,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  createItemCategory: async (formData) => {
    try {
      const response = await axios.post("/itemcategories", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getItemCategoryById: async (id) => {
    try {
      const response = await axios.get(`/itemcategories/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  updateItemCategory: async (id, formData) => {
    try {
      const response = await axios.put(`/itemcategories/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  deleteItemCategory: async (id) => {
    try {
      const response = await axios.delete(`/itemcategories/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};
