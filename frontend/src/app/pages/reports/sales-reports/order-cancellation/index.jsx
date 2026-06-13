import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ColumnGroup } from "primereact/columngroup";
import { Row } from "primereact/row";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { MultiSelect } from "primereact/multiselect";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Tooltip } from "primereact/tooltip";
import { unparse } from "papaparse";
import { Skeleton } from "primereact/skeleton";
import { FilterMatchMode } from "primereact/api";
import { scrollToTop } from "utils/scrollToTop";
import EmptyMessage from "components/shared/EmptyMessage";
import { LocationFilter } from "components/reports/LocationFilter";
import { OrderCancellationService } from "services/reports/sales/orderCancellation";

const INR = "\u20B9";

const columns = [
  { field: "billno", header: "Bill No", type: "text", tone: "primary" },
  { field: "ordertype", header: "Order Type", type: "text", tone: "info" },
  { field: "orderdate", header: "Order Date", type: "text" },
  {
    field: "cancellationdatetime",
    header: "Cancellation Date & Time",
    type: "text",
  },
  {
    field: "customername",
    header: "Customer Name",
    type: "text",
    tone: "accent",
  },
  { field: "customerphone", header: "Customer Phone", type: "text" },
  {
    field: "cancellationreason",
    header: "Cancellation Reason",
    type: "text",
  },
  { field: "cancelledby", header: "Cancelled By", type: "text", tone: "danger" },
  { field: "approvedby", header: "Approved By", type: "text" },
  { field: "remarks", header: "Remarks", type: "text" },
  { field: "noofitems", header: "No. of Items", type: "number" },
  { field: "ordertotal", header: "Order Total", type: "currency" },
  { field: "discount", header: "Discount", type: "currency", tone: "success" },
  { field: "netamount", header: "Net Amount", type: "currency" },
  { field: "taxableamount", header: "Taxable Amount", type: "currency" },
  { field: "taxamount", header: "Tax Amount", type: "currency", tone: "warning" },
  { field: "cgst", header: "CGST", type: "currency" },
  { field: "sgst", header: "SGST", type: "currency" },
  { field: "igst", header: "IGST", type: "currency" },
  { field: "roundoff", header: "Round Off", type: "currency", tone: "roundoff" },
  { field: "grandtotal", header: "Grand Total", type: "currency", tone: "primary" },
  {
    field: "originalpaymentmode",
    header: "Original Payment Mode",
    type: "text",
  },
  { field: "transaction", header: "Transaction", type: "text" },
  { field: "refundstatus", header: "Refund Status", type: "status" },
  { field: "refundamount", header: "Refund Amount", type: "currency" },
];

const numericFields = columns
  .filter((column) => column.type === "currency" || column.type === "number")
  .map((column) => column.field);

const phoneFields = ["customerphone"];
const dateFields = ["orderdate", "cancellationdatetime"];
const dropdownFields = [
  "ordertype",
  "originalpaymentmode",
  "transaction",
  "refundstatus",
];

const initialFilters = columns.reduce(
  (acc, column) => ({
    ...acc,
    [column.field]: {
      value: null,
      matchMode:
        column.type === "currency" || column.type === "number"
          ? FilterMatchMode.CONTAINS
          : FilterMatchMode.CONTAINS,
    },
  }),
  {
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  },
);

const blankRow = columns.reduce(
  (acc, column) => ({
    ...acc,
    [column.field]: "",
  }),
  {},
);

const toneClassMap = {
  primary: "font-semibold text-blue-600",
  info: "font-medium text-cyan-700",
  accent: "font-semibold text-fuchsia-600",
  danger: "font-medium text-red-600",
  success: "font-medium text-emerald-600",
  warning: "font-medium text-orange-600",
};

const formatCurrency = (value) =>
  `${INR}${Number(value ?? 0).toFixed(2)}`;

const formatNumber = (value) => Number(value ?? 0).toFixed(0);

const getStatusClass = (value) => {
  switch ((value || "").toLowerCase()) {
    case "pending":
      return "font-medium text-orange-600";
    case "refunded":
      return "font-medium text-emerald-600";
    case "not applicable":
      return "font-medium text-slate-500";
    default:
      return "font-medium text-slate-600";
  }
};

