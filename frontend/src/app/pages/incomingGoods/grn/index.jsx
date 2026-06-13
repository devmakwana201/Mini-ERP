import { useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "primereact/toast";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
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
  inRange,
  restoreSessionState,
  saveAsExcelFile,
} from "../shared/incomingGoodsUtils";
import {
  formatCurrency,
  getNextId,
  getToday,
  hasIncomingGoodsFlag,
  loadIncomingGoodsState,
  saveIncomingGoodsState,
} from "../shared/mockStore";

const statusSeverity = {
  DRAFT: "warning",
  APPROVED: "success",
  OPEN: "danger",
  RESOLVED: "success",
};

const columnOptions = [
  { field: "num", header: "GRN#" },
  { field: "poNum", header: "PO#" },
  { field: "supplierName", header: "Supplier" },
  { field: "poQty", header: "PO Qty" },
  { field: "dispatchedQty", header: "Dispatched Qty" },
  { field: "receivedQty", header: "Received Qty" },
  { field: "pendingQty", header: "Pending Qty" },
  { field: "shortageQty", header: "Shortage Qty" },
  { field: "fulfillment", header: "Fulfillment" },
  { field: "status", header: "Doc Status" },
  { field: "issueStatus", header: "Issue" },
];

const grnColumnWidths = {
  num: "13rem",
  poNum: "11rem",
  supplierName: "15rem",
  poQty: "9rem",
  dispatchedQty: "11rem",
  receivedQty: "10rem",
  pendingQty: "10rem",
  shortageQty: "10rem",
  fulfillment: "10rem",
  status: "10rem",
  issueStatus: "10rem",
};

const DEFAULT_TABLE_FILTERS = {
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  num: { value: null, matchMode: FilterMatchMode.CONTAINS },
  poNum: { value: null, matchMode: FilterMatchMode.CONTAINS },
  supplierName: { value: null, matchMode: FilterMatchMode.CONTAINS },
  poQty: { value: null, matchMode: FilterMatchMode.CONTAINS },
  dispatchedQty: { value: null, matchMode: FilterMatchMode.CONTAINS },
  receivedQty: { value: null, matchMode: FilterMatchMode.CONTAINS },
  pendingQty: { value: null, matchMode: FilterMatchMode.CONTAINS },
  shortageQty: { value: null, matchMode: FilterMatchMode.CONTAINS },
  fulfillment: { value: null, matchMode: FilterMatchMode.CONTAINS },
  status: { value: null, matchMode: FilterMatchMode.CONTAINS },
  issueStatus: { value: null, matchMode: FilterMatchMode.CONTAINS },
};

const integerFilterFields = new Set([
  "poQty",
  "dispatchedQty",
  "receivedQty",
  "pendingQty",
  "shortageQty",
]);

