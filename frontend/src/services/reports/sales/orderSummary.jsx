import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const OrderSummaryService = {
  getOrderSummary: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(`/reports/sales/order-summary`, {
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
        uniquekey: item.uniquekey,
        receipt: item.receipt,
        orderdatetime: item.orderdatetime,
        guestname: item.guestname,
        phone: item.phone,
        noofitems: parseFloat(item.noofitems),
        discount: parseFloat(item.discount),
        netamount: parseFloat(item.netamount),
        taxableamount: parseFloat(item.taxableamount),
        taxamount: parseFloat(item.taxamount),
        cgst: parseFloat(item.cgst),
        sgst: parseFloat(item.sgst),
        igst: parseFloat(item.igst),
        roundoff: parseFloat(item.roundoff),
        grandtotal: parseFloat(item.grandtotal),
        paidamount: parseFloat(item.paidamount),
        balanceamount: parseFloat(item.balanceamount),
        createdby: item.createdby,
        customertype: item.customertype,
        deliverytype: item.deliverytype,
        paymentdate: item.paymentdate,
        amount: parseFloat(item.amount),
        due: parseFloat(item.due),
        paymode: item.paymode,
        status: item.status,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
