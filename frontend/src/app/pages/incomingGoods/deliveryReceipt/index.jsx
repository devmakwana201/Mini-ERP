import { useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "primereact/toast";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
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
  getGrnByChallanNum,
  getNextDocNum,
  getNextId,
  getPendingDeliveries,
  getToday,
  hasIncomingGoodsFlag,
  loadIncomingGoodsState,
  saveIncomingGoodsState,
} from "../shared/mockStore";

const receiptColumns = [
  { field: "num", header: "DR#" },
  { field: "challanNum", header: "Challan#" },
  { field: "supplierName", header: "Supplier" },
  { field: "date", header: "Date" },
  { field: "accepted", header: "Accepted" },
  { field: "rejected", header: "Rejected" },
  { field: "grnStatus", header: "GRN Status" },
];

const pendingColumnWidths = {
  num: "12rem",
  customerName: "14rem",
  vehicle: "10rem",
  deliveredDate: "10rem",
  grand: "10rem",
};

const acknowledgedColumnWidths = {
  num: "11rem",
  challanNum: "12rem",
  supplierName: "14rem",
  date: "10rem",
  accepted: "9rem",
  rejected: "9rem",
  grnStatus: "10rem",
};

const DEFAULT_PENDING_FILTERS = {
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  num: { value: null, matchMode: FilterMatchMode.CONTAINS },
  customerName: { value: null, matchMode: FilterMatchMode.CONTAINS },
  vehicle: { value: null, matchMode: FilterMatchMode.CONTAINS },
  deliveredDate: { value: null, matchMode: FilterMatchMode.CONTAINS },
  grand: { value: null, matchMode: FilterMatchMode.CONTAINS },
};

const DEFAULT_ACK_FILTERS = {
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  num: { value: null, matchMode: FilterMatchMode.CONTAINS },
  challanNum: { value: null, matchMode: FilterMatchMode.CONTAINS },
  supplierName: { value: null, matchMode: FilterMatchMode.CONTAINS },
  date: { value: null, matchMode: FilterMatchMode.CONTAINS },
  accepted: { value: null, matchMode: FilterMatchMode.CONTAINS },
  rejected: { value: null, matchMode: FilterMatchMode.CONTAINS },
  grnStatus: { value: null, matchMode: FilterMatchMode.CONTAINS },
};

const integerFilterFields = new Set(["accepted", "rejected", "grand"]);

