import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { RoleService } from "services/master-records/roles";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { useNavigate } from "react-router";
import { Dialog } from "primereact/dialog";
import { MultiSelect } from "primereact/multiselect";
import { Tooltip } from "primereact/tooltip";
import { unparse } from "papaparse";
import { Skeleton } from "primereact/skeleton";
import { FilterMatchMode } from "primereact/api";
import { OverlayPanel } from "primereact/overlaypanel";
import { scrollToTop } from "utils/scrollToTop";
import EmptyMessage from "components/shared/EmptyMessage";

export default function Role() {
  const toast = useRef(null);
  const navigate = useNavigate();
  const [roleList, setRoleList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const actionOverlayRef = useRef(null);
  const [selectedRow, setSelectedRow] = useState(null);

  // Delete states
  const [deleteRoleDialog, setDeleteRoleDialog] = useState(false);
  const [deleteRoleId, setDeleteRoleId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Add/Edit dialog states
  const [roleDialog, setRoleDialog] = useState(false);
  const [editRoleId, setEditRoleId] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form data and validation
  const [formData, setFormData] = useState({
    roleName: "",
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
    rolename: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const columnOptions = [{ field: "rolename", header: "Role Name" }];

  // Form validation
  const validateForm = () => {
    const errors = {};

    if (!formData.roleName?.trim()) {
      errors.roleName = "Role Name is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form handlers
  const resetForm = () => {
    setFormData({
      roleName: "",
    });
    setFormErrors({});
  };

  const hideDialog = () => {
    setEditRoleId(null);
    setRoleDialog(false);
    resetForm();
  };

  const openAddDialog = () => {
    setEditRoleId(null);
    setRoleDialog(true);
    resetForm();
  };

  // Save Role
  const saveRole = async () => {
    if (!validateForm()) return;

    try {
      setSaveLoading(true);

      let response;
      if (editRoleId) {
        // Update existing Role
        response = await RoleService.updateRole(editRoleId, formData);
      } else {
        // Create new Role
        response = await RoleService.createRole(formData);
      }

      if (response.success) {
        toast.current?.show({
          severity: "success",
          summary: "Success",
          detail: response?.message || "Operation completed successfully",
          life: 3000,
        });

        hideDialog();
        fetchRoles(); // Refresh the list
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.details?.[0]?.message ||
            response.message ||
            `Failed to ${editRoleId ? "update" : "create"} role`,
          life: 3000,
        });
      }
    } catch (error) {
      console.error(`Error ${editRoleId ? "updating" : "creating"} role:`, error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          `Failed to ${editRoleId ? "update" : "create"} role`,
        life: 3000,
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("roleList_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default columns if nothing in session - all columns visible
    return columnOptions;
  });

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await RoleService.getFormattedRoles({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
      });

      if (response.success) {
        setRoleList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        console.error("Failed to fetch roles:", response.error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: response.error?.message || "Failed to load role data",
          life: 3000,
        });
        setRoleList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error fetching role data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message || error.message || "Failed to load role data",
        life: 3000,
      });
      setRoleList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchRoles();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchRoles]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("roleTableFilters");
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
    rolename: "",
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
    if (roleList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = roleList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        formattedRow[col.header] = row[col.field] ?? "-";
      });
      return formattedRow;
    });

    const csvData = unparse({
      fields: visibleFields.map((col) => col.header),
      data: formattedData.map((row) =>
        visibleFields.map((col) => row[col.header]),
      ),
    });

    const filename = "roles.csv";
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
    if (roleList.length === 0) {
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
      const body = roleList.map((row) =>
        visibleFields.map((col) => row[col.field] ?? "-"),
      );

      // --- Equal column widths ---
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = { top: 30, bottom: 20, left: 30, right: 30 };
      const usableWidth = pageWidth - margin.left - margin.right;
      const colWidth = Math.floor(usableWidth / visibleFields.length);

      const columnStyles = visibleFields.reduce((acc, _col, idx) => {
        acc[idx] = {
          cellWidth: colWidth, // fixed width per column
          overflow: "linebreak", // wrap instead of pushing width
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
          fillColor: [0, 128, 0], // green header background
          textColor: 255, // white text
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240], // light gray for stripes
        },
        columnStyles,
        margin,
        theme: "grid",
        // Soft-wrap ultra-long unbroken strings (adds zero-width spaces)
        didParseCell: (data) => {
          const raw = data.cell?.raw;
          if (typeof raw === "string") {
            const softened = raw.replace(/(\S{30})/g, "$1\u200B"); // insert ZWSP every 30 chars
            if (softened !== raw) data.cell.text = [softened];
          }
        },
      });

      doc.save("roles.pdf");
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
    if (roleList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = roleList.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          filteredRow[col.header] = row[col.field] ?? "-";
        });
        return filteredRow;
      });

      const worksheet = xlsx.utils.json_to_sheet(filteredData);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ["data"] };
      const excelBuffer = xlsx.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      saveAsExcelFile(excelBuffer, "roles");
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

    // Ensure rolename is always included (since it's the only column)
    if (!selectedColumns.some((col) => col.field === "rolename")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "rolename"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "roleList_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Role List
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

  const editRole = async (rowData) => {
    try {
      setFormLoading(true);
      setEditRoleId(rowData.roleid);
      setRoleDialog(true);

      const response = await RoleService.getRoleById(rowData.roleid);

      if (response.success) {
        setFormData({
          roleName: response.data.rolename || "",
        });
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.details?.[0]?.message ||
            response.message ||
            "Failed to fetch role data",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching role:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message || error.message || "Failed to fetch role data",
        life: 3000,
      });
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDeleteRole = (rowData) => {
    setDeleteRoleDialog(true);
    setDeleteRoleId(rowData.roleid);
  };

  const hideDeleteRoleDialog = () => {
    setDeleteRoleDialog(false);
  };

  const handleDeleteRole = async (roleId) => {
    setDeleteLoading(true);
    try {
      const res = await RoleService.deleteRole(roleId);
      if (res.success) {
        toast.current.show({
          severity: "success",
          summary: "Success",
          detail: res.message || "Operation completed successfully",
          life: 3000,
        });
        hideDeleteRoleDialog();
        fetchRoles();
      } else {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail:
            res.error?.details?.[0]?.message ||
            res.message ||
            "Failed to delete role.",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error deleting role:", error);
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

  const deleteRole = async () => {
    try {
      await handleDeleteRole(deleteRoleId);
    } catch (error) {
      console.error("Error deleting role:", error);
    }
  };

  const deleteRoleDialogFooter = (
    <>
      <Button
        label="No"
        icon="pi pi-times"
        style={{ marginRight: "1rem" }}
        outlined
        onClick={hideDeleteRoleDialog}
        disabled={deleteLoading}
      />
      <Button
        label={deleteLoading ? "Deleting" : "Yes"}
        icon={deleteLoading ? "pi pi-spin pi-spinner" : "pi pi-check"}
        severity="danger"
        onClick={deleteRole}
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

  const roleNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="20%" height="1.5rem" />
    ) : (
      <span>{rowData.rolename ? rowData.rolename : "-"}</span>
    );
  };

  return (
    <Page title="Role List">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : roleList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No roles found"
                    subtitle="No roles match your current filters. Try adjusting your search criteria or add a new role."
                  />
                }
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={["rolename"]}
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
                stateKey="roleTableFilters"
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
                {visibleFields.some((col) => col.field === "rolename") && (
                  <Column
                    field="rolename"
                    header="Role Name"
                    style={{ minWidth: "25rem" }}
                    body={roleNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Role Name"
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
                      editRole(selectedRow);
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
                      confirmDeleteRole(selectedRow);
                      actionOverlayRef.current.hide();
                    }}
                  />
                </div>
              </OverlayPanel>

              {/* Delete Dialog */}
              <Dialog
                visible={deleteRoleDialog}
                style={{ width: "32rem" }}
                breakpoints={{ "960px": "75vw", "641px": "90vw" }}
                header="Confirm"
                modal
                footer={deleteRoleDialogFooter}
                onHide={hideDeleteRoleDialog}
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
                  <span>Are you sure you want to delete this role?</span>
                </div>
              </Dialog>

              {/* Add/Update Role Dialog */}
              <Dialog
                visible={roleDialog}
                style={{ width: "40rem" }}
                breakpoints={{ "960px": "75vw", "641px": "90vw" }}
                header={editRoleId ? "Update Role" : "Add Role"}
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
                          ? editRoleId
                            ? "Updating..."
                            : "Adding..."
                          : editRoleId
                            ? "Update"
                            : "Add"
                      }
                      icon={
                        saveLoading ? "pi pi-spin pi-spinner" : "pi pi-check"
                      }
                      onClick={saveRole}
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
                  {/* Role Name */}
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
                          htmlFor="roleName"
                          className="label-default text-base font-semibold"
                        >
                          Role Name <span className="text-red-600">*</span>
                        </label>
                        <InputText
                          id="roleName"
                          value={formData.roleName}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              roleName: e.target.value,
                            });
                            setFormErrors({ ...formErrors, roleName: null });
                          }}
                          placeholder="Enter Role Name"
                          autoFocus
                          className={formErrors.roleName ? "p-invalid" : ""}
                        />
                        {formErrors.roleName && (
                          <small className="p-error">
                            {formErrors.roleName}
                          </small>
                        )}
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
