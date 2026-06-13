import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ColumnGroup } from "primereact/columngroup";
import { Row } from "primereact/row";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { MultiSelect } from "primereact/multiselect";
import { Dropdown } from "primereact/dropdown";
import { Tooltip } from "primereact/tooltip";
import { Skeleton } from "primereact/skeleton";
import { FilterMatchMode } from "primereact/api";
import { unparse } from "papaparse";
import { scrollToTop } from "utils/scrollToTop";
import EmptyMessage from "components/shared/EmptyMessage";
import { selectInvoicedOrders } from "redux/slice/salesOrderSlice";

const dummyInvoices = [
  {
    id: "INV-AHM-2604-0001",
    invoiceNumber: "INV-AHM-2604-0001",
    soNumber: "SO-AHM-2604-0001",
    buyerName: "Gujarat Agro Industries",
    supplierName: "Agro Dot",
    total: 24500,
    paid: 24500,
    pending: 0,
    status: "Paid",
    sellerGSTIN: "24AAACA1111A1Z1",
    buyerGSTIN: "24BBBBB2222B1Z2",
    taxMode: "GST",
    tcs: 245,
    subtotal: 22000,
    discount: 500,
    tax: 2755,
    grandTotal: 24500,
    items: [
      { item: "DAP (50kg)", batch: "DAP-BAG-01", qty: 10, price: 2200, discount: 50, tax: 275.5, total: 24255 },
      { item: "Zinc Sulphate (5kg)", batch: "ZN-SUL-01", qty: 1, price: 500, discount: 0, tax: 0, total: 245 },
    ],
  },
  {
    id: "INV-AHM-2604-0002",
    invoiceNumber: "INV-AHM-2604-0002",
    soNumber: "SO-AHM-2604-0003",
    buyerName: "Mahindra Agri Solutions",
    supplierName: "Agro Dot",
    total: 15750,
    paid: 8000,
    pending: 7750,
    status: "Partial",
    sellerGSTIN: "24AAACA1111A1Z1",
    buyerGSTIN: "27CCCCC3333C1Z3",
    taxMode: "GST",
    tcs: 0,
    subtotal: 14000,
    discount: 0,
    tax: 1750,
    grandTotal: 15750,
    items: [
      { item: "Potash MOP (50kg)", batch: "MOP-BAG-02", qty: 5, price: 1400, discount: 0, tax: 175, total: 7875 },
      { item: "SSP (50kg)", batch: "SSP-BAG-01", qty: 5, price: 1400, discount: 0, tax: 175, total: 7875 },
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
      { item: "Urea (50kg)", batch: "UREA-BAG-01", qty: 50, price: 1079.7, discount: 0, tax: 0, total: 53985 },
    ],
  },
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
      { item: "NPK 19:19:19 (50kg)", batch: "FERT-NPK-50-OLD", qty: 1, price: 1070, discount: 0, tax: 0, total: 1070 },
    ],
  },
  {
    id: "INV-AHM-2604-0005",
    invoiceNumber: "INV-AHM-2604-0005",
    soNumber: "SO-AHM-2604-0010",
    buyerName: "Coromandel International",
    supplierName: "Agro Dot",
    total: 87200,
    paid: 87200,
    pending: 0,
    status: "Paid",
    sellerGSTIN: "24AAACA1111A1Z1",
    buyerGSTIN: "36DDDDD4444D1Z4",
    taxMode: "GST",
    tcs: 872,
    subtotal: 78000,
    discount: 1000,
    tax: 9328,
    grandTotal: 87200,
    items: [
      { item: "Ammonium Sulphate (50kg)", batch: "AS-BAG-03", qty: 30, price: 1300, discount: 500, tax: 4655, total: 43155 },
      { item: "DAP (50kg)", batch: "DAP-BAG-02", qty: 20, price: 2200, discount: 500, tax: 4673, total: 44045 },
    ],
  },
  {
    id: "INV-AHM-2604-0006",
    invoiceNumber: "INV-AHM-2604-0006",
    soNumber: "SO-AHM-2604-0012",
    buyerName: "UPL Limited",
    supplierName: "Agro Dot",
    total: 32450,
    paid: 10000,
    pending: 22450,
    status: "Partial",
    sellerGSTIN: "24AAACA1111A1Z1",
    buyerGSTIN: "27EEEEE5555E1Z5",
    taxMode: "GST",
    tcs: 325,
    subtotal: 29000,
    discount: 250,
    tax: 3375,
    grandTotal: 32450,
    items: [
      { item: "NPK 10:26:26 (50kg)", batch: "NPK-1026-01", qty: 15, price: 1250, discount: 250, tax: 2250, total: 20750 },
      { item: "Boron 20% (1kg)", batch: "BOR-20-01", qty: 25, price: 450, discount: 0, tax: 1125, total: 11700 },
    ],
  },
  {
    id: "INV-AHM-2604-0007",
    invoiceNumber: "INV-AHM-2604-0007",
    soNumber: "SO-AHM-2604-0015",
    buyerName: "PI Industries",
    supplierName: "Agro Dot",
    total: 5600,
    paid: 0,
    pending: 5600,
    status: "Unpaid",
    sellerGSTIN: "24AAACA1111A1Z1",
    buyerGSTIN: "08FFFFF6666F1Z6",
    taxMode: "No Tax",
    tcs: 56,
    subtotal: 5544,
    discount: 0,
    tax: 0,
    grandTotal: 5600,
    items: [
      { item: "Humic Acid (5L)", batch: "HUM-5L-01", qty: 8, price: 693, discount: 0, tax: 0, total: 5544 },
    ],
  },
  {
    id: "INV-AHM-2604-0008",
    invoiceNumber: "INV-AHM-2604-0008",
    soNumber: "SO-AHM-2604-0018",
    buyerName: "Dhanuka Agritech",
    supplierName: "Agro Dot",
    total: 42000,
    paid: 42000,
    pending: 0,
    status: "Paid",
    sellerGSTIN: "24AAACA1111A1Z1",
    buyerGSTIN: "07GGGGG7777G1Z7",
    taxMode: "GST",
    tcs: 420,
    subtotal: 37500,
    discount: 750,
    tax: 4830,
    grandTotal: 42000,
    items: [
      { item: "Urea (50kg)", batch: "UREA-BAG-02", qty: 25, price: 1080, discount: 750, tax: 2430, total: 28680 },
      { item: "NPK 19:19:19 (50kg)", batch: "FERT-NPK-50-NEW", qty: 10, price: 1070, discount: 0, tax: 2400, total: 13320 },
    ],
  },
  { id: "INV-AHM-2604-0009", invoiceNumber: "INV-AHM-2604-0009", soNumber: "SO-AHM-2604-0019", buyerName: "IFFCO", supplierName: "Agro Dot", total: 68400, paid: 0, pending: 68400, status: "Unpaid", sellerGSTIN: "24AAACA1111A1Z1", buyerGSTIN: "07HHHHH8888H1Z8", taxMode: "GST", tcs: 684, subtotal: 60000, discount: 0, tax: 7716, grandTotal: 68400, items: [{ item: "NPK 12:32:16 (50kg)", batch: "NPK-1232-01", qty: 40, price: 1500, discount: 0, tax: 192, total: 68400 }] },
  { id: "INV-AHM-2604-0010", invoiceNumber: "INV-AHM-2604-0010", soNumber: "SO-AHM-2604-0021", buyerName: "Bayer CropScience", supplierName: "Agro Dot", total: 29750, paid: 15000, pending: 14750, status: "Partial", sellerGSTIN: "24AAACA1111A1Z1", buyerGSTIN: "27IIIII9999I1Z9", taxMode: "GST", tcs: 298, subtotal: 26500, discount: 500, tax: 3452, grandTotal: 29750, items: [{ item: "Imidacloprid 70WS (50g)", batch: "IMI-70WS-01", qty: 20, price: 750, discount: 0, tax: 150, total: 15150 }, { item: "Flubendiamide 20WG (150g)", batch: "FLU-20WG-01", qty: 18, price: 800, discount: 0, tax: 144, total: 14544 }] },
  { id: "INV-AHM-2604-0011", invoiceNumber: "INV-AHM-2604-0011", soNumber: "SO-AHM-2604-0023", buyerName: "Syngenta India", supplierName: "Agro Dot", total: 11200, paid: 11200, pending: 0, status: "Paid", sellerGSTIN: "24AAACA1111A1Z1", buyerGSTIN: "27JJJJJ1010J1Z0", taxMode: "GST", tcs: 112, subtotal: 10000, discount: 0, tax: 1088, grandTotal: 11200, items: [{ item: "Thiamethoxam 25WG (250g)", batch: "THIA-25WG-01", qty: 10, price: 1000, discount: 0, tax: 108, total: 11200 }] },
  { id: "INV-AHM-2604-0012", invoiceNumber: "INV-AHM-2604-0012", soNumber: "SO-AHM-2604-0025", buyerName: "Rallis India Ltd", supplierName: "Agro Dot", total: 45600, paid: 0, pending: 45600, status: "Unpaid", sellerGSTIN: "24AAACA1111A1Z1", buyerGSTIN: "27KKKKK1111K1Z1", taxMode: "GST", tcs: 456, subtotal: 40000, discount: 0, tax: 5144, grandTotal: 45600, items: [{ item: "MOP (50kg)", batch: "MOP-BAG-03", qty: 20, price: 1200, discount: 0, tax: 216, total: 24216 }, { item: "Urea (50kg)", batch: "UREA-BAG-03", qty: 15, price: 1080, discount: 0, tax: 194, total: 21384 }] },
  { id: "INV-AHM-2604-0013", invoiceNumber: "INV-AHM-2604-0013", soNumber: "SO-AHM-2604-0027", buyerName: "Nuziveedu Seeds Ltd", supplierName: "Agro Dot", total: 18900, paid: 9000, pending: 9900, status: "Partial", sellerGSTIN: "24AAACA1111A1Z1", buyerGSTIN: "36LLLLL1212L1Z2", taxMode: "GST", tcs: 189, subtotal: 17500, discount: 200, tax: 1411, grandTotal: 18900, items: [{ item: "Hybrid Maize Seeds (1kg)", batch: "HYB-MAI-01", qty: 50, price: 350, discount: 4, tax: 36, total: 18900 }] },
  { id: "INV-AHM-2604-0014", invoiceNumber: "INV-AHM-2604-0014", soNumber: "SO-AHM-2604-0029", buyerName: "Kaveri Seeds", supplierName: "Agro Dot", total: 33000, paid: 33000, pending: 0, status: "Paid", sellerGSTIN: "24AAACA1111A1Z1", buyerGSTIN: "36MMMMM1313M1Z3", taxMode: "GST", tcs: 330, subtotal: 30000, discount: 0, tax: 2670, grandTotal: 33000, items: [{ item: "Hybrid Cotton Seeds (475g)", batch: "HYB-COT-01", qty: 60, price: 500, discount: 0, tax: 45, total: 33000 }] },
  { id: "INV-AHM-2604-0015", invoiceNumber: "INV-AHM-2604-0015", soNumber: "SO-AHM-2604-0031", buyerName: "Godrej Agrovet", supplierName: "Agro Dot", total: 72500, paid: 0, pending: 72500, status: "Unpaid", sellerGSTIN: "24AAACA1111A1Z1", buyerGSTIN: "27NNNNN1414N1Z4", taxMode: "GST", tcs: 725, subtotal: 65000, discount: 1000, tax: 7775, grandTotal: 72500, items: [{ item: "Chlorpyrifos 20EC (1L)", batch: "CHL-20EC-01", qty: 100, price: 350, discount: 5, tax: 35, total: 38000 }, { item: "Cypermethrin 10EC (1L)", batch: "CYP-10EC-01", qty: 100, price: 300, discount: 5, tax: 30, total: 32500 }] },
  { id: "INV-AHM-2604-0016", invoiceNumber: "INV-AHM-2604-0016", soNumber: "SO-AHM-2604-0033", buyerName: "Sumitomo Chemical India", supplierName: "Agro Dot", total: 21300, paid: 10000, pending: 11300, status: "Partial", sellerGSTIN: "24AAACA1111A1Z1", buyerGSTIN: "27OOOOO1515O1Z5", taxMode: "GST", tcs: 213, subtotal: 19000, discount: 0, tax: 2087, grandTotal: 21300, items: [{ item: "Profenofos 50EC (1L)", batch: "PRO-50EC-01", qty: 50, price: 380, discount: 0, tax: 42, total: 21300 }] },
  { id: "INV-AHM-2604-0017", invoiceNumber: "INV-AHM-2604-0017", soNumber: "SO-AHM-2604-0035", buyerName: "FMC India", supplierName: "Agro Dot", total: 56800, paid: 56800, pending: 0, status: "Paid", sellerGSTIN: "24AAACA1111A1Z1", buyerGSTIN: "27PPPPP1616P1Z6", taxMode: "GST", tcs: 568, subtotal: 51000, discount: 500, tax: 5732, grandTotal: 56800, items: [{ item: "Buprofezin 25SC (250ml)", batch: "BUP-25SC-01", qty: 80, price: 350, discount: 0, tax: 50, total: 30000 }, { item: "Diafenthiuron 50WP (100g)", batch: "DIA-50WP-01", qty: 115, price: 200, discount: 0, tax: 36, total: 26800 }] },
  { id: "INV-AHM-2604-0018", invoiceNumber: "INV-AHM-2604-0018", soNumber: "SO-AHM-2604-0037", buyerName: "BASF India", supplierName: "Agro Dot", total: 38900, paid: 0, pending: 38900, status: "Unpaid", sellerGSTIN: "24AAACA1111A1Z1", buyerGSTIN: "27QQQQQ1717Q1Z7", taxMode: "GST", tcs: 389, subtotal: 35000, discount: 0, tax: 3511, grandTotal: 38900, items: [{ item: "Metribuzin 70WP (1kg)", batch: "MET-70WP-01", qty: 70, price: 500, discount: 0, tax: 90, total: 38900 }] },
  { id: "INV-AHM-2604-0019", invoiceNumber: "INV-AHM-2604-0019", soNumber: "SO-AHM-2604-0039", buyerName: "Hebro Organics", supplierName: "Agro Dot", total: 14200, paid: 7000, pending: 7200, status: "Partial", sellerGSTIN: "24AAACA1111A1Z1", buyerGSTIN: "29RRRRR1818R1Z8", taxMode: "No Tax", tcs: 142, subtotal: 14200, discount: 0, tax: 0, grandTotal: 14200, items: [{ item: "Seaweed Extract (1L)", batch: "SEA-EXT-01", qty: 65, price: 200, discount: 0, tax: 0, total: 14200 }] },
  { id: "INV-AHM-2604-0020", invoiceNumber: "INV-AHM-2604-0020", soNumber: "SO-AHM-2604-0041", buyerName: "Excel Crop Care", supplierName: "Agro Dot", total: 91500, paid: 91500, pending: 0, status: "Paid", sellerGSTIN: "24AAACA1111A1Z1", buyerGSTIN: "27SSSSS1919S1Z9", taxMode: "GST", tcs: 915, subtotal: 82500, discount: 1500, tax: 9585, grandTotal: 91500, items: [{ item: "Trifluralin 48EC (1L)", batch: "TRI-48EC-01", qty: 150, price: 300, discount: 5, tax: 54, total: 45750 }, { item: "Pendimethalin 30EC (1L)", batch: "PEN-30EC-01", qty: 125, price: 300, discount: 7, tax: 54, total: 45750 }] },
];

