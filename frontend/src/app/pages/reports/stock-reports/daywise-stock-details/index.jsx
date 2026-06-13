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
import { DaywiseStockDetailsService } from "services/reports/stock/daywiseStockDetails";
import EmptyMessage from "components/shared/EmptyMessage";
import { LocationFilter } from "components/reports/LocationFilter";

export default function DaywiseStockDetails() {
  const toast = useRef(null);
  const [stockDetails, setStockDetails] = useState([]);
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
    mastercategory: { value: null, matchMode: FilterMatchMode.CONTAINS },
    category: { value: null, matchMode: FilterMatchMode.CONTAINS },
    product: { value: null, matchMode: FilterMatchMode.CONTAINS },
    brand: { value: null, matchMode: FilterMatchMode.CONTAINS },
    batchlotnumber: { value: null, matchMode: FilterMatchMode.CONTAINS },
    batchdate: { value: null, matchMode: FilterMatchMode.CONTAINS },
    openingstock: { value: null, matchMode: FilterMatchMode.EQUALS },
    sales: { value: null, matchMode: FilterMatchMode.EQUALS },
    purchase: { value: null, matchMode: FilterMatchMode.EQUALS },
    salesreturn: { value: null, matchMode: FilterMatchMode.EQUALS },
    purchasereturn: { value: null, matchMode: FilterMatchMode.EQUALS },
    adjustin: { value: null, matchMode: FilterMatchMode.EQUALS },
    adjustout: { value: null, matchMode: FilterMatchMode.EQUALS },
    closingstock: { value: null, matchMode: FilterMatchMode.EQUALS },
    uom: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const columnOptions = [
    { field: "date", header: "Date" },
    { field: "mastercategory", header: "Master Category" },
    { field: "category", header: "Category" },
    { field: "product", header: "Product" },
    { field: "brand", header: "Brand" },
    { field: "batchlotnumber", header: "Batch/LOT Number" },
    { field: "batchdate", header: "Batch Date" },
    { field: "openingstock", header: "Opening Stock" },
    { field: "sales", header: "Sales" },
    { field: "purchase", header: "Purchase" },
    { field: "salesreturn", header: "Sales Return" },
    { field: "purchasereturn", header: "Purchase Return" },
    { field: "adjustin", header: "Adjust In" },
    { field: "adjustout", header: "Adjust Out" },
    { field: "closingstock", header: "Closing Stock" },
    { field: "uom", header: "UOM" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("daywiseStockDetails_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    return columnOptions;
  });

  const fetchDaywiseStockDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await DaywiseStockDetailsService.getDaywiseStockDetails({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
        locationId: selectedLocationId,
      });

      if (response.success) {
        setStockDetails(response.data);
        setTotalRecords(response.totalRecords);
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, selectedLocationId]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchDaywiseStockDetails();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchDaywiseStockDetails]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem(
      "daywiseStockDetailsTableFilters",
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
    date: "",
    mastercategory: "",
    category: "",
    product: "",
    brand: "",
    batchlotnumber: "",
    batchdate: "",
    openingstock: "",
    sales: "",
    purchase: "",
    salesreturn: "",
    purchasereturn: "",
    adjustin: "",
    adjustout: "",
    closingstock: "",
    uom: "",
  };

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
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

  const exportCSV = () => {
    if (stockDetails.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = stockDetails.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (
          [
            "openingstock",
            "sales",
            "purchase",
            "salesreturn",
            "purchasereturn",
            "adjustin",
            "adjustout",
            "closingstock",
          ].includes(col.field)
        ) {
          formattedRow[col.header] =
            row[col.field] != null
              ? `${Number(row[col.field]).toFixed(0)}`
              : "0";
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

    const filename = "daywise_stock_details.csv";
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
    if (stockDetails.length === 0) {
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
        format: "A1",
      });

      const head = [visibleFields.map((col) => col.header)];
      const body = stockDetails.map((row) =>
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
          fontSize: 4,
          cellPadding: 1,
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

      doc.save("daywise_stock_details.pdf");
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
    if (stockDetails.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = stockDetails.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (
            [
              "openingstock",
              "sales",
              "purchase",
              "salesreturn",
              "purchasereturn",
              "adjustin",
              "adjustout",
              "closingstock",
            ].includes(col.field)
          ) {
            filteredRow[col.header] =
              row[col.field] != null
                ? `${Number(row[col.field]).toFixed(0)}`
                : "0";
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

      saveAsExcelFile(excelBuffer, "daywise_stock_details");
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

    if (!selectedColumns.some((col) => col.field === "product")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "product"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "daywiseStockDetails_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Daywise Stock Details Report
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

  const productBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="80%" height="1.5rem" />;
    }
    return (
      <span className="font-semibold text-blue-600">
        {rowData.product || "-"}
      </span>
    );
  };

  const dateBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="80%" height="1.5rem" />;
    }
    return (
      <span className="font-medium text-gray-700">{rowData.date || "-"}</span>
    );
  };

  const batchBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="80%" height="1.5rem" />;
    }
    return (
      <span className="font-medium text-purple-600">
        {rowData.batchlotnumber || "-"}
      </span>
    );
  };

  const openingStockBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }
    return (
      <span className="font-semibold text-green-600">
        {rowData.openingstock || "0"}
      </span>
    );
  };

  const salesBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }
    return (
      <span className="font-medium text-red-600">{rowData.sales || "0"}</span>
    );
  };

  const purchaseBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }
    return (
      <span className="font-medium text-blue-600">
        {rowData.purchase || "0"}
      </span>
    );
  };

  const closingStockBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }
    return (
      <span className="font-bold text-green-700">
        {rowData.closingstock || "0"}
      </span>
    );
  };

  const defaultBodyTemplate = (field) => {
    const BodyTemplate = (rowData) => {
      if (isLoading) {
        return <Skeleton width="70%" height="1.5rem" />;
      }
      return <span>{rowData[field] || "-"}</span>;
    };
    BodyTemplate.displayName = `DefaultBodyTemplate_${field}`;
    return BodyTemplate;
  };

  const numberBodyTemplate = (field) => {
    const NumberTemplate = (rowData) => {
      if (isLoading) {
        return <Skeleton width="70%" height="1.5rem" />;
      }
      return <span>{rowData[field] || "0"}</span>;
    };
    NumberTemplate.displayName = `NumberBodyTemplate_${field}`;
    return NumberTemplate;
  };

  const calculateTotals = () => {
    const totals = stockDetails.reduce(
      (acc, row) => {
        acc.openingstock += row.openingstock || 0;
        acc.sales += row.sales || 0;
        acc.purchase += row.purchase || 0;
        acc.salesreturn += row.salesreturn || 0;
        acc.purchasereturn += row.purchasereturn || 0;
        acc.adjustin += row.adjustin || 0;
        acc.adjustout += row.adjustout || 0;
        acc.closingstock += row.closingstock || 0;
        return acc;
      },
      {
        openingstock: 0,
        sales: 0,
        purchase: 0,
        salesreturn: 0,
        purchasereturn: 0,
        adjustin: 0,
        adjustout: 0,
        closingstock: 0,
      },
    );
    return totals;
  };

  const totals = calculateTotals();

  return (
    <Page title="Daywise Stock Details">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : stockDetails
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={<EmptyMessage />}
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "date",
                  "mastercategory",
                  "category",
                  "product",
                  "brand",
                  "batchlotnumber",
                  "uom",
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
                stateKey="daywiseStockDetailsTableFilters"
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
                footerColumnGroup={
                  !isLoading && (
                    <ColumnGroup>
                      <Row>
                        <Column footer="Total:" className="font-bold" />
                        {visibleFields.some((col) => col.field === "date") && (
                          <Column footer="" />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "mastercategory",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "category",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "product",
                        ) && (
                          <Column
                            footer={`Records: ${stockDetails.length}`}
                            className="font-bold text-blue-600"
                          />
                        )}
                        {visibleFields.some((col) => col.field === "brand") && (
                          <Column footer="" />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "batchlotnumber",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "batchdate",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "openingstock",
                        ) && (
                          <Column
                            footer={totals.openingstock}
                            className="font-bold text-green-600"
                          />
                        )}
                        {visibleFields.some((col) => col.field === "sales") && (
                          <Column
                            footer={totals.sales}
                            className="font-bold text-red-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "purchase",
                        ) && (
                          <Column
                            footer={totals.purchase}
                            className="font-bold text-blue-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "salesreturn",
                        ) && (
                          <Column
                            footer={totals.salesreturn}
                            className="font-bold"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "purchasereturn",
                        ) && (
                          <Column
                            footer={totals.purchasereturn}
                            className="font-bold"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "adjustin",
                        ) && (
                          <Column
                            footer={totals.adjustin}
                            className="font-bold"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "adjustout",
                        ) && (
                          <Column
                            footer={totals.adjustout}
                            className="font-bold"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "closingstock",
                        ) && (
                          <Column
                            footer={totals.closingstock}
                            className="font-bold text-green-700"
                          />
                        )}
                        {visibleFields.some((col) => col.field === "uom") && (
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
                  style={{ minWidth: "4rem" }}
                />

                {visibleFields.map((col) => {
                  let bodyTemplate;
                  let style = { minWidth: "8rem" };

                  switch (col.field) {
                    case "product":
                      bodyTemplate = productBodyTemplate;
                      style.minWidth = "12rem";
                      break;
                    case "date":
                      bodyTemplate = dateBodyTemplate;
                      style.minWidth = "10rem";
                      break;
                    case "batchlotnumber":
                      bodyTemplate = batchBodyTemplate;
                      style.minWidth = "10rem";
                      break;
                    case "openingstock":
                      bodyTemplate = openingStockBodyTemplate;
                      style.minWidth = "9rem";
                      break;
                    case "sales":
                      bodyTemplate = salesBodyTemplate;
                      style.minWidth = "7rem";
                      break;
                    case "purchase":
                      bodyTemplate = purchaseBodyTemplate;
                      style.minWidth = "8rem";
                      break;
                    case "closingstock":
                      bodyTemplate = closingStockBodyTemplate;
                      style.minWidth = "9rem";
                      break;
                    case "salesreturn":
                    case "purchasereturn":
                    case "adjustin":
                    case "adjustout":
                      bodyTemplate = numberBodyTemplate(col.field);
                      style.minWidth = "8rem";
                      break;
                    case "mastercategory":
                    case "category":
                      style.minWidth = "10rem";
                      bodyTemplate = defaultBodyTemplate(col.field);
                      break;
                    default:
                      bodyTemplate = defaultBodyTemplate(col.field);
                  }

                  return (
                    <Column
                      key={col.field}
                      field={col.field}
                      header={col.header}
                      style={style}
                      body={bodyTemplate}
                      filter
                      showFilterMenu={false}
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
