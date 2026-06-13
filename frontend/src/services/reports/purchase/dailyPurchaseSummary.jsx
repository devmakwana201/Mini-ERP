import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const DailyPurchaseSummaryService = {
  getDailyPurchaseSummary: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(
        `/reports/purchase/daily-purchase-summary`,
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
        purchaseorderdate: item.purchaseorderdate,
        noofpos: Number(item.noofpos) || 0,
        noofsuppliers: Number(item.noofsuppliers) || 0,
        totalquantity: Number(item.totalquantity) || 0,
        totalamount: Number(item.totalamount) || 0,
        discountamount: Number(item.discountamount) || 0,
        netamount: Number(item.netamount) || 0,
        totaltaxableamount: Number(item.totaltaxableamount) || 0,
        cgst: Number(item.cgst) || 0,
        sgst: Number(item.sgst) || 0,
        igst: Number(item.igst) || 0,
        totaltax: Number(item.totaltax) || 0,
        additionalcharges: Number(item.additionalcharges) || 0,
        roundoff: Number(item.roundoff) || 0,
        grandtotal: Number(item.grandtotal) || 0,
        returnamount: Number(item.returnamount) || 0,
        netpurchase: Number(item.netpurchase) || 0,
        averagepovalue: Number(item.averagepovalue) || 0,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
