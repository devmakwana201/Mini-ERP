import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const PurchaseOrdersService = {
  getPurchaseOrders: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(`/reports/purchase/purchase-orders`, {
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
        supplier: item.supplier,
        suppliergst: item.suppliergst,
        ordernumber: item.ordernumber,
        referencebillnumber: item.referencebillnumber,
        purchaseorderdate: item.purchaseorderdate,
        nooflabels: parseFloat(item.nooflabels),
        remarks: item.remarks,
        createdby: item.createdby,
        createddatetime: item.createddatetime,
        total: parseFloat(item.total),
        discount: parseFloat(item.discount),
        additionalcharge: parseFloat(item.additionalcharge),
        roundoff: parseFloat(item.roundoff),
        grandtotal: parseFloat(item.grandtotal),
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  getPurchaseOrderDetails: async (uniqueKey) => {
    try {
      const response = await axios.get(
        `/pos/purchase-order/details/${uniqueKey}`,
      );
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};
