import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { DiscountReportService } from "services/reports/sales/discountReport";
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

const currencyFields = [
  "ordertotal",
  "discount",
  "net_amount",
  "taxamount",
  "roundoff",
  "grandtotal",
  "total_sgst",
  "total_cgst",
  "total_igst",
];

const CURRENCY_SYMBOL = "\u20B9";

export default function DiscountReport() {
  const toast = useRef(null);
  const [discountList, setDiscountList] = useState([]);
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
    billno: { value: null, matchMode: FilterMatchMode.CONTAINS },
    customer: { value: null, matchMode: FilterMatchMode.CONTAINS },
    createdby: { value: null, matchMode: FilterMatchMode.CONTAINS },
    date: { value: null, matchMode: FilterMatchMode.CONTAINS },
    phoneno: { value: null, matchMode: FilterMatchMode.CONTAINS },
    ordertotal: { value: null, matchMode: FilterMatchMode.EQUALS },
    discount: { value: null, matchMode: FilterMatchMode.EQUALS },
    discount_type: { value: null, matchMode: FilterMatchMode.CONTAINS },
    discount_percentage: { value: null, matchMode: FilterMatchMode.EQUALS },
    net_amount: { value: null, matchMode: FilterMatchMode.EQUALS },
    total_items: { value: null, matchMode: FilterMatchMode.EQUALS },
    taxamount: { value: null, matchMode: FilterMatchMode.EQUALS },
    total_sgst: { value: null, matchMode: FilterMatchMode.EQUALS },
    total_cgst: { value: null, matchMode: FilterMatchMode.EQUALS },
    total_igst: { value: null, matchMode: FilterMatchMode.EQUALS },
    roundoff: { value: null, matchMode: FilterMatchMode.EQUALS },
    grandtotal: { value: null, matchMode: FilterMatchMode.EQUALS },
    payment_type: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const columnOptions = [
    { field: "billno", header: "Bill No." },
    { field: "customer", header: "Customer" },
    { field: "createdby", header: "Created By" },
    { field: "date", header: "Date" },
    { field: "phoneno", header: "Phone No." },
    { field: "ordertotal", header: "Order Total" },
    { field: "discount", header: "Discount" },
    { field: "discount_type", header: "Discount Type" },
    { field: "discount_percentage", header: "Discount %" },
    { field: "net_amount", header: "Net Amount" },
    { field: "total_items", header: "Total Items" },
    { field: "taxamount", header: "Tax Amount" },
    { field: "total_sgst", header: "SGST" },
    { field: "total_cgst", header: "CGST" },
    { field: "total_igst", header: "IGST" },
    { field: "roundoff", header: "Round Off" },
    { field: "grandtotal", header: "Grand Total" },
    { field: "payment_type", header: "Payment Type" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("discountReport_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default - show ALL columns
    return columnOptions;
  });

  const fetchDiscountReport = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await DiscountReportService.getDiscountReport({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
        locationId: selectedLocationId,
      });

      if (response.success) {
        setDiscountList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        console.error("Failed to fetch discount report:", response.error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.message || "Failed to load discount report data",
          life: 3000,
        });
        setDiscountList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error fetching discount report data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load discount report data",
        life: 3000,
      });
      setDiscountList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, selectedLocationId]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchDiscountReport();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchDiscountReport]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("discountReportTableFilters");
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
    billno: "",
    customer: "",
    createdby: "",
    date: "",
    phoneno: "",
    ordertotal: "",
    discount: "",
    discount_type: "",
    discount_percentage: "",
    net_amount: "",
    total_items: "",
    taxamount: "",
    total_sgst: "",
    total_cgst: "",
    total_igst: "",
    roundoff: "",
    grandtotal: "",
    payment_type: "",
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

  const handleRestrictedFilterChange = (options, nextValue) => {
    options.filterApplyCallback(nextValue);
  };

  const formatDateForFilter = (value) => {
    if (!value) {
      return "";
    }

    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, "0");
    const day = `${value.getDate()}`.padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const numericFilterElement = (placeholder) => {
    const NumericFilterElement = (options) => (
      <InputText
        value={options.value || ""}
        onChange={(e) => handleRestrictedFilterChange(options, e.target.value)}
        keyfilter={/[\d.-]/}
        placeholder={placeholder}
        className="w-full"
      />
    );
    NumericFilterElement.displayName = "NumericFilterElement";
    return NumericFilterElement;
  };

  const textOnlyFilterElement = (placeholder) => {
    const TextOnlyFilterElement = (options) => (
      <InputText
        value={options.value || ""}
        onChange={(e) => handleRestrictedFilterChange(options, e.target.value)}
        keyfilter={/[A-Za-z\s]/}
        placeholder={placeholder}
        className="w-full"
      />
    );
    TextOnlyFilterElement.displayName = "TextOnlyFilterElement";
    return TextOnlyFilterElement;
  };

  const dateFilterElement = () => {
    const DateFilterElement = (options) => (
      <Calendar
        value={options.value ? new Date(options.value) : null}
        onChange={(e) =>
          handleRestrictedFilterChange(
            options,
            formatDateForFilter(e.value),
          )
        }
        dateFormat="yy-mm-dd"
        className="inline-flex w-full min-w-[11rem]"
        readOnlyInput
        showIcon
        iconPos="right"
        icon={() => <i className="pi pi-calendar text-sm" />}
        panelClassName="z-50"
        pt={{
          input: {
            className: "!hidden",
          },
          dropdownButton: {
            className:
              "!h-10 !w-14 !min-w-14 !justify-center !rounded-r-md !rounded-l-none !border !border-l-0 !border-gray-300 !bg-white !text-slate-500 hover:!bg-gray-50 hover:!text-slate-700",
          },
          root: {
            className:
              "flex !w-full !min-w-[11rem] overflow-hidden rounded-md border border-gray-300 bg-white",
          },
        }}
      />
    );
    DateFilterElement.displayName = "DateFilterElement";
    return DateFilterElement;
  };

  const exportCSV = () => {
    if (discountList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = discountList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (currencyFields.includes(col.field)) {
          formattedRow[col.header] =
            row[col.field] != null
              ? `${Number(row[col.field]).toFixed(2)}`
              : "0.00";
        } else if (
          ["discount_percentage", "total_items"].includes(col.field)
        ) {
          formattedRow[col.header] =
            row[col.field] != null ? `${Number(row[col.field]).toFixed(2)}` : "0.00";
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

    const filename = "discount_report.csv";
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
    if (discountList.length === 0) {
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
      const body = discountList.map((row) =>
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

      doc.save("discount_report.pdf");
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
    if (discountList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = discountList.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (currencyFields.includes(col.field)) {
            filteredRow[col.header] =
              row[col.field] != null
                ? `${Number(row[col.field]).toFixed(2)}`
                : "0.00";
          } else if (
            ["discount_percentage", "total_items"].includes(col.field)
          ) {
            filteredRow[col.header] =
              row[col.field] != null ? `${Number(row[col.field]).toFixed(2)}` : "0.00";
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

      saveAsExcelFile(excelBuffer, "discount_report");
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

    // Ensure billno is always included
    if (!selectedColumns.some((col) => col.field === "billno")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "billno"),
      ];
    }
    

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "discountReport_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Discount Report
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
  const billNoBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-purple-600">
        {rowData.billno || "-"}
      </span>
    );
  };

  const customerBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-medium text-gray-700">
        {rowData.customer || "-"}
      </span>
    );
  };

  const createdByBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-medium text-sky-700">
        {rowData.createdby || "-"}
      </span>
    );
  };

  const dateBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span>{rowData.date || "-"}</span>
    );
  };

  const phoneBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{rowData.phoneno || "-"}</span>
    );
  };

  const orderTotalBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-semibold">
        {CURRENCY_SYMBOL}
        {rowData.ordertotal ? Number(rowData.ordertotal).toFixed(2) : "0.00"}
      </span>
    );
  };

  const discountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span
        className={rowData.discount > 0 ? "font-semibold text-green-600" : ""}
      >
        {CURRENCY_SYMBOL}
        {rowData.discount ? Number(rowData.discount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const discountPercentageBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="55%" height="1.5rem" />
    ) : (
      <span className="font-medium text-emerald-700">
        {rowData.discount_percentage != null
          ? `${Number(rowData.discount_percentage).toFixed(2)}%`
          : "0.00%"}
      </span>
    );
  };

  const discountTypeBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
        {rowData.discount_type || "-"}
      </span>
    );
  };

  const netAmountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-medium text-slate-700">
        {CURRENCY_SYMBOL}
        {rowData.net_amount ? Number(rowData.net_amount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const totalItemsBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="50%" height="1.5rem" />
    ) : (
      <span className="font-medium">
        {rowData.total_items != null
          ? Number(rowData.total_items).toFixed(2)
          : "0.00"}
      </span>
    );
  };

  const taxAmountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="text-orange-600">
        {CURRENCY_SYMBOL}
        {rowData.taxamount ? Number(rowData.taxamount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const sgstBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className="text-orange-600">
        {CURRENCY_SYMBOL}
        {rowData.total_sgst ? Number(rowData.total_sgst).toFixed(2) : "0.00"}
      </span>
    );
  };

  const cgstBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className="text-orange-600">
        {CURRENCY_SYMBOL}
        {rowData.total_cgst ? Number(rowData.total_cgst).toFixed(2) : "0.00"}
      </span>
    );
  };

  const igstBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className="text-orange-600">
        {CURRENCY_SYMBOL}
        {rowData.total_igst ? Number(rowData.total_igst).toFixed(2) : "0.00"}
      </span>
    );
  };

  const roundOffBodyTemplate = (rowData) => {
    const isPositive = rowData.roundoff > 0;
    return isLoading ? (
      <Skeleton width="50%" height="1.5rem" />
    ) : (
      <span className={isPositive ? "text-blue-600" : "text-red-600"}>
        {isPositive ? "+" : ""}
        {CURRENCY_SYMBOL}
        {rowData.roundoff ? Number(rowData.roundoff).toFixed(2) : "0.00"}
      </span>
    );
  };

  const grandTotalBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-bold text-blue-600">
        {CURRENCY_SYMBOL}
        {rowData.grandtotal ? Number(rowData.grandtotal).toFixed(2) : "0.00"}
      </span>
    );
  };

  const paymentTypeBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="75%" height="1.5rem" />
    ) : (
      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
        {rowData.payment_type || "-"}
      </span>
    );
  };

  // Calculate totals for footer
  const calculateTotals = () => {
    const totals = discountList.reduce(
      (acc, row) => {
        acc.ordertotal += row.ordertotal || 0;
        acc.discount += row.discount || 0;
        acc.discount_percentage += row.discount_percentage || 0;
        acc.net_amount += row.net_amount || 0;
        acc.total_items += row.total_items || 0;
        acc.taxamount += row.taxamount || 0;
        acc.total_sgst += row.total_sgst || 0;
        acc.total_cgst += row.total_cgst || 0;
        acc.total_igst += row.total_igst || 0;
        acc.roundoff += row.roundoff || 0;
        acc.grandtotal += row.grandtotal || 0;
        return acc;
      },
      {
        ordertotal: 0,
        discount: 0,
        discount_percentage: 0,
        net_amount: 0,
        total_items: 0,
        taxamount: 0,
        total_sgst: 0,
        total_cgst: 0,
        total_igst: 0,
        roundoff: 0,
        grandtotal: 0,
      },
    );
    return totals;
  };

  const totals = calculateTotals();

  return (
    <Page title="Discount Report">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : discountList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No discount records found"
                    subtitle="No discount records match your current filters. Try adjusting your search criteria."
                  />
                }
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "billno",
                  "customer",
                  "createdby",
                  "date",
                  "phoneno",
                  "ordertotal",
                  "discount",
                  "discount_type",
                  "discount_percentage",
                  "net_amount",
                  "total_items",
                  "taxamount",
                  "total_sgst",
                  "total_cgst",
                  "total_igst",
                  "roundoff",
                  "grandtotal",
                  "payment_type",
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
                stateKey="discountReportTableFilters"
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
                        <Column footer="Total:" className="font-bold" />
                        {visibleFields.some(
                          (col) => col.field === "billno",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "customer",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "createdby",
                        ) && <Column footer="" />}
                        {visibleFields.some((col) => col.field === "date") && (
                          <Column footer="" />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "phoneno",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "ordertotal",
                        ) && (
                          <Column
                            footer={`${CURRENCY_SYMBOL}${totals.ordertotal.toFixed(2)}`}
                            className="font-bold"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "discount",
                        ) && (
                          <Column
                            footer={`${CURRENCY_SYMBOL}${totals.discount.toFixed(2)}`}
                            className="font-bold text-green-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "discount_type",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "discount_percentage",
                        ) && (
                          <Column
                            footer={`${totals.discount_percentage.toFixed(2)}%`}
                            className="font-bold text-emerald-700"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "net_amount",
                        ) && (
                          <Column
                            footer={`${CURRENCY_SYMBOL}${totals.net_amount.toFixed(2)}`}
                            className="font-bold text-slate-700"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "total_items",
                        ) && (
                          <Column
                            footer={totals.total_items.toFixed(2)}
                            className="font-bold"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "taxamount",
                        ) && (
                          <Column
                            footer={`${CURRENCY_SYMBOL}${totals.taxamount.toFixed(2)}`}
                            className="font-bold text-orange-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "total_sgst",
                        ) && (
                          <Column
                            footer={`${CURRENCY_SYMBOL}${totals.total_sgst.toFixed(2)}`}
                            className="font-bold text-orange-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "total_cgst",
                        ) && (
                          <Column
                            footer={`${CURRENCY_SYMBOL}${totals.total_cgst.toFixed(2)}`}
                            className="font-bold text-orange-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "total_igst",
                        ) && (
                          <Column
                            footer={`${CURRENCY_SYMBOL}${totals.total_igst.toFixed(2)}`}
                            className="font-bold text-orange-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "roundoff",
                        ) && (
                          <Column
                            footer={`${totals.roundoff >= 0 ? "+" : ""}${CURRENCY_SYMBOL}${totals.roundoff.toFixed(2)}`}
                            className={`font-bold ${totals.roundoff >= 0 ? "text-blue-600" : "text-red-600"}`}
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "grandtotal",
                        ) && (
                          <Column
                            footer={`${CURRENCY_SYMBOL}${totals.grandtotal.toFixed(2)}`}
                            className="font-bold text-blue-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "payment_type",
                        ) && <Column footer="" />}
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
                {visibleFields.some((col) => col.field === "billno") && (
                  <Column
                    field="billno"
                    header="Bill No."
                    style={{ minWidth: "12rem" }}
                    body={billNoBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Bill"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "customer") && (
                  <Column
                    field="customer"
                    header="Customer"
                    style={{ minWidth: "14rem" }}
                    body={customerBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Customer"
                    filterElement={textOnlyFilterElement("Search Customer")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "createdby") && (
                  <Column
                    field="createdby"
                    header="Created By"
                    style={{ minWidth: "12rem" }}
                    body={createdByBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search User"
                    filterElement={textOnlyFilterElement("Search User")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "date") && (
                  <Column
                    field="date"
                    header="Date"
                    style={{ minWidth: "14rem" }}
                    body={dateBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Date"
                    filterElement={dateFilterElement()}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "phoneno") && (
                  <Column
                    field="phoneno"
                    header="Phone No."
                    style={{ minWidth: "11rem" }}
                    body={phoneBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "ordertotal") && (
                  <Column
                    field="ordertotal"
                    header="Order Total"
                    style={{ minWidth: "12rem" }}
                    body={orderTotalBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Total"
                    filterElement={numericFilterElement("Search Total")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "discount") && (
                  <Column
                    field="discount"
                    header="Discount"
                    style={{ minWidth: "10rem" }}
                    body={discountBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Discount"
                    filterElement={numericFilterElement("Search Discount")}
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "discount_type",
                ) && (
                  <Column
                    field="discount_type"
                    header="Discount Type"
                    style={{ minWidth: "12rem" }}
                    body={discountTypeBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Type"
                    filterElement={textOnlyFilterElement("Search Type")}
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "discount_percentage",
                ) && (
                  <Column
                    field="discount_percentage"
                    header="Discount %"
                    style={{ minWidth: "10rem" }}
                    body={discountPercentageBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Discount %"
                    filterElement={numericFilterElement("Search Discount %")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "net_amount") && (
                  <Column
                    field="net_amount"
                    header="Net Amount"
                    style={{ minWidth: "11rem" }}
                    body={netAmountBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Net"
                    filterElement={numericFilterElement("Search Net")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "total_items") && (
                  <Column
                    field="total_items"
                    header="Total Items"
                    style={{ minWidth: "10rem" }}
                    body={totalItemsBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Items"
                    filterElement={numericFilterElement("Search Items")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "taxamount") && (
                  <Column
                    field="taxamount"
                    header="Tax Amount"
                    style={{ minWidth: "11rem" }}
                    body={taxAmountBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Tax"
                    filterElement={numericFilterElement("Search Tax")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "total_sgst") && (
                  <Column
                    field="total_sgst"
                    header="SGST"
                    style={{ minWidth: "10rem" }}
                    body={sgstBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search SGST"
                    filterElement={numericFilterElement("Search SGST")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "total_cgst") && (
                  <Column
                    field="total_cgst"
                    header="CGST"
                    style={{ minWidth: "10rem" }}
                    body={cgstBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search CGST"
                    filterElement={numericFilterElement("Search CGST")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "total_igst") && (
                  <Column
                    field="total_igst"
                    header="IGST"
                    style={{ minWidth: "10rem" }}
                    body={igstBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search IGST"
                    filterElement={numericFilterElement("Search IGST")}
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
                    filterPlaceholder="Search Round"
                    filterElement={numericFilterElement("Search Round")}
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
                    filterPlaceholder="Search Grand"
                    filterElement={numericFilterElement("Search Grand")}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "payment_type") && (
                  <Column
                    field="payment_type"
                    header="Payment Type"
                    style={{ minWidth: "12rem" }}
                    body={paymentTypeBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Payment"
                    filterElement={textOnlyFilterElement("Search Payment")}
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
