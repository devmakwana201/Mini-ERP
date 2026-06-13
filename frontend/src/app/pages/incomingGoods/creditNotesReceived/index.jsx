import { useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "primereact/toast";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { MultiSelect } from "primereact/multiselect";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Tooltip } from "primereact/tooltip";
import { FilterMatchMode } from "primereact/api";
import { unparse } from "papaparse";
import { Page } from "components/shared/Page";
import { useAuthContext } from "app/contexts/auth/context";
import { scrollToTop } from "utils/scrollToTop";
import EmptyMessage from "components/shared/EmptyMessage";
import {
  formatDateForFilter,
  inRange,
  parseIsoDate,
  restoreSessionState,
  saveAsExcelFile,
} from "../shared/incomingGoodsUtils";
import {
  formatCurrency,
  getToday,
  hasIncomingGoodsFlag,
  loadIncomingGoodsState,
  saveIncomingGoodsState,
} from "../shared/mockStore";

const statusSeverity = {
  OPEN: "danger",
  RESOLVED: "success",
  NEW: "warning",
  ACKNOWLEDGED: "success",
};

const cnColumns = [
  { field: "num", header: "CN#" },
  { field: "issueRef", header: "Issue Ref" },
  { field: "supplierName", header: "Supplier" },
  { field: "date", header: "Date" },
  { field: "amount", header: "Amount" },
  { field: "remainingAmount", header: "Remaining" },
  { field: "status", header: "Status" },
  { field: "adjustmentMode", header: "Adjustment" },
];

const cnColumnWidths = {
  num: "12rem",
  issueRef: "12rem",
  supplierName: "14rem",
  date: "10rem",
  amount: "10rem",
  remainingAmount: "11rem",
  status: "11rem",
  adjustmentMode: "12rem",
};

const DEFAULT_ISSUE_FILTERS = {
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  issueNo: { value: null, matchMode: FilterMatchMode.CONTAINS },
  grnNum: { value: null, matchMode: FilterMatchMode.CONTAINS },
  supplierName: { value: null, matchMode: FilterMatchMode.CONTAINS },
  date: { value: null, matchMode: FilterMatchMode.CONTAINS },
  amount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  reason: { value: null, matchMode: FilterMatchMode.CONTAINS },
  status: { value: null, matchMode: FilterMatchMode.CONTAINS },
  creditNoteNum: { value: null, matchMode: FilterMatchMode.CONTAINS },
};

const DEFAULT_CN_FILTERS = {
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  num: { value: null, matchMode: FilterMatchMode.CONTAINS },
  issueRef: { value: null, matchMode: FilterMatchMode.CONTAINS },
  supplierName: { value: null, matchMode: FilterMatchMode.CONTAINS },
  date: { value: null, matchMode: FilterMatchMode.CONTAINS },
  amount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  remainingAmount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  status: { value: null, matchMode: FilterMatchMode.CONTAINS },
  adjustmentMode: { value: null, matchMode: FilterMatchMode.CONTAINS },
};

const integerFilterFields = new Set(["amount", "remainingAmount"]);

