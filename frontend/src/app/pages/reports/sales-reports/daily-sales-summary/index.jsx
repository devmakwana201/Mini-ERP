import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { DailySalesSummaryService } from "services/reports/sales/dailySalesSummary";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ColumnGroup } from "primereact/columngroup";
import { Row } from "primereact/row";
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
import EmptyMessage from "components/shared/EmptyMessage";
import { LocationFilter } from "components/reports/LocationFilter";

const DEFAULT_FILTERS = {
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  orderdate: { value: null, matchMode: FilterMatchMode.CONTAINS },
  cash: { value: null, matchMode: FilterMatchMode.CONTAINS },
  no_of_orders: { value: null, matchMode: FilterMatchMode.CONTAINS },
  no_of_customers: { value: null, matchMode: FilterMatchMode.CONTAINS },
  upi_online_amount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  card_amount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  credit_amount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  cheque_amount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  discount_amount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  taxable_amount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  tax_amount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  cgst: { value: null, matchMode: FilterMatchMode.CONTAINS },
  sgst: { value: null, matchMode: FilterMatchMode.CONTAINS },
  igst: { value: null, matchMode: FilterMatchMode.CONTAINS },
  round_off: { value: null, matchMode: FilterMatchMode.CONTAINS },
  grand_total: { value: null, matchMode: FilterMatchMode.CONTAINS },
  return_amount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  net_sales: { value: null, matchMode: FilterMatchMode.CONTAINS },
  average_order_value: { value: null, matchMode: FilterMatchMode.CONTAINS },
  additional_charges: { value: null, matchMode: FilterMatchMode.CONTAINS },
  total: { value: null, matchMode: FilterMatchMode.CONTAINS },
};