export default function OrderCancellation() {
  const toast = useRef(null);
  const [cancellationList, setCancellationList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [dropdownOptions, setDropdownOptions] = useState({
    ordertype: [],
    originalpaymentmode: [],
    transaction: [],
    refundstatus: [],
  });

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [filters, setFilters] = useState(initialFilters);

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("orderCancellation_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columns.filter((column) => fields.includes(column.field));
    }
    return columns;
  });

  const fetchOrderCancellation = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await OrderCancellationService.getOrderCancellation({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
        locationId: selectedLocationId,
      });

      if (response.success) {
        setCancellationList(response.data);
        setTotalRecords(response.totalRecords);
        setDropdownOptions((prev) => {
          const mergeOptions = (previousOptions, nextValues) => {
            const mergedValues = new Set(
              previousOptions.map((option) => option.value),
            );

            nextValues.forEach((value) => {
              if (value && String(value).trim()) {
                mergedValues.add(value);
              }
            });

            return Array.from(mergedValues)
              .sort((a, b) => a.localeCompare(b))
              .map((value) => ({
                label: value,
                value,
              }));
          };

          return {
            ordertype: mergeOptions(
              prev.ordertype,
              response.data.map((row) => row.ordertype),
            ),
            originalpaymentmode: mergeOptions(
              prev.originalpaymentmode,
              response.data.map((row) => row.originalpaymentmode),
            ),
            transaction: mergeOptions(
              prev.transaction,
              response.data.map((row) => row.transaction),
            ),
            refundstatus: mergeOptions(
              prev.refundstatus,
              response.data.map((row) => row.refundstatus),
            ),
          };
        });
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.message ||
            "Failed to load order cancellation report",
          life: 3000,
        });
        setCancellationList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load order cancellation report",
        life: 3000,
      });
      setCancellationList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, selectedLocationId]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchOrderCancellation();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [fetchOrderCancellation]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("orderCancellationTableFilters");
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

  const onGlobalFilterChange = (e) => {
    const value = String(e.target.value || "").replace(
      /[^a-zA-Z0-9\s@.,/&()-]/g,
      "",
    );
    setFilters((prev) => ({
      ...prev,
      global: { ...prev.global, value },
    }));
  };

  const fileExportMessage = () => {
    toast.current.show({
      severity: "success",
      detail: "File Exported Successfully",
      life: 3000,
    });
  };

  const exportFields = useMemo(() => visibleFields, [visibleFields]);

  const sanitizeFilterValue = (type, value) => {
    if (value === null || value === undefined) return value;

    const stringValue = String(value);

    if (type === "phone") {
      return stringValue.replace(/\D/g, "");
    }

    if (type === "numeric") {
      let sanitized = stringValue.replace(/[^0-9.-]/g, "");
      sanitized = sanitized.replace(/(?!^)-/g, "");

      const parts = sanitized.split(".");
      if (parts.length > 2) {
        sanitized = `${parts.shift()}.${parts.join("")}`;
      }

      return sanitized;
    }

    return stringValue.replace(/[^a-zA-Z0-9\s@.,/&()-]/g, "");
  };

  const createValidatedFilterElement = (placeholder, type = "text") => {
    function OrderCancellationFilterElement(options) {
      const allowedKeys = [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ];

      const allowedKeyPatterns = {
        text: /^[a-zA-Z0-9@.,/&()\-\s]$/,
        numeric: /^[0-9.-]$/,
        phone: /^[0-9]$/,
      };

      return (
        <InputText
          value={options.value ?? ""}
          onChange={(e) =>
            options.filterApplyCallback(
              sanitizeFilterValue(type, e.target.value),
            )
          }
          onKeyDown={(e) => {
            if (e.ctrlKey || e.metaKey || allowedKeys.includes(e.key)) {
              return;
            }

            if (!allowedKeyPatterns[type].test(e.key)) {
              e.preventDefault();
            }
          }}
          onPaste={(e) => {
            const pastedText = e.clipboardData.getData("text");
            const sanitizedText = sanitizeFilterValue(type, pastedText);

            if (pastedText !== sanitizedText) {
              e.preventDefault();
              options.filterApplyCallback(sanitizedText);
            }
          }}
          placeholder={placeholder}
          className="p-column-filter w-full"
        />
      );
    }

    OrderCancellationFilterElement.displayName =
      `OrderCancellationFilterElement(${placeholder})`;
    return OrderCancellationFilterElement;
  };

  const createDropdownFilterElement = (placeholder, optionsList) => {
    function OrderCancellationDropdownFilterElement(options) {
      return (
        <Dropdown
          value={options.value ?? null}
          options={optionsList}
          onChange={(e) => options.filterApplyCallback(e.value)}
          placeholder={placeholder}
          className="p-column-filter w-full"
          showClear
        />
      );
    }

    OrderCancellationDropdownFilterElement.displayName =
      `OrderCancellationDropdownFilterElement(${placeholder})`;
    return OrderCancellationDropdownFilterElement;
  };

  const parseDateFilterValue = (value) => {
    if (!value) return null;

    const [day, month, year] = String(value).split("/");
    const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  };

  const formatDateFilterValue = (value) => {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const createDateFilterElement = (placeholder) => {
    function OrderCancellationDateFilterElement(options) {
      return (
        <Calendar
          value={parseDateFilterValue(options.value)}
          onChange={(e) =>
            options.filterApplyCallback(formatDateFilterValue(e.value))
          }
          placeholder={placeholder}
          dateFormat="dd/mm/yy"
          showIcon
          showButtonBar
          className="p-column-filter w-full"
          inputClassName="w-full"
        />
      );
    }

    OrderCancellationDateFilterElement.displayName =
      `OrderCancellationDateFilterElement(${placeholder})`;
    return OrderCancellationDateFilterElement;
  };

  const getExportValue = (row, column) => {
    if (column.type === "currency") {
      return Number(row[column.field] ?? 0).toFixed(2);
    }
    if (column.type === "number") {
      return formatNumber(row[column.field]);
    }
    return row[column.field] || "-";
  };

  const exportCSV = () => {
    if (cancellationList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = cancellationList.map((row) => {
      const formattedRow = {};
      exportFields.forEach((column) => {
        formattedRow[column.header] = getExportValue(row, column);
      });
      return formattedRow;
    });

    const csvData = unparse({
      fields: exportFields.map((column) => column.header),
      data: formattedData.map((row) =>
        exportFields.map((column) => row[column.header]),
      ),
    });

    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "order_cancellation_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    fileExportMessage();
  };

  const exportPdf = async () => {
    if (cancellationList.length === 0) {
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
        format: "A3",
      });

      const head = [exportFields.map((column) => column.header)];
      const body = cancellationList.map((row) =>
        exportFields.map((column) => getExportValue(row, column)),
      );

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = { top: 30, bottom: 20, left: 30, right: 30 };
      const usableWidth = pageWidth - margin.left - margin.right;
      const colWidth = Math.floor(usableWidth / exportFields.length);

      const columnStyles = exportFields.reduce((acc, _column, index) => {
        acc[index] = {
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

      doc.save("order_cancellation_report.pdf");
      fileExportMessage();
    } catch (_error) {
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
      if (module?.default) {
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

  const exportExcel = () => {
    if (cancellationList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = cancellationList.map((row) => {
        const filteredRow = {};
        exportFields.forEach((column) => {
          filteredRow[column.header] = getExportValue(row, column);
        });
        return filteredRow;
      });

      const worksheet = xlsx.utils.json_to_sheet(filteredData);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ["data"] };
      const excelBuffer = xlsx.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      saveAsExcelFile(excelBuffer, "order_cancellation_report");
      fileExportMessage();
    });
  };

  const onColumnToggle = (event) => {
    let selectedColumns = event.value;

    if (!selectedColumns.some((column) => column.field === "billno")) {
      selectedColumns = [
        ...selectedColumns,
        columns.find((column) => column.field === "billno"),
      ];
    }

    const orderedSelectedColumns = columns.filter((column) =>
      selectedColumns.some((selected) => selected.field === column.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "orderCancellation_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((column) => column.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Order Cancellation Report
      </h3>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 lg:justify-end">
        <IconField iconPosition="left" className="w-full sm:w-64">
          <InputIcon className="pi pi-search" />
          <InputText
            type="search"
            value={filters.global?.value || ""}
            onChange={onGlobalFilterChange}
            onKeyDown={(e) => {
              const allowedKeys = [
                "Backspace",
                "Delete",
                "Tab",
                "Escape",
                "Enter",
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "End",
              ];

              if (e.ctrlKey || e.metaKey || allowedKeys.includes(e.key)) {
                return;
              }

              if (!/^[a-zA-Z0-9@.,/&()\-\s]$/.test(e.key)) {
                e.preventDefault();
              }
            }}
            onPaste={(e) => {
              const pastedText = e.clipboardData.getData("text");
              const sanitizedText = sanitizeFilterValue("text", pastedText);

              if (pastedText !== sanitizedText) {
                e.preventDefault();
                const currentValue = filters.global?.value || "";
                setFilters((prev) => ({
                  ...prev,
                  global: {
                    ...prev.global,
                    value: `${currentValue}${sanitizedText}`,
                  },
                }));
              }
            }}
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
          options={columns}
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

  const totals = useMemo(
    () =>
      cancellationList.reduce((acc, row) => {
        numericFields.forEach((field) => {
          acc[field] += Number(row[field] || 0);
        });
        return acc;
      }, numericFields.reduce((acc, field) => ({ ...acc, [field]: 0 }), {})),
    [cancellationList],
  );

  const renderCell = (rowData, column) => {
    if (isLoading) {
      return <Skeleton width="80%" height="1.5rem" />;
    }

    const value = rowData[column.field];

    if (column.type === "currency") {
      if (column.field === "roundoff") {
        const roundOffValue = Number(value || 0);
        const colorClass =
          roundOffValue > 0
            ? "text-blue-600"
            : roundOffValue < 0
              ? "text-red-600"
              : "text-slate-600";

        return (
          <span className={`font-normal ${colorClass}`}>
            {roundOffValue > 0 ? "+" : ""}
            {formatCurrency(roundOffValue)}
          </span>
        );
      }

      return (
        <span className={toneClassMap[column.tone] || "font-normal text-slate-600"}>
          {formatCurrency(value)}
        </span>
      );
    }

    if (column.type === "number") {
      return <span>{formatNumber(value)}</span>;
    }

    if (column.type === "status") {
      return <span className={getStatusClass(value)}>{value || "-"}</span>;
    }

    const className = toneClassMap[column.tone] || "";
    const text = value || "-";

    return (
      <span
        className={className}
        title={text}
      >
        {text}
      </span>
    );
  };

  const renderFooterColumnGroup = () => {
    if (isLoading) {
      return null;
    }

    return (
      <ColumnGroup>
        <Row>
          <Column footer="Total:" className="font-bold" />
          {visibleFields.map((column) => {
            if (column.type === "currency") {
              const total = Number(totals[column.field] || 0);
              const footer =
                column.field === "roundoff"
                  ? `${total > 0 ? "+" : ""}${formatCurrency(total)}`
                  : formatCurrency(total);

              let className = "font-bold";
              if (column.tone === "success") className += " text-emerald-600";
              if (column.tone === "warning") className += " text-orange-600";
              if (column.tone === "primary") className += " text-blue-600";
              if (column.field === "roundoff") {
                className +=
                  total > 0
                    ? " text-blue-600"
                    : total < 0
                      ? " text-red-600"
                      : " text-slate-600";
              }

              return (
                <Column
                  key={column.field}
                  footer={footer}
                  className={className}
                />
              );
            }

            if (column.type === "number") {
              return (
                <Column
                  key={column.field}
                  footer={formatNumber(totals[column.field] || 0)}
                  className="font-bold"
                />
              );
            }

            return <Column key={column.field} footer="" />;
          })}
        </Row>
      </ColumnGroup>
    );
  };

  return (
    <Page title="Order Cancellation">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : cancellationList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={columns.map((column) => column.field)}
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
                stateKey="orderCancellationTableFilters"
                rows={lazyParams.rows}
                first={lazyParams.first}
                totalRecords={totalRecords}
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50, 100]}
                tableStyle={{ minWidth: "120rem" }}
                removableSort
                emptyMessage={
                  !isLoading ? (
                    <EmptyMessage
                      title="No cancelled orders found"
                      subtitle="Try changing filters or date range."
                    />
                  ) : null
                }
                footerColumnGroup={renderFooterColumnGroup()}
              >
                <Column
                  header="Sr No."
                  body={(_rowData, options) =>
                    isLoading ? (
                      <Skeleton width="30%" height="1.5rem" />
                    ) : (
                      lazyParams.first + options.rowIndex + 1
                    )
                  }
                  style={{ minWidth: "5rem" }}
                />

                {visibleFields.map((column) => (
                  <Column
                    key={column.field}
                    field={column.field}
                    header={column.header}
                    style={{
                      minWidth:
                        column.type === "currency"
                          ? "10rem"
                          : column.field === "remarks" ||
                              column.field === "cancellationreason"
                            ? "14rem"
                            : "11rem",
                    }}
                    body={(rowData) => renderCell(rowData, column)}
                    filter
                    showFilterMenu={false}
                    filterElement={
                      dateFields.includes(column.field)
                        ? createDateFilterElement(`Select ${column.header}`)
                        : dropdownFields.includes(column.field)
                          ? createDropdownFilterElement(
                              `Select ${column.header}`,
                              dropdownOptions[column.field] ?? [],
                            )
                        : createValidatedFilterElement(
                            `Search ${column.header}`,
                            numericFields.includes(column.field)
                              ? "numeric"
                              : phoneFields.includes(column.field)
                                ? "phone"
                                : "text",
                          )
                    }
                    sortable
                  />
                ))}
              </DataTable>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
