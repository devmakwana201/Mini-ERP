import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { DailyPurchaseSummaryService } from "services/reports/purchase/dailyPurchaseSummary";
import EmptyMessage from "components/shared/EmptyMessage";
import { LocationFilter } from "components/reports/LocationFilter";

export default function DailyPurchaseSummary() {
  const toast = useRef(null);
  const currencySymbol = "\u20B9";
  const [dailySummary, setDailySummary] = useState([]);
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
    purchaseorderdate: { value: null, matchMode: FilterMatchMode.CONTAINS },
    totalquantity: { value: null, matchMode: FilterMatchMode.EQUALS },
    totalamount: { value: null, matchMode: FilterMatchMode.EQUALS },
    discountamount: { value: null, matchMode: FilterMatchMode.EQUALS },
    totaltaxableamount: { value: null, matchMode: FilterMatchMode.EQUALS },
    totaltax: { value: null, matchMode: FilterMatchMode.EQUALS },
    roundoff: { value: null, matchMode: FilterMatchMode.EQUALS },
    grandtotal: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const columnOptions = [
    { field: "purchaseorderdate", header: "Purchase Order Date" },
    { field: "noofpos", header: "No. of POs" },
    { field: "noofsuppliers", header: "No. of Suppliers" },
    { field: "totalquantity", header: "Total Quantity" },
    { field: "totalamount", header: "Total Amount" },
    { field: "discountamount", header: "Discount Amount" },
    { field: "netamount", header: "Net Amount" },
    { field: "totaltaxableamount", header: "Total Taxable Amount" },
    { field: "cgst", header: "CGST" },
    { field: "sgst", header: "SGST" },
    { field: "igst", header: "IGST" },
    { field: "totaltax", header: "Total Tax" },
    { field: "additionalcharges", header: "Additional Charges" },
    { field: "roundoff", header: "Round Off" },
    { field: "grandtotal", header: "Grand Total" },
    { field: "returnamount", header: "Return Amount" },
    { field: "netpurchase", header: "Net Purchase" },
    { field: "averagepovalue", header: "Average PO Value" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("dailyPurchaseSummary_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default - show ALL columns
    return columnOptions;
  });

  const fetchDailyPurchaseSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const response =
        await DailyPurchaseSummaryService.getDailyPurchaseSummary({
          filters,
          start: lazyParams.first,
          length: lazyParams.rows,
          sortField: lazyParams.sortField,
          sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
          locationId: selectedLocationId,
        });

      if (response.success) {
        const nextData = Array.isArray(response.data) ? response.data : [];
        setDailySummary(nextData);
        setTotalRecords(
          typeof response.totalRecords === "number" ? response.totalRecords : 0,
        );
      } else {
        setDailySummary([]);
        setTotalRecords(0);
        toast.current?.show({
          severity: "error",
          summary: "Validation error",
          detail: response?.error?.message || response?.message || "Invalid input",
          life: 3000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, selectedLocationId]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchDailyPurchaseSummary();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchDailyPurchaseSummary]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem(
      "dailyPurchaseSummaryTableFilters",
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
    purchaseorderdate: "",
    noofpos: "",
    noofsuppliers: "",
    totalquantity: "",
    totalamount: "",
    discountamount: "",
    netamount: "",
    totaltaxableamount: "",
    cgst: "",
    sgst: "",
    igst: "",
    totaltax: "",
    additionalcharges: "",
    roundoff: "",
    grandtotal: "",
    returnamount: "",
    netpurchase: "",
    averagepovalue: "",
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
      onChange={(e) => options.filterApplyCallback(formatDateToDDMMYYYY(e.value))}
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
    if (dailySummary.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = dailySummary.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (
          [
            "totalquantity",
            "totalamount",
            "discountamount",
            "netamount",
            "totaltaxableamount",
            "cgst",
            "sgst",
            "igst",
            "totaltax",
            "additionalcharges",
            "roundoff",
            "grandtotal",
            "returnamount",
            "netpurchase",
            "averagepovalue",
          ].includes(col.field)
        ) {
          formattedRow[col.header] =
            row[col.field] != null
              ? `${Number(row[col.field]).toFixed(2)}`
              : "0.00";
        } else if (["noofpos", "noofsuppliers"].includes(col.field)) {
          formattedRow[col.header] =
            row[col.field] != null ? `${Number(row[col.field]).toFixed(0)}` : "0";
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

    const filename = "daily_purchase_summary.csv";
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
    if (dailySummary.length === 0) {
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
      const body = dailySummary.map((row) =>
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

      doc.save("daily_purchase_summary.pdf");
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
    if (dailySummary.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = dailySummary.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (
            [
              "totalquantity",
              "totalamount",
              "discountamount",
              "netamount",
              "totaltaxableamount",
              "cgst",
              "sgst",
              "igst",
              "totaltax",
              "additionalcharges",
              "roundoff",
              "grandtotal",
              "returnamount",
              "netpurchase",
              "averagepovalue",
            ].includes(col.field)
          ) {
            filteredRow[col.header] =
              row[col.field] != null
                ? `${Number(row[col.field]).toFixed(2)}`
                : "0.00";
          } else if (["noofpos", "noofsuppliers"].includes(col.field)) {
            filteredRow[col.header] =
              row[col.field] != null ? `${Number(row[col.field]).toFixed(0)}` : "0";
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

      saveAsExcelFile(excelBuffer, "daily_purchase_summary");
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

    // Ensure purchaseorderdate is always included (mandatory field)
    if (!selectedColumns.some((col) => col.field === "purchaseorderdate")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "purchaseorderdate"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "dailyPurchaseSummary_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Daily Purchase Summary Report
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
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }
    return <span>{rowData.purchaseorderdate || "-"}</span>;
  };

  const noOfPOsBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="40%" height="1.5rem" />;
    }
    return <span>{rowData.noofpos ?? 0}</span>;
  };

  const noOfSuppliersBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="40%" height="1.5rem" />;
    }
    return <span>{rowData.noofsuppliers ?? 0}</span>;
  };

  const quantityBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="60%" height="1.5rem" />;
    }
    return <span className="font-semibold">{rowData.totalquantity || 0}</span>;
  };

  const totalAmountBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }
    return (
      <span>
        {currencySymbol}{rowData.totalamount ? Number(rowData.totalamount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const discountAmountBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }
    return (
      <span className={rowData.discountamount > 0 ? "text-green-600" : ""}>
        {currencySymbol}
        {rowData.discountamount
          ? Number(rowData.discountamount).toFixed(2)
          : "0.00"}
      </span>
    );
  };

  const netAmountBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }
    return (
      <span>
        {currencySymbol}{rowData.netamount ? Number(rowData.netamount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const totalTaxableAmountBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }
    return (
      <span>
        {currencySymbol}
        {rowData.totaltaxableamount
          ? Number(rowData.totaltaxableamount).toFixed(2)
          : "0.00"}
      </span>
    );
  };

  const cgstBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="60%" height="1.5rem" />;
    }
    return (
      <span>
        {currencySymbol}{rowData.cgst ? Number(rowData.cgst).toFixed(2) : "0.00"}
      </span>
    );
  };

  const sgstBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="60%" height="1.5rem" />;
    }
    return (
      <span>
        {currencySymbol}{rowData.sgst ? Number(rowData.sgst).toFixed(2) : "0.00"}
      </span>
    );
  };

  const igstBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="60%" height="1.5rem" />;
    }
    return (
      <span>
        {currencySymbol}{rowData.igst ? Number(rowData.igst).toFixed(2) : "0.00"}
      </span>
    );
  };

  const totalTaxBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }
    return (
      <span className={rowData.totaltax > 0 ? "text-orange-600" : ""}>
        {currencySymbol}{rowData.totaltax ? Number(rowData.totaltax).toFixed(2) : "0.00"}
      </span>
    );
  };

  const additionalChargesBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }
    return (
      <span>
        {currencySymbol}
        {rowData.additionalcharges
          ? Number(rowData.additionalcharges).toFixed(2)
          : "0.00"}
      </span>
    );
  };

  const roundOffBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="60%" height="1.5rem" />;
    }
    return (
      <span
        className={
          rowData.roundoff > 0
            ? "text-blue-600"
            : rowData.roundoff < 0
              ? "text-red-600"
              : ""
        }
      >
        {currencySymbol}{rowData.roundoff ? Number(rowData.roundoff).toFixed(2) : "0.00"}
      </span>
    );
  };

  const grandTotalBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }
    return (
      <span className="font-bold text-blue-600">
        {currencySymbol}{rowData.grandtotal ? Number(rowData.grandtotal).toFixed(2) : "0.00"}
      </span>
    );
  };

  const returnAmountBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }
    return (
      <span>
        {currencySymbol}
        {rowData.returnamount ? Number(rowData.returnamount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const netPurchaseBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }
    return (
      <span className="font-semibold">
        {currencySymbol}
        {rowData.netpurchase ? Number(rowData.netpurchase).toFixed(2) : "0.00"}
      </span>
    );
  };

  const averagePoValueBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }
    return (
      <span>
        {currencySymbol}
        {rowData.averagepovalue
          ? Number(rowData.averagepovalue).toFixed(2)
          : "0.00"}
      </span>
    );
  };

  // Calculate totals for footer
  const calculateTotals = () => {
    const totals = dailySummary.reduce(
      (acc, row) => {
        acc.noofpos += row.noofpos || 0;
        acc.noofsuppliers += row.noofsuppliers || 0;
        acc.totalquantity += row.totalquantity || 0;
        acc.totalamount += row.totalamount || 0;
        acc.discountamount += row.discountamount || 0;
        acc.netamount += row.netamount || 0;
        acc.totaltaxableamount += row.totaltaxableamount || 0;
        acc.cgst += row.cgst || 0;
        acc.sgst += row.sgst || 0;
        acc.igst += row.igst || 0;
        acc.totaltax += row.totaltax || 0;
        acc.additionalcharges += row.additionalcharges || 0;
        acc.roundoff += row.roundoff || 0;
        acc.grandtotal += row.grandtotal || 0;
        acc.returnamount += row.returnamount || 0;
        acc.netpurchase += row.netpurchase || 0;
        return acc;
      },
      {
        noofpos: 0,
        noofsuppliers: 0,
        totalquantity: 0,
        totalamount: 0,
        discountamount: 0,
        netamount: 0,
        totaltaxableamount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totaltax: 0,
        additionalcharges: 0,
        roundoff: 0,
        grandtotal: 0,
        returnamount: 0,
        netpurchase: 0,
      },
    );
    totals.averagepovalue =
      totals.noofpos > 0 ? totals.grandtotal / totals.noofpos : 0;
    return totals;
  };

  const totals = calculateTotals();

  const emptyMessageTemplate = (
    <div className="flex w-full items-center justify-center py-6">
      <div className="min-h-[240px] w-full">
        <EmptyMessage title="No record found" />
      </div>
    </div>
  );

  // Create footer column group
  const footerGroup = (
    <ColumnGroup>
      <Row>
        <Column footer="" style={{ minWidth: "5rem" }} />
        {visibleFields.some((col) => col.field === "purchaseorderdate") && (
          <Column
            footer="Total:"
            footerStyle={{ textAlign: "right", fontWeight: "bold" }}
            style={{ minWidth: "12rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "noofpos") && (
          <Column
            footer={totals.noofpos.toFixed(0)}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "9rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "noofsuppliers") && (
          <Column
            footer={totals.noofsuppliers.toFixed(0)}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "12rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "totalquantity") && (
          <Column
            footer={totals.totalquantity.toFixed(0)}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "11rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "totalamount") && (
          <Column
            footer={`${currencySymbol}${totals.totalamount.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "12rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "discountamount") && (
          <Column
            footer={`${currencySymbol}${totals.discountamount.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold", color: "#16a34a" }}
            style={{ minWidth: "13rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "netamount") && (
          <Column
            footer={`${currencySymbol}${totals.netamount.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "12rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "totaltaxableamount") && (
          <Column
            footer={`${currencySymbol}${totals.totaltaxableamount.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "15rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "cgst") && (
          <Column
            footer={`${currencySymbol}${totals.cgst.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "9rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "sgst") && (
          <Column
            footer={`${currencySymbol}${totals.sgst.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "9rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "igst") && (
          <Column
            footer={`${currencySymbol}${totals.igst.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "9rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "totaltax") && (
          <Column
            footer={`${currencySymbol}${totals.totaltax.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold", color: "#ea580c" }}
            style={{ minWidth: "10rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "additionalcharges") && (
          <Column
            footer={`${currencySymbol}${totals.additionalcharges.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "13rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "roundoff") && (
          <Column
            footer={`${currencySymbol}${totals.roundoff.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "9rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "grandtotal") && (
          <Column
            footer={`${currencySymbol}${totals.grandtotal.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold", color: "#2563eb" }}
            style={{ minWidth: "12rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "returnamount") && (
          <Column
            footer={`${currencySymbol}${totals.returnamount.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "12rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "netpurchase") && (
          <Column
            footer={`${currencySymbol}${totals.netpurchase.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "12rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "averagepovalue") && (
          <Column
            footer={`${currencySymbol}${totals.averagepovalue.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "13rem" }}
          />
        )}
      </Row>
    </ColumnGroup>
  );
  return (
    <Page title="Daily Purchase Summary">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : dailySummary
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                footerColumnGroup={!isLoading ? footerGroup : null}
                emptyMessage={emptyMessageTemplate}
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "purchaseorderdate",
                  "noofpos",
                  "noofsuppliers",
                  "totalquantity",
                  "totalamount",
                  "discountamount",
                  "netamount",
                  "totaltaxableamount",
                  "cgst",
                  "sgst",
                  "igst",
                  "totaltax",
                  "additionalcharges",
                  "roundoff",
                  "grandtotal",
                  "returnamount",
                  "netpurchase",
                  "averagepovalue",
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
                stateKey="dailyPurchaseSummaryTableFilters"
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
                {visibleFields.some(
                  (col) => col.field === "purchaseorderdate",
                ) && (
                  <Column
                    field="purchaseorderdate"
                    header="Purchase Order Date"
                    style={{ minWidth: "12rem" }}
                    body={dateBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Date"
                    filterElement={dateFilterTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "noofpos") && (
                  <Column
                    field="noofpos"
                    header="No. of POs"
                    style={{ minWidth: "9rem" }}
                    body={noOfPOsBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "noofsuppliers") && (
                  <Column
                    field="noofsuppliers"
                    header="No. of Suppliers"
                    style={{ minWidth: "12rem" }}
                    body={noOfSuppliersBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "totalquantity") && (
                  <Column
                    field="totalquantity"
                    header="Total Quantity"
                    style={{ minWidth: "11rem" }}
                    body={quantityBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Quantity"
                    filterElement={numericFilterTemplate}
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
                    filterElement={numericFilterTemplate}
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
                    filterElement={numericFilterTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "netamount") && (
                  <Column
                    field="netamount"
                    header="Net Amount"
                    style={{ minWidth: "12rem" }}
                    body={netAmountBodyTemplate}
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
                    filterElement={numericFilterTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "cgst") && (
                  <Column
                    field="cgst"
                    header="CGST"
                    style={{ minWidth: "9rem" }}
                    body={cgstBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "sgst") && (
                  <Column
                    field="sgst"
                    header="SGST"
                    style={{ minWidth: "9rem" }}
                    body={sgstBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "igst") && (
                  <Column
                    field="igst"
                    header="IGST"
                    style={{ minWidth: "9rem" }}
                    body={igstBodyTemplate}
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
                    filterElement={numericFilterTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "additionalcharges") && (
                  <Column
                    field="additionalcharges"
                    header="Additional Charges"
                    style={{ minWidth: "13rem" }}
                    body={additionalChargesBodyTemplate}
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
                    filterElement={numericFilterTemplate}
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
                    filterElement={numericFilterTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "returnamount") && (
                  <Column
                    field="returnamount"
                    header="Return Amount"
                    style={{ minWidth: "12rem" }}
                    body={returnAmountBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "netpurchase") && (
                  <Column
                    field="netpurchase"
                    header="Net Purchase"
                    style={{ minWidth: "12rem" }}
                    body={netPurchaseBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "averagepovalue") && (
                  <Column
                    field="averagepovalue"
                    header="Average PO Value"
                    style={{ minWidth: "13rem" }}
                    body={averagePoValueBodyTemplate}
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