export default function DeliveryReceiptPage() {
  const toast = useRef(null);
  const { user } = useAuthContext();
  const [store, setStore] = useState(() => loadIncomingGoodsState());
  const [inspectVisible, setInspectVisible] = useState(false);
  const [viewVisible, setViewVisible] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [selectedDr, setSelectedDr] = useState(null);
  const [draftLines, setDraftLines] = useState([]);

  const [dateRange, setDateRange] = useState(null);
  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("deliveryReceipt_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return receiptColumns.filter((col) => fields.includes(col.field));
    }
    return receiptColumns;
  });
  const [pendingFilters, setPendingFilters] = useState(DEFAULT_PENDING_FILTERS);
  const [acknowledgedFilters, setAcknowledgedFilters] =
    useState(DEFAULT_ACK_FILTERS);
  const [pendingSortField, setPendingSortField] = useState(null);
  const [pendingSortOrder, setPendingSortOrder] = useState(null);
  const [ackSortField, setAckSortField] = useState(null);
  const [ackSortOrder, setAckSortOrder] = useState(null);

  useEffect(() => {
    const pendingRestored = restoreSessionState(
      "incomingGoodsDeliveryPendingTableState",
      DEFAULT_PENDING_FILTERS,
    );
    if (pendingRestored) {
      if (pendingRestored.filters) setPendingFilters(pendingRestored.filters);
      if (pendingRestored.sortField !== undefined) {
        setPendingSortField(pendingRestored.sortField);
        setPendingSortOrder(pendingRestored.sortOrder);
      }
    }

    const ackRestored = restoreSessionState(
      "incomingGoodsDeliveryAcknowledgedTableState",
      DEFAULT_ACK_FILTERS,
    );
    if (ackRestored) {
      if (ackRestored.filters) setAcknowledgedFilters(ackRestored.filters);
      if (ackRestored.sortField !== undefined) {
        setAckSortField(ackRestored.sortField);
        setAckSortOrder(ackRestored.sortOrder);
      }
    }
  }, []);

  const canView = hasIncomingGoodsFlag(user, "incomingGoods.view");
  const canAcknowledge = hasIncomingGoodsFlag(
    user,
    "incomingGoods.deliveryReceipt.create",
  );
  const canCreateGrn = hasIncomingGoodsFlag(user, "incomingGoods.grn.create");

  const pendingRaw = useMemo(() => getPendingDeliveries(store), [store]);

  const acknowledgedRows = useMemo(() => {
    return store.deliveryReceipts.map((dr) => {
      const grn = getGrnByChallanNum(store, dr.challanNum);
      return {
        ...dr,
        grnStatus: grn?.status || "No GRN",
      };
    });
  }, [store]);

  const filteredPending = useMemo(
    () =>
      pendingRaw.filter((row) =>
        inRange(row.deliveredDate || row.date, dateRange),
      ),
    [pendingRaw, dateRange],
  );

  const filteredAcknowledged = useMemo(
    () => acknowledgedRows.filter((row) => inRange(row.date, dateRange)),
    [acknowledgedRows, dateRange],
  );

  const onGlobalFilterChange = (event) => {
    const value = event.target.value;
    setPendingFilters((prev) => ({
      ...prev,
      global: { ...prev.global, value },
    }));
    setAcknowledgedFilters((prev) => ({
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

    if (field === "date" || field === "deliveredDate") {
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

  const openInspectDialog = (challan) => {
    setSelectedChallan(challan);
    setDraftLines(
      (challan.lines || []).map((line) => ({
        ...line,
        received: Number(line.ordered || 0),
        rejReason: "",
      })),
    );
    setInspectVisible(true);
  };

  const updateReceived = (index, value) => {
    setDraftLines((prev) => {
      const next = [...prev];
      const ordered = Number(next[index].ordered || 0);
      const safe = Math.max(0, Math.min(Number(value || 0), ordered));
      next[index] = { ...next[index], received: safe };
      return next;
    });
  };

  const updateReason = (index, value) => {
    setDraftLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], rejReason: value };
      return next;
    });
  };

  const saveDeliveryReceipt = () => {
    if (!selectedChallan) return;

    const itemLines = draftLines.map((line) => {
      const ordered = Number(line.ordered || 0);
      const received = Math.max(
        0,
        Math.min(Number(line.received || 0), ordered),
      );
      const rejected = Math.max(0, ordered - received);

      return {
        itemId: line.itemId,
        name: line.name,
        rate: Number(line.rate || 0),
        ordered,
        received,
        accepted: received,
        rejected,
        rejReason: rejected > 0 ? line.rejReason || "" : "",
      };
    });

    const nextState = {
      ...store,
      deliveryReceipts: [
        ...store.deliveryReceipts,
        {
          id: getNextId(store.deliveryReceipts),
          num: getNextDocNum("DR", store.deliveryReceipts),
          challanId: selectedChallan.id,
          challanNum: selectedChallan.num,
          soNum: selectedChallan.soNum,
          supplierName: selectedChallan.customerName,
          date: getToday(),
          accepted: itemLines.reduce((sum, line) => sum + line.accepted, 0),
          rejected: itemLines.reduce((sum, line) => sum + line.rejected, 0),
          itemLines,
        },
      ],
    };

    saveIncomingGoodsState(nextState);
    setStore(nextState);
    setInspectVisible(false);
    setSelectedChallan(null);
    toast.current?.show({
      severity: "success",
      summary: "Saved",
      detail: "Delivery receipt created successfully",
      life: 2500,
    });
  };

  const createGrnFromDr = (dr) => {
    const existing = getGrnByChallanNum(store, dr.challanNum);
    if (existing) {
      toast.current?.show({
        severity: "warn",
        summary: "Already Exists",
        detail: "GRN already exists for this delivery receipt",
        life: 2500,
      });
      return;
    }

    const challan = store.challans.find((row) => row.id === dr.challanId);
    const po = challan
      ? store.purchaseOrders.find((row) => row.id === challan.linkedPOId)
      : null;

    const itemLines = dr.itemLines.map((line) => ({
      itemId: line.itemId,
      name: line.name,
      rate: Number(line.rate || 0),
      poQty: Number(line.ordered || 0),
      dispatchedQty: Number(line.ordered || 0),
      invoicedQty: Number(line.ordered || 0),
      receivedQty: Number(line.received || 0),
      accepted: 0,
      rejected: 0,
      shortageQty: Math.max(
        0,
        Number(line.ordered || 0) - Number(line.received || 0),
      ),
      rejReason: "",
    }));

    const nextState = {
      ...store,
      grns: [
        ...store.grns,
        {
          id: getNextId(store.grns),
          num: getNextDocNum("GRN", store.grns),
          poNum: po?.num || "N/A",
          poId: po?.id || null,
          supplierName: dr.supplierName,
          date: getToday(),
          status: "DRAFT",
          challanRef: dr.challanNum,
          accepted: 0,
          rejected: 0,
          issueRaised: false,
          issueId: null,
          stockPosted: false,
          itemLines,
        },
      ],
    };

    saveIncomingGoodsState(nextState);
    setStore(nextState);
    toast.current?.show({
      severity: "success",
      summary: "GRN Created",
      detail: "Draft GRN created from delivery receipt",
      life: 2500,
    });
  };

  const getExportRows = () =>
    filteredAcknowledged.map((row) => ({
      "DR#": row.num,
      "Challan#": row.challanNum,
      Supplier: row.supplierName,
      Date: row.date,
      Accepted: row.accepted,
      Rejected: row.rejected,
      "GRN Status": row.grnStatus,
    }));

  const exportCSV = () => {
    if (filteredAcknowledged.length === 0) {
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
    link.setAttribute("download", "delivery_receipts.csv");
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
    if (filteredAcknowledged.length === 0) {
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
      saveAsExcelFile(excelBuffer, "delivery_receipts");
      toast.current?.show({
        severity: "success",
        detail: "XLS exported successfully",
        life: 2500,
      });
    });
  };

  const exportPdf = async () => {
    if (filteredAcknowledged.length === 0) {
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
    doc.save("delivery_receipts.pdf");
    toast.current?.show({
      severity: "success",
      detail: "PDF exported successfully",
      life: 2500,
    });
  };

  const actionBodyPending = (rowData) => {
    if (!canAcknowledge) {
      return (
        <Button label="No Access" size="small" severity="secondary" disabled />
      );
    }

    return (
      <Button
        label="Inspect & Acknowledge"
        size="small"
        onClick={() => openInspectDialog(rowData)}
      />
    );
  };

  const actionBodyAcknowledged = (rowData) => {
    const grn = getGrnByChallanNum(store, rowData.challanNum);

    return (
      <div className="flex gap-2">
        <Button
          label="View Items"
          size="small"
          severity="secondary"
          onClick={() => {
            setSelectedDr(rowData);
            setViewVisible(true);
          }}
        />
        {!grn && (
          <Button
            label="Create GRN"
            size="small"
            disabled={!canCreateGrn}
            onClick={() => createGrnFromDr(rowData)}
          />
        )}
      </div>
    );
  };

  const onColumnToggle = (event) => {
    const selected = event.value;
    const ordered = receiptColumns.filter((column) =>
      selected.some((item) => item.field === column.field),
    );
    setVisibleFields(ordered);
    sessionStorage.setItem(
      "deliveryReceipt_visibleFields",
      JSON.stringify(ordered.map((col) => col.field)),
    );
  };

  const resetFilters = () => {
    setDateRange(null);
    setPendingFilters(DEFAULT_PENDING_FILTERS);
    setAcknowledgedFilters(DEFAULT_ACK_FILTERS);
    setPendingSortField(null);
    setPendingSortOrder(null);
    setAckSortField(null);
    setAckSortOrder(null);
    sessionStorage.removeItem("incomingGoodsDeliveryPendingTableState");
    sessionStorage.removeItem("incomingGoodsDeliveryAcknowledgedTableState");
  };

  if (!canView) {
    return (
      <Page title="Incoming Goods - Delivery Receipt">
        <Message
          severity="warn"
          text="You do not have access to Incoming Goods."
        />
      </Page>
    );
  }

  return (
    <Page title="Incoming Goods - Delivery Receipt">
      <Toast ref={toast} />

      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <div className="mb-4 flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
                  Delivery Receipt
                </h3>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 lg:justify-end">
                  <IconField iconPosition="left" className="w-full sm:w-64">
                    <InputIcon className="pi pi-search" />
                    <InputText
                      type="search"
                      value={pendingFilters.global?.value || ""}
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
                    options={receiptColumns}
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
                  Pending Acknowledgement
                </h3>
                <span className="text-sm text-gray-500">
                  {filteredPending.length} pending
                </span>
              </div>

              <DataTable
                value={filteredPending}
                stripedRows
                paginator
                rows={5}
                scrollable
                tableStyle={{ minWidth: "72rem" }}
                filterDisplay="row"
                filterDelay={0}
                filters={pendingFilters}
                globalFilterFields={[
                  "num",
                  "customerName",
                  "vehicle",
                  "deliveredDate",
                  "grand",
                ]}
                onFilter={(event) => {
                  setPendingFilters(event.filters);
                  scrollToTop();
                }}
                onPage={() => scrollToTop()}
                stateStorage="session"
                stateKey="incomingGoodsDeliveryPendingTableState"
                sortField={pendingSortField}
                sortOrder={pendingSortOrder}
                onSort={(event) => {
                  setPendingSortField(event.sortField);
                  setPendingSortOrder(event.sortOrder);
                  scrollToTop();
                }}
                removableSort
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[5, 10, 25, 50]}
                emptyMessage={
                  <EmptyMessage
                    title="No pending delivered challans"
                    subtitle="No pending deliveries match your current filters."
                  />
                }
                className="mb-6 overflow-hidden rounded-lg border border-gray-300"
              >
                <Column
                  field="num"
                  header="Challan#"
                  style={{ minWidth: pendingColumnWidths.num }}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterElement={(options) =>
                    renderColumnFilter(options, "num", "Challan#")
                  }
                  body={(rowData) => (
                    <span className="font-semibold text-indigo-600">
                      {rowData.num}
                    </span>
                  )}
                />
                <Column
                  field="customerName"
                  header="Supplier"
                  style={{ minWidth: pendingColumnWidths.customerName }}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterElement={(options) =>
                    renderColumnFilter(options, "customerName", "Supplier")
                  }
                  body={(rowData) => (
                    <span className="font-semibold text-purple-600">
                      {rowData.customerName}
                    </span>
                  )}
                />
                <Column
                  field="vehicle"
                  header="Vehicle"
                  style={{ minWidth: pendingColumnWidths.vehicle }}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterElement={(options) =>
                    renderColumnFilter(options, "vehicle", "Vehicle")
                  }
                />
                <Column
                  field="deliveredDate"
                  header="Arrived Date"
                  style={{ minWidth: pendingColumnWidths.deliveredDate }}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterElement={(options) =>
                    renderColumnFilter(options, "deliveredDate", "Arrived Date")
                  }
                  body={(rowData) => (
                    <span className="font-semibold text-purple-600">
                      {rowData.deliveredDate}
                    </span>
                  )}
                />
                <Column
                  field="grand"
                  header="Value"
                  style={{ minWidth: pendingColumnWidths.grand }}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterElement={(options) =>
                    renderColumnFilter(options, "grand", "Value")
                  }
                  body={(rowData) => (
                    <span className="font-bold text-blue-600">
                      {formatCurrency(rowData.grand)}
                    </span>
                  )}
                />
                <Column
                  header="Action"
                  style={{ minWidth: "14rem" }}
                  body={actionBodyPending}
                />
              </DataTable>

              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Acknowledged Deliveries
                </h3>
                <span className="text-sm text-gray-500">
                  {filteredAcknowledged.length} records
                </span>
              </div>

              <DataTable
                value={filteredAcknowledged}
                stripedRows
                paginator
                rows={10}
                scrollable
                tableStyle={{ minWidth: "86rem" }}
                filterDisplay="row"
                filterDelay={0}
                filters={acknowledgedFilters}
                globalFilterFields={receiptColumns.map(
                  (column) => column.field,
                )}
                onFilter={(event) => {
                  setAcknowledgedFilters(event.filters);
                  scrollToTop();
                }}
                onPage={() => scrollToTop()}
                stateStorage="session"
                stateKey="incomingGoodsDeliveryAcknowledgedTableState"
                sortField={ackSortField}
                sortOrder={ackSortOrder}
                onSort={(event) => {
                  setAckSortField(event.sortField);
                  setAckSortOrder(event.sortOrder);
                  scrollToTop();
                }}
                removableSort
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50, 100]}
                emptyMessage={
                  <EmptyMessage
                    title="No delivery receipts found"
                    subtitle="No delivery receipts match your current filters. Try adjusting your search criteria."
                  />
                }
                className="overflow-hidden rounded-lg border border-gray-300"
              >
                {visibleFields.map((column) => {
                  if (column.field === "num") {
                    return (
                      <Column
                        key={column.field}
                        field={column.field}
                        header={column.header}
                        style={{
                          minWidth:
                            acknowledgedColumnWidths[column.field] || "10rem",
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
                          <span className="font-semibold text-indigo-600">
                            {rowData.num}
                          </span>
                        )}
                      />
                    );
                  }

                  if (column.field === "supplierName") {
                    return (
                      <Column
                        key={column.field}
                        field={column.field}
                        header={column.header}
                        style={{
                          minWidth:
                            acknowledgedColumnWidths[column.field] || "10rem",
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
                          <span className="font-semibold text-purple-600">
                            {rowData.supplierName}
                          </span>
                        )}
                      />
                    );
                  }

                  if (column.field === "date") {
                    return (
                      <Column
                        key={column.field}
                        field={column.field}
                        header={column.header}
                        style={{
                          minWidth:
                            acknowledgedColumnWidths[column.field] || "10rem",
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
                          <span className="font-semibold text-purple-600">
                            {rowData.date}
                          </span>
                        )}
                      />
                    );
                  }

                  if (
                    column.field === "accepted" ||
                    column.field === "rejected"
                  ) {
                    return (
                      <Column
                        key={column.field}
                        field={column.field}
                        header={column.header}
                        style={{
                          minWidth:
                            acknowledgedColumnWidths[column.field] || "10rem",
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
                          if (column.field === "rejected") {
                            return (
                              <span
                                className={
                                  val > 0
                                    ? "font-semibold text-red-600"
                                    : "text-green-600"
                                }
                              >
                                {val}
                              </span>
                            );
                          }
                          return (
                            <span className="font-bold text-blue-600">
                              {val}
                            </span>
                          );
                        }}
                      />
                    );
                  }

                  return (
                    <Column
                      key={column.field}
                      field={column.field}
                      header={column.header}
                      style={{
                        minWidth:
                          acknowledgedColumnWidths[column.field] || "10rem",
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
                  body={actionBodyAcknowledged}
                />
              </DataTable>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        header={
          selectedChallan
            ? `Inspect Delivery - ${selectedChallan.num}`
            : "Inspect Delivery"
        }
        visible={inspectVisible}
        modal
        draggable={false}
        style={{ width: "80vw", maxWidth: "1100px" }}
        onHide={() => setInspectVisible(false)}
      >
        <DataTable value={draftLines} stripedRows>
          <Column field="name" header="Item" />
          <Column field="ordered" header="Ordered" />
          <Column
            header="Received"
            body={(rowData, options) => (
              <InputNumber
                value={rowData.received}
                min={0}
                max={Number(rowData.ordered || 0)}
                onValueChange={(event) =>
                  updateReceived(options.rowIndex, event.value)
                }
                useGrouping={false}
              />
            )}
          />
          <Column
            header="Rejected"
            body={(rowData) =>
              Math.max(
                0,
                Number(rowData.ordered || 0) - Number(rowData.received || 0),
              )
            }
          />
          <Column
            header="Rejection Reason"
            body={(rowData, options) => (
              <InputTextarea
                rows={1}
                value={rowData.rejReason}
                onChange={(event) =>
                  updateReason(options.rowIndex, event.target.value)
                }
                placeholder="Optional if no rejection"
              />
            )}
          />
        </DataTable>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            label="Cancel"
            severity="secondary"
            onClick={() => setInspectVisible(false)}
          />
          <Button
            label="Save Delivery Receipt"
            onClick={saveDeliveryReceipt}
            disabled={!canAcknowledge}
          />
        </div>
      </Dialog>

      <Dialog
        modal
        draggable={false}
        header={
          selectedDr
            ? `Delivery Receipt - ${selectedDr.num}`
            : "Delivery Receipt"
        }
        visible={viewVisible}
        style={{ width: "75vw", maxWidth: "1000px" }}
        onHide={() => setViewVisible(false)}
      >
        <DataTable value={selectedDr?.itemLines || []} stripedRows>
          <Column field="name" header="Item" />
          <Column field="ordered" header="Ordered" />
          <Column field="received" header="Received" />
          <Column field="accepted" header="Accepted" />
          <Column field="rejected" header="Rejected" />
          <Column field="rejReason" header="Reason" />
        </DataTable>
      </Dialog>
    </Page>
  );
}
