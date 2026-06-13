import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const CurrentStockReportService = {
  getCurrentStockReport: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(`/reports/stock/current-stock-report`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
          ...(locationId && { locationId }),
        },
      });

      return responseHandler.handleListResponse(response, (item) => ({
        mastercategory: item.mastercategory,
        category: item.category,
        productname: item.productname,
        brand: item.brand,
        safetyquantity: parseFloat(item.safetyquantity),
        batchlotnumber: item.batchlotnumber,
        batchdate: item.batchdate,
        expirydate: item.expirydate,
        stock: parseFloat(item.stock),
        uom: item.uom,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
