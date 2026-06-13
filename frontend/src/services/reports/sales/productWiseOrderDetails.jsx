import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const ProductWiseOrderDetailsService = {
  getProductWiseOrderDetails: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    locationId,
  }) => {
    try {
      const response = await axios.get(`/reports/sales/product-wise-order-details`, {
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
        product: item.product,
        productmastercategory: item.productmastercategory,
        productcategory: item.productcategory,
        productsubcategory: item.productsubcategory,
        brand: item.brand,
        uom: item.uom,
        batchnumber: item.batchnumber,
        batchdate: item.batchdate,
        price: parseFloat(item.price),
        purchase: parseFloat(item.purchase),
        purchaseatsale: parseFloat(item.purchaseatsale),
        profitloss: parseFloat(item.profitloss),
        billno: item.billno,
        customer: item.customer,
        saleperson: item.saleperson,
        orderdate: item.orderdate,
        orderdatetime: item.orderdatetime,
        ordertype: item.ordertype,
        channel: item.channel,
        transaction: item.transaction,
        tax: item.tax,
        orderremark: item.orderremark,
        paymentref: item.paymentref,
        paymentremark: item.paymentremark,
        reprintremark: item.reprintremark,
        quantity: parseFloat(item.quantity),
        totalamount: parseFloat(item.totalamount),
        discount: parseFloat(item.discount),
        taxamount: parseFloat(item.taxamount),
        totaltaxamount: parseFloat(item.totaltaxamount),
        roundoff: parseFloat(item.roundoff),
        grandtotal: parseFloat(item.grandtotal),
        locationname: item.locationname,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },
};
