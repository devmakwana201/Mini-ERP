const STORAGE_KEY = "incoming_goods_mock_v1";

const initialState = {
  purchaseOrders: [
    {
      id: 2001,
      num: "PO-AHM-2604-0021",
      supplierName: "PI Industries Ltd",
      locationName: "Ahmedabad Warehouse",
      status: "PARTIALLY_FULFILLED",
      items: [
        { itemId: 101, name: "Imidacloprid 17.8% (250ml)", qty: 200, rate: 380 },
        { itemId: 102, name: "Chlorpyrifos 50% EC (1L)", qty: 150, rate: 320 },
      ],
    },
  ],
  challans: [
    {
      id: 3001,
      num: "CH-AHM-2604-0021",
      soNum: "SO-AHM-2604-0031",
      linkedPOId: 2001,
      customerName: "PI Industries Ltd (via PO)",
      date: "2026-04-12",
      deliveredDate: "2026-04-13",
      status: "DELIVERED",
      vehicle: "GJ-01-AB-9876",
      grand: 146320,
      lines: [
        { itemId: 101, name: "Imidacloprid 17.8% (250ml)", ordered: 200, rate: 380 },
        { itemId: 102, name: "Chlorpyrifos 50% EC (1L)", ordered: 150, rate: 320 },
      ],
    },
    {
      id: 3002,
      num: "CH-AHM-2604-0022",
      soNum: "SO-AHM-2604-0032",
      linkedPOId: 2001,
      customerName: "PI Industries Ltd (via PO)",
      date: "2026-04-14",
      deliveredDate: "2026-04-14",
      status: "DELIVERED",
      vehicle: "GJ-01-AB-4567",
      grand: 32900,
      lines: [
        { itemId: 101, name: "Imidacloprid 17.8% (250ml)", ordered: 50, rate: 380 },
      ],
    },
  ],
  deliveryReceipts: [
    {
      id: 4001,
      num: "DR-AHM-2604-0011",
      challanId: 3001,
      challanNum: "CH-AHM-2604-0021",
      soNum: "SO-AHM-2604-0031",
      supplierName: "PI Industries Ltd",
      date: "2026-04-13",
      accepted: 342,
      rejected: 8,
      itemLines: [
        {
          itemId: 101,
          name: "Imidacloprid 17.8% (250ml)",
          rate: 380,
          ordered: 200,
          received: 198,
          accepted: 194,
          rejected: 4,
          rejReason: "Damaged bottles",
        },
        {
          itemId: 102,
          name: "Chlorpyrifos 50% EC (1L)",
          rate: 320,
          ordered: 150,
          received: 152,
          accepted: 148,
          rejected: 4,
          rejReason: "Leaking seal",
        },
      ],
    },
  ],
  grns: [
    {
      id: 5001,
      num: "GRN-AHM-2604-0015",
      poNum: "PO-AHM-2604-0021",
      poId: 2001,
      supplierName: "PI Industries Ltd",
      date: "2026-04-13",
      status: "APPROVED",
      challanRef: "CH-AHM-2604-0021",
      accepted: 342,
      rejected: 8,
      issueRaised: true,
      issueId: 6001,
      stockPosted: true,
      itemLines: [
        {
          itemId: 101,
          name: "Imidacloprid 17.8% (250ml)",
          poQty: 200,
          dispatchedQty: 200,
          invoicedQty: 200,
          receivedQty: 198,
          accepted: 194,
          rejected: 4,
          shortageQty: 2,
          rejReason: "Damaged bottles",
          rate: 380,
        },
        {
          itemId: 102,
          name: "Chlorpyrifos 50% EC (1L)",
          poQty: 150,
          dispatchedQty: 150,
          invoicedQty: 150,
          receivedQty: 152,
          accepted: 148,
          rejected: 4,
          shortageQty: 0,
          rejReason: "Leaking seal",
          rate: 320,
        },
      ],
    },
    {
      id: 5002,
      num: "GRN-AHM-2604-0016",
      poNum: "PO-AHM-2604-0021",
      poId: 2001,
      supplierName: "PI Industries Ltd",
      date: "2026-04-14",
      status: "DRAFT",
      challanRef: "CH-AHM-2604-0022",
      accepted: 0,
      rejected: 0,
      issueRaised: false,
      issueId: null,
      stockPosted: false,
      itemLines: [
        {
          itemId: 101,
          name: "Imidacloprid 17.8% (250ml)",
          poQty: 200,
          dispatchedQty: 50,
          invoicedQty: 50,
          receivedQty: 50,
          accepted: 0,
          rejected: 0,
          shortageQty: 0,
          rejReason: "",
          rate: 380,
        },
      ],
    },
  ],
  grnIssues: [
    {
      id: 6001,
      grnNum: "GRN-AHM-2604-0015",
      poNum: "PO-AHM-2604-0021",
      challanNum: "CH-AHM-2604-0021",
      supplierName: "PI Industries Ltd",
      date: "2026-04-13",
      amount: 3040,
      reason: "Imidacloprid: 4 damaged + 2 shortage; Chlorpyrifos: 4 damaged",
      status: "RESOLVED",
      creditNoteNum: "CN-AD-2604-0009",
    },
    {
      id: 6002,
      grnNum: "GRN-AHM-2604-0016",
      poNum: "PO-AHM-2604-0021",
      challanNum: "CH-AHM-2604-0022",
      supplierName: "PI Industries Ltd",
      date: "2026-04-14",
      amount: 0,
      reason: "Awaiting GRN approval",
      status: "OPEN",
      creditNoteNum: null,
    },
  ],
  creditNotes: [
    {
      id: 7001,
      num: "CN-AD-2604-0009",
      issueRef: "ISS-6001",
      supplierName: "PI Industries Ltd",
      date: "2026-04-14",
      amount: 3040,
      remainingAmount: 2040,
      appliedAmount: 1000,
      reservedNextOrderAmount: 0,
      status: "ACKNOWLEDGED",
      adjustmentMode: "PAYMENT",
      receivedByManager: true,
      acknowledgedByManager: true,
      lastAppliedDate: "2026-04-15",
    },
    {
      id: 7002,
      num: "CN-AD-2604-0010",
      issueRef: "ISS-6003",
      supplierName: "UPL Limited",
      date: "2026-04-15",
      amount: 2200,
      remainingAmount: 2200,
      appliedAmount: 0,
      reservedNextOrderAmount: 0,
      status: "NEW",
      receivedByManager: true,
      acknowledgedByManager: false,
    },
  ],
  invoices: [
    {
      id: 8001,
      num: "INV-AHM-2604-0041",
      supplierName: "PI Industries Ltd",
      date: "2026-04-13",
      dueDate: "2026-04-28",
      grand: 146320,
      paid: 120000,
      status: "PARTIALLY_PAID",
    },
    {
      id: 8002,
      num: "INV-AHM-2604-0042",
      supplierName: "UPL Limited",
      date: "2026-04-14",
      dueDate: "2026-04-30",
      grand: 52000,
      paid: 0,
      status: "UNPAID",
    },
  ],
};

