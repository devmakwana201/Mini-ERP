import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const ProductWisePurchaseService = {
  getProductWisePurchase: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(`/reports/purchase/product-wise-purchase`, {
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
        createdby: item.createdby,
        referencebillnumber: item.referencebillnumber,
        podate: item.podate,
        productcategory: item.productcategory,
        brand: item.brand,
        hsnsaccode: item.hsnsaccode,
        product: item.product,
        uom: item.uom,
        batchnumber: item.batchnumber,
        warehouseid: item.warehouseid,
        warehouse: item.warehouse,
        remarks: item.remarks,
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price),
        total: parseFloat(item.total),
        discountpercent: parseFloat(item.discountpercent),
        discount: parseFloat(item.discount),
        netamount: parseFloat(item.netamount),
        taxableamount: parseFloat(item.taxableamount),
        taxpercent: parseFloat(item.taxpercent),
        taxamount: parseFloat(item.taxamount),
        cgst: parseFloat(item.cgst),
        sgst: parseFloat(item.sgst),
        igst: parseFloat(item.igst),
        mrp: parseFloat(item.mrp),
        lastpurchaseprice: parseFloat(item.lastpurchaseprice),
        grandtotal: parseFloat(item.grandtotal),
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
