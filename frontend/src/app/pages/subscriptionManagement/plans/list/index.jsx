import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlanService } from "services/subscription-management/plans";
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
import { useNavigate } from "react-router";
import { Dialog } from "primereact/dialog";
import { Tag } from "primereact/tag";

export default function PlansList() {
  const toast = useRef(null);
  const navigate = useNavigate();
  const [plansList, setPlansList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const actionOverlayRef = useRef(null);
  const [selectedRow, setSelectedRow] = useState(null);

  // Delete states
  const [deletePlanDialog, setDeletePlanDialog] = useState(false);
  const [deletePlanId, setDeletePlanId] = useState(null);
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
    planname: { value: null, matchMode: FilterMatchMode.CONTAINS },
    description: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const columnOptions = [
    { field: "planname", header: "Plan Name" },
    { field: "description", header: "Description" },
    { field: "price", header: "Price" },
    { field: "amc_charges", header: "AMC Charges" },
    { field: "duration", header: "Duration (Days)" },
    { field: "frequency", header: "Frequency" },
    { field: "is_trial", header: "Trial" },
    { field: "details", header: "Features" },
    { field: "isactive", header: "Status" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("plansList_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default columns if nothing in session - show essential columns
    return columnOptions.filter((col) =>
      [
        "planname",
        "description",
        "price",
        "duration",
        "frequency",
        "details",
        "isactive",
      ].includes(col.field),
    );
  });

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await PlanService.getFormattedPlans({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
      });

      if (response.success) {
        setPlansList(response.data || []);
        setTotalRecords(
          response.pagination?.total || response.totalRecords || 0,
        );
      } else {
        console.error("Failed to fetch plans:", response.error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: response.error?.message || "Failed to load plans data",
          life: 3000,
        });
        setPlansList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error fetching plans data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message || error.message || "Failed to load plans data",
        life: 3000,
      });
      setPlansList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchPlans();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchPlans]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("plansTableFilters");
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
    planname: "",
    description: "",
    price: 0,
    amc_charges: 0,
    duration: 0,
    frequency: "",
    is_trial: 0,
    details: [],
    isactive: false,
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
    if (plansList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = plansList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (col.field === "isactive") {
          formattedRow[col.header] = row[col.field] ? "Active" : "Inactive";
        } else if (col.field === "details") {
          formattedRow[col.header] =
            row[col.field]?.map((detail) => detail.particularname).join(", ") ||
            "-";
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

    const filename = "plans.csv";
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
    if (plansList.length === 0) {
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
      const body = plansList.map((row) =>
        visibleFields.map((col) => {
          if (col.field === "isactive") {
            return row[col.field] ? "Active" : "Inactive";
          } else if (col.field === "details") {
            return (
              row[col.field]
                ?.map((detail) => detail.particularname)
                .join(", ") || "-"
            );
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

      doc.save("plans.pdf");
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
    if (plansList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = plansList.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (col.field === "isactive") {
            filteredRow[col.header] = row[col.field] ? "Active" : "Inactive";
          } else if (col.field === "details") {
            filteredRow[col.header] =
              row[col.field]
                ?.map((detail) => detail.particularname)
                .join(", ") || "-";
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

      saveAsExcelFile(excelBuffer, "plans");
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
      selectedColumns = [columnOptions.find((col) => col.field === "planname")];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "plansList_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Plans Management
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
            onClick={() => navigate("/subscription-management/plans/add")}
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

  const editPlan = (rowData, event) => {
    const url = `/subscription-management/plans/edit/${rowData.planid}`;

    // Check if Ctrl (Windows/Linux) or Cmd (Mac) is pressed
    if (event && (event.ctrlKey || event.metaKey)) {
      // Open in new tab
      window.open(url, "_blank");
    } else {
      // Navigate in same tab
      navigate(url);
    }
  };

  const confirmDeletePlan = (rowData) => {
    setDeletePlanDialog(true);
    setDeletePlanId(rowData.planid);
  };

  const hideDeletePlanDialog = () => {
    setDeletePlanDialog(false);
  };

  const handleDeletePlan = async (planId) => {
    setDeleteLoading(true);
    try {
      const res = await PlanService.deletePlan(planId);
      if (res.success) {
        toast.current.show({
          severity: "success",
          summary: "Success",
          detail: res.message || "Operation completed successfully",
          life: 3000,
        });
        hideDeletePlanDialog();
        fetchPlans();
      } else {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail:
            res.error?.details?.[0]?.message ||
            res.message ||
            "Failed to delete plan.",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error deleting plan:", error);
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

  const deletePlan = async () => {
    try {
      await handleDeletePlan(deletePlanId);
    } catch (error) {
      console.error("Error deleting plan:", error);
    }
  };

  const deletePlanDialogFooter = (
    <>
      <Button
        label="No"
        icon="pi pi-times"
        style={{ marginRight: "1rem" }}
        outlined
        onClick={hideDeletePlanDialog}
        disabled={deleteLoading}
      />
      <Button
        label={deleteLoading ? "Deleting" : "Yes"}
        icon={deleteLoading ? "pi pi-spin pi-spinner" : "pi pi-check"}
        severity="danger"
        onClick={deletePlan}
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

  const planNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="20%" height="1.5rem" />
    ) : (
      <span className="font-semibold">{rowData.planname || "-"}</span>
    );
  };

  const descriptionBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="30%" height="1.5rem" />
    ) : (
      <span>{rowData.description || "-"}</span>
    );
  };

  const priceBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="15%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-green-600">
        ₹{parseFloat(rowData.price || 0).toFixed(2)}
      </span>
    );
  };

  const amcChargesBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="15%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-blue-600">
        ₹{parseFloat(rowData.amc_charges || 0).toFixed(2)}
      </span>
    );
  };

  const durationBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="15%" height="1.5rem" />
    ) : (
      <span>{rowData.duration ? `${rowData.duration} days` : "-"}</span>
    );
  };

  const featuresBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="25%" height="1.5rem" />
    ) : (
      <div className="flex flex-wrap gap-1">
        {rowData.details && rowData.details.length > 0 ? (
          rowData.details
            .slice(0, 3)
            .map((detail, index) => (
              <Tag
                key={index}
                value={detail.particularname}
                severity="info"
                className="text-xs"
              />
            ))
        ) : (
          <span>No features</span>
        )}
        {rowData.details && rowData.details.length > 3 && (
          <Tag
            value={`+${rowData.details.length - 3} more`}
            severity="secondary"
            className="text-xs"
          />
        )}
      </div>
    );
  };

  const statusBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60px" height="1.5rem" />
    ) : (
      <Tag
        value={rowData.isactive ? "Active" : "Inactive"}
        severity={rowData.isactive ? "success" : "danger"}
      />
    );
  };

  return (
    <Page title="Plans Management">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : plansList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No plans found"
                    subtitle="No plans match your current filters. Try adjusting your search criteria or add a new plan."
                  />
                }
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={["planname", "description"]}
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
                stateKey="plansTableFilters"
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
                {visibleFields.some((col) => col.field === "planname") && (
                  <Column
                    field="planname"
                    header="Plan Name"
                    style={{ minWidth: "20rem" }}
                    body={planNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Plan Name"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "description") && (
                  <Column
                    field="description"
                    header="Description"
                    style={{ minWidth: "25rem" }}
                    body={descriptionBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Description"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "price") && (
                  <Column
                    field="price"
                    header="Price"
                    style={{ minWidth: "12rem" }}
                    body={priceBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "amc_charges") && (
                  <Column
                    field="amc_charges"
                    header="AMC Charges"
                    style={{ minWidth: "12rem" }}
                    body={amcChargesBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "duration") && (
                  <Column
                    field="duration"
                    header="Duration"
                    style={{ minWidth: "12rem" }}
                    body={durationBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "frequency") && (
                  <Column
                    field="frequency"
                    header="Frequency"
                    style={{ minWidth: "12rem" }}
                    body={(rowData) =>
                      isLoading ? (
                        <Skeleton width="80%" height="1.5rem" />
                      ) : (
                        <span>{rowData.frequency || "-"}</span>
                      )
                    }
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "is_trial") && (
                  <Column
                    field="is_trial"
                    header="Trial"
                    style={{ minWidth: "8rem" }}
                    body={(rowData) =>
                      isLoading ? (
                        <Skeleton width="60%" height="1.5rem" />
                      ) : (
                        <Tag
                          value={rowData.is_trial ? "Yes" : "No"}
                          severity={rowData.is_trial ? "info" : "secondary"}
                        />
                      )
                    }
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "details") && (
                  <Column
                    field="details"
                    header="Features"
                    style={{ minWidth: "25rem" }}
                    body={featuresBodyTemplate}
                  />
                )}
                {visibleFields.some((col) => col.field === "isactive") && (
                  <Column
                    field="isactive"
                    header="Status"
                    style={{ minWidth: "10rem" }}
                    body={statusBodyTemplate}
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
                      editPlan(selectedRow, e);
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
                      confirmDeletePlan(selectedRow);
                      actionOverlayRef.current.hide();
                    }}
                  />
                </div>
              </OverlayPanel>

              {/* Delete Dialog */}
              <Dialog
                visible={deletePlanDialog}
                style={{ width: "32rem" }}
                breakpoints={{ "960px": "75vw", "641px": "90vw" }}
                header="Confirm"
                modal
                footer={deletePlanDialogFooter}
                onHide={hideDeletePlanDialog}
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
                  <span>Are you sure you want to delete this plan?</span>
                </div>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
