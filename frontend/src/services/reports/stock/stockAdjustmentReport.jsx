import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const StockAdjustmentReportService = {
  getStockAdjustmentReport: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(
        `/reports/stock/stock-adjustment-report`,
        {
          params: {
            filters: JSON.stringify(filters),
            start,
            length,
            ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
            ...(locationId && { locationId }),
          },
        },
      );

      return responseHandler.handleListResponse(response, (item) => ({
        createddatetime: item.createddatetime,
        productname: item.productname,
        brand: item.brand,
        mastercategory: item.mastercategory,
        category: item.category,
        subcategory: item.subcategory,
        uom: item.uom,
        totalstock: parseFloat(item.totalstock),
        remark: item.remark,
        createdby: item.createdby,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
