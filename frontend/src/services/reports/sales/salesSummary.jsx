import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const SalesSummaryService = {
  getSalesSummary: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(`/reports/sales/sales-summary`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
          ...(locationId && { locationId }),
        },
      });

      return responseHandler.handleListResponse(response, (item) => ({
        id: item.id,
        date: item.date,
        totalbills: parseInt(item.totalbills),
        products: parseInt(item.products),
        customers: parseInt(item.customers),
        totalquantity: parseFloat(item.totalquantity),
        amount: parseFloat(item.amount),
        discount: parseFloat(item.discount),
        taxableamount: parseFloat(item.taxableamount),
        totaltaxamount: parseFloat(item.totaltaxamount),
        roundoff: parseFloat(item.roundoff),
        grandtotal: parseFloat(item.grandtotal),
        avgbillvalue: parseFloat(item.avgbillvalue),
        discountpercent: parseFloat(item.discountpercent),
        taxpercent: parseFloat(item.taxpercent),
        netsales: parseFloat(item.netsales),
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
