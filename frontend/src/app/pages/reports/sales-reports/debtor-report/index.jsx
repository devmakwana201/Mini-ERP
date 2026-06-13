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

// Dummy data for Debtor Report
const generateDummyData = () => {
  const debtors = [
    { name: "Raj Kumar Singh", mobile: "+91 9876543210", region: "North" },
    { name: "Priya Sharma", mobile: "+91 8765432109", region: "South" },
    { name: "Amit Patel", mobile: "+91 7654321098", region: "West" },
    { name: "Sunita Devi", mobile: "+91 6543210987", region: "East" },
    { name: "Ramesh Gupta", mobile: "+91 5432109876", region: "Central" },
    { name: "Kavitha Reddy", mobile: "+91 4321098765", region: "South" },
    { name: "Manoj Yadav", mobile: "+91 3210987654", region: "North" },
    { name: "Deepika Jain", mobile: "+91 2109876543", region: "West" },
    { name: "Suresh Kumar", mobile: "+91 1098765432", region: "East" },
    { name: "Anita Singh", mobile: "+91 9087654321", region: "Central" },
    { name: "Vikram Choudhary", mobile: "+91 8976543210", region: "North" },
    { name: "Meera Agarwal", mobile: "+91 7865432109", region: "West" },
    { name: "Harish Verma", mobile: "+91 6754321098", region: "South" },
    { name: "Pooja Malhotra", mobile: "+91 5643210987", region: "East" },
    { name: "Ravi Joshi", mobile: "+91 4532109876", region: "Central" },
    { name: "Sita Rani", mobile: "+91 3421098765", region: "North" },
    { name: "Ajay Tiwari", mobile: "+91 2310987654", region: "South" },
    { name: "Nisha Bansal", mobile: "+91 1209876543", region: "West" },
    { name: "Gopal Das", mobile: "+91 9876543211", region: "East" },
    { name: "Rekha Kumari", mobile: "+91 8765432110", region: "Central" },
  ];

  const data = [];

  debtors.forEach((debtor, index) => {
    // Generate random overdue limit (5000 to 100000)
    const overdueLimit = Math.floor(Math.random() * 95000) + 5000;

    // Generate outstanding amount (60-120% of overdue limit to simulate various debt levels)
    const debtRatio = 0.6 + Math.random() * 0.6; // 0.6 to 1.2
    const outstandingAmount = Math.floor(overdueLimit * debtRatio);

    data.push({
      id: index + 1,
      Debtor: debtor.name,
      Mobile: debtor.mobile,
      OverdueLimit: overdueLimit,
      OutstandingAmount: outstandingAmount,
    });
  });

  return data;
};

export default function DebtorReport() {
  const toast = useRef(null);
  const [debtorList, setDebtorList] = useState([]);
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
    Debtor: { value: null, matchMode: FilterMatchMode.CONTAINS },
    Mobile: { value: null, matchMode: FilterMatchMode.CONTAINS },
    OverdueLimit: { value: null, matchMode: FilterMatchMode.EQUALS },
    OutstandingAmount: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const columnOptions = [
    { field: "Debtor", header: "Debtor" },
    { field: "Mobile", header: "Mobile" },
    { field: "OverdueLimit", header: "Overdue Limit" },
    { field: "OutstandingAmount", header: "Outstanding Amount" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("debtorReport_visibleFields");
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
    setDebtorList(dummyData);
    setTotalRecords(dummyData.length);

    // Simulate loading delay
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  const blankRow = {
    Debtor: "",
    Mobile: "",
    OverdueLimit: "",
    OutstandingAmount: "",
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
    if (debtorList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = debtorList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (["OverdueLimit", "OutstandingAmount"].includes(col.field)) {
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

    const filename = "debtor_report.csv";
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
    if (debtorList.length === 0) {
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
      const body = debtorList.map((row) =>
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

      doc.save("debtor_report.pdf");
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
    if (debtorList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = debtorList.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (["OverdueLimit", "OutstandingAmount"].includes(col.field)) {
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

      saveAsExcelFile(excelBuffer, "debtor_report");
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

    // Ensure Debtor is always included
    if (!selectedColumns.some((col) => col.field === "Debtor")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "Debtor"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "debtorReport_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Debtor Report
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
  const debtorBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-purple-600">
        {rowData.Debtor || "-"}
      </span>
    );
  };

  const mobileBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-medium">{rowData.Mobile || "-"}</span>
    );
  };

  const overdueLimitBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-orange-600">
        ₹
        {rowData.OverdueLimit
          ? Number(rowData.OverdueLimit).toFixed(2)
          : "0.00"}
      </span>
    );
  };

  const outstandingAmountBodyTemplate = (rowData) => {
    const isOverdue = rowData.OutstandingAmount > rowData.OverdueLimit;
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span
        className={`font-bold ${isOverdue ? "text-red-600" : "text-green-600"}`}
      >
        ₹
        {rowData.OutstandingAmount
          ? Number(rowData.OutstandingAmount).toFixed(2)
          : "0.00"}
      </span>
    );
  };

  // Calculate totals for footer
  const calculateTotals = () => {
    const totals = debtorList.reduce(
      (acc, row) => {
        acc.overdueLimit += row.OverdueLimit || 0;
        acc.outstandingAmount += row.OutstandingAmount || 0;
        return acc;
      },
      { overdueLimit: 0, outstandingAmount: 0 },
    );
    return totals;
  };

  const totals = calculateTotals();

  return (
    <Page title="Debtor Report">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : debtorList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "Debtor",
                  "Mobile",
                  "OverdueLimit",
                  "OutstandingAmount",
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
                stateKey="debtorReportTableFilters"
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
                          (col) => col.field === "Debtor",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "Mobile",
                        ) && <Column footer="" />}
                        {visibleFields.some(
                          (col) => col.field === "OverdueLimit",
                        ) && (
                          <Column
                            footer={`₹${totals.overdueLimit.toFixed(2)}`}
                            className="font-bold text-orange-600"
                          />
                        )}
                        {visibleFields.some(
                          (col) => col.field === "OutstandingAmount",
                        ) && (
                          <Column
                            footer={`₹${totals.outstandingAmount.toFixed(2)}`}
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
                  style={{ minWidth: "5rem" }}
                />
                {visibleFields.some((col) => col.field === "Debtor") && (
                  <Column
                    field="Debtor"
                    header="Debtor"
                    style={{ minWidth: "14rem" }}
                    body={debtorBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Debtor"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "Mobile") && (
                  <Column
                    field="Mobile"
                    header="Mobile"
                    style={{ minWidth: "12rem" }}
                    body={mobileBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Mobile"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "OverdueLimit") && (
                  <Column
                    field="OverdueLimit"
                    header="Overdue Limit"
                    style={{ minWidth: "12rem" }}
                    body={overdueLimitBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Limit"
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "OutstandingAmount",
                ) && (
                  <Column
                    field="OutstandingAmount"
                    header="Outstanding Amount"
                    style={{ minWidth: "14rem" }}
                    body={outstandingAmountBodyTemplate}
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
