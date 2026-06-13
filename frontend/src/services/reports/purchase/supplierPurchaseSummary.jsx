import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const SupplierPurchaseSummaryService = {
  getSupplierPurchaseSummary: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(
        `/reports/purchase/supplier-purchase-summary`,
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
        suppliername: item.suppliername,
        totalamount: parseFloat(item.totalamount),
        discountamount: parseFloat(item.discountamount),
        totaltaxableamount: parseFloat(item.totaltaxableamount),
        totaltax: parseFloat(item.totaltax),
        roundoff: parseFloat(item.roundoff),
        grandtotal: parseFloat(item.grandtotal),
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