const clone = (value) => JSON.parse(JSON.stringify(value));

export const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

export const hasIncomingGoodsFlag = (user, flagKey) => {
  const flags = user?.flags;
  if (!flags || typeof flags !== "object") return true;
  return Boolean(flags[flagKey]);
};

export const loadIncomingGoodsState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = clone(initialState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    return { ...clone(initialState), ...parsed };
  } catch (_error) {
    return clone(initialState);
  }
};

export const saveIncomingGoodsState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const resetIncomingGoodsState = () => {
  const seed = clone(initialState);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
};

export const getPendingDeliveries = (state) => {
  return state.challans.filter(
    (challan) =>
      challan.status === "DELIVERED" &&
      !state.deliveryReceipts.some((dr) => dr.challanId === challan.id),
  );
};

export const getGrnByChallanNum = (state, challanNum) => {
  return state.grns.find((grn) => grn.challanRef === challanNum) || null;
};

export const getNextId = (rows = []) => {
  if (!rows.length) return 1;
  return Math.max(...rows.map((item) => Number(item.id) || 0)) + 1;
};

export const getNextDocNum = (prefix, rows = []) => {
  const next = rows.length + 1;
  return `${prefix}-AHM-2604-${String(next).padStart(4, "0")}`;
};

export const getToday = () => new Date().toISOString().slice(0, 10);
