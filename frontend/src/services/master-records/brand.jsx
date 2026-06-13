import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const BrandService = {
  getFormattedBrands: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  }) => {
    try {
      const response = await axios.get(`/brands`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (brand) => ({
        brandid: brand.brandid,
        brandname: brand.brandname,
        branddesc: brand.branddesc,
        brandicon: brand.brandicon,
        isapproved: brand.isapproved,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  createBrand: async (brandData) => {
    try {
      const formData = new FormData();
      formData.append("brandname", brandData.brandName);
      formData.append("branddesc", brandData.brandDesc);
      // Convert array of master category IDs to comma-separated string
      if (brandData.brandCategory && brandData.brandCategory.length > 0) {
        formData.append("brandcategory", brandData.brandCategory.join(", "));
      } else {
        formData.append("brandcategory", "");
      }
      if (brandData.brandIcon) {
        formData.append("brandicon", brandData.brandIcon);
      }

      const response = await axios.post(`/brands`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getBrandById: async (brandId) => {
    try {
      const response = await axios.get(`/brands/${brandId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  updateBrand: async (brandId, brandData, imageChanged = true) => {
    try {
      const formData = new FormData();
      formData.append("brandname", brandData.brandName);
      formData.append("branddesc", brandData.brandDesc);
      // Convert array of master category IDs to comma-separated string
      if (brandData.brandCategory && brandData.brandCategory.length > 0) {
        formData.append("brandcategory", brandData.brandCategory.join(", "));
      } else {
        formData.append("brandcategory", "");
      }
      
      // Only include brandicon if image was changed or if it's a new file
      if (imageChanged && brandData.brandIcon) {
        formData.append("brandicon", brandData.brandIcon);
      } else if (imageChanged && !brandData.brandIcon) {
        // If image was changed and removed, send empty string to remove existing image
        formData.append("brandicon", "");
      }

      const response = await axios.put(`/brands/${brandId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  deleteBrand: async (brandId) => {
    try {
      const response = await axios.delete(`/brands/${brandId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};