export default function DailySalesSummary() {
  const toast = useRef(null);
  const [salesList, setSalesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [totalRecords, setTotalRecords] = useState(0);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const columnOptions = [
    { field: "orderdate", header: "Order Date" },
    { field: "no_of_orders", header: "No. of Orders" },
    { field: "no_of_customers", header: "No. of Customers" },
    { field: "cash", header: "Cash" },
    { field: "upi_online_amount", header: "UPI/Online Amount" },
    { field: "card_amount", header: "Card Amount" },
    { field: "credit_amount", header: "Credit Amount" },
    { field: "cheque_amount", header: "Cheque Amount" },
    { field: "discount_amount", header: "Discount Amount" },
    { field: "taxable_amount", header: "Taxable Amount" },
    { field: "tax_amount", header: "Tax Amount" },
    { field: "cgst", header: "CGST" },
    { field: "sgst", header: "SGST" },
    { field: "igst", header: "IGST" },
    { field: "additional_charges", header: "Additional Charges" },
    { field: "round_off", header: "Round Off" },
    { field: "return_amount", header: "Return Amount" },
    { field: "net_sales", header: "Net Sales" },
    { field: "average_order_value", header: "Average Order Value" },
    { field: "total", header: "Total" },
    { field: "grand_total", header: "Grand Total" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("dailySales_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    return columnOptions;
  });

  const fetchDailySales = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await DailySalesSummaryService.getDailySalesSummary({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
        locationId: selectedLocationId,
      });

      if (response.success) {
        setSalesList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.message || "Failed to load daily sales summary data",
          life: 3000,
        });
        setSalesList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load daily sales summary data",
        life: 3000,
      });
      setSalesList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, selectedLocationId]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchDailySales();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchDailySales]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("dailySalesTableFilters");
    if (sessionState) {
      const parsed = JSON.parse(sessionState);

      if (parsed.filters) {
        const mergedFilters = { ...DEFAULT_FILTERS };
        Object.keys(DEFAULT_FILTERS).forEach((key) => {
          const existing = parsed.filters[key];
          if (existing && typeof existing === "object") {
            const normalizedValue =
              existing.value ??
              (Array.isArray(existing.constraints)
                ? existing.constraints.find((item) => item?.value != null)?.value
                : null) ??
              null;
            mergedFilters[key] = {
              ...DEFAULT_FILTERS[key],
              value: normalizedValue,
            };
          }
        });
        setFilters(mergedFilters);
        parsed.filters = mergedFilters;
        sessionStorage.setItem("dailySalesTableFilters", JSON.stringify(parsed));
      }

      if (parsed.sortField !== undefined && parsed.sortOrder !== undefined) {
        setLazyParams((prev) => ({
          ...prev,
          sortField: parsed.sortField,
          sortOrder: parsed.sortOrder,
        }));
      }
    }
  }, []);

  const blankRow = columnOptions.reduce((acc, col) => {
    acc[col.field] = "";
    return acc;
  }, {});

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

  const countFields = new Set(["no_of_orders", "no_of_customers"]);
  const integerFilterFields = new Set([...countFields]);

  const decimalFields = new Set([
    "cash",
    "upi_online_amount",
    "card_amount",
    "credit_amount",
    "cheque_amount",
    "discount_amount",
    "taxable_amount",
    "tax_amount",
    "cgst",
    "sgst",
    "igst",
    "round_off",
    "grand_total",
    "return_amount",
    "net_sales",
    "average_order_value",
    "additional_charges",
    "total",
  ]);

  const currencyFields = new Set([...decimalFields]);
  const profitLossFields = new Set(["net_sales", "round_off"]);
  const footerSumFields = new Set([
    "cash",
    "no_of_orders",
    "no_of_customers",
    "upi_online_amount",
    "card_amount",
    "credit_amount",
    "cheque_amount",
    "discount_amount",
    "taxable_amount",
    "tax_amount",
    "cgst",
    "sgst",
    "igst",
    "round_off",
    "grand_total",
    "return_amount",
    "net_sales",
    "additional_charges",
    "total",
  ]);

  const formatNumericValue = (field, value) => {
    const num = Number(value);
    if (Number.isNaN(num)) {
      return countFields.has(field) ? "0" : "0.00";
    }
    if (countFields.has(field)) {
      return String(Math.trunc(num));
    }
    return num.toFixed(2);
  };

  const getProfitLossClass = (value) => {
    const num = Number(value) || 0;
    if (num < 0) return "text-red-600";
    if (num > 0) return "text-green-600";
    return "";
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

    const parseIsoDate = (dateValue) => {
      if (!dateValue || typeof dateValue !== "string") return null;
      const [year, month, day] = dateValue.split("-").map(Number);
      if (!year || !month || !day) return null;
      return new Date(year, month - 1, day);
    };

    const formatDateForFilter = (dateValue) => {
      if (!(dateValue instanceof Date)) return null;
      const year = dateValue.getFullYear();
      const month = String(dateValue.getMonth() + 1).padStart(2, "0");
      const day = String(dateValue.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    if (field === "orderdate") {
      return (
        <Calendar
          value={parseIsoDate(value)}
          onChange={(e) => applyFilter(e.value ? formatDateForFilter(e.value) : null)}
          dateFormat="dd/mm/yy"
          placeholder={`Select ${header}`}
          showIcon
          readOnlyInput
          className="p-column-filter"
        />
      );
    }

    if (integerFilterFields.has(field)) {
      return (
        <InputText
          value={value}
          keyfilter="int"
          onChange={(e) => applyFilter(e.target.value)}
          placeholder={`Search ${header}`}
          className="p-column-filter"
        />
      );
    }

    if (decimalFields.has(field)) {
      return (
        <InputText
          value={value}
          keyfilter="num"
          onChange={(e) => applyFilter(e.target.value)}
          placeholder={`Search ${header}`}
          className="p-column-filter"
        />
      );
    }

    return (
      <InputText
        value={value}
        onChange={(e) => applyFilter(e.target.value)}
        placeholder={`Search ${header}`}
        className="p-column-filter"
      />
    );
  };

  const exportCSV = () => {
    if (salesList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = salesList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (countFields.has(col.field) || decimalFields.has(col.field)) {
          formattedRow[col.header] = formatNumericValue(col.field, row[col.field]);
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

    const filename = "daily_sales_summary.csv";
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
    if (salesList.length === 0) {
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
      const body = salesList.map((row) =>
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
      });

      doc.save("daily_sales_summary.pdf");
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
    if (salesList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = salesList.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (countFields.has(col.field) || decimalFields.has(col.field)) {
            filteredRow[col.header] = formatNumericValue(col.field, row[col.field]);
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

      saveAsExcelFile(excelBuffer, "daily_sales_summary");
      fileExportMessage();
    });
  };

  const saveAsExcelFile = (buffer, fileName) => {
    import("file-saver").then((module) => {
      if (module && module.default) {
        const EXCEL_TYPE =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
        const EXCEL_EXTENSION = ".xlsx";
        const data = new Blob([buffer], {
          type: EXCEL_TYPE,
        });

        module.default.saveAs(
          data,
          `${fileName}_export_${new Date().getTime()}${EXCEL_EXTENSION}`,
        );
      }
    });
  };

  const onColumnToggle = (event) => {
    let selectedColumns = event.value;

    if (!selectedColumns.some((col) => col.field === "orderdate")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "orderdate"),
      ];
    }

    const orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "dailySales_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Daily Sales Summary Report
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

  const orderDateBodyTemplate = (rowData) =>
    isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-purple-600">
        {(() => {
          const rawDate = rowData.orderdate;
          if (!rawDate) return "-";
          const dateObj = new Date(rawDate);
          if (Number.isNaN(dateObj.getTime())) return rawDate;
          const day = String(dateObj.getDate()).padStart(2, "0");
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const year = dateObj.getFullYear();
          return `${day}/${month}/${year}`;
        })()}
      </span>
    );

  const metricBodyTemplate = (rowData, field) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }

    if (countFields.has(field)) {
      return <span className="font-semibold">{Math.trunc(Number(rowData[field]) || 0)}</span>;
    }

    const numeric = Number(rowData[field] || 0);
    const toneClass = profitLossFields.has(field) ? getProfitLossClass(numeric) : "";
    const baseClass = field === "total" || field === "grand_total" ? "font-bold text-blue-600" : "";
    const className = `${baseClass} ${toneClass}`.trim();

    return (
      <span className={className}>
        {currencyFields.has(field) ? "₹" : ""}
        {numeric.toFixed(2)}
      </span>
    );
  };

  const calculateTotals = () => {
    const totals = {};
    footerSumFields.forEach((field) => {
      totals[field] = 0;
    });

    return salesList.reduce((acc, row) => {
      Object.keys(acc).forEach((field) => {
        acc[field] += Number(row[field]) || 0;
      });
      return acc;
    }, totals);
  };

  const totals = calculateTotals();

  const footerGroup = (
    <ColumnGroup>
      <Row>
        <Column footer="Total:" style={{ textAlign: "left", fontWeight: "bold" }} />
        {visibleFields.map((col) => {
          const isSummable = footerSumFields.has(col.field);
          const isCurrency = currencyFields.has(col.field);
          const isCount = countFields.has(col.field);

          const footerValue = isSummable
            ? `${isCurrency ? "₹" : ""}${
                isCount
                  ? Math.trunc(Number(totals[col.field] || 0))
                  : Number(totals[col.field] || 0).toFixed(2)
              }`
            : "";

          return (
            <Column
              key={`footer_${col.field}`}
              footer={footerValue}
              style={{ textAlign: "left", fontWeight: "bold" }}
            />
          );
        })}
      </Row>
    </ColumnGroup>
  );

  return (
    <Page title="Daily Sales Summary">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : salesList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No daily sales found"
                    subtitle="No daily sales match your current filters. Try adjusting your search criteria."
                  />
                }
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={columnOptions.map((col) => col.field)}
                onFilter={(e) => {
                  setIsLoading(true);
                  setFilters(e.filters);
                  setLazyParams((prev) => ({ ...prev, first: 0 }));
                  scrollToTop();
                }}
                onPage={(e) => {
                  setIsLoading(true);
                  setLazyParams((prev) => ({
                    ...prev,
                    first: e.first,
                    rows: e.rows,
                  }));
                  scrollToTop();
                }}
                onSort={(e) => {
                  setIsLoading(true);
                  setLazyParams((prev) => ({
                    ...prev,
                    sortField: e.sortField,
                    sortOrder: e.sortOrder,
                  }));
                  scrollToTop();
                }}
                stateStorage="session"
                stateKey="dailySalesTableFilters"
                rows={lazyParams.rows}
                first={lazyParams.first}
                totalRecords={totalRecords}
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50, 100]}
                tableStyle={{ minWidth: "95rem" }}
                removableSort
                footerColumnGroup={!isLoading ? footerGroup : null}
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

                {visibleFields.map((col) => {
                  const body =
                    col.field === "orderdate"
                      ? orderDateBodyTemplate
                      : (rowData) => metricBodyTemplate(rowData, col.field);

                  return (
                    <Column
                      key={col.field}
                      field={col.field}
                      header={col.header}
                      style={{ minWidth: "12rem" }}
                      body={body}
                      filter
                      showFilterMenu={false}
                      filterElement={(options) =>
                        renderColumnFilter(options, col.field, col.header)
                      }
                      filterPlaceholder={`Search ${col.header}`}
                      sortable
                    />
                  );
                })}
              </DataTable>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
