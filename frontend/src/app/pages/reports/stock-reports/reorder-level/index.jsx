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

// Dummy data for Reorder Level Report
const generateDummyData = () => {
  const products = [
    {
      name: "Urea 46%",
      masterCategory: "Fertilizers",
      category: "Nitrogenous",
      subCategory: "Straight Fertilizers",
      uom: "Bag",
    },
    {
      name: "DAP 18:46:0",
      masterCategory: "Fertilizers",
      category: "Phosphatic",
      subCategory: "Straight Fertilizers",
      uom: "Bag",
    },
    {
      name: "MOP 0:0:60",
      masterCategory: "Fertilizers",
      category: "Potassic",
      subCategory: "Straight Fertilizers",
      uom: "Bag",
    },
    {
      name: "NPK 10:26:26",
      masterCategory: "Fertilizers",
      category: "Complex",
      subCategory: "NPK Fertilizers",
      uom: "Bag",
    },
    {
      name: "Zinc Sulphate 21%",
      masterCategory: "Fertilizers",
      category: "Micronutrients",
      subCategory: "Zinc Fertilizers",
      uom: "Kg",
    },
    {
      name: "Wheat Seeds HD-2967",
      masterCategory: "Seeds",
      category: "Cereal Seeds",
      subCategory: "Wheat Seeds",
      uom: "Quintal",
    },
    {
      name: "Tomato Seeds Arka Vikas",
      masterCategory: "Seeds",
      category: "Vegetable Seeds",
      subCategory: "Tomato Seeds",
      uom: "Packet",
    },
    {
      name: "Chlorpyriphos 20 EC",
      masterCategory: "Pesticides",
      category: "Insecticides",
      subCategory: "Organophosphates",
      uom: "Liter",
    },
    {
      name: "Glyphosate 41% SL",
      masterCategory: "Pesticides",
      category: "Herbicides",
      subCategory: "Non-selective",
      uom: "Liter",
    },
    {
      name: "Mancozeb 75% WP",
      masterCategory: "Pesticides",
      category: "Fungicides",
      subCategory: "Contact Fungicides",
      uom: "Kg",
    },
    {
      name: "Iron Sulphate",
      masterCategory: "Fertilizers",
      category: "Micronutrients",
      subCategory: "Iron Fertilizers",
      uom: "Kg",
    },
    {
      name: "Rice Seeds Basmati",
      masterCategory: "Seeds",
      category: "Cereal Seeds",
      subCategory: "Rice Seeds",
      uom: "Kg",
    },
    {
      name: "Copper Sulphate",
      masterCategory: "Pesticides",
      category: "Fungicides",
      subCategory: "Copper-based",
      uom: "Kg",
    },
  ];

  const data = [];

  for (let i = 1; i <= 60; i++) {
    const product = products[Math.floor(Math.random() * products.length)];

    const safetyQuantity = Math.floor(Math.random() * 100) + 20;
    const currentStock = Math.floor(Math.random() * 300) + 10;
    const difference = currentStock - safetyQuantity;

    data.push({
      id: i,
      Product: product.name,
      MasterCategory: product.masterCategory,
      Category: product.category,
      SubCategory: product.subCategory,
      UOM: product.uom,
      SafetyQuantity: safetyQuantity,
      CurrentStock: currentStock,
      Difference: difference,
    });
  }

  return data.sort((a, b) => a.Difference - b.Difference);
};

