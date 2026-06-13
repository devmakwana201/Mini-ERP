import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const CategorySalesSummaryService = {
  getCategorySalesSummary: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(
        `/reports/sales/category-sales-summary`,
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
        id: item.id,
        mastercategory: item.mastercategory,
        productcategory: item.productcategory,
        productsubcategory: item.productsubcategory,
        quantity: parseFloat(item.quantity),
        no_of_transactions: parseInt(item.no_of_transactions, 10) || 0,
        no_of_customers: parseInt(item.no_of_customers, 10) || 0,
        no_of_products: parseInt(item.no_of_products, 10) || 0,
        avg_sale_price: parseFloat(item.avg_sale_price),
        netamount: parseFloat(item.netamount),
        taxableamount: parseFloat(item.taxableamount),
        cgst: parseFloat(item.cgst),
        sgst: parseFloat(item.sgst),
        igst: parseFloat(item.igst),
        pct_of_sales: parseFloat(item.pct_of_sales),
        return_qty: parseFloat(item.return_qty),
        return_amount: parseFloat(item.return_amount),
        net_sales: parseFloat(item.net_sales),
        discountamount: parseFloat(item.discountamount),
        taxamount: parseFloat(item.taxamount),
        totalamount: parseFloat(item.totalamount),
        grandtotal: parseFloat(item.grandtotal),
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
