import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { CustomerSalesSummaryService } from "services/reports/sales/customerSalesSummary";
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
import { Dropdown } from "primereact/dropdown";
import { unparse } from "papaparse";
import { Skeleton } from "primereact/skeleton";
import { FilterMatchMode } from "primereact/api";
import { scrollToTop } from "utils/scrollToTop";
import EmptyMessage from "components/shared/EmptyMessage";
import { LocationFilter } from "components/reports/LocationFilter";

const DEFAULT_FILTERS = {
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  customername: { value: null, matchMode: FilterMatchMode.CONTAINS },
  phonenumber: { value: null, matchMode: FilterMatchMode.CONTAINS },
  customer_type: { value: null, matchMode: FilterMatchMode.CONTAINS },
  gstid: { value: null, matchMode: FilterMatchMode.CONTAINS },
  address_city: { value: null, matchMode: FilterMatchMode.CONTAINS },
  firstvisit: { value: null, matchMode: FilterMatchMode.CONTAINS },
  lastvisit: { value: null, matchMode: FilterMatchMode.CONTAINS },
  total_discount_given: { value: null, matchMode: FilterMatchMode.CONTAINS },
  total_tax_collected: { value: null, matchMode: FilterMatchMode.CONTAINS },
  netamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  average_order_value: { value: null, matchMode: FilterMatchMode.CONTAINS },
  outstanding_amount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  credit_limit: { value: null, matchMode: FilterMatchMode.CONTAINS },
  totalorders: { value: null, matchMode: FilterMatchMode.CONTAINS },
  return_count: { value: null, matchMode: FilterMatchMode.CONTAINS },
  return_amount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  net_sales: { value: null, matchMode: FilterMatchMode.CONTAINS },
  customer_since_days: { value: null, matchMode: FilterMatchMode.CONTAINS },
  preferred_payment_mode: { value: null, matchMode: FilterMatchMode.CONTAINS },
  totalamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
};

