import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toInteger = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const DailySalesSummaryService = {
  getDailySalesSummary: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(`/reports/sales/daily-sales-summary`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
          ...(locationId && { locationId }),
        },
      });

      return responseHandler.handleListResponse(response, (item) => ({
        orderdate: item.orderdate,
        cash: toNumber(item.cash),
        no_of_orders: toInteger(item.no_of_orders),
        no_of_customers: toInteger(item.no_of_customers),
        upi_online_amount: toNumber(item.upi_online_amount),
        card_amount: toNumber(item.card_amount),
        credit_amount: toNumber(item.credit_amount),
        cheque_amount: toNumber(item.cheque_amount),
        discount_amount: toNumber(item.discount_amount),
        taxable_amount: toNumber(item.taxable_amount),
        tax_amount: toNumber(item.tax_amount),
        cgst: toNumber(item.cgst),
        sgst: toNumber(item.sgst),
        igst: toNumber(item.igst),
        round_off: toNumber(item.round_off),
        grand_total: toNumber(item.grand_total),
        return_amount: toNumber(item.return_amount),
        net_sales: toNumber(item.net_sales),
        average_order_value: toNumber(item.average_order_value),
        additional_charges: toNumber(item.additional_charges),
        total: toNumber(item.total),
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