export default function CreditNotesReceivedPage() {
  const toast = useRef(null);
  const { user } = useAuthContext();
  const [store, setStore] = useState(() => loadIncomingGoodsState());
  const [applyVisible, setApplyVisible] = useState(false);
  const [selectedCn, setSelectedCn] = useState(null);
  const [applyMode, setApplyMode] = useState("PAYMENT");
  const [applyAmount, setApplyAmount] = useState(0);

  const [dateRange, setDateRange] = useState(null);
  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("creditNotes_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return cnColumns.filter((col) => fields.includes(col.field));
    }
    return cnColumns;
  });
  const [issueFilters, setIssueFilters] = useState(DEFAULT_ISSUE_FILTERS);
  const [cnFilters, setCnFilters] = useState(DEFAULT_CN_FILTERS);
  const [issueSortField, setIssueSortField] = useState(null);
  const [issueSortOrder, setIssueSortOrder] = useState(null);
  const [cnSortField, setCnSortField] = useState(null);
  const [cnSortOrder, setCnSortOrder] = useState(null);

  useEffect(() => {
    const issueRestored = restoreSessionState(
      "incomingGoodsCreditNotesIssuesTableState",
      DEFAULT_ISSUE_FILTERS,
    );
    if (issueRestored) {
      if (issueRestored.filters) setIssueFilters(issueRestored.filters);
      if (issueRestored.sortField !== undefined) {
        setIssueSortField(issueRestored.sortField);
        setIssueSortOrder(issueRestored.sortOrder);
      }
    }

    const cnRestored = restoreSessionState(
      "incomingGoodsCreditNotesReceivedTableState",
      DEFAULT_CN_FILTERS,
    );
    if (cnRestored) {
      if (cnRestored.filters) setCnFilters(cnRestored.filters);
      if (cnRestored.sortField !== undefined) {
        setCnSortField(cnRestored.sortField);
        setCnSortOrder(cnRestored.sortOrder);
      }
    }
  }, []);

  const canView =
    hasIncomingGoodsFlag(user, "incomingGoods.view") &&
    hasIncomingGoodsFlag(user, "incomingGoods.creditNote.view");
  const canAck = hasIncomingGoodsFlag(user, "incomingGoods.creditNote.ack");
  const canApply = hasIncomingGoodsFlag(user, "incomingGoods.creditNote.apply");

  const receivedCreditNotes = useMemo(
    () => store.creditNotes.filter((cn) => cn.receivedByManager),
    [store.creditNotes],
  );

  const filteredIssues = useMemo(
    () =>
      store.grnIssues
        .map((issue) => ({
          ...issue,
          issueNo: `ISS-${String(issue.id).padStart(4, "0")}`,
        }))
        .filter((issue) => inRange(issue.date, dateRange)),
    [store.grnIssues, dateRange],
  );

  const filteredCns = useMemo(
    () => receivedCreditNotes.filter((cn) => inRange(cn.date, dateRange)),
    [receivedCreditNotes, dateRange],
  );

  const onGlobalFilterChange = (event) => {
    const value = event.target.value;
    setIssueFilters((prev) => ({
      ...prev,
      global: { ...prev.global, value },
    }));
    setCnFilters((prev) => ({
      ...prev,
      global: { ...prev.global, value },
    }));
  };

  const renderColumnFilter = (options, field, header) => {
    const value = options.value ?? "";
    const matchMode = FilterMatchMode.CONTAINS;

    const applyFilter = (nextValue) => {
      options.filterCallback(nextValue, matchMode);
      if (typeof options.filterApplyCallback === "function") {
        options.filterApplyCallback(nextValue);
      }
    };

    if (field === "date") {
      return (
        <Calendar
          value={parseIsoDate(value)}
          onChange={(e) =>
            applyFilter(e.value ? formatDateForFilter(e.value) : null)
          }
          dateFormat="dd/mm/yy"
          placeholder={`Select ${header}`}
          showIcon
          readOnlyInput
          className="p-column-filter w-full"
        />
      );
    }

    return (
      <InputText
        value={value}
        keyfilter={integerFilterFields.has(field) ? "int" : undefined}
        onChange={(e) => applyFilter(e.target.value)}
        placeholder={`Search ${header}`}
        className="p-column-filter w-full"
      />
    );
  };

  const acknowledgeCn = (cnNum) => {
    const nextState = {
      ...store,
      creditNotes: store.creditNotes.map((cn) =>
        cn.num === cnNum
          ? {
              ...cn,
              acknowledgedByManager: true,
              status: "ACKNOWLEDGED",
            }
          : cn,
      ),
    };

    saveIncomingGoodsState(nextState);
    setStore(nextState);
    toast.current?.show({
      severity: "success",
      summary: "Acknowledged",
      detail: `Credit note ${cnNum} acknowledged`,
      life: 2500,
    });
  };

  const openApplyDialog = (cn) => {
    setSelectedCn(cn);
    setApplyMode("PAYMENT");
    setApplyAmount(Number(cn.remainingAmount || 0));
    setApplyVisible(true);
  };

  const applyToInvoices = (invoices, amount) => {
    let remaining = Number(amount || 0);

    const updated = [...invoices].sort((a, b) =>
      String(a.date || "").localeCompare(String(b.date || "")),
    );

    for (let index = 0; index < updated.length; index += 1) {
      if (remaining <= 0) break;
      const due = Math.max(
        0,
        Number(updated[index].grand || 0) - Number(updated[index].paid || 0),
      );
      if (due <= 0) continue;

      const used = Math.min(due, remaining);
      const paid = Number(updated[index].paid || 0) + used;
      const grand = Number(updated[index].grand || 0);

      updated[index] = {
        ...updated[index],
        paid,
        status: paid >= grand ? "PAID" : "PARTIALLY_PAID",
      };

      remaining -= used;
    }

    return {
      invoices: updated,
      usedAmount: Math.max(0, Number(amount || 0) - remaining),
    };
  };

  const applyCreditNote = () => {
    if (!selectedCn) return;

    const remaining = Number(selectedCn.remainingAmount || 0);
    const amount = Math.max(0, Math.min(Number(applyAmount || 0), remaining));

    if (amount <= 0) {
      toast.current?.show({
        severity: "warn",
        summary: "Invalid Amount",
        detail: "Enter a valid amount to apply",
        life: 2500,
      });
      return;
    }

    let nextState = { ...store };

    if (applyMode === "PAYMENT") {
      const result = applyToInvoices(store.invoices, amount);
      if (result.usedAmount <= 0) {
        toast.current?.show({
          severity: "warn",
          summary: "No Pending Invoice",
          detail: "No pending invoice available for adjustment",
          life: 2500,
        });
        return;
      }

      nextState.invoices = result.invoices;
      nextState.creditNotes = store.creditNotes.map((cn) =>
        cn.num === selectedCn.num
          ? {
              ...cn,
              remainingAmount: Math.max(0, remaining - result.usedAmount),
              appliedAmount: Number(cn.appliedAmount || 0) + result.usedAmount,
              adjustmentMode: "PAYMENT",
              lastAppliedDate: getToday(),
            }
          : cn,
      );

      toast.current?.show({
        severity: "success",
        summary: "Applied",
        detail: `${selectedCn.num} adjusted in payment: ${formatCurrency(result.usedAmount)}`,
        life: 2500,
      });
    } else {
      nextState.creditNotes = store.creditNotes.map((cn) =>
        cn.num === selectedCn.num
          ? {
              ...cn,
              remainingAmount: Math.max(0, remaining - amount),
              reservedNextOrderAmount:
                Number(cn.reservedNextOrderAmount || 0) + amount,
              adjustmentMode: "NEXT_ORDER",
              lastAppliedDate: getToday(),
            }
          : cn,
      );

      toast.current?.show({
        severity: "success",
        summary: "Reserved",
        detail: `${selectedCn.num} reserved for next order: ${formatCurrency(amount)}`,
        life: 2500,
      });
    }

    saveIncomingGoodsState(nextState);
    setStore(nextState);
    setApplyVisible(false);
    setSelectedCn(null);
  };

  const getExportRows = () =>
    filteredCns.map((row) => ({
      "CN#": row.num,
      "Issue Ref": row.issueRef || "-",
      Supplier: row.supplierName,
      Date: row.date,
      Amount: row.amount,
      Remaining: row.remainingAmount,
      Status: row.acknowledgedByManager ? "ACKNOWLEDGED" : row.status,
      Adjustment: row.adjustmentMode || "Not Applied",
    }));

  const exportCSV = () => {
    if (filteredCns.length === 0) {
      toast.current?.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }
    const rows = getExportRows();
    const csvData = unparse(rows);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "credit_notes_received.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.current?.show({
      severity: "success",
      detail: "CSV exported successfully",
      life: 2500,
    });
  };

  const exportExcel = () => {
    if (filteredCns.length === 0) {
      toast.current?.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }
    const rows = getExportRows();
    import("xlsx").then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(rows);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ["data"] };
      const excelBuffer = xlsx.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      saveAsExcelFile(excelBuffer, "credit_notes_received");
      toast.current?.show({
        severity: "success",
        detail: "XLS exported successfully",
        life: 2500,
      });
    });
  };

  const exportPdf = async () => {
    if (filteredCns.length === 0) {
      toast.current?.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }
    const rows = getExportRows();
    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable = autoTableModule.default || autoTableModule;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "A4",
    });
    const headers = Object.keys(rows[0] || {});
    const body = rows.map((row) => headers.map((header) => row[header]));
    autoTable(doc, {
      head: [headers],
      body,
      styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [22, 163, 74], textColor: 255 },
      margin: { top: 24, left: 18, right: 18, bottom: 24 },
      theme: "grid",
    });
    doc.save("credit_notes_received.pdf");
    toast.current?.show({
      severity: "success",
      detail: "PDF exported successfully",
      life: 2500,
    });
  };

  const onColumnToggle = (event) => {
    const selected = event.value;
    const ordered = cnColumns.filter((column) =>
      selected.some((item) => item.field === column.field),
    );
    setVisibleFields(ordered);
    sessionStorage.setItem(
      "creditNotes_visibleFields",
      JSON.stringify(ordered.map((col) => col.field)),
    );
  };

  const resetFilters = () => {
    setDateRange(null);
    setIssueFilters(DEFAULT_ISSUE_FILTERS);
    setCnFilters(DEFAULT_CN_FILTERS);
    setIssueSortField(null);
    setIssueSortOrder(null);
    setCnSortField(null);
    setCnSortOrder(null);
    sessionStorage.removeItem("incomingGoodsCreditNotesIssuesTableState");
    sessionStorage.removeItem("incomingGoodsCreditNotesReceivedTableState");
  };

  if (!canView) {
    return (
      <Page title="Incoming Goods - Credit Notes (Received)">
        <Message
          severity="warn"
          text="You do not have access to Incoming Goods Credit Notes."
        />
      </Page>
    );
  }

  return (
    <Page title="Incoming Goods - Credit Notes (Received)">
      <Toast ref={toast} />

      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <div className="mb-4 flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
                  Credit Notes (Received)
                </h3>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 lg:justify-end">
                  <IconField iconPosition="left" className="w-full sm:w-64">
                    <InputIcon className="pi pi-search" />
                    <InputText
                      type="search"
                      value={cnFilters.global?.value || ""}
                      onChange={onGlobalFilterChange}
                      placeholder="Keyword Search"
                      className="w-full"
                    />
                  </IconField>

                  <Calendar
                    value={dateRange}
                    onChange={(event) => setDateRange(event.value)}
                    selectionMode="range"
                    readOnlyInput
                    hideOnRangeSelection
                    showIcon
                    dateFormat="dd/mm/yy"
                    placeholder="Date range"
                    className="w-full sm:w-56"
                  />

                  <MultiSelect
                    value={visibleFields}
                    options={cnColumns}
                    optionLabel="header"
                    onChange={onColumnToggle}
                    className="w-full sm:w-56"
                    display="chip"
                    placeholder="Visible Columns"
                  />

                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <div className="flex gap-1">
                      <Button
                        className="export-icon-tooltip"
                        type="button"
                        icon="pi pi-refresh"
                        rounded
                        size="small"
                        severity="secondary"
                        onClick={resetFilters}
                        data-pr-tooltip="Reset Filters"
                      />
                      <Button
                        className="export-icon-tooltip"
                        type="button"
                        icon="pi pi-file"
                        rounded
                        size="small"
                        onClick={exportCSV}
                        data-pr-tooltip="Export CSV"
                      />
                      <Button
                        className="export-icon-tooltip"
                        type="button"
                        icon="pi pi-file-excel"
                        severity="success"
                        rounded
                        size="small"
                        onClick={exportExcel}
                        data-pr-tooltip="Export XLS"
                      />
                      <Button
                        className="export-icon-tooltip"
                        type="button"
                        icon="pi pi-file-pdf"
                        severity="warning"
                        rounded
                        size="small"
                        onClick={exportPdf}
                        data-pr-tooltip="Export PDF"
                      />
                    </div>
                  </div>

                  <Tooltip
                    target=".export-icon-tooltip"
                    position="top"
                    style={{ fontSize: "12px" }}
                    showDelay={100}
                    hideDelay={100}
                  />
                </div>
              </div>

              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Open GRN Issues (Awaiting Credit Note)
                </h3>
                <span className="text-sm text-gray-500">
                  {filteredIssues.length} issues
                </span>
              </div>

              <DataTable
                value={filteredIssues}
                stripedRows
                paginator
                rows={6}
                scrollable
                tableStyle={{ minWidth: "88rem" }}
                filterDisplay="row"
                filterDelay={0}
                filters={issueFilters}
                globalFilterFields={[
                  "issueNo",
                  "grnNum",
                  "supplierName",
                  "date",
                  "amount",
                  "reason",
                  "status",
                  "creditNoteNum",
                ]}
                onFilter={(event) => {
                  setIssueFilters(event.filters);
                  scrollToTop();
                }}
                onPage={() => scrollToTop()}
                stateStorage="session"
                stateKey="incomingGoodsCreditNotesIssuesTableState"
                sortField={issueSortField}
                sortOrder={issueSortOrder}
                onSort={(event) => {
                  setIssueSortField(event.sortField);
                  setIssueSortOrder(event.sortOrder);
                  scrollToTop();
                }}
                removableSort
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[6, 10, 25, 50]}
                emptyMessage={
                  <EmptyMessage
                    title="No GRN issues found"
                    subtitle="No GRN issues match your current filters."
                  />
                }
                className="mb-6 overflow-hidden rounded-lg border border-gray-300"
              >
                <Column
                  field="issueNo"
                  header="Issue#"
                  style={{ minWidth: "10rem" }}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterElement={(options) =>
                    renderColumnFilter(options, "issueNo", "Issue#")
                  }
                  body={(rowData) => (
                    <span className="font-semibold text-indigo-600">
                      {rowData.issueNo}
                    </span>
                  )}
                />
                <Column
                  field="grnNum"
                  header="GRN#"
                  style={{ minWidth: "13rem" }}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterElement={(options) =>
                    renderColumnFilter(options, "grnNum", "GRN#")
                  }
                  body={(rowData) => (
                    <span className="font-semibold text-indigo-600">
                      {rowData.grnNum}
                    </span>
                  )}
                />
                <Column
                  field="supplierName"
                  header="Supplier"
                  style={{ minWidth: "14rem" }}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterElement={(options) =>
                    renderColumnFilter(options, "supplierName", "Supplier")
                  }
                  body={(rowData) => (
                    <span className="font-semibold text-purple-600">
                      {rowData.supplierName}
                    </span>
                  )}
                />
                <Column
                  field="date"
                  header="Date"
                  style={{ minWidth: "9rem" }}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterElement={(options) =>
                    renderColumnFilter(options, "date", "Date")
                  }
                  body={(rowData) => (
                    <span className="font-semibold text-purple-600">
                      {rowData.date}
                    </span>
                  )}
                />
                <Column
                  field="amount"
                  header="Amount"
                  style={{ minWidth: "11rem" }}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterElement={(options) =>
                    renderColumnFilter(options, "amount", "Amount")
                  }
                  body={(rowData) => (
                    <span className="font-bold text-blue-600">
                      {formatCurrency(rowData.amount)}
                    </span>
                  )}
                />
                <Column
                  field="reason"
                  header="Reason"
                  style={{ minWidth: "19rem" }}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterElement={(options) =>
                    renderColumnFilter(options, "reason", "Reason")
                  }
                />
                <Column
                  field="status"
                  header="Status"
                  style={{ minWidth: "10rem" }}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterElement={(options) =>
                    renderColumnFilter(options, "status", "Status")
                  }
                  body={(rowData) => (
                    <Tag
                      value={rowData.status}
                      severity={statusSeverity[rowData.status] || "info"}
                    />
                  )}
                />
                <Column
                  field="creditNoteNum"
                  header="Credit Note"
                  style={{ minWidth: "12rem" }}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterElement={(options) =>
                    renderColumnFilter(options, "creditNoteNum", "Credit Note")
                  }
                  body={(rowData) => (
                    <span
                      className={
                        rowData.creditNoteNum
                          ? "font-semibold text-indigo-600"
                          : "text-gray-400 italic"
                      }
                    >
                      {rowData.creditNoteNum || "Pending"}
                    </span>
                  )}
                />
              </DataTable>

              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Credit Notes Received</h3>
                <span className="text-sm text-gray-500">
                  {filteredCns.length} notes
                </span>
              </div>

              <DataTable
                value={filteredCns}
                stripedRows
                paginator
                rows={10}
                scrollable
                tableStyle={{ minWidth: "78rem" }}
                filterDisplay="row"
                filterDelay={0}
                filters={cnFilters}
                globalFilterFields={cnColumns.map((column) => column.field)}
                onFilter={(event) => {
                  setCnFilters(event.filters);
                  scrollToTop();
                }}
                onPage={() => scrollToTop()}
                stateStorage="session"
                stateKey="incomingGoodsCreditNotesReceivedTableState"
                sortField={cnSortField}
                sortOrder={cnSortOrder}
                onSort={(event) => {
                  setCnSortField(event.sortField);
                  setCnSortOrder(event.sortOrder);
                  scrollToTop();
                }}
                removableSort
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50, 100]}
                emptyMessage={
                  <EmptyMessage
                    title="No credit notes received"
                    subtitle="No credit notes match your current filters. Try adjusting your search criteria."
                  />
                }
                className="overflow-hidden rounded-lg border border-gray-300"
              >
                {visibleFields.map((column) => {
                  if (
                    column.field === "amount" ||
                    column.field === "remainingAmount"
                  ) {
                    return (
                      <Column
                        key={column.field}
                        field={column.field}
                        header={column.header}
                        style={{
                          minWidth: cnColumnWidths[column.field] || "10rem",
                        }}
                        sortable
                        filter
                        showFilterMenu={false}
                        filterElement={(options) =>
                          renderColumnFilter(
                            options,
                            column.field,
                            column.header,
                          )
                        }
                        body={(rowData) => {
                          const val = Number(rowData[column.field] || 0);
                          const isRemaining =
                            column.field === "remainingAmount";
                          return (
                            <span
                              className={
                                isRemaining && val > 0
                                  ? "font-semibold text-orange-600"
                                  : "font-bold text-blue-600"
                              }
                            >
                              {formatCurrency(val)}
                            </span>
                          );
                        }}
                      />
                    );
                  }

                  if (column.field === "status") {
                    return (
                      <Column
                        key={column.field}
                        field={column.field}
                        header={column.header}
                        style={{
                          minWidth: cnColumnWidths[column.field] || "10rem",
                        }}
                        sortable
                        filter
                        showFilterMenu={false}
                        filterElement={(options) =>
                          renderColumnFilter(
                            options,
                            column.field,
                            column.header,
                          )
                        }
                        body={(rowData) => {
                          const currentStatus = rowData.acknowledgedByManager
                            ? "ACKNOWLEDGED"
                            : rowData.status;
                          return (
                            <Tag
                              value={currentStatus}
                              severity={statusSeverity[currentStatus] || "info"}
                            />
                          );
                        }}
                      />
                    );
                  }

                  if (column.field === "adjustmentMode") {
                    return (
                      <Column
                        key={column.field}
                        field={column.field}
                        header={column.header}
                        style={{
                          minWidth: cnColumnWidths[column.field] || "10rem",
                        }}
                        sortable
                        filter
                        showFilterMenu={false}
                        filterElement={(options) =>
                          renderColumnFilter(
                            options,
                            column.field,
                            column.header,
                          )
                        }
                        body={(rowData) => (
                          <span
                            className={
                              rowData.adjustmentMode
                                ? "font-semibold text-green-600"
                                : "text-gray-400 italic"
                            }
                          >
                            {rowData.adjustmentMode || "Not Applied"}
                          </span>
                        )}
                      />
                    );
                  }

                  return (
                    <Column
                      key={column.field}
                      field={column.field}
                      header={column.header}
                      style={{
                        minWidth: cnColumnWidths[column.field] || "10rem",
                      }}
                      sortable
                      filter
                      showFilterMenu={false}
                      filterElement={(options) =>
                        renderColumnFilter(options, column.field, column.header)
                      }
                    />
                  );
                })}
                <Column
                  header="Action"
                  style={{ minWidth: "15rem" }}
                  body={(rowData) => (
                    <div className="flex gap-2">
                      {!rowData.acknowledgedByManager && (
                        <Button
                          label="Acknowledge"
                          size="small"
                          disabled={!canAck}
                          onClick={() => acknowledgeCn(rowData.num)}
                        />
                      )}
                      <Button
                        label="Apply"
                        size="small"
                        severity="secondary"
                        disabled={
                          !canApply || Number(rowData.remainingAmount || 0) <= 0
                        }
                        onClick={() => openApplyDialog(rowData)}
                      />
                    </div>
                  )}
                />
              </DataTable>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        header={selectedCn ? `Apply ${selectedCn.num}` : "Apply Credit Note"}
        visible={applyVisible}
        modal
        draggable={false}
        style={{ width: "480px" }}
        onHide={() => setApplyVisible(false)}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Remaining Amount</label>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              {formatCurrency(selectedCn?.remainingAmount || 0)}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Adjustment Type</label>
            <Dropdown
              value={applyMode}
              options={[
                { label: "Adjust in Payment", value: "PAYMENT" },
                { label: "Reserve for Next Order", value: "NEXT_ORDER" },
              ]}
              onChange={(event) => setApplyMode(event.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Amount</label>
            <InputNumber
              value={applyAmount}
              min={1}
              max={Number(selectedCn?.remainingAmount || 0)}
              onValueChange={(event) => setApplyAmount(event.value || 0)}
              useGrouping={false}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              onClick={() => setApplyVisible(false)}
            />
            <Button
              label="Apply"
              onClick={applyCreditNote}
              disabled={!canApply}
            />
          </div>
        </div>
      </Dialog>
    </Page>
  );
}
