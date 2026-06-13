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
import { StockAdjustmentReportService } from "services/reports/stock/stockAdjustmentReport";
import EmptyMessage from "components/shared/EmptyMessage";
import { LocationFilter } from "components/reports/LocationFilter";

export default function StockAdjustmentReport() {
  const toast = useRef(null);
  const [adjustmentList, setAdjustmentList] = useState([]);
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
    createddatetime: { value: null, matchMode: FilterMatchMode.CONTAINS },
    productname: { value: null, matchMode: FilterMatchMode.CONTAINS },
    brand: { value: null, matchMode: FilterMatchMode.CONTAINS },
    mastercategory: { value: null, matchMode: FilterMatchMode.CONTAINS },
    category: { value: null, matchMode: FilterMatchMode.CONTAINS },
    subcategory: { value: null, matchMode: FilterMatchMode.CONTAINS },
    uom: { value: null, matchMode: FilterMatchMode.CONTAINS },
    totalstock: { value: null, matchMode: FilterMatchMode.EQUALS },
    remark: { value: null, matchMode: FilterMatchMode.CONTAINS },
    createdby: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const columnOptions = [
    { field: "createddatetime", header: "Created Date & Time" },
    { field: "productname", header: "Product Name" },
    { field: "brand", header: "Brand" },
    { field: "mastercategory", header: "Master Category" },
    { field: "category", header: "Category" },
    { field: "subcategory", header: "Sub Category" },
    { field: "uom", header: "UOM" },
    { field: "totalstock", header: "Total Stock" },
    { field: "remark", header: "Remark" },
    { field: "createdby", header: "Created By" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("stockAdjustmentReport_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    return columnOptions;
  });

  const fetchStockAdjustmentReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const response =
        await StockAdjustmentReportService.getStockAdjustmentReport({
          filters,
          start: lazyParams.first,
          length: lazyParams.rows,
          sortField: lazyParams.sortField,
          sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
          locationId: selectedLocationId,
        });

      if (response.success) {
        setAdjustmentList(response.data);
        setTotalRecords(response.totalRecords);
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, selectedLocationId]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchStockAdjustmentReport();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchStockAdjustmentReport]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem(
      "stockAdjustmentReportTableFilters",
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
    createddatetime: "",
    productname: "",
    brand: "",
    mastercategory: "",
    category: "",
    subcategory: "",
    uom: "",
    totalstock: "",
    remark: "",
    createdby: "",
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
    if (adjustmentList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = adjustmentList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (["totalstock"].includes(col.field)) {
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

    const filename = "stock_adjustment_report.csv";
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
    if (adjustmentList.length === 0) {
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
      const body = adjustmentList.map((row) =>
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

      doc.save("stock_adjustment_report.pdf");
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
    if (adjustmentList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = adjustmentList.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (["totalstock"].includes(col.field)) {
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

      saveAsExcelFile(excelBuffer, "stock_adjustment_report");
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

    if (!selectedColumns.some((col) => col.field === "productname")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "productname"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "stockAdjustmentReport_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Stock Adjustment Report
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

  const productNameBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="80%" height="1.5rem" />;
    }
    return (
      <span className="font-semibold text-blue-600">
        {rowData.productname || "-"}
      </span>
    );
  };

  const createdDateTimeBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="100%" height="1.5rem" />;
    }
    return (
      <span className="font-medium text-gray-700">
        {rowData.createddatetime || "-"}
      </span>
    );
  };

  const brandBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="80%" height="1.5rem" />;
    }
    return (
      <span className="font-medium text-purple-600">
        {rowData.brand || "-"}
      </span>
    );
  };

  const totalStockBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }
    return (
      <span className="font-bold text-green-600">
        {rowData.totalstock || "0"}
      </span>
    );
  };

  const remarkBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="90%" height="1.5rem" />;
    }
    return (
      <span className="font-medium text-orange-600" title={rowData.remark}>
        {rowData.remark && rowData.remark.length > 30
          ? `${rowData.remark.substring(0, 30)}...`
          : rowData.remark || "-"}
      </span>
    );
  };

  const createdByBodyTemplate = (rowData) => {
    if (isLoading) {
      return <Skeleton width="80%" height="1.5rem" />;
    }
    return (
      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
        {rowData.createdby || "-"}
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

  const calculateTotals = () => {
    const totals = adjustmentList.reduce(
      (acc, row) => {
        acc.totalrecords += 1;
        acc.totalstock += row.totalstock || 0;

        // Count adjustments by user
        if (row.createdby) {
          acc.useradjustments[row.createdby] =
            (acc.useradjustments[row.createdby] || 0) + 1;
        }

        return acc;
      },
      { totalrecords: 0, totalstock: 0, useradjustments: {} },
    );
    return totals;
  };

  const totals = calculateTotals();

  return (
    <Page title="Stock Adjustment Report">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : adjustmentList
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
                  "productname",
                  "brand",
                  "mastercategory",
                  "category",
                  "subcategory",
                  "remark",
                  "createdby",
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
                stateKey="stockAdjustmentReportTableFilters"
                rows={lazyParams.rows}
                first={lazyParams.first}
                totalRecords={totalRecords}
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50, 100]}
                tableStyle={{ minWidth: "110rem" }}
                removableSort
                footerColumnGroup={
                  !isLoading && (
                    <ColumnGroup>
                      <Row>
                        <Column footer="Total:" className="font-bold" />
                        {visibleFields.some(
                          (col) => col.field === "createddatetime",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "productname",
                        ) && (
                          <Column
                            footer={`Adjustments: ${totals.totalrecords}`}
                            className="font-bold text-blue-600"
                          />
                        )}
                        {visibleFields.some((col) => col.field === "brand") && (
                          <Column footer="" />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "mastercategory",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "category",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "subcategory",
                        ) && <Column footer="" />}
                        {visibleFields.some((col) => col.field === "uom") && (
                          <Column footer="" />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "totalstock",
                        ) && (
                          <Column
                            footer={totals.totalstock}
                            className="font-bold text-green-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "remark",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "createdby",
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
                  style={{ minWidth: "4rem" }}
                />

                {visibleFields.map((col) => {
                  let bodyTemplate;
                  let style = { minWidth: "8rem" };

                  switch (col.field) {
                    case "productname":
                      bodyTemplate = productNameBodyTemplate;
                      style.minWidth = "14rem";
                      break;
                    case "createddatetime":
                      bodyTemplate = createdDateTimeBodyTemplate;
                      style.minWidth = "14rem";
                      break;
                    case "brand":
                      bodyTemplate = brandBodyTemplate;
                      style.minWidth = "10rem";
                      break;
                    case "totalstock":
                      bodyTemplate = totalStockBodyTemplate;
                      style.minWidth = "9rem";
                      break;
                    case "remark":
                      bodyTemplate = remarkBodyTemplate;
                      style.minWidth = "16rem";
                      break;
                    case "createdby":
                      bodyTemplate = createdByBodyTemplate;
                      style.minWidth = "10rem";
                      break;
                    case "mastercategory":
                    case "category":
                    case "subcategory":
                      style.minWidth = "11rem";
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
