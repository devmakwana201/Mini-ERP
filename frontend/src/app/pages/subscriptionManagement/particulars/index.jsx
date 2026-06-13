import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { ParticularService } from "services/subscription-management/particulars";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { InputSwitch } from "primereact/inputswitch";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { MultiSelect } from "primereact/multiselect";
import { Tooltip } from "primereact/tooltip";
import { unparse } from "papaparse";
import { Skeleton } from "primereact/skeleton";
import { FilterMatchMode } from "primereact/api";
import { OverlayPanel } from "primereact/overlaypanel";
import { scrollToTop } from "utils/scrollToTop";
import EmptyMessage from "components/shared/EmptyMessage";
import { Tag } from "primereact/tag";

export default function ParticularsManagement() {
  const toast = useRef(null);
  const [particularList, setParticularList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const actionOverlayRef = useRef(null);
  const [selectedRow, setSelectedRow] = useState(null);

  // Delete states
  const [deleteParticularDialog, setDeleteParticularDialog] = useState(false);
  const [deleteParticularId, setDeleteParticularId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Add/Edit dialog states
  const [particularDialog, setParticularDialog] = useState(false);
  const [editParticularId, setEditParticularId] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form data and validation
  const [formData, setFormData] = useState({
    name: "",
    isactive: true,
  });
  const [formErrors, setFormErrors] = useState({});

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [totalRecords, setTotalRecords] = useState(0);

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const columnOptions = [
    { field: "name", header: "Particular Name" },
    { field: "isactive", header: "Status" },
  ];

  // Form validation
  const validateForm = () => {
    const errors = {};

    if (!formData.name?.trim()) {
      errors.name = "Particular Name is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form handlers
  const resetForm = () => {
    setFormData({
      name: "",
      isactive: true,
    });
    setFormErrors({});
  };

  const hideDialog = () => {
    setEditParticularId(null);
    setParticularDialog(false);
    resetForm();
  };

  const openAddDialog = () => {
    setEditParticularId(null);
    setParticularDialog(true);
    resetForm();
  };

  // Save particular
  const saveParticular = async () => {
    if (!validateForm()) return;

    try {
      setSaveLoading(true);

      let response;
      if (editParticularId) {
        // Update existing particular
        response = await ParticularService.updateParticular(
          editParticularId,
          {
            name: formData.name,
            isactive: formData.isactive ? 1 : 0,
          }
        );
      } else {
        // Create new particular
        response = await ParticularService.createParticular({
          name: formData.name,
          isactive: formData.isactive ? 1 : 0,
        });
      }

      if (response.success) {
        toast.current?.show({
          severity: "success",
          summary: "Success",
          detail: response?.message || "Operation completed successfully",
          life: 3000,
        });

        hideDialog();
        fetchParticulars(); // Refresh the list
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.details?.[0]?.message ||
            response.message ||
            `Failed to ${editParticularId ? "update" : "create"} particular`,
          life: 3000,
        });
      }
    } catch (error) {
      console.error(
        `Error ${editParticularId ? "updating" : "creating"} particular:`,
        error,
      );
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          `Failed to ${editParticularId ? "update" : "create"} particular`,
        life: 3000,
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("particularList_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default columns if nothing in session - all columns visible
    return columnOptions;
  });

  const fetchParticulars = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await ParticularService.getFormattedParticulars({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
      });

      if (response.success) {
        setParticularList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        console.error("Failed to fetch particulars:", response.error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: response.error?.message || "Failed to load particulars data",
          life: 3000,
        });
        setParticularList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error fetching particulars data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load particulars data",
        life: 3000,
      });
      setParticularList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchParticulars();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchParticulars]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("particularTableFilters");
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
    particularname: "",
    particulardesc: "",
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
    if (particularList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = particularList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (col.field === "isactive") {
          formattedRow[col.header] = row[col.field] ? "Active" : "Inactive";
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

    const filename = "particulars.csv";
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
    if (particularList.length === 0) {
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
      const body = particularList.map((row) =>
        visibleFields.map((col) => {
          if (col.field === "isactive") {
            return row[col.field] ? "Active" : "Inactive";
          }
          return row[col.field] ?? "-";
        }),
      );

      // --- Equal column widths ---
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

      doc.save("particulars.pdf");
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
    if (particularList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = particularList.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (col.field === "isactive") {
            filteredRow[col.header] = row[col.field] ? "Active" : "Inactive";
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

      saveAsExcelFile(excelBuffer, "particulars");
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

    // Ensure at least one column is always visible
    if (selectedColumns.length === 0) {
      selectedColumns = [
        columnOptions.find((col) => col.field === "particularname"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "particularList_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Particulars Management
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
            onClick={openAddDialog}
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

  const editParticular = async (rowData) => {
    try {
      setFormLoading(true);
      setEditParticularId(rowData.particularid);
      setParticularDialog(true);

      const response = await ParticularService.getParticularById(rowData.particularid);

      if (response.success) {
        setFormData({
          name: response.data.name || "",
          isactive: response.data.isactive === 1 || response.data.isactive === true,
        });
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.details?.[0]?.message ||
            response.message ||
            "Failed to fetch particular data",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching particular:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to fetch particular data",
        life: 3000,
      });
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDeleteParticular = (rowData) => {
    setDeleteParticularDialog(true);
    setDeleteParticularId(rowData.particularid);
  };

  const hideDeleteParticularDialog = () => {
    setDeleteParticularDialog(false);
  };

  const handleDeleteParticular = async (particularId) => {
    setDeleteLoading(true);
    try {
      const res = await ParticularService.deleteParticular(particularId);
      if (res.success) {
        toast.current.show({
          severity: "success",
          summary: "Success",
          detail: res.message || "Operation completed successfully",
          life: 3000,
        });
        hideDeleteParticularDialog();
        fetchParticulars();
      } else {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail:
            res.error?.details?.[0]?.message ||
            res.message ||
            "Failed to delete particular.",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error deleting particular:", error);
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

  const deleteParticular = async () => {
    try {
      await handleDeleteParticular(deleteParticularId);
    } catch (error) {
      console.error("Error deleting particular:", error);
    }
  };

  const deleteParticularDialogFooter = (
    <>
      <Button
        label="No"
        icon="pi pi-times"
        style={{ marginRight: "1rem" }}
        outlined
        onClick={hideDeleteParticularDialog}
        disabled={deleteLoading}
      />
      <Button
        label={deleteLoading ? "Deleting" : "Yes"}
        icon={deleteLoading ? "pi pi-spin pi-spinner" : "pi pi-check"}
        severity="danger"
        onClick={deleteParticular}
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

  const particularNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="20%" height="1.5rem" />
    ) : (
      <span>{rowData.name ? rowData.name : "-"}</span>
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
    <Page title="Particulars Management">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : particularList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No particulars found"
                    subtitle="No particulars match your current filters. Try adjusting your search criteria or add a new particular."
                  />
                }
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={["name"]}
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
                stateKey="particularTableFilters"
                rows={lazyParams.rows}
                first={lazyParams.first}
                totalRecords={totalRecords}
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50]}
                tableStyle={{ minWidth: "50rem" }}
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
                {visibleFields.some((col) => col.field === "name") && (
                  <Column
                    field="name"
                    header="Particular Name"
                    style={{ minWidth: "25rem" }}
                    body={particularNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Particular Name"
                    sortable
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
                    onClick={() => {
                      editParticular(selectedRow);
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
                      confirmDeleteParticular(selectedRow);
                      actionOverlayRef.current.hide();
                    }}
                  />
                </div>
              </OverlayPanel>

              {/* Delete Dialog */}
              <Dialog
                visible={deleteParticularDialog}
                style={{ width: "32rem" }}
                breakpoints={{ "960px": "75vw", "641px": "90vw" }}
                header="Confirm"
                modal
                footer={deleteParticularDialogFooter}
                onHide={hideDeleteParticularDialog}
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
                  <span>Are you sure you want to delete this particular?</span>
                </div>
              </Dialog>

              {/* Add/Update Particular Dialog */}
              <Dialog
                visible={particularDialog}
                style={{ width: "40rem" }}
                breakpoints={{ "960px": "75vw", "641px": "90vw" }}
                header={editParticularId ? "Update Particular" : "Add Particular"}
                modal
                className="p-fluid"
                footer={
                  <div className="flex justify-end gap-2">
                    <Button
                      label="Cancel"
                      icon="pi pi-times"
                      onClick={hideDialog}
                      disabled={saveLoading || formLoading}
                      className="border-none bg-red-500 text-white hover:bg-red-600"
                    />
                    <Button
                      label={
                        saveLoading
                          ? editParticularId
                            ? "Updating..."
                            : "Adding..."
                          : editParticularId
                            ? "Update"
                            : "Add"
                      }
                      icon={
                        saveLoading ? "pi pi-spin pi-spinner" : "pi pi-check"
                      }
                      onClick={saveParticular}
                      disabled={saveLoading || formLoading}
                      className="border-none bg-green-500 text-white hover:bg-green-600 disabled:opacity-70"
                    />
                  </div>
                }
                onHide={hideDialog}
                blockScroll={true}
                draggable={false}
                resizable={false}
                dismissableMask
              >
                <div className="grid gap-4 sm:grid-cols-1">
                  {/* Particular Name */}
                  <div className="input-root">
                    {formLoading ? (
                      <>
                        <Skeleton
                          width="40%"
                          height="1.25rem"
                          className="mb-2"
                        />
                        <Skeleton width="100%" height="2.5rem" />
                      </>
                    ) : (
                      <>
                        <label
                          htmlFor="name"
                          className="label-default text-base font-semibold"
                        >
                          Particular Name <span className="text-red-600">*</span>
                        </label>
                        <InputText
                          id="name"
                          value={formData.name}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              name: e.target.value,
                            });
                            setFormErrors({
                              ...formErrors,
                              name: null,
                            });
                          }}
                          placeholder="Enter Particular Name"
                          autoFocus
                          className={formErrors.name ? "p-invalid" : ""}
                        />
                        {formErrors.name && (
                          <small className="p-error">
                            {formErrors.name}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Status */}
                  <div className="input-root">
                    {formLoading ? (
                      <>
                        <Skeleton
                          width="40%"
                          height="1.25rem"
                          className="mt-2 mb-2"
                        />
                        <Skeleton width="100%" height="2.5rem" />
                      </>
                    ) : (
                      <>
                        <label
                          htmlFor="isactive"
                          className="label-default text-base font-semibold"
                        >
                          Status
                        </label>
                        <div className="flex items-center gap-2 mt-2">
                          <InputSwitch
                            id="isactive"
                            checked={formData.isactive}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                isactive: e.value,
                              });
                            }}
                          />
                          <span className="text-sm">
                            {formData.isactive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}