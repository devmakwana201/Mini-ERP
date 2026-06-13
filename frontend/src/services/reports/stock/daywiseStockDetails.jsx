import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const DaywiseStockDetailsService = {
  getDaywiseStockDetails: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(`/reports/stock/daywise-stock-details`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
          ...(locationId && { locationId }),
        },
      });

      return responseHandler.handleListResponse(response, (item) => ({
        date: item.date,
        mastercategory: item.mastercategory,
        category: item.category,
        product: item.product,
        brand: item.brand,
        batchlotnumber: item.batchlotnumber,
        batchdate: item.batchdate,
        openingstock: item.openingstock ? parseFloat(item.openingstock) : null,
        sales: item.sales ? parseFloat(item.sales) : null,
        purchase: item.purchase ? parseFloat(item.purchase) : null,
        salesreturn: item.salesreturn ? parseFloat(item.salesreturn) : null,
        purchasereturn: item.purchasereturn
          ? parseFloat(item.purchasereturn)
          : null,
        adjustin: item.adjustin ? parseFloat(item.adjustin) : null,
        adjustout: item.adjustout ? parseFloat(item.adjustout) : null,
        closingstock: item.closingstock ? parseFloat(item.closingstock) : null,
        uom: item.uom,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
