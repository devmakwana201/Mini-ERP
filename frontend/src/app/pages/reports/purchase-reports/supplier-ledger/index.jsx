import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ColumnGroup } from "primereact/columngroup";
import { Row } from "primereact/row";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { MultiSelect } from "primereact/multiselect";
import { Tooltip } from "primereact/tooltip";
import { unparse } from "papaparse";
import { Skeleton } from "primereact/skeleton";
import { FilterMatchMode } from "primereact/api";
import { scrollToTop } from "utils/scrollToTop";
import { SupplierLedgerService } from "services/reports/purchase/supplierLedger";
import EmptyMessage from "components/shared/EmptyMessage";
import { LocationFilter } from "components/reports/LocationFilter";

export default function SupplierLedger() {
  const toast = useRef(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [totalRecords, setTotalRecords] = useState(0);

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    date: { value: null, matchMode: FilterMatchMode.CONTAINS },
    description: { value: null, matchMode: FilterMatchMode.CONTAINS },
    credit: { value: null, matchMode: FilterMatchMode.EQUALS },
    debit: { value: null, matchMode: FilterMatchMode.EQUALS },
    balance: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const columnOptions = [
    { field: "date", header: "Date" },
    { field: "description", header: "Description" },
    { field: "credit", header: "Credit" },
    { field: "debit", header: "Debit" },
    { field: "balance", header: "Balance" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("supplierLedger_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default - show ALL columns
    return columnOptions;
  });

  // Fetch supplier ledger data
  const fetchSupplierLedger = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await SupplierLedgerService.getSupplierLedger({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
        locationId: selectedLocationId,
      });

      if (response.success) {
        setLedgerEntries(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail: response.message || "Failed to fetch supplier ledger data",
          life: 3000,
        });
      }
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "An error occurred while fetching data",
        life: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, selectedLocationId]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchSupplierLedger();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchSupplierLedger]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("supplierLedgerTableFilters");
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
    date: "",
    description: "",
    credit: "",
    debit: "",
    balance: "",
  };

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    const updatedFilters = {
      ...filters,
      global: { ...filters.global, value },
    };
    setFilters(updatedFilters);
  };

  const fileExportMessage = () => {
    toast.current.show({
      severity: "success",
      detail: "File Exported Successfully",
      life: 3000,
    });
  };

  const exportCSV = () => {
    if (ledgerEntries.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = ledgerEntries.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (["credit", "debit", "balance"].includes(col.field)) {
          formattedRow[col.header] =
            row[col.field] != null
              ? `${Number(row[col.field]).toFixed(2)}`
              : "0.00";
        } else {
          formattedRow[col.header] = row[col.field] ?? "-";
        }
      });
      return formattedRow;
    });

    const csvData = unparse({
      fields: visibleFields.map((col) => col.header),
      data: formattedData.map((row) =>
        visibleFields.map((col) => row[col.header]),
      ),
    });

    const filename = "supplier_ledger.csv";
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    fileExportMessage();
  };

  const exportPdf = async () => {
    if (ledgerEntries.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    try {
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

      const head = [visibleFields.map((col) => col.header)];
      const body = ledgerEntries.map((row) =>
        visibleFields.map((col) => row[col.field] ?? "-"),
      );

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = { top: 30, bottom: 20, left: 30, right: 30 };
      const usableWidth = pageWidth - margin.left - margin.right;
      const colWidth = Math.floor(usableWidth / visibleFields.length);

      const columnStyles = visibleFields.reduce((acc, _col, idx) => {
        acc[idx] = {
          cellWidth: colWidth,
          overflow: "linebreak",
        };
        return acc;
      }, {});

      autoTable(doc, {
        head,
        body,
        startY: 20,
        tableWidth: usableWidth,
        styles: {
          fontSize: 8,
          cellPadding: 4,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: {
          fillColor: [0, 128, 0],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240],
        },
        columnStyles,
        margin,
        theme: "grid",
        didParseCell: (data) => {
          const raw = data.cell?.raw;
          if (typeof raw === "string") {
            const softened = raw.replace(/(\S{30})/g, "$1\u200B");
            if (softened !== raw) data.cell.text = [softened];
          }
        },
      });

      doc.save("supplier_ledger.pdf");
      fileExportMessage();
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to export PDF. Please try again.",
        life: 3000,
      });
    }
  };

  const exportExcel = () => {
    if (ledgerEntries.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = ledgerEntries.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (["credit", "debit", "balance"].includes(col.field)) {
            filteredRow[col.header] =
              row[col.field] != null
                ? `${Number(row[col.field]).toFixed(2)}`
                : "0.00";
          } else {
            filteredRow[col.header] = row[col.field] ?? "-";
          }
        });
        return filteredRow;
      });

      const worksheet = xlsx.utils.json_to_sheet(filteredData);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ["data"] };
      const excelBuffer = xlsx.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      saveAsExcelFile(excelBuffer, "supplier_ledger");
      fileExportMessage();
    });
  };

  const saveAsExcelFile = (buffer, fileName) => {
    import("file-saver").then((module) => {
      if (module && module.default) {
        let EXCEL_TYPE =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
        let EXCEL_EXTENSION = ".xlsx";
        const data = new Blob([buffer], {
          type: EXCEL_TYPE,
        });

        module.default.saveAs(
          data,
          fileName + "_export_" + new Date().getTime() + EXCEL_EXTENSION,
        );
      }
    });
  };

  const onColumnToggle = (event) => {
    let selectedColumns = event.value;

    // Ensure date is always included (mandatory field)
    if (!selectedColumns.some((col) => col.field === "date")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "date"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "supplierLedger_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Supplier Ledger Report
      </h3>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 lg:justify-end">
        <IconField iconPosition="left" className="w-full sm:w-64">
          <InputIcon className="pi pi-search" />
          <InputText
            type="search"
            value={filters.global?.value || ""}
            onChange={onGlobalFilterChange}
            placeholder="Keyword Search"
            className="w-full"
          />
        </IconField>

        <LocationFilter
          onLocationChange={setSelectedLocationId}
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

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <div className="flex gap-1">
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

  // Body templates for columns
  const dateBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{rowData.date || "-"}</span>
    );
  };

  const descriptionBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="90%" height="1.5rem" />
    ) : (
      <span>{rowData.description || "-"}</span>
    );
  };

  const creditBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className={rowData.credit > 0 ? "text-green-600" : ""}>
        ₹{rowData.credit ? Number(rowData.credit).toFixed(2) : "0.00"}
      </span>
    );
  };

  const debitBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className={rowData.debit > 0 ? "text-red-600" : ""}>
        ₹{rowData.debit ? Number(rowData.debit).toFixed(2) : "0.00"}
      </span>
    );
  };

  const balanceBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span
        className={`font-bold ${rowData.balance >= 0 ? "text-blue-600" : "text-red-600"}`}
      >
        ₹{rowData.balance ? Number(rowData.balance).toFixed(2) : "0.00"}
      </span>
    );
  };

  // Calculate totals for footer
  const calculateTotals = () => {
    const totals = ledgerEntries.reduce(
      (acc, row) => {
        acc.credit += row.credit || 0;
        acc.debit += row.debit || 0;
        return acc;
      },
      { credit: 0, debit: 0 },
    );
    const finalBalance = totals.credit - totals.debit;
    return { ...totals, balance: finalBalance };
  };

  const totals = calculateTotals();

  // Create footer column group
  const footerGroup = (
    <ColumnGroup>
      <Row>
        <Column footer="" style={{ minWidth: "5rem" }} />
        {visibleFields.some((col) => col.field === "date") && (
          <Column footer="" style={{ minWidth: "10rem" }} />
        )}
        {visibleFields.some((col) => col.field === "description") && (
          <Column
            footer="Total:"
            footerStyle={{ textAlign: "right", fontWeight: "bold" }}
            style={{ minWidth: "25rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "credit") && (
          <Column
            footer={`₹${totals.credit.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold", color: "#16a34a" }}
            style={{ minWidth: "10rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "debit") && (
          <Column
            footer={`₹${totals.debit.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold", color: "#dc2626" }}
            style={{ minWidth: "10rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "balance") && (
          <Column
            footer={`₹${totals.balance.toFixed(2)}`}
            footerStyle={{
              fontWeight: "bold",
              color: totals.balance >= 0 ? "#2563eb" : "#dc2626",
            }}
            style={{ minWidth: "11rem" }}
          />
        )}
      </Row>
    </ColumnGroup>
  );

  return (
    <Page title="Supplier Ledger">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : ledgerEntries
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage message="No supplier ledger records found" />
                }
                footerColumnGroup={!isLoading ? footerGroup : null}
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "date",
                  "description",
                  "credit",
                  "debit",
                  "balance",
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
                stateKey="supplierLedgerTableFilters"
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
                {visibleFields.some((col) => col.field === "date") && (
                  <Column
                    field="date"
                    header="Date"
                    style={{ minWidth: "10rem" }}
                    body={dateBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Date"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "description") && (
                  <Column
                    field="description"
                    header="Description"
                    style={{ minWidth: "25rem" }}
                    body={descriptionBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Description"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "credit") && (
                  <Column
                    field="credit"
                    header="Credit"
                    style={{ minWidth: "10rem" }}
                    body={creditBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Credit"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "debit") && (
                  <Column
                    field="debit"
                    header="Debit"
                    style={{ minWidth: "10rem" }}
                    body={debitBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Debit"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "balance") && (
                  <Column
                    field="balance"
                    header="Balance"
                    style={{ minWidth: "11rem" }}
                    body={balanceBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Balance"
                    sortable
                  />
                )}
              </DataTable>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
