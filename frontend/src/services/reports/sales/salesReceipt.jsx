import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const SalesReceiptService = {
  getSalesReceipt: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(`/reports/sales/sales-receipt`, {
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
        billno: item.billno,
        customer: item.customer,
        saleperson: item.saleperson,
        date: item.date,
        ordertotal: parseFloat(item.ordertotal),
        discount: parseFloat(item.discount),
        taxableamount: parseFloat(item.taxableamount),
        taxamount: parseFloat(item.taxamount),
        roundoff: parseFloat(item.roundoff),
        grandtotal: parseFloat(item.grandtotal),
        transaction: item.transaction,
        orderremark: item.orderremark,
        paymentref: item.paymentref,
        paymentremark: item.paymentremark,
        reprintremark: item.reprintremark,
        children:
          item.children?.map((child) => ({
            id: child.id,
            uniquekey: child.uniquekey,
            billno: child.billno,
            category: child.category,
            taxableamount: parseFloat(child.taxableamount),
            taxamount: child.taxamount ? parseFloat(child.taxamount) : 0,
            totalamount: parseFloat(child.totalamount),
          })) || [],
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