export default function GrnPage() {
  const toast = useRef(null);
  const { user } = useAuthContext();
  const [store, setStore] = useState(() => loadIncomingGoodsState());
  const [approveVisible, setApproveVisible] = useState(false);
  const [viewVisible, setViewVisible] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState(null);
  const [draftLines, setDraftLines] = useState([]);

  const [dateRange, setDateRange] = useState(null);
  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("grn_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    return columnOptions;
  });
  const [tableFilters, setTableFilters] = useState(DEFAULT_TABLE_FILTERS);
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState(null);

  useEffect(() => {
    const restored = restoreSessionState(
      "incomingGoodsGrnTableState",
      DEFAULT_TABLE_FILTERS,
    );
    if (restored) {
      if (restored.filters) setTableFilters(restored.filters);
      if (restored.sortField !== undefined) {
        setSortField(restored.sortField);
        setSortOrder(restored.sortOrder);
      }
    }
  }, []);

  const canView = hasIncomingGoodsFlag(user, "incomingGoods.view");
  const canApprove = hasIncomingGoodsFlag(user, "incomingGoods.grn.approve");
  const canRaiseIssue = hasIncomingGoodsFlag(
    user,
    "incomingGoods.grn.issue.raise",
  );

  const grnRows = useMemo(() => {
    return store.grns.map((grn) => {
      const poQty = (grn.itemLines || []).reduce(
        (sum, line) => sum + Number(line.poQty || 0),
        0,
      );
      const dispatchedQty = (grn.itemLines || []).reduce(
        (sum, line) => sum + Number(line.dispatchedQty || 0),
        0,
      );
      const receivedQty = (grn.itemLines || []).reduce(
        (sum, line) => sum + Number(line.receivedQty || 0),
        0,
      );
      const shortageQty = (grn.itemLines || []).reduce(
        (sum, line) => sum + Number(line.shortageQty || 0),
        0,
      );
      const pendingQty = Math.max(0, poQty - receivedQty);
      const issue = store.grnIssues.find((item) => item.id === grn.issueId);

      return {
        ...grn,
        poQty,
        dispatchedQty,
        receivedQty,
        shortageQty,
        pendingQty,
        fulfillment: pendingQty > 0 ? "Partial" : "Completed",
        issueStatus: issue?.status || "-",
      };
    });
  }, [store.grns, store.grnIssues]);

  const filteredRows = useMemo(
    () => grnRows.filter((row) => inRange(row.date, dateRange)),
    [grnRows, dateRange],
  );

  const onGlobalFilterChange = (event) => {
    const value = event.target.value;
    setTableFilters((prev) => ({
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

  const openApproveDialog = (grn) => {
    setSelectedGrn(grn);
    setDraftLines(
      (grn.itemLines || []).map((line) => ({
        ...line,
        acceptedDraft:
          Number(line.accepted || 0) > 0
            ? Number(line.accepted || 0)
            : Number(line.receivedQty || 0),
        rejReasonDraft: line.rejReason || "",
      })),
    );
    setApproveVisible(true);
  };

  const updateAccepted = (index, value) => {
    setDraftLines((prev) => {
      const next = [...prev];
      const received = Number(next[index].receivedQty || 0);
      const safe = Math.max(0, Math.min(Number(value || 0), received));
      next[index] = { ...next[index], acceptedDraft: safe };
      return next;
    });
  };

  const updateReason = (index, value) => {
    setDraftLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], rejReasonDraft: value };
      return next;
    });
  };

  const approveGrn = () => {
    if (!selectedGrn) return;

    let rejectedTotal = 0;
    const finalLines = draftLines.map((line) => {
      const received = Number(line.receivedQty || 0);
      const accepted = Math.max(
        0,
        Math.min(Number(line.acceptedDraft || 0), received),
      );
      const rejected = Math.max(0, received - accepted);
      const shortage = Math.max(0, Number(line.invoicedQty || 0) - received);
      rejectedTotal += rejected + shortage;

      return {
        ...line,
        accepted,
        rejected,
        shortageQty: shortage,
        rejReason:
          rejected > 0 ? line.rejReasonDraft || "Damaged/Rejected" : "",
      };
    });

    const acceptedTotal = finalLines.reduce(
      (sum, line) => sum + Number(line.accepted || 0),
      0,
    );

    const nextState = {
      ...store,
      grns: store.grns.map((row) => {
        if (row.id !== selectedGrn.id) return row;
        return {
          ...row,
          status: "APPROVED",
          stockPosted: true,
          accepted: acceptedTotal,
          rejected: finalLines.reduce(
            (sum, line) => sum + Number(line.rejected || 0),
            0,
          ),
          itemLines: finalLines,
        };
      }),
    };

    const hasVariance = rejectedTotal > 0;
    if (hasVariance && !selectedGrn.issueRaised) {
      const issueId = getNextId(nextState.grnIssues);
      const issueAmount = Math.round(
        finalLines.reduce(
          (sum, line) =>
            sum +
            Number(line.rate || 0) *
              (Number(line.rejected || 0) + Number(line.shortageQty || 0)),
          0,
        ),
      );

      const reason =
        finalLines
          .filter(
            (line) =>
              Number(line.rejected || 0) > 0 ||
              Number(line.shortageQty || 0) > 0,
          )
          .map(
            (line) =>
              `${line.name}: ${line.rejected} damaged, ${line.shortageQty} shortage${line.rejReason ? ` (${line.rejReason})` : ""}`,
          )
          .join("; ") || "GRN rejection";

      nextState.grnIssues = [
        ...nextState.grnIssues,
        {
          id: issueId,
          grnNum: selectedGrn.num,
          poNum: selectedGrn.poNum,
          challanNum: selectedGrn.challanRef,
          supplierName: selectedGrn.supplierName,
          date: getToday(),
          amount: issueAmount,
          reason,
          status: "OPEN",
          creditNoteNum: null,
        },
      ];

      nextState.grns = nextState.grns.map((row) =>
        row.id === selectedGrn.id
          ? { ...row, issueRaised: true, issueId }
          : row,
      );
    }

    saveIncomingGoodsState(nextState);
    setStore(nextState);
    setApproveVisible(false);

    toast.current?.show({
      severity: "success",
      summary: "Approved",
      detail: "GRN approved successfully",
      life: 2500,
    });
  };

  const raiseIssue = (grn) => {
    const already = store.grnIssues.find((issue) => issue.grnNum === grn.num);
    if (already) {
      toast.current?.show({
        severity: "warn",
        summary: "Already Raised",
        detail: `Issue already exists for ${grn.num}`,
        life: 2500,
      });
      return;
    }

    const issueId = getNextId(store.grnIssues);
    const issueAmount = Math.round(
      (grn.itemLines || []).reduce(
        (sum, line) =>
          sum +
          Number(line.rate || 0) *
            (Number(line.rejected || 0) + Number(line.shortageQty || 0)),
        0,
      ),
    );

    const nextState = {
      ...store,
      grnIssues: [
        ...store.grnIssues,
        {
          id: issueId,
          grnNum: grn.num,
          poNum: grn.poNum,
          challanNum: grn.challanRef,
          supplierName: grn.supplierName,
          date: getToday(),
          amount: issueAmount,
          reason: "Manual issue raised from GRN",
          status: "OPEN",
          creditNoteNum: null,
        },
      ],
      grns: store.grns.map((row) =>
        row.id === grn.id ? { ...row, issueRaised: true, issueId } : row,
      ),
    };

    saveIncomingGoodsState(nextState);
    setStore(nextState);
    toast.current?.show({
      severity: "success",
      summary: "Issue Raised",
      detail: "Issue raised for supplier credit note processing",
      life: 2500,
    });
  };

  const getExportRows = () =>
    filteredRows.map((row) => ({
      "GRN#": row.num,
      "PO#": row.poNum,
      Supplier: row.supplierName,
      "PO Qty": row.poQty,
      "Received Qty": row.receivedQty,
      "Shortage Qty": row.shortageQty,
      Fulfillment: row.fulfillment,
      Status: row.status,
      Issue: row.issueStatus,
      Date: row.date,
    }));

  const fileExportMessage = (label) => {
    toast.current?.show({
      severity: "success",
      detail: `${label} exported successfully`,
      life: 2500,
    });
  };

  const exportCSV = () => {
    if (filteredRows.length === 0) {
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
    link.setAttribute("download", "grn_summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    fileExportMessage("CSV");
  };

  const exportExcel = () => {
    if (filteredRows.length === 0) {
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
      saveAsExcelFile(excelBuffer, "grn_summary");
      fileExportMessage("XLS");
    });
  };

  const exportPdf = async () => {
    if (filteredRows.length === 0) {
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
    doc.save("grn_summary.pdf");
    fileExportMessage("PDF");
  };

  const onColumnToggle = (event) => {
    const selected = event.value;
    const ordered = columnOptions.filter((column) =>
      selected.some((item) => item.field === column.field),
    );
    setVisibleFields(ordered);
    sessionStorage.setItem(
      "grn_visibleFields",
      JSON.stringify(ordered.map((col) => col.field)),
    );
  };

  const resetFilters = () => {
    setDateRange(null);
    setTableFilters(DEFAULT_TABLE_FILTERS);
    setSortField(null);
    setSortOrder(null);
    sessionStorage.removeItem("incomingGoodsGrnTableState");
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">GRN</h3>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 lg:justify-end">
        <IconField iconPosition="left" className="w-full sm:w-64">
          <InputIcon className="pi pi-search" />
          <InputText
            type="search"
            value={tableFilters.global?.value || ""}
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
          options={columnOptions}
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
  );

  const actionBody = (rowData) => {
    const issue = store.grnIssues.find((item) => item.id === rowData.issueId);
    const canShowRaise =
      rowData.status === "APPROVED" &&
      !issue &&
      (Number(rowData.rejected || 0) > 0 ||
        Number(rowData.shortageQty || 0) > 0);

    return (
      <div className="flex gap-2">
        <Button
          label="View"
          size="small"
          severity="secondary"
          onClick={() => {
            setSelectedGrn(rowData);
            setViewVisible(true);
          }}
        />
        {rowData.status === "DRAFT" && (
          <Button
            label="Inspect & Approve"
            size="small"
            disabled={!canApprove}
            onClick={() => openApproveDialog(rowData)}
          />
        )}
        {canShowRaise && (
          <Button
            label="Raise Issue"
            size="small"
            severity="danger"
            disabled={!canRaiseIssue}
            onClick={() => raiseIssue(rowData)}
          />
        )}
      </div>
    );
  };

  if (!canView) {
    return (
      <Page title="Incoming Goods - GRN">
        <Message
          severity="warn"
          text="You do not have access to Incoming Goods."
        />
      </Page>
    );
  }

  return (
    <Page title="Incoming Goods - GRN">
      <Toast ref={toast} />

      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={filteredRows}
                stripedRows
                paginator
                rows={10}
                scrollable
                tableStyle={{ minWidth: "112rem" }}
                header={renderHeader()}
                filterDisplay="row"
                filterDelay={0}
                filters={tableFilters}
                globalFilterFields={columnOptions.map((column) => column.field)}
                onFilter={(event) => {
                  setTableFilters(event.filters);
                  scrollToTop();
                }}
                onPage={() => scrollToTop()}
                stateStorage="session"
                stateKey="incomingGoodsGrnTableState"
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={(event) => {
                  setSortField(event.sortField);
                  setSortOrder(event.sortOrder);
                  scrollToTop();
                }}
                removableSort
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50, 100]}
                emptyMessage={
                  <EmptyMessage
                    title="No GRNs found"
                    subtitle="No GRNs match your current filters. Try adjusting your search criteria."
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
                          minWidth: grnColumnWidths[column.field] || "10rem",
                        }}
                        filter
                        sortable
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
                          minWidth: grnColumnWidths[column.field] || "10rem",
                        }}
                        filter
                        sortable
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

                  if (
                    column.field === "shortageQty" ||
                    column.field === "pendingQty"
                  ) {
                    return (
                      <Column
                        key={column.field}
                        field={column.field}
                        header={column.header}
                        style={{
                          minWidth: grnColumnWidths[column.field] || "10rem",
                        }}
                        filter
                        sortable
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
                        }}
                      />
                    );
                  }

                  if (column.field === "receivedQty") {
                    return (
                      <Column
                        key={column.field}
                        field={column.field}
                        header={column.header}
                        style={{
                          minWidth: grnColumnWidths[column.field] || "10rem",
                        }}
                        filter
                        sortable
                        showFilterMenu={false}
                        filterElement={(options) =>
                          renderColumnFilter(
                            options,
                            column.field,
                            column.header,
                          )
                        }
                        body={(rowData) => (
                          <span className="font-bold text-blue-600">
                            {rowData.receivedQty}
                          </span>
                        )}
                      />
                    );
                  }

                  if (column.field === "fulfillment") {
                    return (
                      <Column
                        key={column.field}
                        field={column.field}
                        header={column.header}
                        style={{
                          minWidth: grnColumnWidths[column.field] || "10rem",
                        }}
                        filter
                        sortable
                        showFilterMenu={false}
                        filterElement={(options) =>
                          renderColumnFilter(
                            options,
                            column.field,
                            column.header,
                          )
                        }
                        body={(rowData) => (
                          <Tag
                            value={rowData.fulfillment}
                            severity={
                              rowData.fulfillment === "Completed"
                                ? "success"
                                : "warning"
                            }
                          />
                        )}
                      />
                    );
                  }

                  if (
                    column.field === "status" ||
                    column.field === "issueStatus"
                  ) {
                    return (
                      <Column
                        key={column.field}
                        field={column.field}
                        header={column.header}
                        style={{
                          minWidth: grnColumnWidths[column.field] || "10rem",
                        }}
                        filter
                        sortable
                        showFilterMenu={false}
                        filterElement={(options) =>
                          renderColumnFilter(
                            options,
                            column.field,
                            column.header,
                          )
                        }
                        body={(rowData) => (
                          <Tag
                            value={rowData[column.field]}
                            severity={
                              statusSeverity[rowData[column.field]] || "info"
                            }
                          />
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
                        minWidth: grnColumnWidths[column.field] || "10rem",
                      }}
                      filter
                      sortable
                      showFilterMenu={false}
                      filterElement={(options) =>
                        renderColumnFilter(options, column.field, column.header)
                      }
                    />
                  );
                })}
                <Column
                  header="Action"
                  style={{ minWidth: "20rem" }}
                  body={actionBody}
                />
              </DataTable>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        header={
          selectedGrn ? `Approve GRN - ${selectedGrn.num}` : "Approve GRN"
        }
        visible={approveVisible}
        modal
        draggable={false}
        style={{ width: "80vw", maxWidth: "1100px" }}
        onHide={() => setApproveVisible(false)}
      >
        <DataTable value={draftLines} stripedRows>
          <Column field="name" header="Item" />
          <Column field="receivedQty" header="Received" />
          <Column field="shortageQty" header="Shortage" />
          <Column
            header="Accepted"
            body={(rowData, options) => (
              <InputNumber
                value={rowData.acceptedDraft}
                min={0}
                max={Number(rowData.receivedQty || 0)}
                onValueChange={(event) =>
                  updateAccepted(options.rowIndex, event.value)
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
                Number(rowData.receivedQty || 0) -
                  Number(rowData.acceptedDraft || 0),
              )
            }
          />
          <Column
            header="Reason"
            body={(rowData, options) => (
              <InputTextarea
                rows={1}
                value={rowData.rejReasonDraft}
                onChange={(event) =>
                  updateReason(options.rowIndex, event.target.value)
                }
              />
            )}
          />
        </DataTable>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            label="Cancel"
            severity="secondary"
            onClick={() => setApproveVisible(false)}
          />
          <Button
            label="Approve GRN"
            onClick={approveGrn}
            disabled={!canApprove}
          />
        </div>
      </Dialog>

      <Dialog
        header={selectedGrn ? `GRN - ${selectedGrn.num}` : "GRN Details"}
        visible={viewVisible}
        modal
        draggable={false}
        style={{ width: "80vw", maxWidth: "1100px" }}
        onHide={() => setViewVisible(false)}
      >
        <DataTable value={selectedGrn?.itemLines || []} stripedRows>
          <Column field="name" header="Item" />
          <Column field="poQty" header="PO Qty" />
          <Column field="dispatchedQty" header="Dispatched" />
          <Column field="receivedQty" header="Received" />
          <Column field="accepted" header="Accepted" />
          <Column field="rejected" header="Rejected" />
          <Column field="shortageQty" header="Shortage" />
          <Column field="rate" header="Rate" />
          <Column
            header="Value Impact"
            body={(rowData) =>
              formatCurrency(
                Number(rowData.rate || 0) *
                  (Number(rowData.rejected || 0) +
                    Number(rowData.shortageQty || 0)),
              )
            }
          />
        </DataTable>
      </Dialog>
    </Page>
  );
}
