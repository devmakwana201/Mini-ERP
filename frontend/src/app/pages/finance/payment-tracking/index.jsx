import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ColumnGroup } from "primereact/columngroup";
import { Row } from "primereact/row";
import { Button } from "primereact/button";
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

const dummyPayments = [
  { id: "PAY-001", invoiceNumber: "INV-AHM-2604-0001", soNumber: "SO-AHM-2604-0001", invoiceId: "INV-AHM-2604-0001", buyerName: "Gujarat Agro Industries", supplierName: "Agro Dot", total: 24500, paid: 24500, pending: 0, status: "Completed", paymentMode: "Bank Transfer", lastPaymentDate: "2026-04-10" },
  { id: "PAY-002", invoiceNumber: "INV-AHM-2604-0002", soNumber: "SO-AHM-2604-0003", invoiceId: "INV-AHM-2604-0002", buyerName: "Mahindra Agri Solutions", supplierName: "Agro Dot", total: 15750, paid: 8000, pending: 7750, status: "Partial", paymentMode: "UPI", lastPaymentDate: "2026-04-12" },
  { id: "PAY-003", invoiceNumber: "INV-AHM-2604-0003", soNumber: "SO-AHM-2604-0006", invoiceId: "INV-AHM-2604-0003", buyerName: "Tata Rallis India (via PO)", supplierName: "Agro Dot", total: 53985, paid: 0, pending: 53985, status: "Pending", paymentMode: "-", lastPaymentDate: "-" },
  { id: "PAY-004", invoiceNumber: "INV-AHM-2604-0004", soNumber: "SO-AHM-2604-0008", invoiceId: "INV-AHM-2604-0004", buyerName: "Tata Rallis India (via PO)", supplierName: "Agro Dot", total: 1081, paid: 0, pending: 1081, status: "Pending", paymentMode: "-", lastPaymentDate: "-" },
  { id: "PAY-005", invoiceNumber: "INV-AHM-2604-0005", soNumber: "SO-AHM-2604-0010", invoiceId: "INV-AHM-2604-0005", buyerName: "Coromandel International", supplierName: "Agro Dot", total: 87200, paid: 87200, pending: 0, status: "Completed", paymentMode: "Cheque", lastPaymentDate: "2026-04-08" },
  { id: "PAY-006", invoiceNumber: "INV-AHM-2604-0006", soNumber: "SO-AHM-2604-0012", invoiceId: "INV-AHM-2604-0006", buyerName: "UPL Limited", supplierName: "Agro Dot", total: 32450, paid: 10000, pending: 22450, status: "Partial", paymentMode: "Cash", lastPaymentDate: "2026-04-14" },
  { id: "PAY-007", invoiceNumber: "INV-AHM-2604-0007", soNumber: "SO-AHM-2604-0015", invoiceId: "INV-AHM-2604-0007", buyerName: "PI Industries", supplierName: "Agro Dot", total: 5600, paid: 0, pending: 5600, status: "Pending", paymentMode: "-", lastPaymentDate: "-" },
  { id: "PAY-008", invoiceNumber: "INV-AHM-2604-0008", soNumber: "SO-AHM-2604-0018", invoiceId: "INV-AHM-2604-0008", buyerName: "Dhanuka Agritech", supplierName: "Agro Dot", total: 42000, paid: 42000, pending: 0, status: "Completed", paymentMode: "UPI", lastPaymentDate: "2026-04-09" },
  { id: "PAY-009", invoiceNumber: "INV-AHM-2604-0009", soNumber: "SO-AHM-2604-0019", invoiceId: "INV-AHM-2604-0009", buyerName: "IFFCO", supplierName: "Agro Dot", total: 68400, paid: 0, pending: 68400, status: "Pending", paymentMode: "-", lastPaymentDate: "-" },
  { id: "PAY-010", invoiceNumber: "INV-AHM-2604-0010", soNumber: "SO-AHM-2604-0021", invoiceId: "INV-AHM-2604-0010", buyerName: "Bayer CropScience", supplierName: "Agro Dot", total: 29750, paid: 15000, pending: 14750, status: "Partial", paymentMode: "UPI", lastPaymentDate: "2026-04-13" },
  { id: "PAY-011", invoiceNumber: "INV-AHM-2604-0011", soNumber: "SO-AHM-2604-0023", invoiceId: "INV-AHM-2604-0011", buyerName: "Syngenta India", supplierName: "Agro Dot", total: 11200, paid: 11200, pending: 0, status: "Completed", paymentMode: "Bank Transfer", lastPaymentDate: "2026-04-11" },
  { id: "PAY-012", invoiceNumber: "INV-AHM-2604-0012", soNumber: "SO-AHM-2604-0025", invoiceId: "INV-AHM-2604-0012", buyerName: "Rallis India Ltd", supplierName: "Agro Dot", total: 45600, paid: 0, pending: 45600, status: "Pending", paymentMode: "-", lastPaymentDate: "-" },
  { id: "PAY-013", invoiceNumber: "INV-AHM-2604-0013", soNumber: "SO-AHM-2604-0027", invoiceId: "INV-AHM-2604-0013", buyerName: "Nuziveedu Seeds Ltd", supplierName: "Agro Dot", total: 18900, paid: 9000, pending: 9900, status: "Partial", paymentMode: "Cash", lastPaymentDate: "2026-04-15" },
  { id: "PAY-014", invoiceNumber: "INV-AHM-2604-0014", soNumber: "SO-AHM-2604-0029", invoiceId: "INV-AHM-2604-0014", buyerName: "Kaveri Seeds", supplierName: "Agro Dot", total: 33000, paid: 33000, pending: 0, status: "Completed", paymentMode: "Cheque", lastPaymentDate: "2026-04-07" },
  { id: "PAY-015", invoiceNumber: "INV-AHM-2604-0015", soNumber: "SO-AHM-2604-0031", invoiceId: "INV-AHM-2604-0015", buyerName: "Godrej Agrovet", supplierName: "Agro Dot", total: 72500, paid: 0, pending: 72500, status: "Pending", paymentMode: "-", lastPaymentDate: "-" },
  { id: "PAY-016", invoiceNumber: "INV-AHM-2604-0016", soNumber: "SO-AHM-2604-0033", invoiceId: "INV-AHM-2604-0016", buyerName: "Sumitomo Chemical India", supplierName: "Agro Dot", total: 21300, paid: 10000, pending: 11300, status: "Partial", paymentMode: "UPI", lastPaymentDate: "2026-04-16" },
  { id: "PAY-017", invoiceNumber: "INV-AHM-2604-0017", soNumber: "SO-AHM-2604-0035", invoiceId: "INV-AHM-2604-0017", buyerName: "FMC India", supplierName: "Agro Dot", total: 56800, paid: 56800, pending: 0, status: "Completed", paymentMode: "Bank Transfer", lastPaymentDate: "2026-04-06" },
  { id: "PAY-018", invoiceNumber: "INV-AHM-2604-0018", soNumber: "SO-AHM-2604-0037", invoiceId: "INV-AHM-2604-0018", buyerName: "BASF India", supplierName: "Agro Dot", total: 38900, paid: 0, pending: 38900, status: "Pending", paymentMode: "-", lastPaymentDate: "-" },
  { id: "PAY-019", invoiceNumber: "INV-AHM-2604-0019", soNumber: "SO-AHM-2604-0039", invoiceId: "INV-AHM-2604-0019", buyerName: "Hebro Organics", supplierName: "Agro Dot", total: 14200, paid: 7000, pending: 7200, status: "Partial", paymentMode: "Cash", lastPaymentDate: "2026-04-14" },
  { id: "PAY-020", invoiceNumber: "INV-AHM-2604-0020", soNumber: "SO-AHM-2604-0041", invoiceId: "INV-AHM-2604-0020", buyerName: "Excel Crop Care", supplierName: "Agro Dot", total: 91500, paid: 91500, pending: 0, status: "Completed", paymentMode: "Cheque", lastPaymentDate: "2026-04-05" },
];

