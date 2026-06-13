import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const PriceDeviationService = {
  getPriceDeviation: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(
        `/reports/purchase/price-deviation`,
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
        supplier: item.supplier,
        product: item.product,
        category: item.category,
        brand: item.brand,
        uom: item.uom,
        hsncode: item.hsncode,
        minimumprice: Number(item.minimumprice) || 0,
        maximumprice: Number(item.maximumprice) || 0,
        averageprice: Number(item.averageprice) || 0,
        lastpurchaseprice: Number(item.lastpurchaseprice) || 0,
        deviationpercent: Number(item.deviationpercent) || 0,
        totalquantity: Number(item.totalquantity) || 0,
        purchasecount: Number(item.purchasecount) || 0,
        firstpurchasedate: item.firstpurchasedate,
        lastpurchasedate: item.lastpurchasedate,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
