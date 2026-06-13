import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { CategorySalesSummaryService } from "services/reports/sales/categorySalesSummary";
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
import EmptyMessage from "components/shared/EmptyMessage";
import { LocationFilter } from "components/reports/LocationFilter";

const DEFAULT_FILTERS = {
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  mastercategory: { value: null, matchMode: FilterMatchMode.CONTAINS },
  productcategory: { value: null, matchMode: FilterMatchMode.CONTAINS },
  productsubcategory: { value: null, matchMode: FilterMatchMode.CONTAINS },
  quantity: { value: null, matchMode: FilterMatchMode.CONTAINS },
  no_of_transactions: { value: null, matchMode: FilterMatchMode.CONTAINS },
  no_of_customers: { value: null, matchMode: FilterMatchMode.CONTAINS },
  no_of_products: { value: null, matchMode: FilterMatchMode.CONTAINS },
  avg_sale_price: { value: null, matchMode: FilterMatchMode.CONTAINS },
  netamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  taxableamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  cgst: { value: null, matchMode: FilterMatchMode.CONTAINS },
  sgst: { value: null, matchMode: FilterMatchMode.CONTAINS },
  igst: { value: null, matchMode: FilterMatchMode.CONTAINS },
  pct_of_sales: { value: null, matchMode: FilterMatchMode.CONTAINS },
  return_qty: { value: null, matchMode: FilterMatchMode.CONTAINS },
  return_amount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  net_sales: { value: null, matchMode: FilterMatchMode.CONTAINS },
  discountamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  taxamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  totalamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  grandtotal: { value: null, matchMode: FilterMatchMode.CONTAINS },
};

