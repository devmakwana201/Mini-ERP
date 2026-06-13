import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

const parseNumber = (value) =>
  value === null || value === undefined || value === ""
    ? 0
    : parseFloat(value);

export const OrderCancellationService = {
  getOrderCancellation: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(`/reports/sales/order-cancellation`, {
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
        ordertype: item.ordertype,
        orderdate: item.orderdate,
        cancellationdatetime: item.cancellationdatetime,
        cancelledby: item.cancelledby,
        approvedby: item.approvedby,
        customername: item.customername,
        customerphone: item.customerphone,
        cancellationreason: item.cancellationreason,
        remarks: item.remarks,
        noofitems: parseNumber(item.noofitems),
        ordertotal: parseNumber(item.ordertotal),
        discount: parseNumber(item.discount),
        netamount: parseNumber(item.netamount),
        taxableamount: parseNumber(item.taxableamount),
        taxamount: parseNumber(item.taxamount),
        cgst: parseNumber(item.cgst),
        sgst: parseNumber(item.sgst),
        igst: parseNumber(item.igst),
        roundoff: parseNumber(item.roundoff),
        grandtotal: parseNumber(item.grandtotal),
        originalpaymentmode: item.originalpaymentmode,
        transaction: item.transaction,
        refundstatus: item.refundstatus,
        refundamount: parseNumber(item.refundamount),
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
