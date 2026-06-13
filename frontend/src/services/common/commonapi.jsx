import axios from "axios";
import { responseHandler } from "utils/responseHandler";
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const CommonApi = {
  getMasterCategoryList: async () => {
    try {
      const response = await axios.get(`${BASE_URL}/common/getsubcategory`);
      const result = responseHandler.handleSuccess(response);
      if (result.success && result.data) {
        return result.data.map((item) => ({
          label: item.itemcategoryname,
          value: item.itemcategoryid,
        }));
      }
      return [];
    } catch (error) {
      const result = responseHandler.handleError(error);
      console.error("Error fetching master category list:", result.error);
      return [];
    }
  },

  getCategoryList: async (masterCategoryId) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/common/getsubcategory/${masterCategoryId}`,
      );
      const result = responseHandler.handleSuccess(response);
      if (result.success && result.data) {
        return result.data.map((item) => ({
          label: item.itemcategoryname,
          value: item.itemcategoryid,
        }));
      }
      return [];
    } catch (error) {
      const result = responseHandler.handleError(error);
      console.error("Error fetching category list:", result.error);
      return [];
    }
  },

  getSubCategoryList: async (categoryId) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/common/getsubcategory/${categoryId}`,
      );
      const result = responseHandler.handleSuccess(response);
      if (result.success && result.data) {
        return result.data.map((item) => ({
          label: item.itemcategoryname,
          value: item.itemcategoryid,
        }));
      }
      return [];
    } catch (error) {
      const result = responseHandler.handleError(error);
      console.error("Error fetching sub category list:", result.error);
      return [];
    }
  },

  getDropdownData: async (slug, id = null) => {
    try {
      let url = `${BASE_URL}/common/dropdown/${slug}`;
      if (id) {
        url += `?id=${id}`;
      }

      const response = await axios.get(url);
      const result = responseHandler.handleSuccess(response);
      if (result.success && result.data) {
        return result.data.map((item) => ({
          label: item.name,
          value: item.id,
        }));
      }
      return [];
    } catch (error) {
      const result = responseHandler.handleError(error);
      console.error(`Error fetching ${slug} dropdown data:`, result.error);
      return [];
    }
  },

  getBrandList: async () => {
    return await CommonApi.getDropdownData("brand");
  },

  getItemTypeList: async () => {
    return await CommonApi.getDropdownData("itemtype");
  },

  getBaseUnitList: async () => {
    return await CommonApi.getDropdownData("uom");
  },

  getItemCategoryList: async () => {
    return await CommonApi.getDropdownData("itemcategory");
  },

  getCountryList: async () => {
    return await CommonApi.getDropdownData("country");
  },

  getStateList: async (countryId) => {
    return await CommonApi.getDropdownData("state", countryId);
  },

  getCityList: async (stateId) => {
    return await CommonApi.getDropdownData("city", stateId);
  },

  getLocationList: async () => {
    return await CommonApi.getDropdownData("location");
  },

  getTaxProfileList: async () => {
    return await CommonApi.getDropdownData("taxprofile");
  },
};
