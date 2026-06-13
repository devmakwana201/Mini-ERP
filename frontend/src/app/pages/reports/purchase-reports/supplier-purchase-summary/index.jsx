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
import { SupplierPurchaseSummaryService } from "services/reports/purchase/supplierPurchaseSummary";
import EmptyMessage from "components/shared/EmptyMessage";
import { LocationFilter } from "components/reports/LocationFilter";

export default function SupplierPurchaseSummary() {
  const toast = useRef(null);
  const [supplierSummary, setSupplierSummary] = useState([]);
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
    suppliername: { value: null, matchMode: FilterMatchMode.CONTAINS },
    totalamount: { value: null, matchMode: FilterMatchMode.EQUALS },
    discountamount: { value: null, matchMode: FilterMatchMode.EQUALS },
    totaltaxableamount: { value: null, matchMode: FilterMatchMode.EQUALS },
    totaltax: { value: null, matchMode: FilterMatchMode.EQUALS },
    roundoff: { value: null, matchMode: FilterMatchMode.EQUALS },
    grandtotal: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const columnOptions = [
    { field: "suppliername", header: "Supplier Name" },
    { field: "totalamount", header: "Total Amount" },
    { field: "discountamount", header: "Discount Amount" },
    { field: "totaltaxableamount", header: "Total Taxable Amount" },
    { field: "totaltax", header: "Total Tax" },
    { field: "roundoff", header: "Round Off" },
    { field: "grandtotal", header: "Grand Total" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem(
      "supplierPurchaseSummary_visibleFields",
    );
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default - show ALL columns
    return columnOptions;
  });

  // Fetch supplier purchase summary data
  const fetchSupplierPurchaseSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const response =
        await SupplierPurchaseSummaryService.getSupplierPurchaseSummary({
          filters,
          start: lazyParams.first,
          length: lazyParams.rows,
          sortField: lazyParams.sortField,
          sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
          locationId: selectedLocationId,
        });

      if (response.success) {
        setSupplierSummary(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail:
            response.message || "Failed to fetch supplier purchase summary",
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
      fetchSupplierPurchaseSummary();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchSupplierPurchaseSummary]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem(
      "supplierPurchaseSummaryTableFilters",
    );
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
    suppliername: "",
    totalamount: "",
    discountamount: "",
    totaltaxableamount: "",
    totaltax: "",
    roundoff: "",
    grandtotal: "",
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
    if (supplierSummary.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = supplierSummary.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (
          [
            "totalamount",
            "discountamount",
            "totaltaxableamount",
            "totaltax",
            "roundoff",
            "grandtotal",
          ].includes(col.field)
        ) {
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

    const filename = "supplier_purchase_summary.csv";
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
    if (supplierSummary.length === 0) {
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
      const body = supplierSummary.map((row) =>
        visibleFields.map((col) => row[col.field] ?? "-"),
      );

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = { top: 30, bottom: 20, left: 30, right: 30 };
      const usableWidth = pageWidth - margin.left - margin.right;
      const colWidth = Math.floor(usableWidth / visibleFields.length);

      const columnStyles = visibleFields.reduce((acc, _col, idx) => {
        acc[idx] = { cellWidth: colWidth, overflow: "linebreak" };
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

      doc.save("supplier_purchase_summary.pdf");
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
    if (supplierSummary.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = supplierSummary.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (
            [
              "totalamount",
              "discountamount",
              "totaltaxableamount",
              "totaltax",
              "roundoff",
              "grandtotal",
            ].includes(col.field)
          ) {
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

      saveAsExcelFile(excelBuffer, "supplier_purchase_summary");
      fileExportMessage();
    });
  };

  const saveAsExcelFile = (buffer, fileName) => {
    import("file-saver").then((module) => {
      if (module && module.default) {
        const EXCEL_TYPE =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
        const EXCEL_EXTENSION = ".xlsx";
        const data = new Blob([buffer], { type: EXCEL_TYPE });

        module.default.saveAs(
          data,
          fileName + "_export_" + new Date().getTime() + EXCEL_EXTENSION,
        );
      }
    });
  };

  const onColumnToggle = (event) => {
    let selectedColumns = event.value;

    // ensure suppliername is always present
    if (!selectedColumns.some((col) => col.field === "suppliername")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "suppliername"),
      ];
    }

    const orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "supplierPurchaseSummary_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Supplier Purchase Summary Report
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
  const supplierNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span>{rowData.suppliername || "-"}</span>
    );
  };

  const totalAmountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>
        ₹{rowData.totalamount ? Number(rowData.totalamount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const discountAmountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className={rowData.discountamount > 0 ? "text-green-600" : ""}>
        ₹
        {rowData.discountamount
          ? Number(rowData.discountamount).toFixed(2)
          : "0.00"}
      </span>
    );
  };

  const totalTaxableAmountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>
        ₹
        {rowData.totaltaxableamount
          ? Number(rowData.totaltaxableamount).toFixed(2)
          : "0.00"}
      </span>
    );
  };

  const totalTaxBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className={rowData.totaltax > 0 ? "text-orange-600" : ""}>
        ₹{rowData.totaltax ? Number(rowData.totaltax).toFixed(2) : "0.00"}
      </span>
    );
  };

  const roundOffBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span
        className={
          rowData.roundoff > 0
            ? "text-blue-600"
            : rowData.roundoff < 0
              ? "text-red-600"
              : ""
        }
      >
        ₹{rowData.roundoff ? Number(rowData.roundoff).toFixed(2) : "0.00"}
      </span>
    );
  };

  const grandTotalBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-bold text-blue-600">
        ₹{rowData.grandtotal ? Number(rowData.grandtotal).toFixed(2) : "0.00"}
      </span>
    );
  };

  // Calculate totals for footer
  const calculateTotals = () => {
    const totals = supplierSummary.reduce(
      (acc, row) => {
        acc.totalamount += row.totalamount || 0;
        acc.discountamount += row.discountamount || 0;
        acc.totaltaxableamount += row.totaltaxableamount || 0;
        acc.totaltax += row.totaltax || 0;
        acc.roundoff += row.roundoff || 0;
        acc.grandtotal += row.grandtotal || 0;
        return acc;
      },
      {
        totalamount: 0,
        discountamount: 0,
        totaltaxableamount: 0,
        totaltax: 0,
        roundoff: 0,
        grandtotal: 0,
      },
    );
    return totals;
  };

  const totals = calculateTotals();

  // Create footer column group
  const footerGroup = (
    <ColumnGroup>
      <Row>
        <Column footer="" style={{ minWidth: "5rem" }} />
        {visibleFields.some((col) => col.field === "suppliername") && (
          <Column
            footer="Total:"
            footerStyle={{ textAlign: "right", fontWeight: "bold" }}
            style={{ minWidth: "18rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "totalamount") && (
          <Column
            footer={`₹${totals.totalamount.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "12rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "discountamount") && (
          <Column
            footer={`₹${totals.discountamount.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold", color: "#16a34a" }}
            style={{ minWidth: "13rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "totaltaxableamount") && (
          <Column
            footer={`₹${totals.totaltaxableamount.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "15rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "totaltax") && (
          <Column
            footer={`₹${totals.totaltax.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold", color: "#ea580c" }}
            style={{ minWidth: "10rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "roundoff") && (
          <Column
            footer={`₹${totals.roundoff.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "9rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "grandtotal") && (
          <Column
            footer={`₹${totals.grandtotal.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold", color: "#2563eb" }}
            style={{ minWidth: "12rem" }}
          />
        )}
      </Row>
    </ColumnGroup>
  );

  return (
    <Page title="Supplier Purchase Summary">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : supplierSummary
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage message="No supplier purchase summary found" />
                }
                footerColumnGroup={!isLoading ? footerGroup : null}
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "suppliername",
                  "totalamount",
                  "discountamount",
                  "totaltaxableamount",
                  "totaltax",
                  "roundoff",
                  "grandtotal",
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
                stateKey="supplierPurchaseSummaryTableFilters"
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

                {visibleFields.some((col) => col.field === "suppliername") && (
                  <Column
                    field="suppliername"
                    header="Supplier Name"
                    style={{ minWidth: "18rem" }}
                    body={supplierNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Supplier"
                    sortable
                  />
                )}

                {visibleFields.some((col) => col.field === "totalamount") && (
                  <Column
                    field="totalamount"
                    header="Total Amount"
                    style={{ minWidth: "12rem" }}
                    body={totalAmountBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Total"
                    sortable
                  />
                )}

                {visibleFields.some(
                  (col) => col.field === "discountamount",
                ) && (
                  <Column
                    field="discountamount"
                    header="Discount Amount"
                    style={{ minWidth: "13rem" }}
                    body={discountAmountBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Discount"
                    sortable
                  />
                )}

                {visibleFields.some(
                  (col) => col.field === "totaltaxableamount",
                ) && (
                  <Column
                    field="totaltaxableamount"
                    header="Total Taxable Amount"
                    style={{ minWidth: "15rem" }}
                    body={totalTaxableAmountBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Taxable"
                    sortable
                  />
                )}

                {visibleFields.some((col) => col.field === "totaltax") && (
                  <Column
                    field="totaltax"
                    header="Total Tax"
                    style={{ minWidth: "10rem" }}
                    body={totalTaxBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Tax"
                    sortable
                  />
                )}

                {visibleFields.some((col) => col.field === "roundoff") && (
                  <Column
                    field="roundoff"
                    header="Round Off"
                    style={{ minWidth: "9rem" }}
                    body={roundOffBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Round Off"
                    sortable
                  />
                )}

                {visibleFields.some((col) => col.field === "grandtotal") && (
                  <Column
                    field="grandtotal"
                    header="Grand Total"
                    style={{ minWidth: "12rem" }}
                    body={grandTotalBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Grand Total"
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
