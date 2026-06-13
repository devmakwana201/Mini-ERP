import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const SupplierLedgerService = {
  getSupplierLedger: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(`/reports/purchase/supplier-ledger`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
          ...(locationId && { locationId }),
        },
      });

      return responseHandler.handleListResponse(response, (item) => ({
        date: item.date,
        description: item.description,
        credit: parseFloat(item.credit),
        debit: parseFloat(item.debit),
        balance: parseFloat(item.balance),
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