export default function CategorySalesSummary() {
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
    { field: "mastercategory", header: "Master Category" },
    { field: "productcategory", header: "Product Category" },
    { field: "productsubcategory", header: "Product Sub Category" },
    { field: "no_of_transactions", header: "No. of Transactions" },
    { field: "no_of_customers", header: "No. of Customers" },
    { field: "no_of_products", header: "No. of Products" },
    { field: "quantity", header: "Quantity" },
    { field: "avg_sale_price", header: "Average Sale Price" },
    { field: "totalamount", header: "Total Amount" },
    { field: "discountamount", header: "Discount Amount" },
    { field: "taxableamount", header: "Taxable Amount" },
    { field: "taxamount", header: "Tax Amount" },
    { field: "netamount", header: "Net Amount" },
    { field: "cgst", header: "CGST" },
    { field: "sgst", header: "SGST" },
    { field: "igst", header: "IGST" },
    { field: "grandtotal", header: "Grand Total" },
    { field: "return_qty", header: "Return Qty" },
    { field: "return_amount", header: "Return Amount" },
    { field: "net_sales", header: "Net Sales" },
    { field: "pct_of_sales", header: "% of Total Sales" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("categorySales_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default - show ALL columns
    return columnOptions;
  });

  const fetchCategorySales = useCallback(async () => {
    setIsLoading(true);

    try {
      const response =
        await CategorySalesSummaryService.getCategorySalesSummary({
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
        console.error(
          "Failed to fetch category sales summary:",
          response.error,
        );
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.message ||
            "Failed to load category sales summary data",
          life: 3000,
        });
        setSalesList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error fetching category sales summary data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load category sales summary data",
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
      fetchCategorySales();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchCategorySales]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("categorySalesTableFilters");
    if (sessionState) {
      const parsed = JSON.parse(sessionState);

      // Backward-compatible state migration:
      // keep existing user-applied filters but inject newly added filter keys.
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
        sessionStorage.setItem(
          "categorySalesTableFilters",
          JSON.stringify(parsed),
        );
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

  const countFields = new Set([
    "no_of_transactions",
    "no_of_customers",
    "no_of_products",
  ]);
  const integerFilterFields = new Set([...countFields]);

  const decimalFields = new Set([
    "quantity",
    "avg_sale_price",
    "netamount",
    "taxableamount",
    "cgst",
    "sgst",
    "igst",
    "pct_of_sales",
    "return_qty",
    "return_amount",
    "net_sales",
    "discountamount",
    "taxamount",
    "totalamount",
    "grandtotal",
  ]);

  const currencyFields = new Set([
    "avg_sale_price",
    "netamount",
    "taxableamount",
    "cgst",
    "sgst",
    "igst",
    "return_amount",
    "net_sales",
    "discountamount",
    "taxamount",
    "totalamount",
    "grandtotal",
  ]);
  const profitLossFields = new Set(["net_sales"]);

  const footerSumFields = new Set([
    "quantity",
    "netamount",
    "taxableamount",
    "cgst",
    "sgst",
    "igst",
    "return_qty",
    "return_amount",
    "net_sales",
    "discountamount",
    "taxamount",
    "totalamount",
    "grandtotal",
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

  const textOnlyFilterFields = new Set([
    "mastercategory",
    "productcategory",
    "productsubcategory",
  ]);

  const preventDigitKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^\d$/.test(e.key)) e.preventDefault();
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

    if (textOnlyFilterFields.has(field)) {
      return (
        <InputText
          value={value}
          onKeyDown={preventDigitKeyDown}
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

    const filename = "category_sales_summary.csv";
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
        didParseCell: (data) => {
          const raw = data.cell?.raw;
          if (typeof raw === "string") {
            const softened = raw.replace(/(\S{30})/g, "$1\u200B");
            if (softened !== raw) data.cell.text = [softened];
          }
        },
      });

      doc.save("category_sales_summary.pdf");
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

      saveAsExcelFile(excelBuffer, "category_sales_summary");
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

    // Ensure mastercategory is always included
    if (!selectedColumns.some((col) => col.field === "mastercategory")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "mastercategory"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "categorySales_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Category Sales Summary Report
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
  const masterCategoryBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-indigo-600">
        {rowData.mastercategory || "-"}
      </span>
    );
  };

  const productCategoryBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-purple-600">
        {rowData.productcategory || "-"}
      </span>
    );
  };

  const productSubCategoryBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span>{rowData.productsubcategory || "-"}</span>
    );
  };

  const quantityBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className="font-semibold">{rowData.quantity || 0}</span>
    );
  };

  const metricBodyTemplate = (
    rowData,
    field,
    { currency = false, suffix = "" } = {},
  ) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }

    const numeric = Number(rowData[field]) || 0;
    const formatted = countFields.has(field)
      ? Math.trunc(numeric)
      : Number(numeric).toFixed(2);
    const toneClass = profitLossFields.has(field) ? getProfitLossClass(numeric) : "";

    return (
      <span className={toneClass}>
        {currency ? "₹" : ""}
        {formatted}
        {suffix}
      </span>
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
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className={rowData.discountamount > 0 ? "text-green-600" : ""}>
        ₹
        {rowData.discountamount
          ? Number(rowData.discountamount).toFixed(2)
          : "0.00"}
      </span>
    );
  };

  const taxAmountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>
        ₹{rowData.taxamount ? Number(rowData.taxamount).toFixed(2) : "0.00"}
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
    const totals = salesList.reduce(
      (acc, row) => {
        Object.keys(acc).forEach((key) => {
          acc[key] += Number(row[key]) || 0;
        });
        return acc;
      },
      {
        quantity: 0,
        netamount: 0,
        taxableamount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        return_qty: 0,
        return_amount: 0,
        net_sales: 0,
        totalamount: 0,
        discountamount: 0,
        taxamount: 0,
        grandtotal: 0,
      },
    );
    return totals;
  };

  const totals = calculateTotals();

  const footerGroup = (
    <ColumnGroup>
      <Row>
        <Column footer="Total:" style={{ textAlign: "left", fontWeight: "bold" }} />
        {visibleFields.map((col) => {
          const isSummable = footerSumFields.has(col.field);
          const isCurrency = currencyFields.has(col.field);
          const footerValue = isSummable
            ? `${isCurrency ? "₹" : ""}${Number(totals[col.field] || 0).toFixed(2)}`
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
    <Page title="Category Sales Summary">
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
                    title="No category sales found"
                    subtitle="No category sales match your current filters. Try adjusting your search criteria."
                  />
                }
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "mastercategory",
                  "productcategory",
                  "productsubcategory",
                  "quantity",
                  "no_of_transactions",
                  "no_of_customers",
                  "no_of_products",
                  "avg_sale_price",
                  "netamount",
                  "taxableamount",
                  "cgst",
                  "sgst",
                  "igst",
                  "pct_of_sales",
                  "return_qty",
                  "return_amount",
                  "net_sales",
                  "discountamount",
                  "taxamount",
                  "totalamount",
                  "grandtotal",
                ]}
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
                stateKey="categorySalesTableFilters"
                rows={lazyParams.rows}
                first={lazyParams.first}
                totalRecords={totalRecords}
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50, 100]}
                tableStyle={{ minWidth: "70rem" }}
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
                  let body = null;
                  if (col.field === "mastercategory") body = masterCategoryBodyTemplate;
                  else if (col.field === "productcategory") body = productCategoryBodyTemplate;
                  else if (col.field === "productsubcategory") body = productSubCategoryBodyTemplate;
                  else if (col.field === "quantity") body = quantityBodyTemplate;
                  else if (col.field === "totalamount") body = totalAmountBodyTemplate;
                  else if (col.field === "discountamount") body = discountAmountBodyTemplate;
                  else if (col.field === "taxamount") body = taxAmountBodyTemplate;
                  else if (col.field === "grandtotal") body = grandTotalBodyTemplate;
                  else if (col.field === "pct_of_sales") {
                    body = (rowData) =>
                      metricBodyTemplate(rowData, "pct_of_sales", { suffix: "%" });
                  } else {
                    body = (rowData) =>
                      metricBodyTemplate(rowData, col.field, {
                        currency: currencyFields.has(col.field),
                      });
                  }

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
