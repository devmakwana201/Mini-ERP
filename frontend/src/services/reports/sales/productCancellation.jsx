import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const ProductCancellationService = {
  getProductCancellation: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(`/reports/sales/product-cancellation`, {
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
        customername: item.customername,
        cancellationdate: item.cancellationdate,
        product: item.product,
        category: item.category,
        brand: item.brand,
        uom: item.uom,
        batchnumber: item.batchnumber,
        price: parseFloat(item.price),
        quantity: parseFloat(item.quantity),
        discount: parseFloat(item.discount),
        netamount: parseFloat(item.netamount),
        taxamount: parseFloat(item.taxamount),
        grandtotal: parseFloat(item.grandtotal),
        cancellationreason: item.cancellationreason,
        returntostock: item.returntostock,
        originalsaledate: item.originalsaledate,
        cancelledby: item.cancelledby,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
