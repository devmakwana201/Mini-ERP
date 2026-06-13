import { createSlice } from "@reduxjs/toolkit";

// SO status flow: Confirmed → Partially Delivered / Fully Delivered → Invoiced
const initialState = {
  soCounter: 1,       // persisted so numbers never reset on hot-reload
  salesOrders: [],    // { soNumber, poNumber, supplier, items, status, createdAt, invoiceNumber? }
};

export const salesOrderSlice = createSlice({
  name: "salesOrders",
  initialState,
  reducers: {
    // Called when a PO is accepted — creates a new SO with status "Confirmed"
    acceptPO: (state, action) => {
      const { po, items } = action.payload;
      const soNumber = `SO-PO-${String(state.soCounter++).padStart(4, "0")}`;
      state.salesOrders.push({
        soNumber,
        poNumber: po.ordernumber,
        supplier: po.supplier,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          rate: item.rate,
          total: item.total,
          delivered: 0,
        })),
        status: "Confirmed",
        createdAt: new Date().toISOString().slice(0, 10),
        invoiceNumber: null,
      });
    },

    // Called from Deliver Products — updates delivery qty and advances status
    recordDelivery: (state, action) => {
      const { soNumber, deliveryItems } = action.payload;
      const order = state.salesOrders.find((o) => o.soNumber === soNumber);
      if (!order) return;

      order.items = order.items.map((item, idx) => ({
        ...item,
        delivered: item.delivered + (deliveryItems[idx]?.currentDelivery || 0),
      }));

      const allDelivered = order.items.every(
        (item) => item.delivered >= item.quantity,
      );
      order.status = allDelivered ? "Fully Delivered" : "Partially Delivered";
    },

    // Called when delivery is confirmed — generates an invoice
    generateInvoice: (state, action) => {
      const { soNumber } = action.payload;
      const order = state.salesOrders.find((o) => o.soNumber === soNumber);
      if (!order || order.invoiceNumber) return;

      const invoiceNumber = `INV-PO-${soNumber.replace("SO-PO-", "")}`;
      order.invoiceNumber = invoiceNumber;
      order.status = "Invoiced";
      order.invoiceDate = new Date().toISOString().slice(0, 10);
      order.paid = 0;
      order.total = order.items.reduce(
        (sum, item) => sum + item.quantity * item.rate,
        0,
      );
      order.pending = order.total;
      order.paymentStatus = "Unpaid";
    },

    // Called from Invoice page — records a payment
    recordPayment: (state, action) => {
      const { soNumber, amount } = action.payload;
      const order = state.salesOrders.find((o) => o.soNumber === soNumber);
      if (!order) return;
      order.paid = (order.paid || 0) + amount;
      order.pending = order.total - order.paid;
      order.paymentStatus = order.pending <= 0 ? "Paid" : "Partial";
    },

    // Called from Direct SO Generation — creates a standalone invoice immediately
    generateDirectInvoice: (state, action) => {
      const { customer, lineItems, totals, orderDate } = action.payload;
      const soNumber = `SO-DIR-${String(state.soCounter++).padStart(4, "0")}`;
      const invoiceNumber = `INV-DIR-${soNumber.replace("SO-DIR-", "")}`;
      state.salesOrders.push({
        soNumber,
        poNumber: null,
        supplier: customer?.name || "Direct Customer",
        buyerName: customer?.name || "Direct Customer",
        buyerGSTIN: customer?.gstin || "",
        items: lineItems
          .filter((item) => item.product)
          .map((item) => ({
            name: item.product?.name || "—",
            quantity: item.quantity,
            rate: item.rate,
            delivered: item.quantity,
          })),
        status: "Invoiced",
        createdAt: orderDate
          ? new Date(orderDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        invoiceNumber,
        invoiceDate: new Date().toISOString().slice(0, 10),
        paid: 0,
        total: totals?.total || 0,
        pending: totals?.total || 0,
        paymentStatus: "Unpaid",
        source: "Direct",
      });
    },
  },
});

export const {
  acceptPO,
  recordDelivery,
  generateInvoice,
  recordPayment,
  generateDirectInvoice,
} = salesOrderSlice.actions;
export default salesOrderSlice.reducer;

// Selectors
export const selectAllSalesOrders = (state) => state.salesOrders.salesOrders;

// Orders visible in Deliver Products (accepted POs awaiting/during/after delivery)
export const selectConfirmedOrders = (state) =>
  state.salesOrders.salesOrders.filter((o) =>
    ["Confirmed", "Partially Delivered", "Fully Delivered"].includes(o.status),
  );

// Orders that have an invoice (shown in Invoice section)
export const selectInvoicedOrders = (state) =>
  state.salesOrders.salesOrders.filter((o) => o.invoiceNumber);
