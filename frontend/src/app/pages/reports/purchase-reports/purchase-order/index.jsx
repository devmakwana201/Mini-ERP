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
import { PurchaseOrdersService } from "services/reports/purchase/purchaseOrders";
import EmptyMessage from "components/shared/EmptyMessage";
import { LocationFilter } from "components/reports/LocationFilter";

export default function PurchaseOrder() {
  const toast = useRef(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
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
    supplier: { value: null, matchMode: FilterMatchMode.CONTAINS },
    suppliergst: { value: null, matchMode: FilterMatchMode.CONTAINS },
    ordernumber: { value: null, matchMode: FilterMatchMode.CONTAINS },
    referencebillnumber: { value: null, matchMode: FilterMatchMode.CONTAINS },
    purchaseorderdate: { value: null, matchMode: FilterMatchMode.CONTAINS },
    nooflabels: { value: null, matchMode: FilterMatchMode.EQUALS },
    remarks: { value: null, matchMode: FilterMatchMode.CONTAINS },
    createdby: { value: null, matchMode: FilterMatchMode.CONTAINS },
    createddatetime: { value: null, matchMode: FilterMatchMode.CONTAINS },
    total: { value: null, matchMode: FilterMatchMode.EQUALS },
    discount: { value: null, matchMode: FilterMatchMode.EQUALS },
    additionalcharge: { value: null, matchMode: FilterMatchMode.EQUALS },
    roundoff: { value: null, matchMode: FilterMatchMode.EQUALS },
    grandtotal: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const columnOptions = [
    { field: "supplier", header: "Supplier" },
    { field: "suppliergst", header: "Supplier GST" },
    { field: "ordernumber", header: "Order Number" },
    { field: "referencebillnumber", header: "Reference Bill Number" },
    { field: "purchaseorderdate", header: "Purchase Order Date" },
    { field: "nooflabels", header: "No. of Labels" },
    { field: "remarks", header: "Remarks" },
    { field: "createdby", header: "Created By" },
    { field: "createddatetime", header: "Created Date & Time" },
    { field: "total", header: "Total" },
    { field: "discount", header: "Discount" },
    { field: "additionalcharge", header: "Additional Charge" },
    { field: "roundoff", header: "Round Off" },
    { field: "grandtotal", header: "Grand Total" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("purchaseOrder_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default - show ALL columns
    return columnOptions;
  });

  // Fetch purchase orders data
  const fetchPurchaseOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await PurchaseOrdersService.getPurchaseOrders({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
        locationId: selectedLocationId,
      });

      if (response.success) {
        setPurchaseOrders(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail: response.message || "Failed to fetch purchase orders data",
          life: 3000,
        });
      }
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "An error occurred while fetching data",
        life: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, selectedLocationId]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchPurchaseOrders();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchPurchaseOrders]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("purchaseOrderTableFilters");
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
    supplier: "",
    suppliergst: "",
    ordernumber: "",
    referencebillnumber: "",
    purchaseorderdate: "",
    nooflabels: "",
    remarks: "",
    createdby: "",
    createddatetime: "",
    total: "",
    discount: "",
    additionalcharge: "",
    roundoff: "",
    grandtotal: "",
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
    if (purchaseOrders.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = purchaseOrders.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (
          [
            "nooflabels",
            "total",
            "discount",
            "additionalcharge",
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

    const filename = "purchase_orders.csv";
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
    if (purchaseOrders.length === 0) {
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
      const body = purchaseOrders.map((row) =>
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
            const softened = raw.replace(/(\S{20})/g, "$1\u200B");
            if (softened !== raw) data.cell.text = [softened];
          }
        },
      });

      doc.save("purchase_orders.pdf");
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
    if (purchaseOrders.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = purchaseOrders.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (
            [
              "nooflabels",
              "total",
              "discount",
              "additionalcharge",
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

      saveAsExcelFile(excelBuffer, "purchase_orders");
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

    // Ensure ordernumber is always included (mandatory field)
    if (!selectedColumns.some((col) => col.field === "ordernumber")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "ordernumber"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "purchaseOrder_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Purchase Orders Report
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
  const supplierBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span>{rowData.supplier || "-"}</span>
    );
  };

  const supplierGSTBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{rowData.suppliergst || "-"}</span>
    );
  };

  const orderNumberBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className="font-bold text-purple-600">
        {rowData.ordernumber || "-"}
      </span>
    );
  };

  const referenceBillBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span>{rowData.referencebillnumber || "-"}</span>
    );
  };

  const dateBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{rowData.purchaseorderdate || "-"}</span>
    );
  };

  const labelsBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="40%" height="1.5rem" />
    ) : (
      <span>{rowData.nooflabels || 0}</span>
    );
  };

  const remarksBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span>{rowData.remarks || "-"}</span>
    );
  };

  const createdByBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span>{rowData.createdby || "-"}</span>
    );
  };

  const createdDateTimeBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="90%" height="1.5rem" />
    ) : (
      <span>{rowData.createddatetime || "-"}</span>
    );
  };

  const totalBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>₹{rowData.total ? Number(rowData.total).toFixed(2) : "0.00"}</span>
    );
  };

  const discountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className={rowData.discount > 0 ? "text-green-600" : ""}>
        ₹{rowData.discount ? Number(rowData.discount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const additionalChargeBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className={rowData.additionalcharge > 0 ? "text-orange-600" : ""}>
        ₹
        {rowData.additionalcharge
          ? Number(rowData.additionalcharge).toFixed(2)
          : "0.00"}
      </span>
    );
  };

  const roundOffBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="50%" height="1.5rem" />
    ) : (
      <span
        className={
          rowData.roundoff > 0
            ? "text-blue-600"
            : rowData.roundoff < 0
              ? "text-red-600"
              : ""
        }
      >
        ₹{rowData.roundoff ? Number(rowData.roundoff).toFixed(2) : "0.00"}
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
    const totals = purchaseOrders.reduce(
      (acc, row) => {
        acc.labels += row.nooflabels || 0;
        acc.total += row.total || 0;
        acc.discount += row.discount || 0;
        acc.additionalCharge += row.additionalcharge || 0;
        acc.roundOff += row.roundoff || 0;
        acc.grandTotal += row.grandtotal || 0;
        return acc;
      },
      {
        labels: 0,
        total: 0,
        discount: 0,
        additionalCharge: 0,
        roundOff: 0,
        grandTotal: 0,
      },
    );
    return totals;
  };

  const totals = calculateTotals();

  // Create footer column group
  const footerGroup = (
    <ColumnGroup>
      <Row>
        <Column footer="" style={{ minWidth: "5rem" }} />
        {visibleFields.some((col) => col.field === "supplier") && (
          <Column
            footer="Total:"
            footerStyle={{ textAlign: "right", fontWeight: "bold" }}
            style={{ minWidth: "16rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "suppliergst") && (
          <Column footer="" style={{ minWidth: "12rem" }} />
        )}
        {visibleFields.some((col) => col.field === "ordernumber") && (
          <Column footer="" style={{ minWidth: "10rem" }} />
        )}
        {visibleFields.some((col) => col.field === "referencebillnumber") && (
          <Column footer="" style={{ minWidth: "12rem" }} />
        )}
        {visibleFields.some((col) => col.field === "purchaseorderdate") && (
          <Column footer="" style={{ minWidth: "12rem" }} />
        )}
        {visibleFields.some((col) => col.field === "nooflabels") && (
          <Column
            footer={totals.labels}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "9rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "remarks") && (
          <Column footer="" style={{ minWidth: "14rem" }} />
        )}
        {visibleFields.some((col) => col.field === "createdby") && (
          <Column footer="" style={{ minWidth: "10rem" }} />
        )}
        {visibleFields.some((col) => col.field === "createddatetime") && (
          <Column footer="" style={{ minWidth: "15rem" }} />
        )}
        {visibleFields.some((col) => col.field === "total") && (
          <Column
            footer={`₹${totals.total.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "11rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "discount") && (
          <Column
            footer={`₹${totals.discount.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold", color: "#16a34a" }}
            style={{ minWidth: "10rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "additionalcharge") && (
          <Column
            footer={`₹${totals.additionalCharge.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold", color: "#ea580c" }}
            style={{ minWidth: "12rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "roundoff") && (
          <Column
            footer={`₹${totals.roundOff.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "9rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "grandtotal") && (
          <Column
            footer={`₹${totals.grandTotal.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold", color: "#2563eb" }}
            style={{ minWidth: "12rem" }}
          />
        )}
      </Row>
    </ColumnGroup>
  );

  return (
    <Page title="Purchase Order">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : purchaseOrders
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage message="No purchase order records found" />
                }
                footerColumnGroup={!isLoading ? footerGroup : null}
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "supplier",
                  "suppliergst",
                  "ordernumber",
                  "referencebillnumber",
                  "purchaseorderdate",
                  "nooflabels",
                  "remarks",
                  "createdby",
                  "createddatetime",
                  "total",
                  "discount",
                  "additionalcharge",
                  "roundoff",
                  "grandtotal",
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
                stateKey="purchaseOrderTableFilters"
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
                    style={{ minWidth: "16rem" }}
                    body={supplierBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Supplier"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "suppliergst") && (
                  <Column
                    field="suppliergst"
                    header="Supplier GST"
                    style={{ minWidth: "12rem" }}
                    body={supplierGSTBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search GST"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "ordernumber") && (
                  <Column
                    field="ordernumber"
                    header="Order Number"
                    style={{ minWidth: "10rem" }}
                    body={orderNumberBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Order"
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "referencebillnumber",
                ) && (
                  <Column
                    field="referencebillnumber"
                    header="Reference Bill Number"
                    style={{ minWidth: "12rem" }}
                    body={referenceBillBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Ref Bill"
                    sortable
                  />
                )}
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
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "nooflabels") && (
                  <Column
                    field="nooflabels"
                    header="No. of Labels"
                    style={{ minWidth: "9rem" }}
                    body={labelsBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Labels"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "remarks") && (
                  <Column
                    field="remarks"
                    header="Remarks"
                    style={{ minWidth: "14rem" }}
                    body={remarksBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Remarks"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "createdby") && (
                  <Column
                    field="createdby"
                    header="Created By"
                    style={{ minWidth: "10rem" }}
                    body={createdByBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Creator"
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "createddatetime",
                ) && (
                  <Column
                    field="createddatetime"
                    header="Created Date & Time"
                    style={{ minWidth: "15rem" }}
                    body={createdDateTimeBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Date Time"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "total") && (
                  <Column
                    field="total"
                    header="Total"
                    style={{ minWidth: "11rem" }}
                    body={totalBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Total"
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
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "additionalcharge",
                ) && (
                  <Column
                    field="additionalcharge"
                    header="Additional Charge"
                    style={{ minWidth: "12rem" }}
                    body={additionalChargeBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Add Charge"
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
