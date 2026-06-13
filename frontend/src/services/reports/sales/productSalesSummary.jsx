import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const ProductSalesSummaryService = {
  getProductSalesSummary: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(`/reports/sales/product-sales-summary`, {
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
        orderdate: item.orderdate,
        customer: item.customer,
        product: item.product,
        productmastercategory: item.productmastercategory,
        productcategory: item.productcategory,
        productsubcategory: item.productsubcategory,
        brand: item.brand,
        uom: item.uom,
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price),
        totalamount: parseFloat(item.totalamount),
        discount: parseFloat(item.discount),
        taxableamount: parseFloat(item.taxableamount),
        tax: item.tax,
        taxamount: parseFloat(item.taxamount),
        grandtotal: parseFloat(item.grandtotal),
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