export default function ReorderLevel() {
  const toast = useRef(null);
  const [reorderList, setReorderList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [totalRecords, setTotalRecords] = useState(0);

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    Product: { value: null, matchMode: FilterMatchMode.CONTAINS },
    MasterCategory: { value: null, matchMode: FilterMatchMode.CONTAINS },
    Category: { value: null, matchMode: FilterMatchMode.CONTAINS },
    SubCategory: { value: null, matchMode: FilterMatchMode.CONTAINS },
    UOM: { value: null, matchMode: FilterMatchMode.CONTAINS },
    SafetyQuantity: { value: null, matchMode: FilterMatchMode.EQUALS },
    CurrentStock: { value: null, matchMode: FilterMatchMode.EQUALS },
    Difference: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const columnOptions = [
    { field: "Product", header: "Product" },
    { field: "MasterCategory", header: "Master Category" },
    { field: "Category", header: "Category" },
    { field: "SubCategory", header: "Sub Category" },
    { field: "UOM", header: "UOM" },
    { field: "SafetyQuantity", header: "Safety Quantity" },
    { field: "CurrentStock", header: "Current Stock" },
    { field: "Difference", header: "Difference" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("reorderLevel_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    return columnOptions;
  });

  useEffect(() => {
    const dummyData = generateDummyData();
    setReorderList(dummyData);
    setTotalRecords(dummyData.length);

    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  const blankRow = {
    Product: "",
    MasterCategory: "",
    Category: "",
    SubCategory: "",
    UOM: "",
    SafetyQuantity: "",
    CurrentStock: "",
    Difference: "",
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
    if (reorderList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = reorderList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (
          ["SafetyQuantity", "CurrentStock", "Difference"].includes(col.field)
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

    const filename = "reorder_level_report.csv";
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
    if (reorderList.length === 0) {
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
      const body = reorderList.map((row) =>
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
      });

      doc.save("reorder_level_report.pdf");
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
    if (reorderList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = reorderList.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (
            ["SafetyQuantity", "CurrentStock", "Difference"].includes(col.field)
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

      saveAsExcelFile(excelBuffer, "reorder_level_report");
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

    if (!selectedColumns.some((col) => col.field === "Product")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "Product"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "reorderLevel_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Reorder Level Report
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
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-blue-600">
        {rowData.Product || "-"}
      </span>
    );
  };

  const currentStockBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span
        className={`font-semibold ${rowData.CurrentStock <= rowData.SafetyQuantity ? "text-red-600" : "text-green-600"}`}
      >
        {rowData.CurrentStock || "0"}
      </span>
    );
  };

  const safetyQuantityBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-medium text-orange-600">
        {rowData.SafetyQuantity || "0"}
      </span>
    );
  };

  const differenceBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span
        className={`font-bold ${rowData.Difference < 0 ? "text-red-600" : rowData.Difference === 0 ? "text-yellow-600" : "text-green-600"}`}
      >
        {rowData.Difference > 0 ? "+" : ""}
        {rowData.Difference || "0"}
      </span>
    );
  };

  const defaultBodyTemplate = (field) => {
    const BodyTemplate = (rowData) => {
      return isLoading ? (
        <Skeleton width="70%" height="1.5rem" />
      ) : (
        <span>{rowData[field] || "-"}</span>
      );
    };
    BodyTemplate.displayName = `DefaultBodyTemplate_${field}`;
    return BodyTemplate;
  };

  const calculateTotals = () => {
    const totals = reorderList.reduce(
      (acc, row) => {
        acc.totalProducts += 1;
        acc.totalSafetyQuantity += row.SafetyQuantity || 0;
        acc.totalCurrentStock += row.CurrentStock || 0;
        if (row.Difference < 0) {
          acc.belowSafetyLevel += 1;
          acc.shortageQuantity += Math.abs(row.Difference);
        }
        if (row.Difference === 0) {
          acc.atSafetyLevel += 1;
        }
        return acc;
      },
      {
        totalProducts: 0,
        totalSafetyQuantity: 0,
        totalCurrentStock: 0,
        belowSafetyLevel: 0,
        atSafetyLevel: 0,
        shortageQuantity: 0,
      },
    );
    return totals;
  };

  const totals = calculateTotals();

  return (
    <Page title="Reorder Level">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : reorderList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "Product",
                  "MasterCategory",
                  "Category",
                  "SubCategory",
                  "UOM",
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
                stateKey="reorderLevelTableFilters"
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
                footerColumnGroup={
                  !isLoading && (
                    <ColumnGroup>
                      <Row>
                        <Column footer="Total:" className="font-bold" />
                        {visibleFields.some(
                          (col) => col.field === "Product",
                        ) && (
                          <Column
                            footer={`Products: ${totals.totalProducts}`}
                            className="font-bold text-blue-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "MasterCategory",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "Category",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "SubCategory",
                        ) && <Column footer="" />}
                        {visibleFields.some((col) => col.field === "UOM") && (
                          <Column footer="" />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "SafetyQuantity",
                        ) && (
                          <Column
                            footer={totals.totalSafetyQuantity}
                            className="font-bold text-orange-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "CurrentStock",
                        ) && (
                          <Column
                            footer={totals.totalCurrentStock}
                            className="font-bold text-green-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "Difference",
                        ) && (
                          <Column
                            footer={`Below: ${totals.belowSafetyLevel}`}
                            className="font-bold text-red-600"
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
                  style={{ minWidth: "4rem" }}
                />

                {visibleFields.map((col) => {
                  let bodyTemplate;
                  let style = { minWidth: "8rem" };

                  switch (col.field) {
                    case "Product":
                      bodyTemplate = productBodyTemplate;
                      style.minWidth = "14rem";
                      break;
                    case "CurrentStock":
                      bodyTemplate = currentStockBodyTemplate;
                      style.minWidth = "10rem";
                      break;
                    case "SafetyQuantity":
                      bodyTemplate = safetyQuantityBodyTemplate;
                      style.minWidth = "10rem";
                      break;
                    case "Difference":
                      bodyTemplate = differenceBodyTemplate;
                      style.minWidth = "10rem";
                      break;
                    case "MasterCategory":
                    case "Category":
                    case "SubCategory":
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
