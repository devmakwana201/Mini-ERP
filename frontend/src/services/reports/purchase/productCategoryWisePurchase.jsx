import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const ProductCategoryWisePurchaseService = {
  getProductCategoryWisePurchase: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(`/reports/purchase/product-category-wise-purchase`, {
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
        productcategory: item.productcategory,
        quantity: parseFloat(item.quantity),
        noofproducts: parseFloat(item.noofproducts),
        noofpos: parseFloat(item.noofpos),
        averageunitprice: parseFloat(item.averageunitprice),
        total: parseFloat(item.total),
        discount: parseFloat(item.discount),
        netamount: parseFloat(item.netamount),
        taxableamount: parseFloat(item.taxableamount),
        cgst: parseFloat(item.cgst),
        sgst: parseFloat(item.sgst),
        igst: parseFloat(item.igst),
        taxamount: parseFloat(item.taxamount),
        percentoftotalpurchase: parseFloat(item.percentoftotalpurchase),
        returnqty: parseFloat(item.returnqty),
        returnamount: parseFloat(item.returnamount),
        netpurchase: parseFloat(item.netpurchase),
        grandtotal: parseFloat(item.grandtotal),
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
