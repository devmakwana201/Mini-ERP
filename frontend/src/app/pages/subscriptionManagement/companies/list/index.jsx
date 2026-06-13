import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { CompanyService } from "services/subscription-management/companies";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { MultiSelect } from "primereact/multiselect";
import { Tooltip } from "primereact/tooltip";
import { unparse } from "papaparse";
import { Skeleton } from "primereact/skeleton";
import { FilterMatchMode } from "primereact/api";
import { OverlayPanel } from "primereact/overlaypanel";
import { scrollToTop } from "utils/scrollToTop";
import EmptyMessage from "components/shared/EmptyMessage";
import { Tag } from "primereact/tag";
import { useNavigate } from "react-router";
import { Dialog } from "primereact/dialog";
import { format } from "date-fns";

export default function CompaniesList() {
  const toast = useRef(null);
  const navigate = useNavigate();
  const [companiesList, setCompaniesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const actionOverlayRef = useRef(null);
  const [selectedRow, setSelectedRow] = useState(null);

  // Delete states
  const [deleteCompanyDialog, setDeleteCompanyDialog] = useState(false);
  const [deleteCompanyId, setDeleteCompanyId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [totalRecords, setTotalRecords] = useState(0);

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    companyname: { value: null, matchMode: FilterMatchMode.CONTAINS },
    companyemailid: { value: null, matchMode: FilterMatchMode.CONTAINS },
    companycontactnumber: { value: null, matchMode: FilterMatchMode.CONTAINS },
    planname: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const columnOptions = [
    { field: "companyname", header: "Company Name" },
    { field: "companyemailid", header: "Email" },
    { field: "companycontactnumber", header: "Phone" },
    { field: "address", header: "Address" },
    { field: "planname", header: "Plan" },
    { field: "expirydate", header: "Expiry Date" },
    { field: "serialKey", header: "Serial Key" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("companiesList_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default columns if nothing in session - show essential columns
    return columnOptions.filter((col) =>
      [
        "companyname",
        "companyemailid",
        "companycontactnumber",
        "planname",
        "expirydate",
      ].includes(col.field),
    );
  });

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await CompanyService.getFormattedCompanies({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
      });

      if (response.success) {
        setCompaniesList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        console.error("Failed to fetch companies:", response.error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: response.error?.message || "Failed to load companies data",
          life: 3000,
        });
        setCompaniesList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error fetching companies data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load companies data",
        life: 3000,
      });
      setCompaniesList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCompanies();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchCompanies]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("companiesTableFilters");
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
    companyname: "",
    companyemailid: "",
    companycontactnumber: "",
    address: "",
    planname: "",
    expirydate: null,
    serialKey: "",
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
    if (companiesList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = companiesList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (col.field === "expirydate" && row[col.field]) {
          formattedRow[col.header] = format(
            new Date(row[col.field]),
            "dd/MM/yyyy",
          );
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

    const filename = "companies.csv";
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
    if (companiesList.length === 0) {
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
      const body = companiesList.map((row) =>
        visibleFields.map((col) => {
          if (col.field === "expirydate" && row[col.field]) {
            return format(new Date(row[col.field]), "dd/MM/yyyy");
          }
          return row[col.field] ?? "-";
        }),
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

      doc.save("companies.pdf");
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
    if (companiesList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = companiesList.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (col.field === "isactive") {
            filteredRow[col.header] = row[col.field] ? "Active" : "Inactive";
          } else if (col.field === "expirydate" && row[col.field]) {
            filteredRow[col.header] = format(
              new Date(row[col.field]),
              "dd/MM/yyyy",
            );
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

      saveAsExcelFile(excelBuffer, "companies");
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

    if (selectedColumns.length === 0) {
      selectedColumns = [
        columnOptions.find((col) => col.field === "companyname"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "companiesList_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Companies Management
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

          <Button
            label="Add"
            icon="pi pi-plus"
            size="small"
            onClick={() => navigate("/subscription-management/companies/add")}
          />
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

  const editCompany = (rowData, event) => {
    const url = `/subscription-management/companies/edit/${rowData.companyid}`;

    // Check if Ctrl (Windows/Linux) or Cmd (Mac) is pressed
    if (event && (event.ctrlKey || event.metaKey)) {
      // Open in new tab
      window.open(url, "_blank");
    } else {
      // Navigate in same tab
      navigate(url);
    }
  };

  const confirmDeleteCompany = (rowData) => {
    setDeleteCompanyDialog(true);
    setDeleteCompanyId(rowData.companyid);
  };

  const hideDeleteCompanyDialog = () => {
    setDeleteCompanyDialog(false);
  };

  const handleDeleteCompany = async (companyId) => {
    setDeleteLoading(true);
    try {
      const res = await CompanyService.deleteCompany(companyId);
      if (res.success) {
        toast.current.show({
          severity: "success",
          summary: "Success",
          detail: res.message || "Operation completed successfully",
          life: 3000,
        });
        hideDeleteCompanyDialog();
        fetchCompanies();
      } else {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail:
            res.error?.details?.[0]?.message ||
            res.message ||
            "Failed to delete company.",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error deleting company:", error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message || error.message || "Unexpected error occurred",
        life: 3000,
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const deleteCompany = async () => {
    try {
      await handleDeleteCompany(deleteCompanyId);
    } catch (error) {
      console.error("Error deleting company:", error);
    }
  };

  const deleteCompanyDialogFooter = (
    <>
      <Button
        label="No"
        icon="pi pi-times"
        style={{ marginRight: "1rem" }}
        outlined
        onClick={hideDeleteCompanyDialog}
        disabled={deleteLoading}
      />
      <Button
        label={deleteLoading ? "Deleting" : "Yes"}
        icon={deleteLoading ? "pi pi-spin pi-spinner" : "pi pi-check"}
        severity="danger"
        onClick={deleteCompany}
        disabled={deleteLoading}
      />
    </>
  );

  const menuBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton shape="circle" size="2.5rem" />
    ) : (
      <Button
        icon="pi pi-ellipsis-v"
        className="h-[2.5rem] w-[2.5rem]"
        rounded
        text
        aria-label="More Options"
        onClick={(e) => {
          setSelectedRow(rowData);
          actionOverlayRef.current.toggle(e);
        }}
      />
    );
  };

  const companyNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="20%" height="1.5rem" />
    ) : (
      <span>{rowData.companyname || "-"}</span>
    );
  };

  const emailBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="30%" height="1.5rem" />
    ) : (
      <span>{rowData.companyemailid || "-"}</span>
    );
  };

  const phoneBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="20%" height="1.5rem" />
    ) : (
      <span>{rowData.companycontactnumber || "-"}</span>
    );
  };

  const addressBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="25%" height="1.5rem" />
    ) : (
      <span>{rowData.address || "-"}</span>
    );
  };

  const planBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="15%" height="1.5rem" />
    ) : (
      <span>{rowData.planname || "-"}</span>
    );
  };

  const expiryDateBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="15%" height="1.5rem" />
    ) : rowData.expirydate ? (
      <span>{format(new Date(rowData.expirydate), "dd/MM/yyyy")}</span>
    ) : (
      "-"
    );
  };

  const serialKeyBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="20%" height="1.5rem" />
    ) : (
      <span className="font-mono text-sm">{rowData.serialKey || "-"}</span>
    );
  };

  return (
    <Page title="Companies Management">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : companiesList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No companies found"
                    subtitle="No companies match your current filters. Try adjusting your search criteria or add a new company."
                  />
                }
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "companyname",
                  "companyemailid",
                  "companycontactnumber",
                  "planname",
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
                stateKey="companiesTableFilters"
                rows={lazyParams.rows}
                first={lazyParams.first}
                totalRecords={totalRecords}
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50]}
                tableStyle={{ minWidth: "75rem" }}
                removableSort
              >
                <Column
                  header="Action"
                  body={menuBodyTemplate}
                  style={{ width: "3rem" }}
                />
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
                {visibleFields.some((col) => col.field === "companyname") && (
                  <Column
                    field="companyname"
                    header="Company Name"
                    style={{ minWidth: "20rem" }}
                    body={companyNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Company Name"
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "companyemailid",
                ) && (
                  <Column
                    field="companyemailid"
                    header="Email"
                    style={{ minWidth: "25rem" }}
                    body={emailBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Email"
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "companycontactnumber",
                ) && (
                  <Column
                    field="companycontactnumber"
                    header="Phone"
                    style={{ minWidth: "15rem" }}
                    body={phoneBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Phone"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "address") && (
                  <Column
                    field="address"
                    header="Address"
                    style={{ minWidth: "20rem" }}
                    body={addressBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "planname") && (
                  <Column
                    field="planname"
                    header="Plan"
                    style={{ minWidth: "15rem" }}
                    body={planBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Plan"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "expirydate") && (
                  <Column
                    field="expirydate"
                    header="Expiry Date"
                    style={{ minWidth: "12rem" }}
                    body={expiryDateBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "serialKey") && (
                  <Column
                    field="serialKey"
                    header="Serial Key"
                    style={{ minWidth: "20rem" }}
                    body={serialKeyBodyTemplate}
                    sortable
                  />
                )}
              </DataTable>

              <OverlayPanel ref={actionOverlayRef}>
                <div className="flex gap-2">
                  <Button
                    icon="pi pi-pencil"
                    rounded
                    outlined
                    className="p-0 text-xs"
                    style={{
                      fontSize: "0.7rem",
                      width: "2.5rem",
                      height: "2.5rem",
                    }}
                    onClick={(e) => {
                      editCompany(selectedRow, e);
                      actionOverlayRef.current.hide();
                    }}
                  />
                  <Button
                    icon="pi pi-trash"
                    rounded
                    outlined
                    severity="danger"
                    className="p-0 text-xs"
                    style={{
                      fontSize: "0.7rem",
                      width: "2.5rem",
                      height: "2.5rem",
                    }}
                    onClick={() => {
                      confirmDeleteCompany(selectedRow);
                      actionOverlayRef.current.hide();
                    }}
                  />
                </div>
              </OverlayPanel>

              {/* Delete Dialog */}
              <Dialog
                visible={deleteCompanyDialog}
                style={{ width: "32rem" }}
                breakpoints={{ "960px": "75vw", "641px": "90vw" }}
                header="Confirm"
                modal
                footer={deleteCompanyDialogFooter}
                onHide={hideDeleteCompanyDialog}
                blockScroll={true}
                draggable={false}
                resizable={false}
                dismissableMask
              >
                <div className="confirmation-content flex items-center">
                  <i
                    className="pi pi-exclamation-triangle mr-3"
                    style={{ fontSize: "2rem" }}
                  />
                  <span>Are you sure you want to delete this company?</span>
                </div>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
