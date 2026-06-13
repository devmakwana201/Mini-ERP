import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { WarehouseService } from "services/master-records/warehouse";
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
import { CommonApi } from "services/common/commonapi";
import { Dropdown } from "primereact/dropdown";
import EmptyMessage from "components/shared/EmptyMessage";
import { InputSwitch } from "primereact/inputswitch";
import { Tag } from "primereact/tag";

export default function WarehouseManagement() {
  const toast = useRef(null);
  const [warehouseList, setWarehouseList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const actionOverlayRef = useRef(null);
  const [selectedRow, setSelectedRow] = useState(null);

  // Delete states
  const [deleteWarehouseDialog, setDeleteWarehouseDialog] = useState(false);
  const [deleteWarehouseId, setDeleteWarehouseId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Add/Edit dialog states
  const [warehouseDialog, setWarehouseDialog] = useState(false);
  const [editWarehouseId, setEditWarehouseId] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Location dropdown states
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationList, setLocationList] = useState([]);

  // Form data and validation
  const [formData, setFormData] = useState({
    warehouseName: "",
    locationId: null,
    isDefaultWarehouse: false,
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
    warehousename: { value: null, matchMode: FilterMatchMode.CONTAINS },
    locationname: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const columnOptions = [
    { field: "warehousename", header: "Warehouse Name" },
    { field: "locationname", header: "Location" },
    { field: "isdefaultwarehouse", header: "Default Warehouse" },
    { field: "createddate", header: "Created Date" },
  ];

  // Form validation
  const validateForm = () => {
    const errors = {};

    if (!formData.warehouseName?.trim()) {
      errors.warehouseName = "Warehouse Name is required";
    }

    if (!formData.locationId) {
      errors.locationId = "Location is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Load location data
  const loadLocationData = async () => {
    try {
      setLocationLoading(true);
      const data = await CommonApi.getLocationList();
      setLocationList(data);
    } catch (error) {
      console.error("Error loading locations:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message || error.message || "Failed to load locations",
        life: 3000,
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      warehouseName: "",
      locationId: null,
      isDefaultWarehouse: false,
    });
    setFormErrors({});
  };

  const hideDialog = () => {
    setEditWarehouseId(null);
    setWarehouseDialog(false);
    resetForm();
  };

  const openAddDialog = () => {
    setEditWarehouseId(null);
    setWarehouseDialog(true);
    resetForm();
    loadLocationData(); // Load locations when dialog opens
  };

  // Save Warehouse
  const saveWarehouse = async () => {
    if (!validateForm()) return;

    try {
      setSaveLoading(true);

      let response;
      if (editWarehouseId) {
        // Update existing Warehouse
        response = await WarehouseService.updateWarehouse(
          editWarehouseId,
          formData,
        );
      } else {
        // Create new Warehouse
        response = await WarehouseService.createWarehouse(formData);
      }

      if (response.success) {
        toast.current?.show({
          severity: "success",
          summary: "Success",
          detail: response?.message || "Operation completed successfully",
          life: 3000,
        });

        hideDialog();
        fetchWarehouses(); // Refresh the list
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.details?.[0]?.message ||
            response.message ||
            `Failed to ${editWarehouseId ? "update" : "create"} Warehouse`,
          life: 3000,
        });
      }
    } catch (error) {
      console.error(
        `Error ${editWarehouseId ? "updating" : "creating"} Warehouse:`,
        error,
      );
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          `Failed to ${editWarehouseId ? "update" : "create"} Warehouse`,
        life: 3000,
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("warehouseList_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default columns if nothing in session - all columns visible
    return columnOptions;
  });

  const fetchWarehouses = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await WarehouseService.getFormattedWarehouses({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
      });

      if (response.success) {
        setWarehouseList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        console.error("Failed to fetch warehouses:", response.error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: response.error?.message || "Failed to load warehouse data",
          life: 3000,
        });
        setWarehouseList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error fetching warehouse data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load warehouse data",
        life: 3000,
      });
      setWarehouseList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchWarehouses();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchWarehouses]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("warehouseTableFilters");
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
    warehousename: "",
    locationname: "",
    isdefaultwarehouse: "",
    createddate: "",
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
    if (warehouseList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = warehouseList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (col.field === "isdefaultwarehouse") {
          formattedRow[col.header] = row[col.field] === 1 ? "Yes" : "No";
        } else if (col.field === "createddate") {
          formattedRow[col.header] = row[col.field]
            ? new Date(row[col.field]).toLocaleDateString()
            : "-";
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

    const filename = "warehouses.csv";
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
    if (warehouseList.length === 0) {
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
      const body = warehouseList.map((row) =>
        visibleFields.map((col) => {
          if (col.field === "isdefaultwarehouse") {
            return row[col.field] === 1 ? "Yes" : "No";
          } else if (col.field === "createddate") {
            return row[col.field]
              ? new Date(row[col.field]).toLocaleDateString()
              : "-";
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

      doc.save("warehouses.pdf");
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
    if (warehouseList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = warehouseList.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (col.field === "isdefaultwarehouse") {
            filteredRow[col.header] = row[col.field] === 1 ? "Yes" : "No";
          } else if (col.field === "createddate") {
            filteredRow[col.header] = row[col.field]
              ? new Date(row[col.field]).toLocaleDateString()
              : "-";
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

      saveAsExcelFile(excelBuffer, "warehouses");
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

    // Ensure warehousename is always included
    if (!selectedColumns.some((col) => col.field === "warehousename")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "warehousename"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "warehouseList_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Warehouse List
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

  const editWarehouse = async (rowData) => {
    try {
      setFormLoading(true);
      setEditWarehouseId(rowData.warehouseid);
      setWarehouseDialog(true);

      // Load location data first
      loadLocationData();

      const response = await WarehouseService.getWarehouseById(
        rowData.warehouseid,
      );

      if (response.success) {
        setFormData({
          warehouseName: response.data.warehousename || "",
          locationId: response.data.locationid || null,
          isDefaultWarehouse: response.data.isdefaultwarehouse === 1,
        });
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.details?.[0]?.message ||
            response.message ||
            "Failed to fetch Warehouse data",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching Warehouse:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to fetch Warehouse data",
        life: 3000,
      });
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDeleteWarehouse = (rowData) => {
    setDeleteWarehouseDialog(true);
    setDeleteWarehouseId(rowData.warehouseid);
  };

  const hideDeleteWarehouseDialog = () => {
    setDeleteWarehouseDialog(false);
  };

  const handleDeleteWarehouse = async (warehouseId) => {
    setDeleteLoading(true);
    try {
      const res = await WarehouseService.deleteWarehouse(warehouseId);
      if (res.success) {
        toast.current.show({
          severity: "success",
          summary: "Success",
          detail: res.message || "Operation completed successfully",
          life: 3000,
        });
        hideDeleteWarehouseDialog();
        fetchWarehouses();
      } else {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail:
            res.error?.details?.[0]?.message ||
            res.message ||
            "Failed to delete Warehouse.",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error deleting Warehouse:", error);
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

  const deleteWarehouse = async () => {
    try {
      await handleDeleteWarehouse(deleteWarehouseId);
    } catch (error) {
      console.error("Error deleting Warehouse:", error);
    }
  };

  const deleteWarehouseDialogFooter = (
    <>
      <Button
        label="No"
        icon="pi pi-times"
        style={{ marginRight: "1rem" }}
        outlined
        onClick={hideDeleteWarehouseDialog}
        disabled={deleteLoading}
      />
      <Button
        label={deleteLoading ? "Deleting" : "Yes"}
        icon={deleteLoading ? "pi pi-spin pi-spinner" : "pi pi-check"}
        severity="danger"
        onClick={deleteWarehouse}
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

  const warehouseNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{rowData.warehousename || "-"}</span>
    );
  };

  const locationNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{rowData.locationname || "-"}</span>
    );
  };

  const defaultWarehouseBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <div style={{ textAlign: "center" }}>
        <Tag
          value={rowData.isdefaultwarehouse === 1 ? "Yes" : "No"}
          severity={rowData.isdefaultwarehouse === 1 ? "success" : "danger"}
        />
      </div>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const dateBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span>{formatDate(rowData.createddate)}</span>
    );
  };

  return (
    <Page title="Warehouse List">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : warehouseList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No warehouses found"
                    subtitle="No warehouses match your current filters. Try adjusting your search criteria or add a new warehouse."
                  />
                }
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={["warehousename", "locationname"]}
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
                stateKey="warehouseTableFilters"
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
                {visibleFields.some((col) => col.field === "warehousename") && (
                  <Column
                    field="warehousename"
                    header="Warehouse Name"
                    style={{ minWidth: "15rem" }}
                    body={warehouseNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Warehouse Name"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "locationname") && (
                  <Column
                    field="locationname"
                    header="Location"
                    style={{ minWidth: "12rem" }}
                    body={locationNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Location"
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "isdefaultwarehouse",
                ) && (
                  <Column
                    field="isdefaultwarehouse"
                    header="Default Warehouse"
                    style={{ minWidth: "12rem" }}
                    headerStyle={{ display: "flex", justifyContent: "center" }}
                    body={defaultWarehouseBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "createddate") && (
                  <Column
                    field="createddate"
                    header="Created Date"
                    style={{ minWidth: "10rem" }}
                    body={dateBodyTemplate}
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
                      editWarehouse(selectedRow);
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
                      confirmDeleteWarehouse(selectedRow);
                      actionOverlayRef.current.hide();
                    }}
                  />
                </div>
              </OverlayPanel>

              {/* Delete Dialog */}
              <Dialog
                visible={deleteWarehouseDialog}
                style={{ width: "32rem" }}
                breakpoints={{ "960px": "75vw", "641px": "90vw" }}
                header="Confirm"
                modal
                footer={deleteWarehouseDialogFooter}
                onHide={hideDeleteWarehouseDialog}
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
                  <span>Are you sure you want to delete this Warehouse?</span>
                </div>
              </Dialog>

              {/* Add/Update Warehouse Dialog */}
              <Dialog
                visible={warehouseDialog}
                style={{ width: "40rem" }}
                breakpoints={{ "960px": "75vw", "641px": "90vw" }}
                header={editWarehouseId ? "Update Warehouse" : "Add Warehouse"}
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
                          ? editWarehouseId
                            ? "Updating..."
                            : "Adding..."
                          : editWarehouseId
                            ? "Update"
                            : "Add"
                      }
                      icon={
                        saveLoading ? "pi pi-spin pi-spinner" : "pi pi-check"
                      }
                      onClick={saveWarehouse}
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
                  {/* Warehouse Name */}
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
                          htmlFor="warehouseName"
                          className="label-default text-base font-semibold"
                        >
                          Warehouse Name <span className="text-red-600">*</span>
                        </label>
                        <InputText
                          id="warehouseName"
                          value={formData.warehouseName}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              warehouseName: e.target.value,
                            });
                            setFormErrors({
                              ...formErrors,
                              warehouseName: null,
                            });
                          }}
                          placeholder="Enter Warehouse Name"
                          autoFocus
                          className={
                            formErrors.warehouseName ? "p-invalid" : ""
                          }
                        />
                        {formErrors.warehouseName && (
                          <small className="p-error">
                            {formErrors.warehouseName}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Location */}
                  <div className="input-root">
                    {formLoading ? (
                      <>
                        <Skeleton
                          width="30%"
                          height="1.25rem"
                          className="mb-2"
                        />
                        <Skeleton width="100%" height="2.5rem" />
                      </>
                    ) : (
                      <>
                        <label
                          htmlFor="locationId"
                          className="label-default text-base font-semibold"
                        >
                          Location <span className="text-red-600">*</span>
                        </label>
                        <Dropdown
                          id="locationId"
                          value={formData.locationId}
                          options={locationList}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              locationId: e.value,
                            });
                            setFormErrors({ ...formErrors, locationId: null });
                          }}
                          placeholder="Select Location"
                          loading={locationLoading}
                          className={formErrors.locationId ? "p-invalid" : ""}
                          disabled={saveLoading || locationLoading}
                        />
                        {formErrors.locationId && (
                          <small className="p-error">
                            {formErrors.locationId}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Is Default Warehouse */}
                  <div className="input-root">
                    {formLoading ? (
                      <>
                        <Skeleton
                          width="50%"
                          height="1.25rem"
                          className="mb-2"
                        />
                        <Skeleton width="100%" height="2.5rem" />
                      </>
                    ) : (
                      <>
                        <label
                          htmlFor="isDefaultWarehouse"
                          className="label-default text-base font-semibold"
                        >
                          Is Default Warehouse
                        </label>
                        <InputSwitch
                          id="isDefaultWarehouse"
                          checked={formData.isDefaultWarehouse}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              isDefaultWarehouse: e.value,
                            })
                          }
                          disabled={saveLoading}
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
