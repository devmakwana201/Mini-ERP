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

// Dummy data for Creditor Report
const generateDummyData = () => {
  const creditors = [
    { name: "AgroTech Seeds Distributors", type: "Supplier" },
    { name: "Green Valley Fertilizers Pvt Ltd", type: "Supplier" },
    { name: "FarmCorp Solutions", type: "Supplier" },
    { name: "Rural Agro Supplies", type: "Supplier" },
    { name: "Harvest Pro Industries", type: "Supplier" },
    { name: "Prime Agricultural Services", type: "Supplier" },
    { name: "Modern Farming Equipment", type: "Supplier" },
    { name: "Agri Business Corporation", type: "Supplier" },
    { name: "Golden Harvest Suppliers", type: "Supplier" },
    { name: "Field Fresh Products", type: "Supplier" },
    { name: "Nature's Best Fertilizers", type: "Supplier" },
    { name: "Organic Farm Supplies", type: "Supplier" },
    { name: "Elite Crop Solutions", type: "Supplier" },
    { name: "Pioneer Agricultural Tools", type: "Supplier" },
    { name: "Supreme Seeds & Pesticides", type: "Supplier" },
    { name: "State Bank of India", type: "Bank" },
    { name: "HDFC Bank", type: "Bank" },
    { name: "Axis Bank", type: "Bank" },
    { name: "Transport Solutions Pvt Ltd", type: "Service Provider" },
    { name: "Logistics Express", type: "Service Provider" },
    { name: "Quality Testing Labs", type: "Service Provider" },
    { name: "Agricultural Consultancy", type: "Service Provider" },
    { name: "Equipment Maintenance Co.", type: "Service Provider" },
    { name: "Storage & Warehousing Ltd", type: "Service Provider" },
    { name: "Insurance Partners", type: "Financial" },
  ];

  const data = [];

  // Generate creditor data with outstanding amounts
  creditors.forEach((creditor, index) => {
    // Generate random outstanding amount based on creditor type
    let baseAmount = 0;
    switch (creditor.type) {
      case "Supplier":
        baseAmount = Math.floor(Math.random() * 250000) + 50000; // 50K to 300K
        break;
      case "Bank":
        baseAmount = Math.floor(Math.random() * 500000) + 100000; // 100K to 600K
        break;
      case "Service Provider":
        baseAmount = Math.floor(Math.random() * 100000) + 20000; // 20K to 120K
        break;
      case "Financial":
        baseAmount = Math.floor(Math.random() * 150000) + 30000; // 30K to 180K
        break;
      default:
        baseAmount = Math.floor(Math.random() * 100000) + 25000; // 25K to 125K
    }

    // Some creditors might have zero balance (already settled)
    const hasOutstanding = Math.random() < 0.85; // 85% have outstanding amounts
    const amount = hasOutstanding ? baseAmount : 0;

    data.push({
      id: index + 1,
      Creditor: creditor.name,
      Amount: amount,
      // Additional fields for context (not displayed in table)
      type: creditor.type,
      hasOutstanding: hasOutstanding,
    });
  });

  // Sort by Amount (highest first), but keep zero amounts at the end
  data.sort((a, b) => {
    if (a.Amount === 0 && b.Amount === 0) return 0;
    if (a.Amount === 0) return 1;
    if (b.Amount === 0) return -1;
    return b.Amount - a.Amount;
  });

  return data;
};

export default function CreditorReport() {
  const toast = useRef(null);
  const [creditorList, setCreditorList] = useState([]);
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
    Creditor: { value: null, matchMode: FilterMatchMode.CONTAINS },
    Amount: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const columnOptions = [
    { field: "Creditor", header: "Creditor" },
    { field: "Amount", header: "Amount" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("creditorReport_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default - show ALL columns
    return columnOptions;
  });

  // Initialize dummy data
  useEffect(() => {
    const dummyData = generateDummyData();
    setCreditorList(dummyData);
    setTotalRecords(dummyData.length);

    // Simulate loading delay
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  const blankRow = {
    Creditor: "",
    Amount: "",
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
    if (creditorList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = creditorList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (["Amount"].includes(col.field)) {
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

    const filename = "creditor_report.csv";
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
    if (creditorList.length === 0) {
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
        orientation: "portrait",
        unit: "pt",
        format: "A4",
      });

      const head = [visibleFields.map((col) => col.header)];
      const body = creditorList.map((row) =>
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
          fontSize: 9,
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
            const softened = raw.replace(/(\S{35})/g, "$1\u200B");
            if (softened !== raw) data.cell.text = [softened];
          }
        },
      });

      doc.save("creditor_report.pdf");
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
    if (creditorList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = creditorList.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (["Amount"].includes(col.field)) {
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

      saveAsExcelFile(excelBuffer, "creditor_report");
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

    // Ensure Creditor is always included (mandatory field)
    if (!selectedColumns.some((col) => col.field === "Creditor")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "Creditor"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "creditorReport_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Creditor Report
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
  const creditorBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span>{rowData.Creditor || "-"}</span>
    );
  };

  const amountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span
        className={`font-bold ${rowData.Amount > 0 ? "text-red-600" : "text-green-600"}`}
      >
        ₹{rowData.Amount ? Number(rowData.Amount).toFixed(2) : "0.00"}
      </span>
    );
  };

  // Calculate totals for footer
  const calculateTotals = () => {
    const totalAmount = creditorList.reduce(
      (acc, row) => acc + (row.Amount || 0),
      0,
    );
    const creditorCount = creditorList.filter((row) => row.Amount > 0).length;
    return { totalAmount, creditorCount, totalCreditors: creditorList.length };
  };

  const totals = calculateTotals();

  // Create footer column group
  const footerGroup = (
    <ColumnGroup>
      <Row>
        <Column footer="" style={{ minWidth: "5rem" }} />
        {visibleFields.some((col) => col.field === "Creditor") && (
          <Column
            footer={`Total Outstanding (${totals.creditorCount}/${totals.totalCreditors} active):`}
            footerStyle={{ textAlign: "right", fontWeight: "bold" }}
            style={{ minWidth: "20rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "Amount") && (
          <Column
            footer={`₹${totals.totalAmount.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold", color: "#dc2626" }}
            style={{ minWidth: "12rem" }}
          />
        )}
      </Row>
    </ColumnGroup>
  );

  return (
    <Page title="Creditor Report">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : creditorList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                footerColumnGroup={!isLoading ? footerGroup : null}
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={["Creditor", "Amount"]}
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
                stateKey="creditorReportTableFilters"
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
                {visibleFields.some((col) => col.field === "Creditor") && (
                  <Column
                    field="Creditor"
                    header="Creditor"
                    style={{ minWidth: "20rem" }}
                    body={creditorBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Creditor"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "Amount") && (
                  <Column
                    field="Amount"
                    header="Amount"
                    style={{ minWidth: "12rem" }}
                    body={amountBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Amount"
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
