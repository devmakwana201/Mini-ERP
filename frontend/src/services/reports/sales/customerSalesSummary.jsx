import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const CustomerSalesSummaryService = {
  getCustomerSalesSummary: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(`/reports/sales/customer-sales-summary`, {
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
        customername: item.customername,
        phonenumber: item.phonenumber,
        customer_type: item.customer_type,
        gstid: item.gstid,
        address_city: item.address_city,
        firstvisit: item.firstvisit,
        lastvisit: item.lastvisit,
        total_discount_given: parseFloat(item.total_discount_given),
        total_tax_collected: parseFloat(item.total_tax_collected),
        netamount: parseFloat(item.netamount),
        average_order_value: parseFloat(item.average_order_value),
        outstanding_amount: parseFloat(item.outstanding_amount),
        credit_limit: parseFloat(item.credit_limit),
        totalorders: parseFloat(item.totalorders),
        return_count: parseFloat(item.return_count),
        return_amount: parseFloat(item.return_amount),
        net_sales: parseFloat(item.net_sales),
        customer_since_days: parseFloat(item.customer_since_days),
        preferred_payment_mode: item.preferred_payment_mode,
        totalamount: parseFloat(item.totalamount),
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