export default function InvoicePage() {
  const toast = useRef(null);
  const poInvoicedOrders = useSelector(selectInvoicedOrders);
  const [invoiceList, setInvoiceList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");

  const paymentModeOptions = [
    { label: "UPI", value: "UPI" },
    { label: "Cash", value: "Cash" },
    { label: "Bank Transfer", value: "Bank Transfer" },
    { label: "Cheque", value: "Cheque" },
  ];

  const currencyFields = ["total", "paid", "pending"];
  const numericFilterFields = ["total", "paid", "pending"];

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [totalRecords, setTotalRecords] = useState(0);

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    invoiceNumber: { value: null, matchMode: FilterMatchMode.CONTAINS },
    soNumber: { value: null, matchMode: FilterMatchMode.CONTAINS },
    buyerName: { value: null, matchMode: FilterMatchMode.CONTAINS },
    total: { value: null, matchMode: FilterMatchMode.CONTAINS },
    paid: { value: null, matchMode: FilterMatchMode.CONTAINS },
    pending: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const columnOptions = [
    { field: "invoiceNumber", header: "Invoice #" },
    { field: "soNumber", header: "SO #" },
    { field: "buyerName", header: "Buyer" },
    { field: "total", header: "Total" },
    { field: "paid", header: "Paid" },
    { field: "pending", header: "Pending" },
    { field: "status", header: "Status" },
    { field: "action", header: "Action" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("salesInvoice_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    return columnOptions;
  });

  const [dropdownOptions, setDropdownOptions] = useState({
    statusOptions: [],
  });

  const statusOptions = dropdownOptions.statusOptions;

  const allDataRef = useRef([]);

  const fetchInvoices = useCallback(() => {
    try {
      // Build PO-generated invoices from Redux state
      const poInvoices = poInvoicedOrders.map((order) => ({
        id: order.invoiceNumber,
        invoiceNumber: order.invoiceNumber,
        soNumber: order.soNumber,
        buyerName: `${order.supplier} (via PO)`,
        supplierName: "Agro Dot",
        total: order.total || 0,
        paid: order.paid || 0,
        pending: order.pending || order.total || 0,
        status: order.paymentStatus || "Unpaid",
        source: "PO",
        items: order.items.map((item) => ({
          item: item.name,
          qty: item.quantity,
          price: item.rate,
          discount: 0,
          tax: 0,
          total: item.quantity * item.rate,
        })),
      }));

      if (allDataRef.current.length === 0 || poInvoices.length > 0) {
        setIsLoading(true);
        allDataRef.current = [...poInvoices, ...dummyInvoices];
        const statuses = [...new Set(allDataRef.current.map((r) => r.status).filter(Boolean))].sort();
        setDropdownOptions({ statusOptions: statuses.map((v) => ({ label: v, value: v })) });
      }

      let filtered = [...allDataRef.current];

      if (filters.global?.value) {
        const globalValue = String(filters.global.value).toLowerCase();
        filtered = filtered.filter((row) =>
          Object.values(row).some((val) =>
            String(val ?? "")
              .toLowerCase()
              .includes(globalValue),
          ),
        );
      }

      Object.entries(filters).forEach(([field, filterMeta]) => {
        if (field === "global" || !filterMeta?.value) return;
        const filterValue = String(filterMeta.value).toLowerCase();

        if (filterMeta.matchMode === FilterMatchMode.EQUALS) {
          filtered = filtered.filter(
            (row) =>
              String(row[field] ?? "").toLowerCase() === filterValue,
          );
        } else {
          filtered = filtered.filter((row) =>
            String(row[field] ?? "")
              .toLowerCase()
              .includes(filterValue),
          );
        }
      });

      if (lazyParams.sortField) {
        filtered.sort((a, b) => {
          const valA = a[lazyParams.sortField];
          const valB = b[lazyParams.sortField];
          let result;

          if (typeof valA === "number" && typeof valB === "number") {
            result = valA - valB;
          } else {
            result = String(valA ?? "").localeCompare(String(valB ?? ""));
          }

          return lazyParams.sortOrder === 1 ? result : -result;
        });
      }

      setTotalRecords(filtered.length);

      const paginated = filtered.slice(
        lazyParams.first,
        lazyParams.first + lazyParams.rows,
      );
      setInvoiceList(paginated);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: error.message || "Failed to load invoices",
        life: 3000,
      });
      setInvoiceList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, poInvoicedOrders]);

  useEffect(() => {
    fetchInvoices();
  }, [filters, lazyParams, fetchInvoices]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("salesInvoiceTableFilters");
    if (sessionState) {
      const parsed = JSON.parse(sessionState);

      if (parsed.sortField !== undefined && parsed.sortOrder !== undefined) {
        setLazyParams((prev) => ({
          ...prev,
          sortField: parsed.sortField,
          sortOrder: parsed.sortOrder,
        }));
      }
    }
  }, []);

  const blankRow = {
    invoiceNumber: "",
    soNumber: "",
    buyerName: "",
    total: "",
    paid: "",
    pending: "",
    status: "",
  };

  const formatCurrency = (value) =>
    `₹${value != null ? Number(value).toFixed(2) : "0.00"}`;

  const openInvoiceDetails = (invoice) => {
    const detail = allDataRef.current.find((r) => r.id === invoice.id || r.invoiceNumber === invoice.invoiceNumber) || invoice;
    setSelectedInvoice(detail);
    setPaymentAmount(String(Number(detail.pending || 0)));
    setPaymentMode("UPI");
    setIsDetailOpen(true);
  };

  const handleRecordPayment = () => {
    if (!selectedInvoice) return;
    const amount = Number(paymentAmount || 0);
    const currentPending = Number(selectedInvoice.pending || 0);
    if (amount <= 0 || amount > currentPending) {
      toast.current?.show({ severity: "warn", summary: "Invalid Amount", detail: `Enter an amount between \u20b91 and \u20b9${currentPending.toFixed(2)}`, life: 3000 });
      return;
    }
    setIsRecordingPayment(true);
    const paid = Number(selectedInvoice.paid || 0) + amount;
    const pending = Number(selectedInvoice.total || 0) - paid;
    const newStatus = pending <= 0 ? "Paid" : "Partial";

    setSelectedInvoice((prev) =>
      prev ? { ...prev, paid, pending, status: newStatus } : prev,
    );

    allDataRef.current = allDataRef.current.map((row) =>
      (row.id || row.invoiceNumber) ===
      (selectedInvoice.id || selectedInvoice.invoiceNumber)
        ? { ...row, paid, pending, status: newStatus }
        : row,
    );
    fetchInvoices();
    try {
      const updates = JSON.parse(localStorage.getItem("agro_payment_updates") || "{}");
      updates[selectedInvoice.invoiceNumber] = { paid, pending, status: newStatus, paymentMode, lastPaymentDate: new Date().toISOString().slice(0, 10) };
      localStorage.setItem("agro_payment_updates", JSON.stringify(updates));
    } catch (_) {}

    toast.current?.show({
      severity: "success",
      summary: "Success",
      detail: `₹${amount.toFixed(2)} via ${paymentMode} recorded. ${pending > 0 ? `Remaining: ₹${pending.toFixed(2)}` : "Fully paid!"}`,
      life: 3000,
    });

    setIsRecordingPayment(false);
    if (pending <= 0) setIsDetailOpen(false);
    else setPaymentAmount(String(pending));
  };

  const onGlobalFilterChange = (e) => {
    const rawValue = e.target.value;
    const value = sanitizeFilterValue("text", rawValue);

    const updatedFilters = {
      ...filters,
      global: { ...filters.global, value },
    };
    setFilters(updatedFilters);
  };

  const sanitizeFilterValue = (type, value) => {
    if (value === null || value === undefined) return value;

    const stringValue = String(value);

    if (type === "numeric") {
      let sanitized = stringValue.replace(/[^0-9.-]/g, "");
      sanitized = sanitized.replace(/(?!^)-/g, "");

      const parts = sanitized.split(".");
      if (parts.length > 2) {
        sanitized = `${parts.shift()}.${parts.join("")}`;
      }

      return sanitized;
    }

    return stringValue.replace(/[^a-zA-Z0-9\s@.,/&()-]/g, "");
  };

  const fileExportMessage = () => {
    toast.current.show({
      severity: "success",
      detail: "File Exported Successfully",
      life: 3000,
    });
  };

  const exportCSV = () => {
    if (allDataRef.current.length === 0) {
      toast.current.show({ severity: "warn", summary: "Warning", detail: "No data available to export", life: 3000 });
      return;
    }

    const exportFields = visibleFields.filter((col) => col.field !== "action");
    const formattedData = allDataRef.current.map((row) => {
      const formattedRow = {};
      exportFields.forEach((col) => {
        if (currencyFields.includes(col.field)) {
          formattedRow[col.header] = row[col.field] != null ? `${Number(row[col.field]).toFixed(2)}` : "0.00";
        } else {
          formattedRow[col.header] = row[col.field] ?? "-";
        }
      });
      return formattedRow;
    });

    const csvData = unparse({
      fields: exportFields.map((col) => col.header),
      data: formattedData.map((row) => exportFields.map((col) => row[col.header])),
    });

    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sales_invoice.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    fileExportMessage();
  };

  const exportPdf = async () => {
    if (allDataRef.current.length === 0) {
      toast.current.show({ severity: "warn", summary: "Warning", detail: "No data available to export", life: 3000 });
      return;
    }

    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = autoTableModule.default || autoTableModule;

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "A4" });

      const exportFields = visibleFields.filter((col) => col.field !== "action");
      const head = [exportFields.map((col) => col.header)];
      const body = allDataRef.current.map((row) =>
        exportFields.map((col) => row[col.field] ?? "-"),
      );

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = { top: 30, bottom: 20, left: 30, right: 30 };
      const usableWidth = pageWidth - margin.left - margin.right;
      const colWidth = Math.floor(usableWidth / exportFields.length);

      const columnStyles = exportFields.reduce((acc, _col, idx) => {
        acc[idx] = { cellWidth: colWidth, overflow: "linebreak" };
        return acc;
      }, {});

      autoTable(doc, {
        head, body, startY: 20, tableWidth: usableWidth,
        styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak", valign: "middle" },
        headStyles: { fillColor: [0, 128, 0], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        columnStyles, margin, theme: "grid",
      });

      doc.save("sales_invoice.pdf");
      fileExportMessage();
    } catch (error) {
      toast.current.show({ severity: "error", summary: "Error", detail: "Failed to export PDF.", life: 3000 });
    }
  };

  const exportExcel = () => {
    if (allDataRef.current.length === 0) {
      toast.current.show({ severity: "warn", summary: "Warning", detail: "No data available to export", life: 3000 });
      return;
    }

    import("xlsx").then((xlsx) => {
      const exportFields = visibleFields.filter((col) => col.field !== "action");
      const filteredData = allDataRef.current.map((row) => {
        const filteredRow = {};
        exportFields.forEach((col) => {
          if (currencyFields.includes(col.field)) {
            filteredRow[col.header] = row[col.field] != null ? `${Number(row[col.field]).toFixed(2)}` : "0.00";
          } else {
            filteredRow[col.header] = row[col.field] ?? "-";
          }
        });
        return filteredRow;
      });

      const worksheet = xlsx.utils.json_to_sheet(filteredData);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ["data"] };
      const excelBuffer = xlsx.write(workbook, { bookType: "xlsx", type: "array" });

      import("file-saver").then((module) => {
        if (module && module.default) {
          const data = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
          });
          module.default.saveAs(data, `sales_invoice_export_${new Date().getTime()}.xlsx`);
        }
      });

      fileExportMessage();
    });
  };

  const onColumnToggle = (event) => {
    let selectedColumns = event.value;

    if (!selectedColumns.some((col) => col.field === "invoiceNumber")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "invoiceNumber"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "salesInvoice_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Sales Invoice Report
      </h3>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 lg:justify-end">
        <IconField iconPosition="left" className="w-full sm:w-64">
          <InputIcon className="pi pi-search" />
          <InputText
            type="search"
            value={filters.global?.value || ""}
            onChange={onGlobalFilterChange}
            onKeyDown={(e) => {
              const allowedKeys = [
                "Backspace", "Delete", "Tab", "Escape", "Enter",
                "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End",
              ];
              if (e.ctrlKey || e.metaKey || allowedKeys.includes(e.key)) return;
              if (!/^[a-zA-Z0-9@.,/&()\-\s]$/.test(e.key)) e.preventDefault();
            }}
            onPaste={(e) => {
              const pastedText = e.clipboardData.getData("text");
              const sanitizedText = sanitizeFilterValue("text", pastedText);
              if (pastedText !== sanitizedText) {
                e.preventDefault();
                const currentValue = filters.global?.value || "";
                const updatedFilters = {
                  ...filters,
                  global: { ...filters.global, value: `${currentValue}${sanitizedText}` },
                };
                setFilters(updatedFilters);
              }
            }}
            placeholder="Keyword Search"
            className="w-full"
          />
        </IconField>

        <MultiSelect
          value={visibleFields}
          options={columnOptions}
          optionLabel="header"
          onChange={onColumnToggle}
          className="w-full sm:w-56"
          display="chip"
          placeholder="Visible Columns"
          disabled={isLoading}
        />

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <div className="flex gap-1">
            <Button className="export-icon-tooltip" type="button" icon="pi pi-file" rounded size="small" onClick={exportCSV} data-pr-tooltip="Export as CSV" disabled={isLoading} />
            <Button className="export-icon-tooltip" type="button" icon="pi pi-file-excel" severity="success" rounded size="small" onClick={exportExcel} data-pr-tooltip="Export as XLS" disabled={isLoading} />
            <Button className="export-icon-tooltip" type="button" icon="pi pi-file-pdf" severity="warning" rounded size="small" onClick={exportPdf} data-pr-tooltip="Export as PDF" disabled={isLoading} />
          </div>
        </div>

        <Tooltip target=".export-icon-tooltip" position="top" style={{ fontSize: "12px" }} showDelay={100} hideDelay={100} />
      </div>
    </div>
  );

  const createValidatedFilterElement = (placeholder, type = "text") => {
    function InvoiceFilterElement(options) {
      const allowedKeys = [
        "Backspace", "Delete", "Tab", "Escape", "Enter",
        "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End",
      ];
      const allowedKeyPatterns = {
        text: /^[a-zA-Z0-9@.,/&()\-\s]$/,
        numeric: /^[0-9.-]$/,
      };

      return (
        <InputText
          value={options.value ?? ""}
          onChange={(e) => options.filterApplyCallback(sanitizeFilterValue(type, e.target.value))}
          onKeyDown={(e) => {
            if (e.ctrlKey || e.metaKey || allowedKeys.includes(e.key)) return;
            if (!allowedKeyPatterns[type].test(e.key)) e.preventDefault();
          }}
          onPaste={(e) => {
            const pastedText = e.clipboardData.getData("text");
            if (pastedText !== sanitizeFilterValue(type, pastedText)) {
              e.preventDefault();
              options.filterApplyCallback(sanitizeFilterValue(type, pastedText));
            }
          }}
          placeholder={placeholder}
          className="p-column-filter w-full"
        />
      );
    }
    InvoiceFilterElement.displayName = `InvoiceFilterElement(${placeholder})`;
    return InvoiceFilterElement;
  };

  const createDropdownFilterElement = (placeholder, optionsList) => {
    function InvoiceDropdownFilterElement(options) {
      return (
        <Dropdown
          value={options.value ?? null}
          options={optionsList}
          onChange={(e) => options.filterApplyCallback(e.value)}
          placeholder={placeholder}
          className="p-column-filter w-full"
          showClear
        />
      );
    }
    InvoiceDropdownFilterElement.displayName = `InvoiceDropdownFilterElement(${placeholder})`;
    return InvoiceDropdownFilterElement;
  };

  // Body templates
  const invoiceNumberBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <button
        type="button"
        onClick={() => openInvoiceDetails(rowData)}
        className="cursor-pointer font-semibold text-blue-600 hover:underline"
      >
        {rowData.invoiceNumber || "-"}
      </button>
    );
  };

  const soNumberBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span>{rowData.soNumber || "-"}</span>
    );
  };

  const buyerNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-fuchsia-600">{rowData.buyerName || "-"}</span>
    );
  };

  const currencyBodyTemplate = (field, className = "font-normal text-slate-600") => {
    function CurrencyBodyCell(rowData) {
      return isLoading ? (
        <Skeleton width="70%" height="1.5rem" />
      ) : (
        <span className={className}>
          ₹{rowData[field] != null ? Number(rowData[field]).toFixed(2) : "0.00"}
        </span>
      );
    }
    return CurrencyBodyCell;
  };

  const pendingBodyTemplate = (rowData) => {
    if (isLoading) return <Skeleton width="70%" height="1.5rem" />;
    const value = Number(rowData.pending) || 0;
    return (
      <span className={`font-semibold ${value > 0 ? "text-red-600" : "text-green-600"}`}>
        ₹{value.toFixed(2)}
      </span>
    );
  };

  const statusBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span
        className={`rounded-full px-2 py-1 text-xs font-medium ${
          rowData.status === "Paid"
            ? "bg-green-100 text-green-800"
            : rowData.status === "Partial"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800"
        }`}
      >
        {rowData.status || "Unpaid"}
      </span>
    );
  };

  const actionBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Button label="View" outlined size="small" onClick={() => openInvoiceDetails(rowData)} />
        <Button label="Update" outlined size="small" />
        <Button label="Payment" size="small" onClick={() => openInvoiceDetails(rowData)} />
        <Button icon="pi pi-print" outlined rounded size="small" severity="success" onClick={() => window.print()} tooltip="Print" tooltipOptions={{ position: "top" }} />
      </div>
    );
  };

  // Calculate totals
  const calculateTotals = () => {
    const totals = allDataRef.current.reduce(
      (acc, row) => {
        acc.total += Number(row.total) || 0;
        acc.paid += Number(row.paid) || 0;
        acc.pending += Number(row.pending) || 0;
        return acc;
      },
      { total: 0, paid: 0, pending: 0 },
    );
    return totals;
  };

  const totals = calculateTotals();

  const dialogFooter = (
    <div className="flex items-center justify-end gap-2">
      <Button label="Close" outlined onClick={() => { setIsDetailOpen(false); setSelectedInvoice(null); }} />
      <Button label="Print" icon="pi pi-print" outlined severity="success" onClick={() => window.print()} />
      {selectedInvoice && Number(selectedInvoice.pending || 0) > 0 && (
        <Button label="Record Payment" loading={isRecordingPayment} onClick={handleRecordPayment} />
      )}
    </div>
  );

  return (
    <Page title="Invoice">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : invoiceList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No invoices found"
                    subtitle="No invoices match your current filters. Try adjusting your search criteria."
                  />
                }
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "invoiceNumber",
                  "soNumber",
                  "buyerName",
                  "total",
                  "paid",
                  "pending",
                  "status",
                ]}
                onFilter={(e) => {
                  setFilters(e.filters);
                  setLazyParams((prev) => ({ ...prev, first: 0 }));
                  scrollToTop();
                }}
                onPage={(e) => {
                  setLazyParams((prev) => ({
                    ...prev,
                    first: e.first,
                    rows: e.rows,
                  }));
                  scrollToTop();
                }}
                onSort={(e) => {
                  setLazyParams((prev) => ({
                    ...prev,
                    sortField: e.sortField,
                    sortOrder: e.sortOrder,
                  }));
                  scrollToTop();
                }}
                stateStorage="session"
                stateKey="salesInvoiceTableFilters"
                rows={lazyParams.rows}
                first={lazyParams.first}
                totalRecords={totalRecords}
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50, 100]}
                tableStyle={{ minWidth: "50rem" }}
                removableSort
                footerColumnGroup={
                  !isLoading && (
                    <ColumnGroup>
                      <Row>
                        <Column
                          footer={`Total Invoices: ${allDataRef.current.length}`}
                          className="font-bold"
                        />
                        {visibleFields.some((col) => col.field === "invoiceNumber") && <Column footer="" />}
                        {visibleFields.some((col) => col.field === "soNumber") && <Column footer="" />}
                        {visibleFields.some((col) => col.field === "buyerName") && <Column footer="" />}
                        {visibleFields.some((col) => col.field === "total") && (
                          <Column footer={`₹${totals.total.toFixed(2)}`} className="font-bold text-blue-600" />
                        )}
                        {visibleFields.some((col) => col.field === "paid") && (
                          <Column footer={`₹${totals.paid.toFixed(2)}`} className="font-bold text-emerald-600" />
                        )}
                        {visibleFields.some((col) => col.field === "pending") && (
                          <Column
                            footer={`₹${totals.pending.toFixed(2)}`}
                            className={`font-bold ${totals.pending > 0 ? "text-red-600" : "text-green-600"}`}
                          />
                        )}
                        {visibleFields.some((col) => col.field === "status") && <Column footer="" />}
                        {visibleFields.some((col) => col.field === "action") && <Column footer="" />}
                      </Row>
                    </ColumnGroup>
                  )
                }
              >
                <Column
                  header="Sr No."
                  body={(rowData, options) =>
                    isLoading ? (
                      <Skeleton width="30%" height="1.5rem" />
                    ) : (
                      options.rowIndex + 1
                    )
                  }
                  style={{ minWidth: "5rem" }}
                />
                {visibleFields.some((col) => col.field === "invoiceNumber") && (
                  <Column
                    field="invoiceNumber"
                    header="Invoice #"
                    style={{ minWidth: "12rem" }}
                    body={invoiceNumberBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Invoice", "text")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "soNumber") && (
                  <Column
                    field="soNumber"
                    header="SO #"
                    style={{ minWidth: "12rem" }}
                    body={soNumberBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search SO", "text")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "buyerName") && (
                  <Column
                    field="buyerName"
                    header="Buyer"
                    style={{ minWidth: "12rem" }}
                    body={buyerNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Buyer", "text")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "total") && (
                  <Column
                    field="total"
                    header="Total"
                    style={{ minWidth: "10rem" }}
                    body={currencyBodyTemplate("total")}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Total", "numeric")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "paid") && (
                  <Column
                    field="paid"
                    header="Paid"
                    style={{ minWidth: "10rem" }}
                    body={currencyBodyTemplate("paid", "font-medium text-emerald-600")}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Paid", "numeric")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "pending") && (
                  <Column
                    field="pending"
                    header="Pending"
                    style={{ minWidth: "10rem" }}
                    body={pendingBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Pending", "numeric")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "status") && (
                  <Column
                    field="status"
                    header="Status"
                    style={{ minWidth: "9rem" }}
                    body={statusBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterElement={createDropdownFilterElement("Select Status", statusOptions)}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "action") && (
                  <Column
                    field="action"
                    header="Action"
                    style={{ minWidth: "18rem" }}
                    body={actionBodyTemplate}
                  />
                )}
              </DataTable>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        visible={isDetailOpen}
        onHide={() => { setIsDetailOpen(false); setSelectedInvoice(null); }}
        header={`Invoice ${selectedInvoice?.invoiceNumber || ""}`}
        className="w-full max-w-5xl"
        draggable={false}
        footer={dialogFooter}
      >
        {!selectedInvoice ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Skeleton width="100%" height="200px" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left dark:border-dark-500/40">
                    <th className="px-3 py-2">ITEM</th>
                    <th className="px-3 py-2">BATCH</th>
                    <th className="px-3 py-2">QTY</th>
                    <th className="px-3 py-2">PRICE</th>
                    <th className="px-3 py-2">DISCOUNT</th>
                    <th className="px-3 py-2">TAX</th>
                    <th className="px-3 py-2">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoice.items || []).map((item, index) => (
                    <tr key={`${item.item}-${index}`} className="border-b border-gray-100 dark:border-dark-500/20">
                      <td className="px-3 py-2">{item.item || "-"}</td>
                      <td className="px-3 py-2">{item.batch || "-"}</td>
                      <td className="px-3 py-2">{item.qty ?? "-"}</td>
                      <td className="px-3 py-2">{formatCurrency(item.price)}</td>
                      <td className="px-3 py-2">{formatCurrency(item.discount)}</td>
                      <td className="px-3 py-2">{formatCurrency(item.tax)}</td>
                      <td className="px-3 py-2">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
              <div className="rounded-md border border-gray-200 px-3 py-2 dark:border-dark-500/40">
                <p className="text-xs text-gray-500 dark:text-dark-300">SUBTOTAL</p>
                <p className="font-medium">{formatCurrency(selectedInvoice.subtotal)}</p>
              </div>
              <div className="rounded-md border border-gray-200 px-3 py-2 dark:border-dark-500/40">
                <p className="text-xs text-gray-500 dark:text-dark-300">DISCOUNT</p>
                <p className="font-medium">{formatCurrency(selectedInvoice.discount)}</p>
              </div>
              <div className="rounded-md border border-gray-200 px-3 py-2 dark:border-dark-500/40">
                <p className="text-xs text-gray-500 dark:text-dark-300">TAX</p>
                <p className="font-medium">{formatCurrency(selectedInvoice.tax)}</p>
              </div>
              <div className="rounded-md border border-gray-200 px-3 py-2 dark:border-dark-500/40">
                <p className="text-xs text-gray-500 dark:text-dark-300">TCS</p>
                <p className="font-medium">{formatCurrency(selectedInvoice.tcs)}</p>
              </div>
              <div className="rounded-md bg-amber-50 px-3 py-2 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                <p className="text-xs">GRAND TOTAL</p>
                <p className="font-semibold">{formatCurrency(selectedInvoice.grandTotal)}</p>
              </div>
            </div>

            <div className="rounded-md bg-gray-100 px-3 py-2 text-sm dark:bg-dark-600">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span><span className="font-medium">Seller GSTIN:</span> {selectedInvoice.sellerGSTIN || "-"}</span>
                <span><span className="font-medium">Buyer GSTIN:</span> {selectedInvoice.buyerGSTIN || "-"}</span>
                <span><span className="font-medium">Tax Mode:</span> {selectedInvoice.taxMode || "-"}</span>
                <span><span className="font-medium">Status:</span> {selectedInvoice.status || "-"}</span>
                <span><span className="font-medium">Pending:</span> {formatCurrency(selectedInvoice.pending)}</span>
              </div>
            </div>
            {Number(selectedInvoice.pending || 0) > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20">
                <label className="whitespace-nowrap text-sm font-medium">Pay Amount:</label>
                <InputText
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="w-36"
                  placeholder="Enter amount"
                  keyfilter="money"
                />
                <label className="whitespace-nowrap text-sm font-medium">Mode:</label>
                <Dropdown
                  value={paymentMode}
                  options={paymentModeOptions}
                  onChange={(e) => setPaymentMode(e.value)}
                  className="w-36"
                />
                <span className="text-sm text-gray-500">of {formatCurrency(selectedInvoice.pending)} pending</span>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </Page>
  );
}
