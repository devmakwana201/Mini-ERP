import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { MultiSelect } from "primereact/multiselect";
import { Tooltip } from "primereact/tooltip";
import { unparse } from "papaparse";
import { Skeleton } from "primereact/skeleton";
import { FilterMatchMode } from "primereact/api";
import { scrollToTop } from "utils/scrollToTop";
import { PriceDeviationService } from "services/reports/purchase/priceDeviation";
import EmptyMessage from "components/shared/EmptyMessage";
import { LocationFilter } from "components/reports/LocationFilter";

export default function PriceDeviation() {
  const toast = useRef(null);
  const currencySymbol = "\u20B9";
  const [priceDeviation, setPriceDeviation] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [totalRecords, setTotalRecords] = useState(0);

  const defaultFilters = {
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    supplier: { value: null, matchMode: FilterMatchMode.CONTAINS },
    product: { value: null, matchMode: FilterMatchMode.CONTAINS },
    category: { value: null, matchMode: FilterMatchMode.CONTAINS },
    brand: { value: null, matchMode: FilterMatchMode.CONTAINS },
    uom: { value: null, matchMode: FilterMatchMode.CONTAINS },
    hsncode: { value: null, matchMode: FilterMatchMode.CONTAINS },
    minimumprice: { value: null, matchMode: FilterMatchMode.EQUALS },
    maximumprice: { value: null, matchMode: FilterMatchMode.EQUALS },
    averageprice: { value: null, matchMode: FilterMatchMode.EQUALS },
    lastpurchaseprice: { value: null, matchMode: FilterMatchMode.EQUALS },
    deviationpercent: { value: null, matchMode: FilterMatchMode.EQUALS },
    totalquantity: { value: null, matchMode: FilterMatchMode.EQUALS },
    purchasecount: { value: null, matchMode: FilterMatchMode.EQUALS },
    firstpurchasedate: { value: null, matchMode: FilterMatchMode.CONTAINS },
    lastpurchasedate: { value: null, matchMode: FilterMatchMode.CONTAINS },
  };

  const [filters, setFilters] = useState(defaultFilters);

  const columnOptions = [
    { field: "supplier", header: "Supplier" },
    { field: "product", header: "Product" },
    { field: "category", header: "Category" },
    { field: "brand", header: "Brand" },
    { field: "uom", header: "UOM" },
    { field: "averageprice", header: "Average Price" },
    { field: "lastpurchaseprice", header: "Last Purchase Price" },
    { field: "minimumprice", header: "Minimum Price" },
    { field: "maximumprice", header: "Maximum Price" },
    { field: "deviationpercent", header: "Deviation %" },
    { field: "totalquantity", header: "Total Quantity Purchased" },
    { field: "purchasecount", header: "Purchase Count" },
    { field: "firstpurchasedate", header: "First Purchase Date" },
    { field: "lastpurchasedate", header: "Last Purchase Date" },
    { field: "hsncode", header: "HSN Code" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("priceDeviation_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    return columnOptions;
  });

  const fetchPriceDeviation = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await PriceDeviationService.getPriceDeviation({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
        locationId: selectedLocationId,
      });

      if (response.success) {
        setPriceDeviation(Array.isArray(response.data) ? response.data : []);
        setTotalRecords(
          typeof response.totalRecords === "number" ? response.totalRecords : 0,
        );
      } else {
        setPriceDeviation([]);
        setTotalRecords(0);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response?.error?.message || response?.message || "Request failed",
          life: 3000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, selectedLocationId]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchPriceDeviation();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchPriceDeviation]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("priceDeviationTableFilters");
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

  const normalizeFilters = (incoming) => {
    const normalized = { ...defaultFilters };
    Object.keys(defaultFilters).forEach((key) => {
      if (incoming && typeof incoming[key] === "object") {
        normalized[key] = incoming[key];
      }
    });
    return normalized;
  };

  const blankRow = {
    supplier: "",
    product: "",
    category: "",
    brand: "",
    uom: "",
    averageprice: "",
    lastpurchaseprice: "",
    minimumprice: "",
    maximumprice: "",
    deviationpercent: "",
    totalquantity: "",
    purchasecount: "",
    firstpurchasedate: "",
    lastpurchasedate: "",
    hsncode: "",
  };

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      global: { ...prev.global, value },
    }));
  };

  const parseDateFromDDMMYYYY = (value) => {
    if (!value || typeof value !== "string") return null;
    const parts = value.split("/");
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts.map((p) => parseInt(p, 10));
    if (!dd || !mm || !yyyy) return null;
    const date = new Date(yyyy, mm - 1, dd);
    if (Number.isNaN(date.getTime())) return null;
    if (
      date.getFullYear() !== yyyy ||
      date.getMonth() !== mm - 1 ||
      date.getDate() !== dd
    )
      return null;
    return date;
  };

  const formatDateToDDMMYYYY = (date) => {
    if (!date) return null;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const numericFilterTemplate = (options) => (
    <InputText
      value={options.value ?? ""}
      onChange={(e) => options.filterApplyCallback(e.target.value)}
      placeholder="Search"
      className="p-column-filter"
      keyfilter={/^-?\d*\.?\d*$/}
    />
  );

  const dateFilterTemplate = (options) => (
    <Calendar
      value={parseDateFromDDMMYYYY(options.value)}
      onChange={(e) =>
        options.filterApplyCallback(formatDateToDDMMYYYY(e.value))
      }
      dateFormat="dd/mm/yy"
      placeholder="DD/MM/YYYY"
      className="p-column-filter w-full"
      showIcon
      readOnlyInput
      showButtonBar
    />
  );

  const fileExportMessage = () => {
    toast.current.show({
      severity: "success",
      detail: "File Exported Successfully",
      life: 3000,
    });
  };

  const exportCSV = () => {
    if (priceDeviation.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = priceDeviation.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (
          [
            "minimumprice",
            "maximumprice",
            "averageprice",
            "lastpurchaseprice",
          ].includes(col.field)
        ) {
          formattedRow[col.header] =
            row[col.field] != null
              ? `${Number(row[col.field]).toFixed(2)}`
              : "0.00";
        } else if (["deviationpercent"].includes(col.field)) {
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

    const filename = "price_deviation.csv";
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

  const exportExcel = () => {
    if (priceDeviation.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = priceDeviation.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (
            [
              "minimumprice",
              "maximumprice",
              "averageprice",
              "lastpurchaseprice",
            ].includes(col.field)
          ) {
            filteredRow[col.header] =
              row[col.field] != null
                ? `${Number(row[col.field]).toFixed(2)}`
                : "0.00";
          } else if (["deviationpercent"].includes(col.field)) {
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

      saveAsExcelFile(excelBuffer, "price_deviation");
      fileExportMessage();
    });
  };

  const exportPdf = async () => {
    if (priceDeviation.length === 0) {
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
      const body = priceDeviation.map((row) =>
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
          fontSize: 7,
          cellPadding: 3,
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

      doc.save("price_deviation.pdf");
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
    if (!selectedColumns.some((col) => col.field === "supplier")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "supplier"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "priceDeviation_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Price Deviation Report
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

  const emptyMessageTemplate = (
    <div className="flex w-full items-center justify-center py-6">
      <div className="min-h-[240px] w-full">
        <EmptyMessage title="No record found" />
      </div>
    </div>
  );

  const textBody = (value) =>
    isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span>{value || "-"}</span>
    );

  const currencyBody = (value, highlight = "") =>
    isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className={highlight}>
        {currencySymbol}
        {value ? Number(value).toFixed(2) : "0.00"}
      </span>
    );

  const percentBody = (value) =>
    isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span>{value ? Number(value).toFixed(2) : "0.00"}%</span>
    );

  return (
    <Page title="Price Deviation">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : priceDeviation
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={emptyMessageTemplate}
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "supplier",
                  "product",
                  "category",
                  "brand",
                  "uom",
                  "hsncode",
                ]}
                onFilter={(e) => {
                  setFilters(normalizeFilters(e.filters));
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
                stateKey="priceDeviationTableFilters"
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
                {visibleFields.some((col) => col.field === "supplier") && (
                  <Column
                    field="supplier"
                    header="Supplier"
                    style={{ minWidth: "15rem" }}
                    body={(row) => textBody(row.supplier)}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Supplier"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "product") && (
                  <Column
                    field="product"
                    header="Product"
                    style={{ minWidth: "15rem" }}
                    body={(row) => textBody(row.product)}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Product"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "category") && (
                  <Column
                    field="category"
                    header="Category"
                    style={{ minWidth: "12rem" }}
                    body={(row) => textBody(row.category)}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Category"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "brand") && (
                  <Column
                    field="brand"
                    header="Brand"
                    style={{ minWidth: "12rem" }}
                    body={(row) => textBody(row.brand)}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Brand"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "uom") && (
                  <Column
                    field="uom"
                    header="UOM"
                    style={{ minWidth: "8rem" }}
                    body={(row) => textBody(row.uom)}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search UOM"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "averageprice") && (
                  <Column
                    field="averageprice"
                    header="Average Price"
                    style={{ minWidth: "12rem" }}
                    body={(row) => currencyBody(row.averageprice)}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Avg Price"
                    filterElement={numericFilterTemplate}
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "lastpurchaseprice",
                ) && (
                  <Column
                    field="lastpurchaseprice"
                    header="Last Purchase Price"
                    style={{ minWidth: "13rem" }}
                    body={(row) => currencyBody(row.lastpurchaseprice)}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Last Price"
                    filterElement={numericFilterTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "minimumprice") && (
                  <Column
                    field="minimumprice"
                    header="Minimum Price"
                    style={{ minWidth: "12rem" }}
                    body={(row) => currencyBody(row.minimumprice)}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Min Price"
                    filterElement={numericFilterTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "maximumprice") && (
                  <Column
                    field="maximumprice"
                    header="Maximum Price"
                    style={{ minWidth: "12rem" }}
                    body={(row) => currencyBody(row.maximumprice)}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Max Price"
                    filterElement={numericFilterTemplate}
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "deviationpercent",
                ) && (
                  <Column
                    field="deviationpercent"
                    header="Deviation %"
                    style={{ minWidth: "11rem" }}
                    body={(row) => percentBody(row.deviationpercent)}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search %"
                    filterElement={numericFilterTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "totalquantity") && (
                  <Column
                    field="totalquantity"
                    header="Total Quantity Purchased"
                    style={{ minWidth: "14rem" }}
                    body={(row) => textBody(row.totalquantity)}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Quantity"
                    filterElement={numericFilterTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "purchasecount") && (
                  <Column
                    field="purchasecount"
                    header="Purchase Count"
                    style={{ minWidth: "11rem" }}
                    body={(row) => textBody(row.purchasecount)}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Count"
                    filterElement={numericFilterTemplate}
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "firstpurchasedate",
                ) && (
                  <Column
                    field="firstpurchasedate"
                    header="First Purchase Date"
                    style={{ minWidth: "12rem" }}
                    body={(row) => textBody(row.firstpurchasedate)}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search First Date"
                    filterElement={dateFilterTemplate}
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "lastpurchasedate",
                ) && (
                  <Column
                    field="lastpurchasedate"
                    header="Last Purchase Date"
                    style={{ minWidth: "12rem" }}
                    body={(row) => textBody(row.lastpurchasedate)}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Last Date"
                    filterElement={dateFilterTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "hsncode") && (
                  <Column
                    field="hsncode"
                    header="HSN Code"
                    style={{ minWidth: "10rem" }}
                    body={(row) => textBody(row.hsncode)}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search HSN"
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
