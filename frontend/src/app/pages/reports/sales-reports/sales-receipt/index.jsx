import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { SalesReceiptService } from "services/reports/sales/salesReceipt";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ColumnGroup } from "primereact/columngroup";
import { Row } from "primereact/row";
import { InputText } from "primereact/inputtext";
import { useNavigate } from "react-router-dom";
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

const toINR = (n) => (n != null ? Number(n).toFixed(2) : "0.00");

export default function SalesReceipt() {
  const toast = useRef(null);
  const navigate = useNavigate();
  const [receiptList, setReceiptList] = useState([]);
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
    saleperson: { value: null, matchMode: FilterMatchMode.CONTAINS },
    date: { value: null, matchMode: FilterMatchMode.CONTAINS },
    ordertotal: { value: null, matchMode: FilterMatchMode.EQUALS },
    discount: { value: null, matchMode: FilterMatchMode.EQUALS },
    taxableamount: { value: null, matchMode: FilterMatchMode.EQUALS },
    taxamount: { value: null, matchMode: FilterMatchMode.EQUALS },
    roundoff: { value: null, matchMode: FilterMatchMode.EQUALS },
    grandtotal: { value: null, matchMode: FilterMatchMode.EQUALS },
    transaction: { value: null, matchMode: FilterMatchMode.CONTAINS },
    orderremark: { value: null, matchMode: FilterMatchMode.CONTAINS },
    paymentref: { value: null, matchMode: FilterMatchMode.CONTAINS },
    paymentremark: { value: null, matchMode: FilterMatchMode.CONTAINS },
    reprintremark: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const columnOptions = [
    { field: "billno", header: "Bill No." },
    { field: "customer", header: "Customer" },
    { field: "saleperson", header: "Sale Person" },
    { field: "date", header: "Date" },
    { field: "ordertotal", header: "Order Total" },
    { field: "discount", header: "Discount" },
    { field: "taxableamount", header: "Taxable Amount" },
    { field: "taxamount", header: "Tax Amount" },
    { field: "roundoff", header: "Round off" },
    { field: "grandtotal", header: "Grand Total" },
    { field: "transaction", header: "Transaction" },
    { field: "orderremark", header: "Order Remark" },
    { field: "paymentref", header: "Payment Ref#" },
    { field: "paymentremark", header: "Payment Remark" },
    { field: "reprintremark", header: "Reprint Remark" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("salesReceipt_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default - show ALL columns
    return columnOptions;
  });

  const [expandedRows, setExpandedRows] = useState(null);

  const fetchReceipts = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await SalesReceiptService.getSalesReceipt({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
        locationId: selectedLocationId,
      });

      if (response.success) {
        setReceiptList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        console.error("Failed to fetch sales receipts:", response.error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.message || "Failed to load sales receipt data",
          life: 3000,
        });
        setReceiptList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error fetching sales receipt data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load sales receipt data",
        life: 3000,
      });
      setReceiptList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, selectedLocationId]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchReceipts();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchReceipts]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("salesReceiptTableFilters");
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
    saleperson: "",
    date: "",
    ordertotal: "",
    discount: "",
    taxableamount: "",
    taxamount: "",
    roundoff: "",
    grandtotal: "",
    transaction: "",
    orderremark: "",
    paymentref: "",
    paymentremark: "",
    reprintremark: "",
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
    if (receiptList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = receiptList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (
          [
            "ordertotal",
            "discount",
            "taxableamount",
            "taxamount",
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

    const filename = "sales_receipt.csv";
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
    if (receiptList.length === 0) {
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

      const head = [visibleFields.map((col) => col.header)];
      const body = receiptList.map((row) =>
        visibleFields.map((col) => row[col.field] ?? "-"),
      );

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = { top: 30, bottom: 20, left: 20, right: 20 };
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
          fontSize: 6,
          cellPadding: 2,
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
            const softened = raw.replace(/(\S{20})/g, "$1\u200B");
            if (softened !== raw) data.cell.text = [softened];
          }
        },
      });

      doc.save("sales_receipt.pdf");
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
    if (receiptList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = receiptList.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (
            [
              "ordertotal",
              "discount",
              "taxableamount",
              "taxamount",
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

      saveAsExcelFile(excelBuffer, "sales_receipt");
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
      "salesReceipt_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Sales Receipt Report
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
          scrollHeight="300px"
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
      <span
        className="cursor-pointer font-semibold text-blue-600 transition-colors duration-200 hover:text-blue-800 hover:underline"
        onClick={() => window.open(`/ebill/${rowData.uniquekey}`, "_blank")}
        title="Click to view bill in new tab"
      >
        {rowData.billno || "-"}
      </span>
    );
  };

  const customerBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-medium">{rowData.customer || "-"}</span>
    );
  };

  const salePersonBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
        {rowData.saleperson || "-"}
      </span>
    );
  };

  const orderTotalBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-semibold">
        ₹{rowData.ordertotal ? Number(rowData.ordertotal).toFixed(2) : "0.00"}
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
        ₹{rowData.discount ? Number(rowData.discount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const taxableAmountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>
        ₹
        {rowData.taxableamount
          ? Number(rowData.taxableamount).toFixed(2)
          : "0.00"}
      </span>
    );
  };

  const taxAmountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="text-orange-600">
        ₹{rowData.taxamount ? Number(rowData.taxamount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const roundOffBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span
        className={rowData.roundoff >= 0 ? "text-green-600" : "text-red-600"}
      >
        ₹{rowData.roundoff ? Number(rowData.roundoff).toFixed(2) : "0.00"}
      </span>
    );
  };

  const grandTotalBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-bold text-green-600">
        ₹{rowData.grandtotal ? Number(rowData.grandtotal).toFixed(2) : "0.00"}
      </span>
    );
  };

  const transactionBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
        {rowData.transaction || "-"}
      </span>
    );
  };

  const orderRemarkBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="90%" height="1.5rem" />
    ) : (
      <span className="text-sm text-gray-700" title={rowData.orderremark}>
        {rowData.orderremark
          ? rowData.orderremark.length > 25
            ? `${rowData.orderremark.substring(0, 25)}...`
            : rowData.orderremark
          : "-"}
      </span>
    );
  };

  const paymentRefBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-mono text-sm">{rowData.paymentref || "-"}</span>
    );
  };

  const paymentRemarkBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="text-sm" title={rowData.paymentremark}>
        {rowData.paymentremark
          ? rowData.paymentremark.length > 20
            ? `${rowData.paymentremark.substring(0, 20)}...`
            : rowData.paymentremark
          : "-"}
      </span>
    );
  };

  const reprintRemarkBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="text-sm text-gray-600" title={rowData.reprintremark}>
        {rowData.reprintremark
          ? rowData.reprintremark.length > 20
            ? `${rowData.reprintremark.substring(0, 20)}...`
            : rowData.reprintremark
          : "-"}
      </span>
    );
  };

  const dateBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="text-sm">{rowData.date || "-"}</span>
    );
  };

  // Calculate totals for footer
  const calculateTotals = () => {
    const totals = receiptList.reduce(
      (acc, row) => {
        acc.ordertotal += row.ordertotal || 0;
        acc.discount += row.discount || 0;
        acc.taxableamount += row.taxableamount || 0;
        acc.taxamount += row.taxamount || 0;
        acc.roundoff += row.roundoff || 0;
        acc.grandtotal += row.grandtotal || 0;
        return acc;
      },
      {
        ordertotal: 0,
        discount: 0,
        taxableamount: 0,
        taxamount: 0,
        roundoff: 0,
        grandtotal: 0,
      },
    );
    return totals;
  };

  const totals = calculateTotals();

  // --- ADD: child table renderer ---
  const renderChildTable = (data) => (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="mb-2 font-semibold">Category Bills</div>
      <DataTable
        value={data}
        size="small"
        emptyMessage="No category bills found"
      >
        <Column
          header="Bill No"
          body={(row) => (
            <span
              className="cursor-pointer font-medium text-blue-600 hover:underline"
              onClick={() =>
                window.open(
                  `/ebill/${row.category.toLowerCase()}/${row.uniquekey}`,
                  "_blank",
                )
              }
              title={`Open ${row.category} bill`}
            >
              {row.billno}
            </span>
          )}
          style={{ minWidth: "12rem" }}
        />
        <Column
          field="category"
          header="Category"
          style={{ minWidth: "10rem" }}
        />
        <Column
          field="taxableamount"
          header="Taxable Amount (₹)"
          body={(r) => `₹${toINR(r.taxableamount)}`}
          style={{ minWidth: "12rem" }}
        />
        <Column
          field="taxamount"
          header="Tax Amount (₹)"
          body={(r) => `₹${toINR(r.taxamount)}`}
          style={{ minWidth: "10rem" }}
        />
        <Column
          field="totalamount"
          header="Total Amount (₹)"
          body={(r) => `₹${toINR(r.totalamount)}`}
          style={{ minWidth: "12rem" }}
        />
      </DataTable>
    </div>
  );

  // --- ADD: expansion template + allowExpansion ---
  const rowExpansionTemplate = (parentRow) => {
    const { children } = parentRow || [];

    return <div className="p-3">{renderChildTable(children)}</div>;
  };

  const allowExpansion = (rowData) => {
    const c = rowData?.children;
    return !!(c && Array.isArray(c) && c.length > 0);
  };

  return (
    <Page title="Sales Receipt">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : receiptList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No sales receipts found"
                    subtitle="No sales receipts match your current filters. Try adjusting your search criteria."
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
                  "saleperson",
                  "ordertotal",
                  "discount",
                  "taxableamount",
                  "taxamount",
                  "roundoff",
                  "grandtotal",
                  "paymentref",
                ]}
                onFilter={(e) => {
                  setIsLoading(true);
                  setFilters(e.filters);
                  setLazyParams((prev) => ({ ...prev, first: 0 }));
                  setExpandedRows(null);
                  scrollToTop();
                }}
                onPage={(e) => {
                  setIsLoading(true);
                  setLazyParams((prev) => ({
                    ...prev,
                    first: e.first,
                    rows: e.rows,
                  }));
                  setExpandedRows(null);
                  scrollToTop();
                }}
                onSort={(e) => {
                  setIsLoading(true);
                  setLazyParams((prev) => ({
                    ...prev,
                    sortField: e.sortField,
                    sortOrder: e.sortOrder,
                  }));
                  setExpandedRows(null);
                  scrollToTop();
                }}
                stateStorage="session"
                stateKey="salesReceiptTableFilters"
                rows={lazyParams.rows}
                first={lazyParams.first}
                totalRecords={totalRecords}
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50, 100]}
                tableStyle={{ minWidth: "80rem" }}
                removableSort
                dataKey="id"
                expandedRows={expandedRows}
                onRowToggle={(e) => setExpandedRows(e.data)}
                rowExpansionTemplate={rowExpansionTemplate}
                footerColumnGroup={
                  !isLoading && (
                    <ColumnGroup>
                      <Row>
                        <Column footer="" style={{ width: "3rem" }} />
                        <Column footer="Total:" className="font-bold" />
                        {visibleFields.some(
                          (col) => col.field === "billno",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "customer",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "saleperson",
                        ) && <Column footer="" />}
                        {visibleFields.some((col) => col.field === "date") && (
                          <Column footer="" />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "ordertotal",
                        ) && (
                          <Column
                            footer={`₹${totals.ordertotal.toFixed(2)}`}
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
                        {visibleFields.some(
                          (col) => col.field === "roundoff",
                        ) && (
                          <Column
                            footer={`₹${totals.roundoff.toFixed(2)}`}
                            className={`font-bold ${totals.roundoff >= 0 ? "text-green-600" : "text-red-600"}`}
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "grandtotal",
                        ) && (
                          <Column
                            footer={`₹${totals.grandtotal.toFixed(2)}`}
                            className="font-bold text-green-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "transaction",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "orderremark",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "paymentref",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "paymentremark",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "reprintremark",
                        ) && <Column footer="" />}
                      </Row>
                    </ColumnGroup>
                  )
                }
              >
                <Column expander={allowExpansion} style={{ width: "3rem" }} />
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
                    style={{ minWidth: "10rem" }}
                    body={billNoBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Bill No"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "customer") && (
                  <Column
                    field="customer"
                    header="Customer"
                    style={{ minWidth: "12rem" }}
                    body={customerBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Customer"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "saleperson") && (
                  <Column
                    field="saleperson"
                    header="Sale Person"
                    style={{ minWidth: "10rem" }}
                    body={salePersonBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Sale Person"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "date") && (
                  <Column
                    field="date"
                    header="Date"
                    style={{ minWidth: "9rem" }}
                    body={dateBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "ordertotal") && (
                  <Column
                    field="ordertotal"
                    header="Order Total"
                    style={{ minWidth: "10rem" }}
                    body={orderTotalBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Order Total"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "discount") && (
                  <Column
                    field="discount"
                    header="Discount"
                    style={{ minWidth: "9rem" }}
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
                    style={{ minWidth: "11rem" }}
                    body={taxableAmountBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Taxable Amount"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "taxamount") && (
                  <Column
                    field="taxamount"
                    header="Tax Amount"
                    style={{ minWidth: "10rem" }}
                    body={taxAmountBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Tax Amount"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "roundoff") && (
                  <Column
                    field="roundoff"
                    header="Round off"
                    style={{ minWidth: "9rem" }}
                    body={roundOffBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Round off"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "grandtotal") && (
                  <Column
                    field="grandtotal"
                    header="Grand Total"
                    style={{ minWidth: "11rem" }}
                    body={grandTotalBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Grand Total"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "transaction") && (
                  <Column
                    field="transaction"
                    header="Transaction"
                    style={{ minWidth: "10rem" }}
                    body={transactionBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "orderremark") && (
                  <Column
                    field="orderremark"
                    header="Order Remark"
                    style={{ minWidth: "13rem" }}
                    body={orderRemarkBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "paymentref") && (
                  <Column
                    field="paymentref"
                    header="Payment Ref#"
                    style={{ minWidth: "11rem" }}
                    body={paymentRefBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Payment Ref"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "paymentremark") && (
                  <Column
                    field="paymentremark"
                    header="Payment Remark"
                    style={{ minWidth: "12rem" }}
                    body={paymentRemarkBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "reprintremark") && (
                  <Column
                    field="reprintremark"
                    header="Reprint Remark"
                    style={{ minWidth: "12rem" }}
                    body={reprintRemarkBodyTemplate}
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