export default function CustomerSalesSummary() {
  const toast = useRef(null);
  const [customerList, setCustomerList] = useState([]);
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
    { field: "customername", header: "Customer Name" },
    { field: "phonenumber", header: "Phone Number" },
    { field: "customer_type", header: "Customer Type" },
    { field: "gstid", header: "GST ID" },
    { field: "address_city", header: "Address / City" },
    { field: "preferred_payment_mode", header: "Preferred Payment Mode" },
    { field: "customer_since_days", header: "Customer Since (Days)" },
    { field: "firstvisit", header: "First Visit" },
    { field: "lastvisit", header: "Last Visit" },
    { field: "totalorders", header: "Total Orders" },
    { field: "totalamount", header: "Total Amount" },
    { field: "total_discount_given", header: "Total Discount Given" },
    { field: "total_tax_collected", header: "Total Tax Collected" },
    { field: "netamount", header: "Net Amount" },
    { field: "average_order_value", header: "Average Order Value" },
    { field: "return_count", header: "Return Count" },
    { field: "return_amount", header: "Return Amount" },
    { field: "net_sales", header: "Net Sales" },
    { field: "outstanding_amount", header: "Outstanding Amount" },
    { field: "credit_limit", header: "Credit Limit" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("customerSales_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    return columnOptions;
  });

  const fetchCustomerSales = useCallback(async () => {
    setIsLoading(true);

    try {
      const response =
        await CustomerSalesSummaryService.getCustomerSalesSummary({
          filters,
          start: lazyParams.first,
          length: lazyParams.rows,
          sortField: lazyParams.sortField,
          sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
          locationId: selectedLocationId,
        });

      if (response.success) {
        setCustomerList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.message ||
            "Failed to load customer sales summary data",
          life: 3000,
        });
        setCustomerList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load customer sales summary data",
        life: 3000,
      });
      setCustomerList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, selectedLocationId]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCustomerSales();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchCustomerSales]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("customerSalesTableFilters");
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
        sessionStorage.setItem(
          "customerSalesTableFilters",
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

  const countFields = new Set(["totalorders", "return_count", "customer_since_days"]);
  const integerFilterFields = new Set([
    ...countFields,
    "phonenumber",
  ]);

  const decimalFields = new Set([
    "total_discount_given",
    "total_tax_collected",
    "netamount",
    "average_order_value",
    "outstanding_amount",
    "credit_limit",
    "return_amount",
    "net_sales",
    "totalamount",
  ]);

  const currencyFields = new Set([
    "total_discount_given",
    "total_tax_collected",
    "netamount",
    "average_order_value",
    "outstanding_amount",
    "credit_limit",
    "return_amount",
    "net_sales",
    "totalamount",
  ]);
  const profitLossFields = new Set(["netamount", "net_sales"]);

  const footerSumFields = new Set([
    "total_discount_given",
    "total_tax_collected",
    "netamount",
    "outstanding_amount",
    "credit_limit",
    "totalorders",
    "return_count",
    "return_amount",
    "net_sales",
    "totalamount",
  ]);

  const preferredPaymentModeOptions = [
    ...new Set([
      "Cash",
      "Account",
      "Card Payment",
      "Paytm",
      "Phone Pay",
      "Google Pay",
      "Amazon Pay",
      ...customerList
        .map((row) => row?.preferred_payment_mode)
        .filter((value) => typeof value === "string" && value.trim() !== ""),
    ]),
  ].map((mode) => ({ label: mode, value: mode }));

  const customerTypeOptions = [
    ...new Set(
      customerList
        .map((row) => row?.customer_type)
        .filter((value) => typeof value === "string" && value.trim() !== ""),
    ),
  ].map((type) => ({ label: type, value: type }));

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
    "customername",
    "customer_type",
    "preferred_payment_mode",
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

    if (field === "preferred_payment_mode") {
      return (
        <Dropdown
          value={value || null}
          options={preferredPaymentModeOptions}
          onChange={(e) => applyFilter(e.value ?? null)}
          placeholder={`Select ${header}`}
          className="p-column-filter"
        />
      );
    }

    if (field === "customer_type") {
      return (
        <Dropdown
          value={value || null}
          options={customerTypeOptions}
          onChange={(e) => applyFilter(e.value ?? null)}
          placeholder={`Select ${header}`}
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
    if (customerList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = customerList.map((row) => {
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

    const filename = "customer_sales_summary.csv";
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
    if (customerList.length === 0) {
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
      const body = customerList.map((row) =>
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

      doc.save("customer_sales_summary.pdf");
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
    if (customerList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = customerList.map((row) => {
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

      saveAsExcelFile(excelBuffer, "customer_sales_summary");
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

    if (!selectedColumns.some((col) => col.field === "customername")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "customername"),
      ];
    }

    const orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "customerSales_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Customer Sales Summary Report
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

  const customerNameBodyTemplate = (rowData) =>
    isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-purple-600">
        {rowData.customername || "-"}
      </span>
    );

  const phoneNumberBodyTemplate = (rowData) =>
    isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-medium">{rowData.phonenumber || "-"}</span>
    );

  const firstVisitBodyTemplate = (rowData) =>
    isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span>{rowData.firstvisit || "-"}</span>
    );

  const lastVisitBodyTemplate = (rowData) =>
    isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span>{rowData.lastvisit || "-"}</span>
    );

  const metricBodyTemplate = (
    rowData,
    field,
    { currency = false, suffix = "" } = {},
  ) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }

    if (countFields.has(field)) {
      return <span className="font-semibold">{Math.trunc(Number(rowData[field]) || 0)}</span>;
    }

    if (decimalFields.has(field)) {
      const numeric = Number(rowData[field] || 0);
      const toneClass = profitLossFields.has(field) ? getProfitLossClass(numeric) : "";
      const baseClass = field === "totalamount" ? "font-bold text-green-600" : "";
      const className = `${baseClass} ${toneClass}`.trim();

      return (
        <span className={className}>
          {currency ? "₹" : ""}
          {numeric.toFixed(2)}
          {suffix}
        </span>
      );
    }

    return <span>{rowData[field] || "-"}</span>;
  };

  const calculateTotals = () => {
    const totals = customerList.reduce((acc, row) => {
      Object.keys(acc).forEach((key) => {
        acc[key] += Number(row[key]) || 0;
      });
      return acc;
    }, {
      total_discount_given: 0,
      total_tax_collected: 0,
      netamount: 0,
      outstanding_amount: 0,
      credit_limit: 0,
      totalorders: 0,
      return_count: 0,
      return_amount: 0,
      net_sales: 0,
      totalamount: 0,
    });

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
    <Page title="Customer Sales Summary">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : customerList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No customer sales found"
                    subtitle="No customer sales match your current filters. Try adjusting your search criteria."
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
                stateKey="customerSalesTableFilters"
                rows={lazyParams.rows}
                first={lazyParams.first}
                totalRecords={totalRecords}
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50, 100]}
                tableStyle={{ minWidth: "90rem" }}
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
                  if (col.field === "customername") body = customerNameBodyTemplate;
                  else if (col.field === "phonenumber") body = phoneNumberBodyTemplate;
                  else if (col.field === "firstvisit") body = firstVisitBodyTemplate;
                  else if (col.field === "lastvisit") body = lastVisitBodyTemplate;
                  else {
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
