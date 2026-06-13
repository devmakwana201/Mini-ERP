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
import { SalesSummaryService } from "services/reports/sales/salesSummary";
import EmptyMessage from "components/shared/EmptyMessage";
import { LocationFilter } from "components/reports/LocationFilter";

export default function SalesSummary() {
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

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    date: { value: null, matchMode: FilterMatchMode.CONTAINS },
    totalbills: { value: null, matchMode: FilterMatchMode.EQUALS },
    products: { value: null, matchMode: FilterMatchMode.EQUALS },
    customers: { value: null, matchMode: FilterMatchMode.EQUALS },
    totalquantity: { value: null, matchMode: FilterMatchMode.EQUALS },
    amount: { value: null, matchMode: FilterMatchMode.EQUALS },
    discount: { value: null, matchMode: FilterMatchMode.EQUALS },
    taxableamount: { value: null, matchMode: FilterMatchMode.EQUALS },
    totaltaxamount: { value: null, matchMode: FilterMatchMode.EQUALS },
    roundoff: { value: null, matchMode: FilterMatchMode.EQUALS },
    grandtotal: { value: null, matchMode: FilterMatchMode.EQUALS },
    avgbillvalue: { value: null, matchMode: FilterMatchMode.EQUALS },
    discountpercent: { value: null, matchMode: FilterMatchMode.EQUALS },
    taxpercent: { value: null, matchMode: FilterMatchMode.EQUALS },
    netsales: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const columnOptions = [
    { field: "date", header: "Date" },
    { field: "totalbills", header: "Total Bills" },
    { field: "products", header: "Products" },
    { field: "customers", header: "Customers" },
    { field: "totalquantity", header: "Total Quantity" },
    { field: "amount", header: "Amount" },
    { field: "discount", header: "Discount" },
    { field: "taxableamount", header: "Taxable Amount" },
    { field: "totaltaxamount", header: "Total Tax Amount" },
    { field: "roundoff", header: "Round Off" },
    { field: "grandtotal", header: "Grand Total" },
    { field: "avgbillvalue", header: "Avg Bill Value" },
    { field: "discountpercent", header: "Discount %" },
    { field: "taxpercent", header: "Tax %" },
    { field: "netsales", header: "Net Sales" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("salesSummary_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default - show ALL columns
    return columnOptions;
  });

  // Fetch sales summary data
  const fetchSalesSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await SalesSummaryService.getSalesSummary({
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
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail: response.message || "Failed to fetch sales summary",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching sales summary:", error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "An error occurred while fetching sales summary",
        life: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, selectedLocationId]);

  // Debounced effect for fetching data
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchSalesSummary();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchSalesSummary]);

  // Restore sort state from sessionStorage
  useEffect(() => {
    const savedState = sessionStorage.getItem("salesSummaryTableFilters");
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        if (parsedState.sortField && parsedState.sortOrder !== undefined) {
          setLazyParams((prev) => ({
            ...prev,
            sortField: parsedState.sortField,
            sortOrder: parsedState.sortOrder,
          }));
        }
      } catch (error) {
        console.error("Error parsing saved state:", error);
      }
    }
  }, []);

  const blankRow = {
    totalbills: "",
    products: "",
    customers: "",
    totalquantity: "",
    amount: "",
    discount: "",
    taxableamount: "",
    totaltaxamount: "",
    roundoff: "",
    grandtotal: "",
    avgbillvalue: "",
    discountpercent: "",
    taxpercent: "",
    netsales: "",
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
        if (
          [
            "amount",
            "discount",
            "taxableamount",
            "totaltaxamount",
            "grandtotal",
            "avgbillvalue",
            "netsales",
          ].includes(col.field)
        ) {
          formattedRow[col.header] =
            row[col.field] != null
              ? `${Number(row[col.field]).toFixed(2)}`
              : "0.00";
        } else if (col.field === "roundoff") {
          formattedRow[col.header] =
            row[col.field] != null ? row[col.field].toString() : "0";
        } else if (["discountpercent", "taxpercent"].includes(col.field)) {
          formattedRow[col.header] =
            row[col.field] != null ? `${Number(row[col.field]).toFixed(2)}%` : "0.00%";
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

    const filename = "sales_summary.csv";
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

      doc.save("sales_summary.pdf");
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
          if (
            [
              "amount",
              "discount",
              "taxableamount",
              "totaltaxamount",
              "grandtotal",
              "avgbillvalue",
              "netsales",
            ].includes(col.field)
          ) {
            filteredRow[col.header] =
              row[col.field] != null
                ? `${Number(row[col.field]).toFixed(2)}`
                : "0.00";
          } else if (col.field === "roundoff") {
            filteredRow[col.header] =
              row[col.field] != null ? row[col.field].toString() : "0";
          } else if (["discountpercent", "taxpercent"].includes(col.field)) {
            filteredRow[col.header] =
              row[col.field] != null ? `${Number(row[col.field]).toFixed(2)}%` : "0.00%";
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

      saveAsExcelFile(excelBuffer, "sales_summary");
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

    // Ensure totalbills is always included (primary identifier)
    if (!selectedColumns.some((col) => col.field === "totalbills")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "totalbills"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "salesSummary_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Sales Summary Report
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
  const totalBillsBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-blue-600">
        {rowData.totalbills || 0}
      </span>
    );
  };

  const productsBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-purple-600">
        {rowData.products || 0}
      </span>
    );
  };

  const customersBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-indigo-600">
        {rowData.customers || 0}
      </span>
    );
  };

  const totalQuantityBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-semibold">
        {rowData.totalquantity ? Number(rowData.totalquantity).toFixed(2) : "0.00"}
      </span>
    );
  };

  const amountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span>
        ₹{rowData.amount ? Number(rowData.amount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const discountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className={rowData.discount > 0 ? "text-green-600" : ""}>
        ₹{rowData.discount ? Number(rowData.discount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const taxableAmountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span>
        ₹
        {rowData.taxableamount
          ? Number(rowData.taxableamount).toFixed(2)
          : "0.00"}
      </span>
    );
  };

  const totalTaxAmountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="text-orange-600">
        ₹
        {rowData.totaltaxamount
          ? Number(rowData.totaltaxamount).toFixed(2)
          : "0.00"}
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
            ? "text-green-600"
            : rowData.roundoff < 0
              ? "text-red-600"
              : ""
        }
      >
        {rowData.roundoff > 0 ? "+" : ""}
        {rowData.roundoff || 0}
      </span>
    );
  };

  const grandTotalBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-bold text-blue-600">
        ₹{rowData.grandtotal ? Number(rowData.grandtotal).toFixed(2) : "0.00"}
      </span>
    );
  };

  const avgBillValueBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-teal-700">
        â‚¹{rowData.avgbillvalue ? Number(rowData.avgbillvalue).toFixed(2) : "0.00"}
      </span>
    );
  };

  const percentBodyTemplate = (field) => {
    const PercentTemplate = (rowData) => {
      return isLoading ? (
        <Skeleton width="70%" height="1.5rem" />
      ) : (
        <span>{rowData[field] ? Number(rowData[field]).toFixed(2) : "0.00"}%</span>
      );
    };
    PercentTemplate.displayName = `PercentTemplate_${field}`;
    return PercentTemplate;
  };

  const netSalesBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-bold text-green-700">
        â‚¹{rowData.netsales ? Number(rowData.netsales).toFixed(2) : "0.00"}
      </span>
    );
  };

  const dateBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-medium">{rowData.date || "-"}</span>
    );
  };

  // Calculate totals for footer
  const calculateTotals = () => {
    const totals = salesList.reduce(
      (acc, row) => {
        acc.totalBills += row.totalbills || 0;
        acc.products += row.products || 0;
        acc.customers += row.customers || 0;
        acc.totalQuantity += row.totalquantity || 0;
        acc.amount += row.amount || 0;
        acc.discount += row.discount || 0;
        acc.taxableAmount += row.taxableamount || 0;
        acc.totalTaxAmount += row.totaltaxamount || 0;
        acc.roundOff += Number(row.roundoff) || 0;
        acc.grandTotal += row.grandtotal || 0;
        acc.netSales += row.netsales || 0;
        return acc;
      },
      {
        totalBills: 0,
        products: 0,
        customers: 0,
        totalQuantity: 0,
        amount: 0,
        discount: 0,
        taxableAmount: 0,
        totalTaxAmount: 0,
        roundOff: 0,
        grandTotal: 0,
        netSales: 0,
      },
    );
    totals.roundOff = Number(totals.roundOff.toFixed(2));
    totals.avgBillValue = totals.totalBills > 0 ? totals.grandTotal / totals.totalBills : 0;
    totals.discountPercent = totals.amount > 0 ? (totals.discount / totals.amount) * 100 : 0;
    totals.taxPercent = totals.taxableAmount > 0 ? (totals.totalTaxAmount / totals.taxableAmount) * 100 : 0;
    return totals;
  };

  const totals = calculateTotals();

  return (
    <Page title="Sales Summary">
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
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "totalbills",
                  "products",
                  "customers",
                  "totalquantity",
                  "amount",
                  "discount",
                  "taxableamount",
                  "totaltaxamount",
                  "roundoff",
                  "grandtotal",
                  "avgbillvalue",
                  "discountpercent",
                  "taxpercent",
                  "netsales",
                ]}
                onFilter={(e) => {
                  setFilters(e.filters);
                  setLazyParams((prev) => ({ ...prev, first: 0 }));
                  setIsLoading(true);
                  scrollToTop();
                }}
                onPage={(e) => {
                  setLazyParams((prev) => ({
                    ...prev,
                    first: e.first,
                    rows: e.rows,
                  }));
                  setIsLoading(true);
                  scrollToTop();
                }}
                onSort={(e) => {
                  setLazyParams((prev) => ({
                    ...prev,
                    sortField: e.sortField,
                    sortOrder: e.sortOrder,
                  }));
                  setIsLoading(true);
                  scrollToTop();
                }}
                emptyMessage={<EmptyMessage />}
                stateStorage="session"
                stateKey="salesSummaryTableFilters"
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
                        {visibleFields.some((col) => col.field === "date") && (
                          <Column footer="" />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "totalbills",
                        ) && (
                          <Column
                            footer={totals.totalBills}
                            className="font-bold text-blue-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "products",
                        ) && (
                          <Column
                            footer={totals.products}
                            className="font-bold text-purple-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "customers",
                        ) && (
                          <Column
                            footer={totals.customers}
                            className="font-bold text-indigo-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "totalquantity",
                        ) && (
                          <Column
                            footer={totals.totalQuantity.toFixed(2)}
                            className="font-bold"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "amount",
                        ) && (
                          <Column
                            footer={`₹${totals.amount.toFixed(2)}`}
                            className="font-bold"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "discount",
                        ) && (
                          <Column
                            footer={`₹${totals.discount.toFixed(2)}`}
                            className="font-bold text-green-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "taxableamount",
                        ) && (
                          <Column
                            footer={`₹${totals.taxableAmount.toFixed(2)}`}
                            className="font-bold"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "totaltaxamount",
                        ) && (
                          <Column
                            footer={`₹${totals.totalTaxAmount.toFixed(2)}`}
                            className="font-bold text-orange-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "roundoff",
                        ) && (
                          <Column
                            footer={`${totals.roundOff > 0 ? "+" : ""}${totals.roundOff.toFixed(2)}`}
                            className={`font-bold ${totals.roundOff >= 0 ? "text-green-600" : "text-red-600"}`}
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "grandtotal",
                        ) && (
                          <Column
                            footer={`₹${totals.grandTotal.toFixed(2)}`}
                            className="font-bold text-blue-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "avgbillvalue",
                        ) && (
                          <Column
                            footer={`â‚¹${totals.avgBillValue.toFixed(2)}`}
                            className="font-bold text-teal-700"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "discountpercent",
                        ) && (
                          <Column
                            footer={`${totals.discountPercent.toFixed(2)}%`}
                            className="font-bold"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "taxpercent",
                        ) && (
                          <Column
                            footer={`${totals.taxPercent.toFixed(2)}%`}
                            className="font-bold"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "netsales",
                        ) && (
                          <Column
                            footer={`â‚¹${totals.netSales.toFixed(2)}`}
                            className="font-bold text-green-700"
                          />
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
                {visibleFields.some((col) => col.field === "totalbills") && (
                  <Column
                    field="totalbills"
                    header="Total Bills"
                    style={{ minWidth: "10rem" }}
                    body={totalBillsBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Bills"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "products") && (
                  <Column
                    field="products"
                    header="Products"
                    style={{ minWidth: "10rem" }}
                    body={productsBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Products"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "customers") && (
                  <Column
                    field="customers"
                    header="Customers"
                    style={{ minWidth: "10rem" }}
                    body={customersBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Customers"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "totalquantity") && (
                  <Column
                    field="totalquantity"
                    header="Total Quantity"
                    style={{ minWidth: "12rem" }}
                    body={totalQuantityBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Quantity"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "amount") && (
                  <Column
                    field="amount"
                    header="Amount"
                    style={{ minWidth: "12rem" }}
                    body={amountBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Amount"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "discount") && (
                  <Column
                    field="discount"
                    header="Discount"
                    style={{ minWidth: "11rem" }}
                    body={discountBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Discount"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "taxableamount") && (
                  <Column
                    field="taxableamount"
                    header="Taxable Amount"
                    style={{ minWidth: "13rem" }}
                    body={taxableAmountBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Tax Amount"
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "totaltaxamount",
                ) && (
                  <Column
                    field="totaltaxamount"
                    header="Total Tax Amount"
                    style={{ minWidth: "14rem" }}
                    body={totalTaxAmountBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Total Tax"
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
                    filterPlaceholder="Search Round Off"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "grandtotal") && (
                  <Column
                    field="grandtotal"
                    header="Grand Total"
                    style={{ minWidth: "13rem" }}
                    body={grandTotalBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Grand Total"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "avgbillvalue") && (
                  <Column
                    field="avgbillvalue"
                    header="Avg Bill Value"
                    style={{ minWidth: "13rem" }}
                    body={avgBillValueBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Avg Bill"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "discountpercent") && (
                  <Column
                    field="discountpercent"
                    header="Discount %"
                    style={{ minWidth: "10rem" }}
                    body={percentBodyTemplate("discountpercent")}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Discount %"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "taxpercent") && (
                  <Column
                    field="taxpercent"
                    header="Tax %"
                    style={{ minWidth: "10rem" }}
                    body={percentBodyTemplate("taxpercent")}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Tax %"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "netsales") && (
                  <Column
                    field="netsales"
                    header="Net Sales"
                    style={{ minWidth: "12rem" }}
                    body={netSalesBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Net Sales"
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
