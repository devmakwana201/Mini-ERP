import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OrderSummaryService } from "services/reports/sales/orderSummary";
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

export default function OrderSummary() {
  const toast = useRef(null);
  const [orderList, setOrderList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const currencyFields = [
    "amount",
    "due",
    "discount",
    "netamount",
    "taxableamount",
    "taxamount",
    "cgst",
    "sgst",
    "igst",
    "roundoff",
    "grandtotal",
    "paidamount",
    "balanceamount",
  ];

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [totalRecords, setTotalRecords] = useState(0);
  const numericFilterFields = [
    "noofitems",
    "discount",
    "netamount",
    "taxableamount",
    "taxamount",
    "cgst",
    "sgst",
    "igst",
    "roundoff",
    "grandtotal",
    "paidamount",
    "balanceamount",
    "amount",
    "due",
  ];
  const phoneFilterFields = ["phone"];
  const dateFilterFields = ["orderdatetime", "paymentdate"];

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    receipt: { value: null, matchMode: FilterMatchMode.CONTAINS },
    orderdatetime: { value: null, matchMode: FilterMatchMode.CONTAINS },
    guestname: { value: null, matchMode: FilterMatchMode.CONTAINS },
    phone: { value: null, matchMode: FilterMatchMode.CONTAINS },
    noofitems: { value: null, matchMode: FilterMatchMode.CONTAINS },
    discount: { value: null, matchMode: FilterMatchMode.CONTAINS },
    netamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
    taxableamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
    taxamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
    cgst: { value: null, matchMode: FilterMatchMode.CONTAINS },
    sgst: { value: null, matchMode: FilterMatchMode.CONTAINS },
    igst: { value: null, matchMode: FilterMatchMode.CONTAINS },
    roundoff: { value: null, matchMode: FilterMatchMode.CONTAINS },
    grandtotal: { value: null, matchMode: FilterMatchMode.CONTAINS },
    paidamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
    balanceamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
    createdby: { value: null, matchMode: FilterMatchMode.CONTAINS },
    customertype: { value: null, matchMode: FilterMatchMode.EQUALS },
    deliverytype: { value: null, matchMode: FilterMatchMode.EQUALS },
    paymentdate: { value: null, matchMode: FilterMatchMode.CONTAINS },
    amount: { value: null, matchMode: FilterMatchMode.CONTAINS },
    due: { value: null, matchMode: FilterMatchMode.CONTAINS },
    paymode: { value: null, matchMode: FilterMatchMode.EQUALS },
    status: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const columnOptions = [
    { field: "receipt", header: "Receipt" },
    { field: "orderdatetime", header: "Order Date Time" },
    { field: "guestname", header: "Guest Name" },
    { field: "phone", header: "Phone" },
    { field: "noofitems", header: "No. of Items" },
    { field: "discount", header: "Discount" },
    { field: "netamount", header: "Net Amount" },
    { field: "taxableamount", header: "Taxable Amount" },
    { field: "taxamount", header: "Tax Amount" },
    { field: "cgst", header: "CGST" },
    { field: "sgst", header: "SGST" },
    { field: "igst", header: "IGST" },
    { field: "roundoff", header: "Round Off" },
    { field: "grandtotal", header: "Grand Total" },
    { field: "paidamount", header: "Paid Amount" },
    { field: "balanceamount", header: "Balance Amount" },
    { field: "createdby", header: "Created By" },
    { field: "customertype", header: "Customer Type" },
    { field: "deliverytype", header: "Delivery Type" },
    { field: "paymentdate", header: "Payment Date" },
    { field: "amount", header: "Amount" },
    { field: "due", header: "Due" },
    { field: "paymode", header: "Paymode" },
    { field: "status", header: "Status" },
    { field: "print", header: "Print" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("orderSummary_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default - show ALL columns
    return columnOptions;
  });

  const [dropdownOptions, setDropdownOptions] = useState({
    customerTypeOptions: [],
    deliveryTypeOptions: [],
    paymodeOptions: [],
    statusOptions: [],
  });

  const customerTypeOptions = dropdownOptions.customerTypeOptions;
  const deliveryTypeOptions = dropdownOptions.deliveryTypeOptions;
  const paymodeOptions = dropdownOptions.paymodeOptions;
  const statusOptions = dropdownOptions.statusOptions;

  const fetchOrderSummary = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await OrderSummaryService.getOrderSummary({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
        locationId: selectedLocationId,
      });

      if (response.success) {
        setOrderList(response.data);
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
            customerTypeOptions: mergeOptions(
              prev.customerTypeOptions,
              response.data.map((row) => row.customertype),
            ),
            deliveryTypeOptions: mergeOptions(
              prev.deliveryTypeOptions,
              response.data.map((row) => row.deliverytype),
            ),
            paymodeOptions: mergeOptions(
              prev.paymodeOptions,
              response.data.map((row) => row.paymode),
            ),
            statusOptions: mergeOptions(
              prev.statusOptions,
              response.data.map((row) => row.status),
            ),
          };
        });
      } else {
        console.error("Failed to fetch order summary:", response.error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.message || "Failed to load order summary data",
          life: 3000,
        });
        setOrderList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error fetching order summary data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load order summary data",
        life: 3000,
      });
      setOrderList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, selectedLocationId]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchOrderSummary();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchOrderSummary]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("orderSummaryTableFilters");
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
    receipt: "",
    orderdatetime: "",
    guestname: "",
    phone: "",
    noofitems: "",
    discount: "",
    netamount: "",
    taxableamount: "",
    taxamount: "",
    cgst: "",
    sgst: "",
    igst: "",
    roundoff: "",
    grandtotal: "",
    paidamount: "",
    balanceamount: "",
    createdby: "",
    customertype: "",
    deliverytype: "",
    paymentdate: "",
    amount: "",
    due: "",
    paymode: "",
    status: "",
  };

  const onGlobalFilterChange = (e) => {
    const rawValue = e.target.value;
    const value = sanitizeFilterValue("text", rawValue);

    const updatedFilters = {
      ...filters,
      global: { ...filters.global, value },
    };
    setFilters(updatedFilters);
  };

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

    if (type === "date") {
      return stringValue.replace(/[^0-9\s/:APMapm-]/g, "");
    }

    return stringValue.replace(/[^a-zA-Z0-9\s@.,/&()-]/g, "");
  };

  const fileExportMessage = () => {
    toast.current.show({
      severity: "success",
      detail: "File Exported Successfully",
      life: 3000,
    });
  };

  const exportCSV = () => {
    if (orderList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

      const formattedData = orderList.map((row) => {
        const formattedRow = {};
        visibleFields.forEach((col) => {
          if (col.field === "print") return; // Skip Print column in export
          if (currencyFields.includes(col.field) || col.field === "noofitems") {
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

    const exportFields = visibleFields.filter((col) => col.field !== "print");
    const csvData = unparse({
      fields: exportFields.map((col) => col.header),
      data: formattedData.map((row) =>
        exportFields.map((col) => row[col.header]),
      ),
    });

    const filename = "order_summary.csv";
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
    if (orderList.length === 0) {
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

      const exportFields = visibleFields.filter((col) => col.field !== "print");
      const head = [exportFields.map((col) => col.header)];
      const body = orderList.map((row) =>
        exportFields.map((col) => row[col.field] ?? "-"),
      );

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = { top: 30, bottom: 20, left: 30, right: 30 };
      const usableWidth = pageWidth - margin.left - margin.right;
      const colWidth = Math.floor(usableWidth / exportFields.length);

      const columnStyles = exportFields.reduce((acc, _col, idx) => {
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

      doc.save("order_summary.pdf");
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
    if (orderList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = orderList.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (col.field === "print") return; // Skip Print column in export
          if (currencyFields.includes(col.field) || col.field === "noofitems") {
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

      saveAsExcelFile(excelBuffer, "order_summary");
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

    // Ensure receipt is always included
    if (!selectedColumns.some((col) => col.field === "receipt")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "receipt"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "orderSummary_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Order Summary Report
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
                const updatedFilters = {
                  ...filters,
                  global: {
                    ...filters.global,
                    value: `${currentValue}${sanitizedText}`,
                  },
                };
                setFilters(updatedFilters);
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

  const createValidatedFilterElement = (placeholder, type = "text") => {
    function OrderSummaryFilterElement(options) {
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
        date: /^[0-9/:APMapm\-\s]$/,
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

            if (pastedText !== sanitizeFilterValue(type, pastedText)) {
              e.preventDefault();
              options.filterApplyCallback(sanitizeFilterValue(type, pastedText));
            }
          }}
          placeholder={placeholder}
          className="p-column-filter w-full"
        />
      );
    }

    OrderSummaryFilterElement.displayName = `OrderSummaryFilterElement(${placeholder})`;
    return OrderSummaryFilterElement;
  };

  const createDropdownFilterElement = (placeholder, optionsList) => {
    function OrderSummaryDropdownFilterElement(options) {
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

    OrderSummaryDropdownFilterElement.displayName =
      `OrderSummaryDropdownFilterElement(${placeholder})`;
    return OrderSummaryDropdownFilterElement;
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
    function OrderSummaryDateFilterElement(options) {
      const selectedDate = parseDateFilterValue(options.value);

      return (
        <Calendar
          value={selectedDate}
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

    OrderSummaryDateFilterElement.displayName =
      `OrderSummaryDateFilterElement(${placeholder})`;
    return OrderSummaryDateFilterElement;
  };

  // Body templates for columns
  const receiptBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-blue-600">
        {rowData.receipt || "-"}
      </span>
    );
  };

  const orderDateTimeBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="90%" height="1.5rem" />
    ) : (
      <span className="text-sm">{rowData.orderdatetime || "-"}</span>
    );
  };

  const guestNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-fuchsia-600">
        {rowData.guestname || "-"}
      </span>
    );
  };

  const phoneBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-normal tracking-wide text-slate-600">
        {rowData.phone || "-"}
      </span>
    );
  };

  const textBodyTemplate = (field, className = "") => {
    function TextBodyCell(rowData) {
      return isLoading ? (
        <Skeleton width="80%" height="1.5rem" />
      ) : (
        <span className={className}>{rowData[field] || "-"}</span>
      );
    }

    return TextBodyCell;
  };

  const currencyBodyTemplate = (field, className = "font-normal text-slate-600") => {
    function CurrencyBodyCell(rowData) {
      return isLoading ? (
        <Skeleton width="70%" height="1.5rem" />
      ) : (
        <span className={className}>
          ₹{rowData[field] != null ? Number(rowData[field]).toFixed(2) : "0.00"}
        </span>
      );
    }

    return CurrencyBodyCell;
  };

  const roundOffBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }

    const value = Number(rowData.roundoff) || 0;
    const isPositive = value > 0;
    const isNegative = value < 0;

    return (
      <span
        className={`font-normal ${
          isPositive
            ? "text-blue-600"
            : isNegative
              ? "text-red-600"
              : "text-slate-600"
        }`}
      >
        {isPositive ? "+" : ""}
        ₹{value.toFixed(2)}
      </span>
    );
  };

  const numberBodyTemplate = (field) => {
    function NumberBodyCell(rowData) {
      return isLoading ? (
        <Skeleton width="60%" height="1.5rem" />
      ) : (
        <span>{rowData[field] != null ? Number(rowData[field]).toFixed(0) : "0"}</span>
      );
    }

    return NumberBodyCell;
  };

  const amountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-semibold">
        ₹{rowData.amount ? Number(rowData.amount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const dueBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span
        className={
          rowData.due > 0 ? "font-semibold text-red-600" : "text-green-600"
        }
      >
        ₹{rowData.due ? Number(rowData.due).toFixed(2) : "0.00"}
      </span>
    );
  };

  const paymodeBodyTemplate = (rowData) => {
    const paymode = rowData.paymode || "-";
    const normalizedPaymode = String(paymode).toLowerCase();
    let paymodeClass = "text-blue-800 bg-blue-100";

    if (normalizedPaymode.includes("wallet")) {
      paymodeClass = "text-amber-700 bg-amber-100";
    } else if (normalizedPaymode.includes("upi")) {
      paymodeClass = "text-violet-700 bg-violet-100";
    } else if (normalizedPaymode.includes("bank")) {
      paymodeClass = "text-indigo-600 bg-indigo-100";
    } else if (normalizedPaymode.includes("credit")) {
      paymodeClass = "text-red-600 bg-red-100";
    } else if (normalizedPaymode.includes("cash")) {
      paymodeClass = "text-blue-800 bg-blue-100";
    }

    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span
        className={`rounded-full px-2 py-1 text-xs font-medium ${paymodeClass}`}
      >
        {paymode}
      </span>
    );
  };

  const balanceAmountBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }

    const value = Number(rowData.balanceamount) || 0;

    return (
      <span
        className={`font-semibold ${
          value > 0 ? "text-red-600" : value < 0 ? "text-blue-600" : "text-green-600"
        }`}
      >
        ₹{value.toFixed(2)}
      </span>
    );
  };

  const statusBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span
        className={`rounded-full px-2 py-1 text-xs font-medium ${
          rowData.status === "Completed"
            ? "bg-green-100 text-green-800"
            : rowData.status === "Pending"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800"
        }`}
      >
        {rowData.status || "-"}
      </span>
    );
  };

  const printBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="40px" height="1.5rem" />
    ) : (
      <Button
        icon="pi pi-print"
        className="p-button-rounded p-button-text p-button-sm"
        onClick={() => {
          const billIdentifier = rowData.uniquekey || rowData.id;
          const billUrl = new URL(
            `/ebill/${billIdentifier}`,
            window.location.origin,
          );
          billUrl.searchParams.set("download", "pdf");

          window.open(billUrl.toString(), "_blank", "noopener,noreferrer");

          toast.current.show({
            severity: "info",
            summary: "Print",
            detail: `Opening PDF for order ${rowData.receipt}`,
            life: 3000,
          });
        }}
        tooltip="Print Order"
        tooltipOptions={{ position: "top" }}
      />
    );
  };

  // Calculate totals for footer
  const calculateTotals = () => {
    const totals = orderList.reduce(
      (acc, row) => {
        acc.discount += Number(row.discount) || 0;
        acc.netamount += Number(row.netamount) || 0;
        acc.taxableamount += Number(row.taxableamount) || 0;
        acc.taxamount += Number(row.taxamount) || 0;
        acc.cgst += Number(row.cgst) || 0;
        acc.sgst += Number(row.sgst) || 0;
        acc.igst += Number(row.igst) || 0;
        acc.roundoff += Number(row.roundoff) || 0;
        acc.amount += Number(row.amount) || 0;
        acc.due += Number(row.due) || 0;
        acc.grandtotal += Number(row.grandtotal) || 0;
        acc.paidamount += Number(row.paidamount) || 0;
        acc.balanceamount += Number(row.balanceamount) || 0;
        return acc;
      },
      {
        discount: 0,
        netamount: 0,
        taxableamount: 0,
        taxamount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        roundoff: 0,
        amount: 0,
        due: 0,
        grandtotal: 0,
        paidamount: 0,
        balanceamount: 0,
      },
    );
    return totals;
  };

  const totals = calculateTotals();

  return (
    <Page title="Order Summary">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : orderList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No orders found"
                    subtitle="No orders match your current filters. Try adjusting your search criteria."
                  />
                }
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "receipt",
                  "orderdatetime",
                  "guestname",
                  "phone",
                  "noofitems",
                  "discount",
                  "netamount",
                  "taxableamount",
                  "taxamount",
                  "cgst",
                  "sgst",
                  "igst",
                  "roundoff",
                  "grandtotal",
                  "paidamount",
                  "balanceamount",
                  "createdby",
                  "customertype",
                  "deliverytype",
                  "paymentdate",
                  "amount",
                  "due",
                  "paymode",
                  "status",
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
                stateKey="orderSummaryTableFilters"
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
                footerColumnGroup={
                  !isLoading && (
                    <ColumnGroup>
                      <Row>
                        <Column
                          footer={`Total Orders: ${orderList.length}`}
                          className="font-bold"
                        />
                        {visibleFields.some(
                          (col) => col.field === "receipt",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "orderdatetime",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "guestname",
                        ) && <Column footer="" />}
                        {visibleFields.some((col) => col.field === "phone") && (
                          <Column footer="" />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "noofitems",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "discount",
                        ) && (
                          <Column
                            footer={`₹${totals.discount.toFixed(2)}`}
                            className="font-bold text-emerald-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "netamount",
                        ) && (
                          <Column
                            footer={`₹${totals.netamount.toFixed(2)}`}
                            className="font-bold"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "taxableamount",
                        ) && (
                          <Column
                            footer={`₹${totals.taxableamount.toFixed(2)}`}
                            className="font-bold"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "taxamount",
                        ) && (
                          <Column
                            footer={`₹${totals.taxamount.toFixed(2)}`}
                            className="font-bold text-orange-600"
                          />
                        )}
                        {visibleFields.some((col) => col.field === "cgst") && (
                          <Column
                            footer={`₹${totals.cgst.toFixed(2)}`}
                            className="font-bold"
                          />
                        )}
                        {visibleFields.some((col) => col.field === "sgst") && (
                          <Column
                            footer={`₹${totals.sgst.toFixed(2)}`}
                            className="font-bold"
                          />
                        )}
                        {visibleFields.some((col) => col.field === "igst") && (
                          <Column
                            footer={`₹${totals.igst.toFixed(2)}`}
                            className="font-bold"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "roundoff",
                        ) && (
                          <Column
                            footer={`${totals.roundoff > 0 ? "+" : ""}₹${totals.roundoff.toFixed(2)}`}
                            className={`font-bold ${
                              totals.roundoff > 0
                                ? "text-blue-600"
                                : totals.roundoff < 0
                                  ? "text-red-600"
                                  : "text-slate-600"
                            }`}
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "grandtotal",
                        ) && (
                          <Column
                            footer={`₹${totals.grandtotal.toFixed(2)}`}
                            className="font-bold text-blue-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "paidamount",
                        ) && (
                          <Column
                            footer={`₹${totals.paidamount.toFixed(2)}`}
                            className="font-bold"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "balanceamount",
                        ) && (
                          <Column
                            footer={`₹${totals.balanceamount.toFixed(2)}`}
                            className={`font-bold ${
                              totals.balanceamount > 0
                                ? "text-red-600"
                                : totals.balanceamount < 0
                                  ? "text-blue-600"
                                  : "text-green-600"
                            }`}
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "createdby",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "customertype",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "deliverytype",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "paymentdate",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "amount",
                        ) && (
                          <Column
                            footer={`₹${totals.amount.toFixed(2)}`}
                            className="font-bold"
                          />
                        )}
                        {visibleFields.some((col) => col.field === "due") && (
                          <Column
                            footer={`₹${totals.due.toFixed(2)}`}
                            className={`font-bold ${totals.due > 0 ? "text-red-600" : "text-green-600"}`}
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "paymode",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "status",
                        ) && <Column footer="" />}
                        {visibleFields.some((col) => col.field === "print") && (
                          <Column footer="" />
                        )}
                      </Row>
                    </ColumnGroup>
                  )
                }
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
                {visibleFields.some((col) => col.field === "receipt") && (
                  <Column
                    field="receipt"
                    header="Receipt"
                    style={{ minWidth: "12rem" }}
                    body={receiptBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Receipt", "text")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "orderdatetime") && (
                  <Column
                    field="orderdatetime"
                    header="Order Date Time"
                    style={{ minWidth: "14rem" }}
                    body={orderDateTimeBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterElement={createDateFilterElement("Select Order Date")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "guestname") && (
                  <Column
                    field="guestname"
                    header="Guest Name"
                    style={{ minWidth: "12rem" }}
                    body={guestNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Guest", "text")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "phone") && (
                  <Column
                    field="phone"
                    header="Phone"
                    style={{ minWidth: "11rem" }}
                    body={phoneBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Phone", "phone")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "noofitems") && (
                  <Column
                    field="noofitems"
                    header="No. of Items"
                    style={{ minWidth: "10rem" }}
                    body={numberBodyTemplate("noofitems")}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Items", "numeric")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "discount") && (
                  <Column
                    field="discount"
                    header="Discount"
                    style={{ minWidth: "10rem" }}
                    body={currencyBodyTemplate("discount", "font-normal text-emerald-600")}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Discount", "numeric")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "netamount") && (
                  <Column
                    field="netamount"
                    header="Net Amount"
                    style={{ minWidth: "10rem" }}
                    body={currencyBodyTemplate("netamount")}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Net Amount", "numeric")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "taxableamount") && (
                  <Column
                    field="taxableamount"
                    header="Taxable Amount"
                    style={{ minWidth: "11rem" }}
                    body={currencyBodyTemplate("taxableamount")}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Taxable", "numeric")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "taxamount") && (
                  <Column
                    field="taxamount"
                    header="Tax Amount"
                    style={{ minWidth: "10rem" }}
                    body={currencyBodyTemplate("taxamount", "font-normal text-orange-600")}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Tax Amount", "numeric")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "cgst") && (
                  <Column
                    field="cgst"
                    header="CGST"
                    style={{ minWidth: "9rem" }}
                    body={currencyBodyTemplate("cgst")}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search CGST", "numeric")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "sgst") && (
                  <Column
                    field="sgst"
                    header="SGST"
                    style={{ minWidth: "9rem" }}
                    body={currencyBodyTemplate("sgst")}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search SGST", "numeric")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "igst") && (
                  <Column
                    field="igst"
                    header="IGST"
                    style={{ minWidth: "9rem" }}
                    body={currencyBodyTemplate("igst")}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search IGST", "numeric")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "roundoff") && (
                  <Column
                    field="roundoff"
                    header="Round Off"
                    style={{ minWidth: "10rem" }}
                    body={roundOffBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Round Off", "numeric")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "grandtotal") && (
                  <Column
                    field="grandtotal"
                    header="Grand Total"
                    style={{ minWidth: "10rem" }}
                    body={currencyBodyTemplate("grandtotal", "font-semibold text-blue-600")}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Grand Total", "numeric")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "paidamount") && (
                  <Column
                    field="paidamount"
                    header="Paid Amount"
                    style={{ minWidth: "10rem" }}
                    body={currencyBodyTemplate("paidamount")}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Paid Amount", "numeric")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "balanceamount") && (
                  <Column
                    field="balanceamount"
                    header="Balance Amount"
                    style={{ minWidth: "11rem" }}
                    body={balanceAmountBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Balance", "numeric")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "createdby") && (
                  <Column
                    field="createdby"
                    header="Created By"
                    style={{ minWidth: "12rem" }}
                    body={textBodyTemplate("createdby", "font-medium text-red-600")}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Created By", "text")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "customertype") && (
                  <Column
                    field="customertype"
                    header="Customer Type"
                    style={{ minWidth: "11rem" }}
                    body={textBodyTemplate("customertype", "font-medium text-blue-600")}
                    filter
                    showFilterMenu={false}
                    filterElement={createDropdownFilterElement(
                      "Select Customer Type",
                      customerTypeOptions,
                    )}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "deliverytype") && (
                  <Column
                    field="deliverytype"
                    header="Delivery Type"
                    style={{ minWidth: "10rem" }}
                    body={textBodyTemplate("deliverytype", "font-medium text-blue-600")}
                    filter
                    showFilterMenu={false}
                    filterElement={createDropdownFilterElement(
                      "Select Delivery Type",
                      deliveryTypeOptions,
                    )}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "paymentdate") && (
                  <Column
                    field="paymentdate"
                    header="Payment Date"
                    style={{ minWidth: "14rem" }}
                    body={textBodyTemplate("paymentdate", "text-sm")}
                    filter
                    showFilterMenu={false}
                    filterElement={createDateFilterElement("Select Payment Date")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "amount") && (
                  <Column
                    field="amount"
                    header="Amount"
                    style={{ minWidth: "10rem" }}
                    body={amountBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Amount", "numeric")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "due") && (
                  <Column
                    field="due"
                    header="Due"
                    style={{ minWidth: "9rem" }}
                    body={dueBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterElement={createValidatedFilterElement("Search Due", "numeric")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "paymode") && (
                  <Column
                    field="paymode"
                    header="Paymode"
                    style={{ minWidth: "10rem" }}
                    body={paymodeBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterElement={createDropdownFilterElement(
                      "Select Paymode",
                      paymodeOptions,
                    )}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "status") && (
                  <Column
                    field="status"
                    header="Status"
                    style={{ minWidth: "9rem" }}
                    body={statusBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterElement={createDropdownFilterElement(
                      "Select Status",
                      statusOptions,
                    )}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "print") && (
                  <Column
                    field="print"
                    header="Print"
                    style={{ minWidth: "7rem" }}
                    body={printBodyTemplate}
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
