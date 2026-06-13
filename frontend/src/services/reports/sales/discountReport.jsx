import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const DiscountReportService = {
  getDiscountReport: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(`/reports/sales/discount-report`, {
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
        billno: item.billno,
        customer: item.customer,
        orderid: item.orderid,
        createdby: item.createdby,
        date: item.date,
        phoneno: item.phoneno,
        ordertotal: parseFloat(item.ordertotal),
        discount: parseFloat(item.discount),
        discount_type: item.discount_type,
        discount_percentage: parseFloat(item.discount_percentage),
        net_amount: parseFloat(item.net_amount),
        taxamount: parseFloat(item.taxamount),
        roundoff: parseFloat(item.roundoff),
        grandtotal: parseFloat(item.grandtotal),
        total_items: parseFloat(item.total_items),
        total_sgst: parseFloat(item.total_sgst),
        total_cgst: parseFloat(item.total_cgst),
        total_igst: parseFloat(item.total_igst),
        payment_type: item.payment_type,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
