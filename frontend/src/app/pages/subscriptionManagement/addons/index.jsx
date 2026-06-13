import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { AddonService } from "services/subscription-management/addons";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
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
import { InputTextarea } from "primereact/inputtextarea";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { ParticularService } from "services/subscription-management/particulars";

export default function AddonsManagement() {
  const toast = useRef(null);
  const [addonsList, setAddonsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [particulars, setParticulars] = useState([]);

  const actionOverlayRef = useRef(null);
  const [selectedRow, setSelectedRow] = useState(null);

  // Delete states
  const [deleteAddonDialog, setDeleteAddonDialog] = useState(false);
  const [deleteAddonId, setDeleteAddonId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Add/Edit dialog states
  const [addonDialog, setAddonDialog] = useState(false);
  const [editAddonId, setEditAddonId] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form data and validation
  const [formData, setFormData] = useState({
    addonname: "",
    description: "",
    limitation: "",
    price: null,
    duration: null,
    particularid: null,
    isactive: 1,
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
    addonname: { value: null, matchMode: FilterMatchMode.CONTAINS },
    description: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const columnOptions = [
    { field: "addonname", header: "Addon Name" },
    { field: "description", header: "Description" },
    { field: "limitation", header: "Limitation" },
    { field: "price", header: "Price" },
    { field: "duration", header: "Duration (Days)" },
    { field: "particularname", header: "Particular" },
    { field: "isactive", header: "Status" },
  ];

  // Form validation
  const validateForm = () => {
    const errors = {};

    if (!formData.addonname?.trim()) {
      errors.addonname = "Addon name is required";
    }

    if (!formData.price || formData.price <= 0) {
      errors.price = "Price must be greater than 0";
    }

    if (!formData.duration || formData.duration <= 0) {
      errors.duration = "Duration must be greater than 0";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form handlers
  const resetForm = () => {
    setFormData({
      addonname: "",
      description: "",
      limitation: "",
      price: null,
      duration: null,
      particularid: null,
      isactive: 1,
    });
    setFormErrors({});
  };

  const hideDialog = () => {
    setEditAddonId(null);
    setAddonDialog(false);
    resetForm();
  };

  const openAddDialog = () => {
    setEditAddonId(null);
    setAddonDialog(true);
    resetForm();
  };

  // Save addon
  const saveAddon = async () => {
    if (!validateForm()) return;

    try {
      setSaveLoading(true);

      let response;
      if (editAddonId) {
        response = await AddonService.updateAddon(editAddonId, formData);
      } else {
        response = await AddonService.createAddon(formData);
      }

      if (response.success) {
        toast.current?.show({
          severity: "success",
          summary: "Success",
          detail: response?.message || "Operation completed successfully",
          life: 3000,
        });

        hideDialog();
        fetchAddons();
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.details?.[0]?.message ||
            response.message ||
            `Failed to ${editAddonId ? "update" : "create"} addon`,
          life: 3000,
        });
      }
    } catch (error) {
      console.error(`Error ${editAddonId ? "updating" : "creating"} addon:`, error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          `Failed to ${editAddonId ? "update" : "create"} addon`,
        life: 3000,
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("addonsList_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    return columnOptions;
  });

  const fetchAddons = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await AddonService.getFormattedAddons({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
      });

      if (response.success) {
        setAddonsList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        console.error("Failed to fetch addons:", response.error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: response.error?.message || "Failed to load addons data",
          life: 3000,
        });
        setAddonsList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error fetching addons data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load addons data",
        life: 3000,
      });
      setAddonsList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchAddons();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchAddons]);

  // Load particulars for dropdown
  useEffect(() => {
    const loadParticulars = async () => {
      try {
        const response = await ParticularService.getActiveParticulars();
        if (response.success) {
          setParticulars(response.data || []);
        }
      } catch (error) {
        console.error("Error loading particulars:", error);
      }
    };

    loadParticulars();
  }, []);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("addonsTableFilters");
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
    addonname: "",
    description: "",
    limitation: "",
    price: 0,
    duration: 0,
    particularname: "",
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
    if (addonsList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = addonsList.map((row) => {
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

    const filename = "addons.csv";
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
    if (addonsList.length === 0) {
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
      const body = addonsList.map((row) =>
        visibleFields.map((col) => {
          if (col.field === "isactive") {
            return row[col.field] ? "Active" : "Inactive";
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

      doc.save("addons.pdf");
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
    if (addonsList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = addonsList.map((row) => {
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

      saveAsExcelFile(excelBuffer, "addons");
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
        columnOptions.find((col) => col.field === "addonname"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "addonsList_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Addons Management
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

  const editAddon = async (rowData) => {
    try {
      setFormLoading(true);
      setEditAddonId(rowData.addonid);
      setAddonDialog(true);

      const response = await AddonService.getAddonById(rowData.addonid);

      if (response.success) {
        setFormData({
          addonname: response.data.addonname || "",
          description: response.data.description || "",
          limitation: response.data.limitation || "",
          price: response.data.price || null,
          duration: response.data.duration || null,
          particularid: response.data.particularid || null,
          isactive: response.data.isactive ?? 1,
        });
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.details?.[0]?.message ||
            response.message ||
            "Failed to fetch addon data",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching addon:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to fetch addon data",
        life: 3000,
      });
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDeleteAddon = (rowData) => {
    setDeleteAddonDialog(true);
    setDeleteAddonId(rowData.addonid);
  };

  const hideDeleteAddonDialog = () => {
    setDeleteAddonDialog(false);
  };

  const handleDeleteAddon = async (addonId) => {
    setDeleteLoading(true);
    try {
      const res = await AddonService.deleteAddon(addonId);
      if (res.success) {
        toast.current.show({
          severity: "success",
          summary: "Success",
          detail: res.message || "Operation completed successfully",
          life: 3000,
        });
        hideDeleteAddonDialog();
        fetchAddons();
      } else {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail:
            res.error?.details?.[0]?.message ||
            res.message ||
            "Failed to delete addon.",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error deleting addon:", error);
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

  const deleteAddon = async () => {
    try {
      await handleDeleteAddon(deleteAddonId);
    } catch (error) {
      console.error("Error deleting addon:", error);
    }
  };

  const deleteAddonDialogFooter = (
    <>
      <Button
        label="No"
        icon="pi pi-times"
        style={{ marginRight: "1rem" }}
        outlined
        onClick={hideDeleteAddonDialog}
        disabled={deleteLoading}
      />
      <Button
        label={deleteLoading ? "Deleting" : "Yes"}
        icon={deleteLoading ? "pi pi-spin pi-spinner" : "pi pi-check"}
        severity="danger"
        onClick={deleteAddon}
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

  const addonNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="20%" height="1.5rem" />
    ) : (
      <span className="font-semibold">{rowData.addonname || "-"}</span>
    );
  };

  const descriptionBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="30%" height="1.5rem" />
    ) : (
      <span>{rowData.description || "-"}</span>
    );
  };

  const limitationBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="25%" height="1.5rem" />
    ) : (
      <span>{rowData.limitation || "-"}</span>
    );
  };

  const particularBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="20%" height="1.5rem" />
    ) : (
      <span>{rowData.particularname || "-"}</span>
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

  const durationBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="15%" height="1.5rem" />
    ) : (
      <span>{rowData.duration ? `${rowData.duration} days` : "-"}</span>
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
    <Page title="Addons Management">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : addonsList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No addons found"
                    subtitle="No addons match your current filters. Try adjusting your search criteria or add a new addon."
                  />
                }
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={["addonname", "description"]}
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
                stateKey="addonsTableFilters"
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
                {visibleFields.some((col) => col.field === "addonname") && (
                  <Column
                    field="addonname"
                    header="Addon Name"
                    style={{ minWidth: "20rem" }}
                    body={addonNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Addon Name"
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
                {visibleFields.some((col) => col.field === "limitation") && (
                  <Column
                    field="limitation"
                    header="Limitation"
                    style={{ minWidth: "20rem" }}
                    body={limitationBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "particularname") && (
                  <Column
                    field="particularname"
                    header="Particular"
                    style={{ minWidth: "15rem" }}
                    body={particularBodyTemplate}
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
                {visibleFields.some((col) => col.field === "duration") && (
                  <Column
                    field="duration"
                    header="Duration"
                    style={{ minWidth: "12rem" }}
                    body={durationBodyTemplate}
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
                      editAddon(selectedRow);
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
                      confirmDeleteAddon(selectedRow);
                      actionOverlayRef.current.hide();
                    }}
                  />
                </div>
              </OverlayPanel>

              {/* Delete Dialog */}
              <Dialog
                visible={deleteAddonDialog}
                style={{ width: "32rem" }}
                breakpoints={{ "960px": "75vw", "641px": "90vw" }}
                header="Confirm"
                modal
                footer={deleteAddonDialogFooter}
                onHide={hideDeleteAddonDialog}
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
                  <span>Are you sure you want to delete this addon?</span>
                </div>
              </Dialog>

              {/* Add/Update Addon Dialog */}
              <Dialog
                visible={addonDialog}
                style={{ width: "45rem" }}
                breakpoints={{ "960px": "75vw", "641px": "90vw" }}
                header={editAddonId ? "Update Addon" : "Add Addon"}
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
                          ? editAddonId
                            ? "Updating..."
                            : "Adding..."
                          : editAddonId
                            ? "Update"
                            : "Add"
                      }
                      icon={
                        saveLoading ? "pi pi-spin pi-spinner" : "pi pi-check"
                      }
                      onClick={saveAddon}
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
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Addon Name */}
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
                          htmlFor="addonname"
                          className="label-default text-base font-semibold"
                        >
                          Addon Name <span className="text-red-600">*</span>
                        </label>
                        <InputText
                          id="addonname"
                          value={formData.addonname}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              addonname: e.target.value,
                            });
                            setFormErrors({
                              ...formErrors,
                              addonname: null,
                            });
                          }}
                          placeholder="Enter Addon Name"
                          autoFocus
                          className={formErrors.addonname ? "p-invalid" : ""}
                        />
                        {formErrors.addonname && (
                          <small className="p-error">
                            {formErrors.addonname}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Price */}
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
                          htmlFor="price"
                          className="label-default text-base font-semibold"
                        >
                          Price <span className="text-red-600">*</span>
                        </label>
                        <InputNumber
                          id="price"
                          value={formData.price}
                          onValueChange={(e) => {
                            setFormData({
                              ...formData,
                              price: e.value,
                            });
                            setFormErrors({
                              ...formErrors,
                              price: null,
                            });
                          }}
                          placeholder="Enter Price"
                          className={formErrors.price ? "p-invalid" : ""}
                          mode="decimal"
                          minFractionDigits={2}
                          maxFractionDigits={2}
                          min={0}
                        />
                        {formErrors.price && (
                          <small className="p-error">{formErrors.price}</small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Duration */}
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
                          htmlFor="duration"
                          className="label-default text-base font-semibold"
                        >
                          Duration (Days) <span className="text-red-600">*</span>
                        </label>
                        <InputNumber
                          id="duration"
                          value={formData.duration}
                          onValueChange={(e) => {
                            setFormData({
                              ...formData,
                              duration: e.value,
                            });
                            setFormErrors({
                              ...formErrors,
                              duration: null,
                            });
                          }}
                          placeholder="Enter Duration"
                          className={formErrors.duration ? "p-invalid" : ""}
                          min={1}
                        />
                        {formErrors.duration && (
                          <small className="p-error">{formErrors.duration}</small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Particular */}
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
                          htmlFor="particularid"
                          className="label-default text-base font-semibold"
                        >
                          Particular
                        </label>
                        <Dropdown
                          id="particularid"
                          value={formData.particularid}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              particularid: e.value,
                            });
                            setFormErrors({
                              ...formErrors,
                              particularid: null,
                            });
                          }}
                          options={particulars}
                          optionLabel="name"
                          optionValue="particularid"
                          placeholder="Select Particular"
                          className={formErrors.particularid ? "p-invalid" : ""}
                          filter
                        />
                        {formErrors.particularid && (
                          <small className="p-error">{formErrors.particularid}</small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Description */}
                  <div className="input-root md:col-span-2">
                    {formLoading ? (
                      <>
                        <Skeleton
                          width="40%"
                          height="1.25rem"
                          className="mt-2 mb-2"
                        />
                        <Skeleton width="100%" height="4rem" />
                      </>
                    ) : (
                      <>
                        <label
                          htmlFor="description"
                          className="label-default text-base font-semibold"
                        >
                          Description
                        </label>
                        <InputTextarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            });
                            setFormErrors({
                              ...formErrors,
                              description: null,
                            });
                          }}
                          placeholder="Enter Description"
                          rows={3}
                          className={
                            formErrors.description ? "p-invalid" : ""
                          }
                        />
                        {formErrors.description && (
                          <small className="p-error">
                            {formErrors.description}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Limitation */}
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
                          htmlFor="limitation"
                          className="label-default text-base font-semibold"
                        >
                          Limitation
                        </label>
                        <InputText
                          id="limitation"
                          value={formData.limitation}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              limitation: e.target.value,
                            });
                            setFormErrors({
                              ...formErrors,
                              limitation: null,
                            });
                          }}
                          placeholder="Enter limitation details"
                          className={
                            formErrors.limitation ? "p-invalid" : ""
                          }
                        />
                        {formErrors.limitation && (
                          <small className="p-error">
                            {formErrors.limitation}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Active/Inactive Switch */}
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
                          htmlFor="isactive"
                          className="label-default text-base font-semibold"
                        >
                          Status
                        </label>
                        <InputSwitch
                          id="isactive"
                          checked={formData.isactive === 1}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              isactive: e.value ? 1 : 0,
                            });
                          }}
                        />
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