export default function PaymentTrackingPage() {
  const navigate = useNavigate();
  const toast = useRef(null);
  const [paymentList, setPaymentList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const currencyFields = ["total", "paid", "pending"];

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
    supplierName: { value: null, matchMode: FilterMatchMode.CONTAINS },
    paymentMode: { value: null, matchMode: FilterMatchMode.EQUALS },
    lastPaymentDate: { value: null, matchMode: FilterMatchMode.CONTAINS },
    total: { value: null, matchMode: FilterMatchMode.CONTAINS },
    paid: { value: null, matchMode: FilterMatchMode.CONTAINS },
    pending: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const columnOptions = [
    { field: "invoiceNumber", header: "Invoice #" },
    { field: "soNumber", header: "SO #" },
    { field: "buyerName", header: "Buyer" },
    { field: "supplierName", header: "Supplier" },
    { field: "total", header: "Total" },
    { field: "paid", header: "Paid" },
    { field: "pending", header: "Pending" },
    { field: "status", header: "Status" },
    { field: "paymentMode", header: "Pay Mode" },
    { field: "lastPaymentDate", header: "Last Payment" },
    { field: "action", header: "Action" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("paymentTracking_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    return columnOptions;
  });

  const [dropdownOptions, setDropdownOptions] = useState({ statusOptions: [], paymentModeOptions: [] });
  const statusOptions = dropdownOptions.statusOptions;
  const paymentModeOptions = dropdownOptions.paymentModeOptions;
  const allDataRef = useRef([]);

  const fetchPayments = useCallback(() => {
    try {
      if (allDataRef.current.length === 0) {
        setIsLoading(true);
        let base = [...dummyPayments];
        try {
          const updates = JSON.parse(localStorage.getItem("agro_payment_updates") || "{}");
          if (Object.keys(updates).length > 0) {
            base = base.map((row) => {
              const upd = updates[row.invoiceNumber];
              if (!upd) return row;
              const ptStatus = upd.status === "Paid" ? "Completed" : upd.status === "Unpaid" ? "Pending" : upd.status;
              return { ...row, paid: upd.paid, pending: upd.pending, status: ptStatus, paymentMode: upd.paymentMode || row.paymentMode, lastPaymentDate: upd.lastPaymentDate || row.lastPaymentDate };
            });
          }
        } catch (_) {}
        allDataRef.current = base;
        const statuses = [...new Set(allDataRef.current.map((r) => r.status).filter(Boolean))].sort();
        const modes = [...new Set(allDataRef.current.map((r) => r.paymentMode).filter((v) => v && v !== "-"))].sort();
        setDropdownOptions({ statusOptions: statuses.map((v) => ({ label: v, value: v })), paymentModeOptions: modes.map((v) => ({ label: v, value: v })) });
      }

      let filtered = [...allDataRef.current];
      if (filters.global?.value) {
        const gv = String(filters.global.value).toLowerCase();
        filtered = filtered.filter((row) => Object.values(row).some((val) => String(val ?? "").toLowerCase().includes(gv)));
      }
      Object.entries(filters).forEach(([field, fm]) => {
        if (field === "global" || !fm?.value) return;
        const fv = String(fm.value).toLowerCase();
        if (fm.matchMode === FilterMatchMode.EQUALS) {
          filtered = filtered.filter((row) => String(row[field] ?? "").toLowerCase() === fv);
        } else {
          filtered = filtered.filter((row) => String(row[field] ?? "").toLowerCase().includes(fv));
        }
      });
      if (lazyParams.sortField) {
        filtered.sort((a, b) => {
          const vA = a[lazyParams.sortField], vB = b[lazyParams.sortField];
          let r = typeof vA === "number" && typeof vB === "number" ? vA - vB : String(vA ?? "").localeCompare(String(vB ?? ""));
          return lazyParams.sortOrder === 1 ? r : -r;
        });
      }
      setTotalRecords(filtered.length);
      setPaymentList(filtered.slice(lazyParams.first, lazyParams.first + lazyParams.rows));
    } catch (error) {
      toast.current?.show({ severity: "error", summary: "Error", detail: error.message || "Failed to load payments", life: 3000 });
      setPaymentList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams]);

  useEffect(() => {
    fetchPayments();
  }, [filters, lazyParams, fetchPayments]);

  useEffect(() => {
    const ss = sessionStorage.getItem("paymentTrackingTableFilters");
    if (ss) {
      const parsed = JSON.parse(ss);
      if (parsed.sortField !== undefined && parsed.sortOrder !== undefined) {
        setLazyParams((prev) => ({ ...prev, sortField: parsed.sortField, sortOrder: parsed.sortOrder }));
      }
    }
  }, []);

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

  const onGlobalFilterChange = (e) => {
    const value = sanitizeFilterValue("text", e.target.value);
    setFilters((prev) => ({ ...prev, global: { ...prev.global, value } }));
  };

  const blankRow = { invoiceNumber: "", soNumber: "", buyerName: "", supplierName: "", total: "", paid: "", pending: "", status: "", paymentMode: "", lastPaymentDate: "" };

  const fileExportMessage = () => { toast.current.show({ severity: "success", detail: "File Exported Successfully", life: 3000 }); };

  const exportCSV = () => {
    if (allDataRef.current.length === 0) { toast.current.show({ severity: "warn", summary: "Warning", detail: "No data to export", life: 3000 }); return; }
    const ef = visibleFields.filter((c) => c.field !== "action");
    const fd = allDataRef.current.map((r) => { const o = {}; ef.forEach((c) => { o[c.header] = currencyFields.includes(c.field) ? Number(r[c.field] ?? 0).toFixed(2) : (r[c.field] ?? "-"); }); return o; });
    const csv = unparse({ fields: ef.map((c) => c.header), data: fd.map((r) => ef.map((c) => r[c.header])) });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.setAttribute("download", "payment_tracking.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    fileExportMessage();
  };

  const exportPdf = async () => {
    if (allDataRef.current.length === 0) { toast.current.show({ severity: "warn", summary: "Warning", detail: "No data to export", life: 3000 }); return; }
    try {
      const [{ jsPDF }, atm] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const autoTable = atm.default || atm;
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "A4" });
      const ef = visibleFields.filter((c) => c.field !== "action");
      const head = [ef.map((c) => c.header)];
      const body = allDataRef.current.map((r) => ef.map((c) => r[c.field] ?? "-"));
      const pw = doc.internal.pageSize.getWidth(); const m = { top: 30, bottom: 20, left: 30, right: 30 }; const uw = pw - m.left - m.right;
      const cw = Math.floor(uw / ef.length); const cs = ef.reduce((a, _, i) => { a[i] = { cellWidth: cw, overflow: "linebreak" }; return a; }, {});
      autoTable(doc, { head, body, startY: 20, tableWidth: uw, styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak", valign: "middle" }, headStyles: { fillColor: [0, 128, 0], textColor: 255, fontStyle: "bold" }, alternateRowStyles: { fillColor: [240, 240, 240] }, columnStyles: cs, margin: m, theme: "grid" });
      doc.save("payment_tracking.pdf"); fileExportMessage();
    } catch (e) { toast.current.show({ severity: "error", summary: "Error", detail: "Failed to export PDF.", life: 3000 }); }
  };

  const exportExcel = () => {
    if (allDataRef.current.length === 0) { toast.current.show({ severity: "warn", summary: "Warning", detail: "No data to export", life: 3000 }); return; }
    import("xlsx").then((xlsx) => {
      const ef = visibleFields.filter((c) => c.field !== "action");
      const fd = allDataRef.current.map((r) => { const o = {}; ef.forEach((c) => { o[c.header] = currencyFields.includes(c.field) ? Number(r[c.field] ?? 0).toFixed(2) : (r[c.field] ?? "-"); }); return o; });
      const ws = xlsx.utils.json_to_sheet(fd); const wb = { Sheets: { data: ws }, SheetNames: ["data"] };
      const buf = xlsx.write(wb, { bookType: "xlsx", type: "array" });
      import("file-saver").then((mod) => { if (mod?.default) { mod.default.saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" }), `payment_tracking_${new Date().getTime()}.xlsx`); } });
      fileExportMessage();
    });
  };

  const onColumnToggle = (event) => {
    let sel = event.value;
    if (!sel.some((c) => c.field === "invoiceNumber")) sel = [...sel, columnOptions.find((c) => c.field === "invoiceNumber")];
    const ordered = columnOptions.filter((c) => sel.some((s) => s.field === c.field));
    setVisibleFields(ordered);
    sessionStorage.setItem("paymentTracking_visibleFields", JSON.stringify(ordered.map((c) => c.field)));
  };

  const createValidatedFilterElement = (placeholder, type = "text") => {
    function Elem(options) {
      const ak = ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
      const kp = { text: /^[a-zA-Z0-9@.,/&()\-\s]$/, numeric: /^[0-9.-]$/ };
      return (
        <InputText value={options.value ?? ""} onChange={(e) => options.filterApplyCallback(sanitizeFilterValue(type, e.target.value))}
          onKeyDown={(e) => { if (e.ctrlKey || e.metaKey || ak.includes(e.key)) return; if (!kp[type].test(e.key)) e.preventDefault(); }}
          onPaste={(e) => { const p = e.clipboardData.getData("text"); if (p !== sanitizeFilterValue(type, p)) { e.preventDefault(); options.filterApplyCallback(sanitizeFilterValue(type, p)); } }}
          placeholder={placeholder} className="p-column-filter w-full" />
      );
    }
    Elem.displayName = `PTFilter(${placeholder})`;
    return Elem;
  };

  const createDropdownFilterElement = (placeholder, optionsList) => {
    function Elem(options) {
      return (<Dropdown value={options.value ?? null} options={optionsList} onChange={(e) => options.filterApplyCallback(e.value)} placeholder={placeholder} className="p-column-filter w-full" showClear />);
    }
    Elem.displayName = `PTDropdown(${placeholder})`;
    return Elem;
  };

  // Body templates
  const invoiceNumberBody = (rowData) => isLoading ? <Skeleton width="80%" height="1.5rem" /> : (
    <button type="button" onClick={() => navigate("/finance/invoice")} className="cursor-pointer font-semibold text-blue-600 hover:underline">{rowData.invoiceNumber || "-"}</button>
  );
  const soNumberBody = (rowData) => isLoading ? <Skeleton width="80%" height="1.5rem" /> : <span>{rowData.soNumber || "-"}</span>;
  const buyerNameBody = (rowData) => isLoading ? <Skeleton width="80%" height="1.5rem" /> : <span className="font-semibold text-fuchsia-600">{rowData.buyerName || "-"}</span>;
  const supplierNameBody = (rowData) => isLoading ? <Skeleton width="80%" height="1.5rem" /> : <span>{rowData.supplierName || "-"}</span>;
  const currencyBody = (field, cls = "font-normal text-slate-600") => {
    function C(rowData) { return isLoading ? <Skeleton width="70%" height="1.5rem" /> : <span className={cls}>₹{Number(rowData[field] ?? 0).toFixed(2)}</span>; }
    return C;
  };
  const pendingBody = (rowData) => {
    if (isLoading) return <Skeleton width="70%" height="1.5rem" />;
    const v = Number(rowData.pending) || 0;
    return <span className={`font-semibold ${v > 0 ? "text-red-600" : "text-green-600"}`}>₹{v.toFixed(2)}</span>;
  };
  const statusBody = (rowData) => isLoading ? <Skeleton width="70%" height="1.5rem" /> : (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
      rowData.status === "Completed" ? "bg-green-100 text-green-800"
      : rowData.status === "Partial" ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800"
    }`}>{rowData.status || "Pending"}</span>
  );
  const paymentModeBody = (rowData) => isLoading ? <Skeleton width="70%" height="1.5rem" /> : (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
      rowData.paymentMode === "-" || !rowData.paymentMode ? "bg-gray-100 text-gray-500"
      : "bg-blue-100 text-blue-800"
    }`}>{rowData.paymentMode || "-"}</span>
  );
  const lastPaymentDateBody = (rowData) => isLoading ? <Skeleton width="70%" height="1.5rem" /> : (
    <span className="text-slate-600">{rowData.lastPaymentDate || "-"}</span>
  );
  const actionBody = (rowData) => isLoading ? <Skeleton width="80%" height="1.5rem" /> : (
    <Button label="Pay Now" size="small" outlined onClick={() => navigate("/finance/invoice", { state: { openInvoice: rowData.invoiceNumber } })} disabled={rowData.status === "Completed"} />
  );

  // Calculate totals
  const totals = allDataRef.current.reduce((acc, r) => { acc.total += Number(r.total) || 0; acc.paid += Number(r.paid) || 0; acc.pending += Number(r.pending) || 0; return acc; }, { total: 0, paid: 0, pending: 0 });

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">Payment Tracking Report</h3>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 lg:justify-end">
        <IconField iconPosition="left" className="w-full sm:w-64">
          <InputIcon className="pi pi-search" />
          <InputText type="search" value={filters.global?.value || ""} onChange={onGlobalFilterChange}
            onKeyDown={(e) => { const ak = ["Backspace","Delete","Tab","Escape","Enter","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"]; if (e.ctrlKey || e.metaKey || ak.includes(e.key)) return; if (!/^[a-zA-Z0-9@.,/&()\-\s]$/.test(e.key)) e.preventDefault(); }}
            onPaste={(e) => { const p = e.clipboardData.getData("text"); const s = sanitizeFilterValue("text", p); if (p !== s) { e.preventDefault(); setFilters((prev) => ({ ...prev, global: { ...prev.global, value: `${prev.global?.value || ""}${s}` } })); } }}
            placeholder="Keyword Search" className="w-full" />
        </IconField>
        <MultiSelect value={visibleFields} options={columnOptions} optionLabel="header" onChange={onColumnToggle} className="w-full sm:w-56" display="chip" placeholder="Visible Columns" disabled={isLoading} />
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

  return (
    <Page title="Payment Tracking">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={isLoading ? Array.from({ length: 10 }, () => blankRow) : paymentList}
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={<EmptyMessage title="No payment records found" subtitle="Try adjusting your search criteria." />}
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={["invoiceNumber", "soNumber", "buyerName", "supplierName", "total", "paid", "pending", "status", "paymentMode", "lastPaymentDate"]}
                onFilter={(e) => { setFilters(e.filters); setLazyParams((prev) => ({ ...prev, first: 0 })); scrollToTop(); }}
                onPage={(e) => { setLazyParams((prev) => ({ ...prev, first: e.first, rows: e.rows })); scrollToTop(); }}
                onSort={(e) => { setLazyParams((prev) => ({ ...prev, sortField: e.sortField, sortOrder: e.sortOrder })); scrollToTop(); }}
                stateStorage="session"
                stateKey="paymentTrackingTableFilters"
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
                footerColumnGroup={!isLoading && (
                  <ColumnGroup><Row>
                    <Column footer={`Total Records: ${allDataRef.current.length}`} className="font-bold" />
                    {visibleFields.some((c) => c.field === "invoiceNumber") && <Column footer="" />}
                    {visibleFields.some((c) => c.field === "soNumber") && <Column footer="" />}
                    {visibleFields.some((c) => c.field === "buyerName") && <Column footer="" />}
                    {visibleFields.some((c) => c.field === "supplierName") && <Column footer="" />}
                    {visibleFields.some((c) => c.field === "total") && <Column footer={`₹${totals.total.toFixed(2)}`} className="font-bold text-blue-600" />}
                    {visibleFields.some((c) => c.field === "paid") && <Column footer={`₹${totals.paid.toFixed(2)}`} className="font-bold text-emerald-600" />}
                    {visibleFields.some((c) => c.field === "pending") && <Column footer={`₹${totals.pending.toFixed(2)}`} className={`font-bold ${totals.pending > 0 ? "text-red-600" : "text-green-600"}`} />}
                    {visibleFields.some((c) => c.field === "status") && <Column footer="" />}
                    {visibleFields.some((c) => c.field === "paymentMode") && <Column footer="" />}
                    {visibleFields.some((c) => c.field === "lastPaymentDate") && <Column footer="" />}
                    {visibleFields.some((c) => c.field === "action") && <Column footer="" />}
                  </Row></ColumnGroup>
                )}
              >
                <Column header="Sr No." body={(_, opts) => isLoading ? <Skeleton width="30%" height="1.5rem" /> : opts.rowIndex + 1} style={{ minWidth: "5rem" }} />
                {visibleFields.some((c) => c.field === "invoiceNumber") && <Column field="invoiceNumber" header="Invoice #" style={{ minWidth: "12rem" }} body={invoiceNumberBody} filter showFilterMenu={false} filterElement={createValidatedFilterElement("Search Invoice", "text")} sortable />}
                {visibleFields.some((c) => c.field === "soNumber") && <Column field="soNumber" header="SO #" style={{ minWidth: "11rem" }} body={soNumberBody} filter showFilterMenu={false} filterElement={createValidatedFilterElement("Search SO", "text")} sortable />}
                {visibleFields.some((c) => c.field === "buyerName") && <Column field="buyerName" header="Buyer" style={{ minWidth: "13rem" }} body={buyerNameBody} filter showFilterMenu={false} filterElement={createValidatedFilterElement("Search Buyer", "text")} sortable />}
                {visibleFields.some((c) => c.field === "supplierName") && <Column field="supplierName" header="Supplier" style={{ minWidth: "12rem" }} body={supplierNameBody} filter showFilterMenu={false} filterElement={createValidatedFilterElement("Search Supplier", "text")} sortable />}
                {visibleFields.some((c) => c.field === "total") && <Column field="total" header="Total" style={{ minWidth: "10rem" }} body={currencyBody("total")} filter showFilterMenu={false} filterElement={createValidatedFilterElement("Search Total", "numeric")} sortable />}
                {visibleFields.some((c) => c.field === "paid") && <Column field="paid" header="Paid" style={{ minWidth: "10rem" }} body={currencyBody("paid", "font-medium text-emerald-600")} filter showFilterMenu={false} filterElement={createValidatedFilterElement("Search Paid", "numeric")} sortable />}
                {visibleFields.some((c) => c.field === "pending") && <Column field="pending" header="Pending" style={{ minWidth: "10rem" }} body={pendingBody} filter showFilterMenu={false} filterElement={createValidatedFilterElement("Search Pending", "numeric")} sortable />}
                {visibleFields.some((c) => c.field === "status") && <Column field="status" header="Status" style={{ minWidth: "9rem" }} body={statusBody} filter showFilterMenu={false} filterElement={createDropdownFilterElement("Select Status", statusOptions)} sortable />}
                {visibleFields.some((c) => c.field === "paymentMode") && <Column field="paymentMode" header="Pay Mode" style={{ minWidth: "10rem" }} body={paymentModeBody} filter showFilterMenu={false} filterElement={createDropdownFilterElement("Select Mode", paymentModeOptions)} sortable />}
                {visibleFields.some((c) => c.field === "lastPaymentDate") && <Column field="lastPaymentDate" header="Last Payment" style={{ minWidth: "11rem" }} body={lastPaymentDateBody} filter showFilterMenu={false} filterElement={createValidatedFilterElement("Search Date", "text")} sortable />}
                {visibleFields.some((c) => c.field === "action") && <Column field="action" header="Action" style={{ minWidth: "9rem" }} body={actionBody} />}
              </DataTable>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
