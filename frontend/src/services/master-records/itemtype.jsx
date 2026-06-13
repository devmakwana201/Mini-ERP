import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const ItemTypeService = {
  getFormattedItemTypes: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  }) => {
    try {
      const response = await axios.get(`/itemtypes`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (itemType) => ({
        itemtypeid: itemType.itemtypeid,
        itemtypename: itemType.itemtypename,
        itemtypedesc: itemType.itemtypedesc,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  createItemType: async (itemTypeData) => {
    try {
      const response = await axios.post(`/itemtypes`, {
        itemtypename: itemTypeData.itemTypeName,
        itemtypedesc: itemTypeData.itemTypeDescription,
      });

      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getItemTypeById: async (itemTypeId) => {
    try {
      const response = await axios.get(`/itemtypes/${itemTypeId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  updateItemType: async (itemTypeId, itemTypeData) => {
    try {
      const response = await axios.put(`/itemtypes/${itemTypeId}`, {
        itemtypename: itemTypeData.itemTypeName,
        itemtypedesc: itemTypeData.itemTypeDescription,
      });

      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  deleteItemType: async (itemTypeId) => {
    try {
      const response = await axios.delete(`/itemtypes/${itemTypeId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};
