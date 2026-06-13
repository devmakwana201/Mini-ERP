import axios from "utils/axios";

const dummyInvoices = [
  {
    id: "INV-AHM-2604-0004",
    invoiceNumber: "INV-AHM-2604-0004",
    soNumber: "SO-AHM-2604-0008",
    buyerName: "Tata Rallis India (via PO)",
    supplierName: "Agro Dot",
    total: 1081,
    paid: 0,
    pending: 1081,
    status: "Unpaid",
    sellerGSTIN: "24AAACA1111A1Z1",
    buyerGSTIN: "24AAAAA0000A1Z5",
    taxMode: "No Tax",
    tcs: 11,
    subtotal: 1070,
    discount: 0,
    tax: 0,
    grandTotal: 1081,
    items: [
      {
        item: "NPK 19:19:19 (50kg)",
        batch: "FERT-NPK-50-OLD",
        qty: 1,
        price: 1070,
        discount: 0,
        tax: 0,
        total: 1070,
      },
    ],
  },
  {
    id: "INV-AHM-2604-0003",
    invoiceNumber: "INV-AHM-2604-0003",
    soNumber: "SO-AHM-2604-0006",
    buyerName: "Tata Rallis India (via PO)",
    supplierName: "Agro Dot",
    total: 53985,
    paid: 0,
    pending: 53985,
    status: "Unpaid",
    sellerGSTIN: "24AAACA1111A1Z1",
    buyerGSTIN: "24AAAAA0000A1Z5",
    taxMode: "No Tax",
    tcs: 0,
    subtotal: 53985,
    discount: 0,
    tax: 0,
    grandTotal: 53985,
    items: [
      {
        item: "Urea (50kg)",
        batch: "UREA-BAG-01",
        qty: 50,
        price: 1079.7,
        discount: 0,
        tax: 0,
        total: 53985,
      },
    ],
  },
];

const dummyPayments = [
  {
    id: "PAY-001",
    invoiceNumber: "INV-AHM-2604-0004",
    invoiceId: "INV-AHM-2604-0004",
    supplierName: "Agro Dot",
    total: 1081,
    paid: 0,
    pending: 1081,
    status: "Pending",
  },
  {
    id: "PAY-002",
    invoiceNumber: "INV-AHM-2604-0003",
    invoiceId: "INV-AHM-2604-0003",
    supplierName: "Agro Dot",
    total: 53985,
    paid: 0,
    pending: 53985,
    status: "Pending",
  },
];

const isSuccess = (response) =>
  response?.data?.success === 1 || response?.data?.success === true;

const isNotFound = (error) => {
  const statusCode =
    error?.statusCode ||
    error?.error?.statusCode ||
    error?.response?.status ||
    error?.response?.data?.error?.statusCode;

  const message =
    error?.message ||
    error?.error?.message ||
    error?.response?.data?.error?.message ||
    "";

  return statusCode === 404 || /not found/i.test(String(message));
};

const parseError = (error, fallbackMessage) => {
  if (error?.error?.message) {
    return error.error.message;
  }

  if (error?.message) {
    return error.message;
  }

  return fallbackMessage;
};

const parseListResponse = (response) => {
  if (!isSuccess(response)) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      error: {
        message: response?.data?.error?.message || "Failed to fetch records.",
      },
    };
  }

  const list = response?.data?.data || [];
  const totalRecords =
    response?.data?.pagination?.total ||
    response?.data?.meta?.pagination?.total ||
    list.length;

  return {
    success: true,
    data: list,
    totalRecords,
  };
};

const parseSingleResponse = (response) => {
  if (!isSuccess(response)) {
    return {
      success: false,
      data: null,
      error: {
        message: response?.data?.error?.message || "Failed to fetch record.",
      },
    };
  }

  const payload = response?.data?.data;

  return {
    success: true,
    data: Array.isArray(payload) ? payload[0] || null : payload || null,
  };
};

export const FinanceInvoiceService = {
  fetchInvoices: async (params = {}) => {
    try {
      const response = await axios.get("/superadmin/finance/invoices", {
        params,
      });
      return parseListResponse(response);
    } catch (error) {
      if (isNotFound(error)) {
        return {
          success: true,
          data: dummyInvoices,
          totalRecords: dummyInvoices.length,
        };
      }
      return {
        success: false,
        data: [],
        totalRecords: 0,
        error: { message: parseError(error, "Failed to fetch invoices.") },
      };
    }
  },

  fetchInvoiceById: async (invoiceId) => {
    try {
      const response = await axios.get(
        `/superadmin/finance/invoices/${invoiceId}`,
      );
      return parseSingleResponse(response);
    } catch (error) {
      if (isNotFound(error)) {
        const invoice = dummyInvoices.find(
          (item) => item.id === invoiceId || item.invoiceNumber === invoiceId,
        );
        return {
          success: true,
          data: invoice || dummyInvoices[0],
        };
      }
      return {
        success: false,
        data: null,
        error: { message: parseError(error, "Failed to fetch invoice.") },
      };
    }
  },

  fetchPayments: async (params = {}) => {
    try {
      const response = await axios.get("/superadmin/finance/payments", {
        params,
      });
      return parseListResponse(response);
    } catch (error) {
      if (isNotFound(error)) {
        return {
          success: true,
          data: dummyPayments,
          totalRecords: dummyPayments.length,
        };
      }
      return {
        success: false,
        data: [],
        totalRecords: 0,
        error: { message: parseError(error, "Failed to fetch payments.") },
      };
    }
  },

  recordInvoicePayment: async (invoiceId, body) => {
    try {
      const response = await axios.post(
        `/superadmin/finance/invoices/${invoiceId}/record-payment`,
        body,
      );

      if (!isSuccess(response)) {
        return {
          success: false,
          error: {
            message:
              response?.data?.error?.message || "Failed to record payment.",
          },
        };
      }

      return {
        success: true,
        data: response?.data?.data || null,
        message:
          response?.data?.message || "Payment recorded successfully.",
      };
    } catch (error) {
      if (isNotFound(error)) {
        const paidAmount = Number(body?.amountPaid || 0);
        return {
          success: true,
          data: {
            invoiceId,
            newStatus: "Paid",
            paid: paidAmount,
            pending: 0,
          },
          message: "Payment recorded successfully (dummy mode).",
        };
      }
      return {
        success: false,
        error: { message: parseError(error, "Failed to record payment.") },
      };
    }
  },
};
