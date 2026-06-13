const STORAGE_KEY = "procurement_mock_purchase_orders";

const defaultPurchaseOrders = [
  {
    id: 1,
    poNumber: "PO-AHM-2604-0005",
    supplierId: 101,
    supplier: "PI Industries Ltd",
    locationId: 1,
    location: "Ahmedabad Warehouse",
    orderDate: "2026-04-14",
    total: 1330,
    currency: "INR",
    status: "approved",
    linkedSo: "SO-AHM-2604-0005",
    canSubmit: false,
    remarks: "Urgent replenishment for seasonal demand.",
    createdBy: "Anjali",
    items: [
      {
        id: 1,
        itemName: "Urea (50kg)",
        orderedQty: 5,
        freeQty: 0,
        totalQty: 5,
        rate: 266,
        gst: "0%",
        offerApplied: "-",
        total: 1330,
      },
    ],
  },
  {
    id: 2,
    poNumber: "PO-AHM-2604-0003",
    supplierId: 102,
    supplier: "Coromandel Intl.",
    locationId: 1,
    location: "Ahmedabad Warehouse",
    orderDate: "2026-03-26",
    total: 180000,
    currency: "INR",
    status: "draft",
    linkedSo: null,
    canSubmit: true,
    remarks: "Awaiting procurement manager confirmation.",
    createdBy: "Rahul",
    items: [
      {
        id: 1,
        itemName: "DAP Premium",
        orderedQty: 90,
        freeQty: 0,
        totalQty: 90,
        rate: 2000,
        gst: "5%",
        offerApplied: "Festival Scheme",
        total: 180000,
      },
    ],
  },
  {
    id: 3,
    poNumber: "PO-SRT-2604-0001",
    supplierId: 103,
    supplier: "UPL Limited",
    locationId: 2,
    location: "Surat Branch",
    orderDate: "2026-03-24",
    total: 133000,
    currency: "INR",
    status: "partially-received",
    linkedSo: null,
    canSubmit: false,
    remarks: "Partial inward completed against lot 1.",
    createdBy: "Mitesh",
    items: [
      {
        id: 1,
        itemName: "Nano Urea Liquid 500ml",
        orderedQty: 350,
        freeQty: 10,
        totalQty: 360,
        rate: 370,
        gst: "12%",
        offerApplied: "-",
        total: 133000,
      },
    ],
  },
  {
    id: 4,
    poNumber: "PO-AHM-2604-0002",
    supplierId: 101,
    supplier: "PI Industries Ltd",
    locationId: 1,
    location: "Ahmedabad Warehouse",
    orderDate: "2026-03-22",
    total: 146320,
    currency: "INR",
    status: "approved",
    linkedSo: "SO-AHM-2604-0001",
    canSubmit: false,
    remarks: "Approved and shared with warehouse.",
    createdBy: "Anjali",
    items: [
      {
        id: 1,
        itemName: "Insecticide Pack A",
        orderedQty: 64,
        freeQty: 4,
        totalQty: 68,
        rate: 2150,
        gst: "18%",
        offerApplied: "Dealer Offer",
        total: 146320,
      },
    ],
  },
  {
    id: 5,
    poNumber: "PO-AHM-2604-0001",
    supplierId: 104,
    supplier: "Tata Rallis India",
    locationId: 1,
    location: "Ahmedabad Warehouse",
    orderDate: "2026-03-20",
    total: 210642,
    currency: "INR",
    status: "submitted",
    linkedSo: null,
    canSubmit: false,
    remarks: "Submitted for final commercial approval.",
    createdBy: "Rina",
    items: [
      {
        id: 1,
        itemName: "Micronutrient Mix",
        orderedQty: 120,
        freeQty: 12,
        totalQty: 132,
        rate: 1595.77,
        gst: "12%",
        offerApplied: "-",
        total: 210642,
      },
    ],
  },
];

const hasWindow = () => typeof window !== "undefined";

const getStoredPurchaseOrders = () => {
  if (!hasWindow()) return [...defaultPurchaseOrders];

  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  if (!stored) {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPurchaseOrders));
    return [...defaultPurchaseOrders];
  }

  try {
    return JSON.parse(stored);
  } catch {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPurchaseOrders));
    return [...defaultPurchaseOrders];
  }
};

const saveStoredPurchaseOrders = (records) => {
  if (!hasWindow()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

export const getMockPurchaseOrders = () => getStoredPurchaseOrders();

export const saveMockPurchaseOrder = (record) => {
  const records = getStoredPurchaseOrders();
  const nextRecords = [record, ...records];
  saveStoredPurchaseOrders(nextRecords);
  return record;
};

export const updateMockPurchaseOrder = (id, updates) => {
  const records = getStoredPurchaseOrders();
  const nextRecords = records.map((record) =>
    record.id === id ? { ...record, ...updates } : record,
  );
  saveStoredPurchaseOrders(nextRecords);
};

export const getNextPurchaseOrderId = () => {
  const records = getStoredPurchaseOrders();
  return records.reduce((maxId, record) => Math.max(maxId, record.id), 0) + 1;
};

export const getNextPurchaseOrderNumber = (location = "") => {
  const records = getStoredPurchaseOrders();
  const prefix = location.toLowerCase().includes("surat") ? "SRT" : "AHM";
  const yearSuffix = "26";
  const monthCode = "04";
  const matching = records.filter((record) =>
    record.poNumber.startsWith(`PO-${prefix}-${yearSuffix}${monthCode}-`),
  );
  const sequence = String(matching.length + 1).padStart(4, "0");
  return `PO-${prefix}-${yearSuffix}${monthCode}-${sequence}`;
};
