import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Page } from "components/shared/Page";
import EmptyMessage from "components/shared/EmptyMessage";
import { Toast } from "primereact/toast";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Dialog } from "primereact/dialog";
import { MultiSelect } from "primereact/multiselect";
import { Tag } from "primereact/tag";
import { Tooltip } from "primereact/tooltip";
import { Skeleton } from "primereact/skeleton";
import { FilterMatchMode } from "primereact/api";
import { unparse } from "papaparse";
import {
  getMockPurchaseOrders,
  updateMockPurchaseOrder,
} from "../mockPurchaseOrders";

const columnOptions = [
  { field: "poNumber", header: "PO#" },
  { field: "supplier", header: "Supplier" },
  { field: "location", header: "Location" },
  { field: "orderDate", header: "Date" },
  { field: "total", header: "Total" },
  { field: "status", header: "Status" },
  { field: "linkedSo", header: "Linked SO" },
];

const statusOptions = [
  { label: "All", value: null },
  { label: "Approved", value: "approved" },
  { label: "Draft", value: "draft" },
  { label: "Partially Received", value: "partially-received" },
  { label: "Submitted", value: "submitted" },
];

const statusMeta = {
  approved: { label: "APPROVED", severity: "success" },
  draft: { label: "DRAFT", severity: "secondary" },
  "partially-received": {
    label: "PARTIALLY RECEIVED",
    severity: "warning",
  },
  submitted: { label: "SUBMITTED", severity: "info" },
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function ProcurementPurchaseOrder() {
  const toast = useRef(null);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [tableRows, setTableRows] = useState([]);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("procurementPurchaseOrder_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    return columnOptions;
  });

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    poNumber: { value: null, matchMode: FilterMatchMode.CONTAINS },
    supplier: { value: null, matchMode: FilterMatchMode.CONTAINS },
    location: { value: null, matchMode: FilterMatchMode.CONTAINS },
    orderDate: { value: null, matchMode: FilterMatchMode.CONTAINS },
    total: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.CONTAINS },
    linkedSo: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const records = getMockPurchaseOrders();
      setPurchaseOrders(records);
      setTableRows(records);
      setIsLoading(false);
    }, 450);

    return () => clearTimeout(timer);
  }, []);

  const supplierOptions = useMemo(() => {
    const suppliers = Array.from(
      new Set(purchaseOrders.map((row) => row.supplier)),
    );

    return [
      { label: "All", value: null },
      ...suppliers.map((supplier) => ({ label: supplier, value: supplier })),
    ];
  }, [purchaseOrders]);

  const blankRow = {
    poNumber: "",
    supplier: "",
    location: "",
    orderDate: "",
    total: "",
    status: "",
    linkedSo: "",
  };

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      global: { ...prev.global, value },
    }));
  };

  const filteredPurchaseOrders = useMemo(
    () =>
      purchaseOrders.filter((row) => {
        const matchesStatus = selectedStatus
          ? row.status === selectedStatus
          : true;
        const matchesSupplier = selectedSupplier
          ? row.supplier === selectedSupplier
          : true;

        return matchesStatus && matchesSupplier;
      }),
    [purchaseOrders, selectedStatus, selectedSupplier],
  );

  useEffect(() => {
    setTableRows(filteredPurchaseOrders);
  }, [filteredPurchaseOrders]);

  const onColumnToggle = (event) => {
    let selectedColumns = event.value;

    if (!selectedColumns.some((col) => col.field === "poNumber")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "poNumber"),
      ];
    }

    const orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((selected) => selected.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "procurementPurchaseOrder_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const fileExportMessage = () => {
    toast.current?.show({
      severity: "success",
      detail: "File Exported Successfully",
      life: 3000,
    });
  };

  const getExportData = () =>
    tableRows.map((row) => ({
      "PO#": row.poNumber,
      Supplier: row.supplier,
      Location: row.location,
      Date: row.orderDate,
      Total: formatCurrency(row.total),
      Status: statusMeta[row.status]?.label || row.status,
      "Linked SO": row.linkedSo || "-",
    }));

  const exportCSV = () => {
    if (!tableRows.length) {
      toast.current?.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const csvData = unparse(getExportData());
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "procurement_purchase_orders.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    fileExportMessage();
  };

  const exportExcel = async () => {
    if (!tableRows.length) {
      toast.current?.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const xlsx = await import("xlsx");
    const worksheet = xlsx.utils.json_to_sheet(getExportData());
    const workbook = { Sheets: { data: worksheet }, SheetNames: ["data"] };
    const excelBuffer = xlsx.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const fileSaver = await import("file-saver");
    fileSaver.default.saveAs(
      new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
      }),
      `procurement_purchase_orders_${Date.now()}.xlsx`,
    );

    fileExportMessage();
  };

  const exportPdf = async () => {
    if (!tableRows.length) {
      toast.current?.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

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
    const exportData = getExportData();

    autoTable(doc, {
      head: [Object.keys(exportData[0])],
      body: exportData.map((row) => Object.values(row)),
      startY: 24,
      styles: {
        fontSize: 8,
        cellPadding: 5,
      },
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [247, 250, 249],
      },
      theme: "grid",
      margin: { top: 24, left: 24, right: 24, bottom: 24 },
    });

    doc.save("procurement_purchase_orders.pdf");
    fileExportMessage();
  };

  const handleView = (rowData) => {
    setSelectedPurchaseOrder(rowData);
    setDetailsVisible(true);
  };

  const handleSubmit = (rowData) => {
    setPurchaseOrders((prev) =>
      prev.map((record) =>
        record.id === rowData.id
          ? { ...record, status: "submitted", canSubmit: false }
          : record,
      ),
    );
    updateMockPurchaseOrder(rowData.id, {
      status: "submitted",
      canSubmit: false,
    });

    toast.current?.show({
      severity: "success",
      summary: "Submitted",
      detail: `${rowData.poNumber} submitted successfully`,
      life: 3000,
    });
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Purchase Orders
      </h3>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
        <IconField iconPosition="left" className="w-full sm:w-72">
          <InputIcon className="pi pi-search" />
          <InputText
            type="search"
            value={filters.global?.value || ""}
            onChange={onGlobalFilterChange}
            placeholder="PO# or supplier..."
            className="w-full"
          />
        </IconField>

        <Dropdown
          value={selectedStatus}
          options={statusOptions}
          optionLabel="label"
          optionValue="value"
          onChange={(e) => setSelectedStatus(e.value)}
          placeholder="Status"
          className="w-full sm:w-40"
        />

        <Dropdown
          value={selectedSupplier}
          options={supplierOptions}
          optionLabel="label"
          optionValue="value"
          onChange={(e) => setSelectedSupplier(e.value)}
          placeholder="Supplier"
          className="w-full sm:w-48"
        />

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

        <div className="flex items-center gap-2">
          <Button
            className="export-icon-tooltip"
            type="button"
            icon="pi pi-file"
            rounded
            size="small"
            onClick={exportCSV}
            data-pr-tooltip="Export as CSV"
            disabled={isLoading}
          />
          <Button
            className="export-icon-tooltip"
            type="button"
            icon="pi pi-file-excel"
            severity="success"
            rounded
            size="small"
            onClick={exportExcel}
            data-pr-tooltip="Export as XLS"
            disabled={isLoading}
          />
          <Button
            className="export-icon-tooltip"
            type="button"
            icon="pi pi-file-pdf"
            severity="warning"
            rounded
            size="small"
            onClick={exportPdf}
            data-pr-tooltip="Export as PDF"
            disabled={isLoading}
          />
          <Button
            label="Create PO"
            icon="pi pi-plus"
            size="small"
            onClick={() => navigate("/procurement/create-po")}
          />
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
  );

  const poBodyTemplate = (rowData) =>
    isLoading ? (
      <Skeleton width="8rem" height="1.5rem" />
    ) : (
      <span className="font-semibold text-primary-700">{rowData.poNumber}</span>
    );

  const createTextBodyTemplate = (field, width = "10rem", rowData) =>
    isLoading ? (
      <Skeleton width={width} height="1.5rem" />
    ) : (
      <span>{rowData[field] || "-"}</span>
    );

  const supplierBodyTemplate = (rowData) =>
    createTextBodyTemplate("supplier", "11rem", rowData);

  const locationBodyTemplate = (rowData) =>
    createTextBodyTemplate("location", "11rem", rowData);

  const dateBodyTemplate = (rowData) =>
    createTextBodyTemplate("orderDate", "7rem", rowData);

  const totalBodyTemplate = (rowData) =>
    isLoading ? (
      <Skeleton width="6rem" height="1.5rem" />
    ) : (
      <span className="font-semibold">{formatCurrency(rowData.total)}</span>
    );

  const statusBodyTemplate = (rowData) =>
    isLoading ? (
      <Skeleton width="7rem" height="1.5rem" />
    ) : (
      <Tag
        value={statusMeta[rowData.status]?.label || rowData.status}
        severity={statusMeta[rowData.status]?.severity || "secondary"}
        className="text-[10px] font-semibold"
      />
    );

  const linkedSoBodyTemplate = (rowData) =>
    isLoading ? (
      <Skeleton width="8rem" height="1.5rem" />
    ) : rowData.linkedSo ? (
      <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
        {rowData.linkedSo}
      </span>
    ) : (
      <span className="text-slate-400">-</span>
    );

  const actionBodyTemplate = (rowData) =>
    isLoading ? (
      <div className="flex gap-2">
        <Skeleton width="4rem" height="2rem" />
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <Button
          label="View"
          outlined
          size="small"
          onClick={() => handleView(rowData)}
        />
        {rowData.canSubmit && (
          <Button
            label="Submit"
            size="small"
            onClick={() => handleSubmit(rowData)}
          />
        )}
      </div>
    );

  return (
    <Page title="Procurement - Purchase Order">
      <Toast ref={toast} />

      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 5 }, () => blankRow)
                    : filteredPurchaseOrders
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No purchase orders found"
                    subtitle="No purchase orders match your current filters. Try adjusting your search and filter criteria."
                  />
                }
                paginator
                filters={filters}
                filterDisplay="row"
                filterDelay={0}
                globalFilterFields={[
                  "poNumber",
                  "supplier",
                  "location",
                  "orderDate",
                  "status",
                  "linkedSo",
                ]}
                onFilter={(e) => setFilters(e.filters)}
                onValueChange={setTableRows}
                rows={10}
                rowsPerPageOptions={[10, 25, 50]}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                totalRecords={tableRows.length}
                tableStyle={{ minWidth: "72rem" }}
                removableSort
              >
                <Column
                  header="PO#"
                  field="poNumber"
                  body={poBodyTemplate}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterPlaceholder="Search PO#"
                  style={{ minWidth: "12rem" }}
                  hidden={!visibleFields.some((col) => col.field === "poNumber")}
                />
                <Column
                  header="Supplier"
                  field="supplier"
                  body={supplierBodyTemplate}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterPlaceholder="Search Supplier"
                  style={{ minWidth: "14rem" }}
                  hidden={!visibleFields.some((col) => col.field === "supplier")}
                />
                <Column
                  header="Location"
                  field="location"
                  body={locationBodyTemplate}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterPlaceholder="Search Location"
                  style={{ minWidth: "15rem" }}
                  hidden={!visibleFields.some((col) => col.field === "location")}
                />
                <Column
                  header="Date"
                  field="orderDate"
                  body={dateBodyTemplate}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterPlaceholder="Search Date"
                  style={{ minWidth: "10rem" }}
                  hidden={!visibleFields.some((col) => col.field === "orderDate")}
                />
                <Column
                  header="Total"
                  field="total"
                  body={totalBodyTemplate}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterPlaceholder="Search Total"
                  style={{ minWidth: "10rem" }}
                  hidden={!visibleFields.some((col) => col.field === "total")}
                />
                <Column
                  header="Status"
                  field="status"
                  body={statusBodyTemplate}
                  sortable
                  filter
                  showFilterMenu={false}
                  style={{ minWidth: "12rem" }}
                  hidden={!visibleFields.some((col) => col.field === "status")}
                />
                <Column
                  header="Linked SO"
                  field="linkedSo"
                  body={linkedSoBodyTemplate}
                  sortable
                  filter
                  showFilterMenu={false}
                  filterPlaceholder="Search SO"
                  style={{ minWidth: "13rem" }}
                  hidden={!visibleFields.some((col) => col.field === "linkedSo")}
                />
                <Column
                  header="Actions"
                  body={actionBodyTemplate}
                  style={{ minWidth: "12rem" }}
                />
              </DataTable>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        visible={detailsVisible}
        onHide={() => setDetailsVisible(false)}
        style={{ width: "50rem", maxWidth: "95vw" }}
        breakpoints={{ "960px": "90vw", "641px": "96vw" }}
        modal
        draggable={false}
        resizable={false}
        dismissableMask
        header={
          selectedPurchaseOrder ? (
            <div className="flex flex-col gap-2">
              <div className="text-lg font-semibold">
                {selectedPurchaseOrder.poNumber}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Tag
                  value={
                    statusMeta[selectedPurchaseOrder.status]?.label ||
                    selectedPurchaseOrder.status
                  }
                  severity={
                    statusMeta[selectedPurchaseOrder.status]?.severity ||
                    "secondary"
                  }
                />
                <span className="text-slate-500">
                  Supplier: {selectedPurchaseOrder.supplier}
                </span>
                {selectedPurchaseOrder.linkedSo && (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 font-semibold text-blue-600">
                    {selectedPurchaseOrder.linkedSo}
                  </span>
                )}
              </div>
            </div>
          ) : null
        }
      >
        {selectedPurchaseOrder && (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 md:grid-cols-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Location
                </div>
                <div className="mt-1 font-medium text-slate-700">
                  {selectedPurchaseOrder.location}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Order Date
                </div>
                <div className="mt-1 font-medium text-slate-700">
                  {selectedPurchaseOrder.orderDate}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Created By
                </div>
                <div className="mt-1 font-medium text-slate-700">
                  {selectedPurchaseOrder.createdBy}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Remarks
                </div>
                <div className="mt-1 font-medium text-slate-700">
                  {selectedPurchaseOrder.remarks}
                </div>
              </div>
            </div>

            <DataTable
              value={selectedPurchaseOrder.items}
              className="overflow-hidden rounded-lg border border-slate-200"
            >
              <Column field="itemName" header="Item" />
              <Column field="orderedQty" header="Ordered Qty" />
              <Column field="freeQty" header="Free Qty" />
              <Column field="totalQty" header="Total Qty" />
              <Column
                field="rate"
                header="Rate"
                body={(rowData) => formatCurrency(rowData.rate)}
              />
              <Column field="gst" header="GST%" />
              <Column field="offerApplied" header="Offer Applied" />
              <Column
                field="total"
                header="Total"
                body={(rowData) => formatCurrency(rowData.total)}
              />
            </DataTable>

            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <div className="text-sm text-slate-500">
                Grand Total for {selectedPurchaseOrder.items.length} item(s)
              </div>
              <div className="text-lg font-semibold text-slate-800">
                {formatCurrency(selectedPurchaseOrder.total)}
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </Page>
  );
}
