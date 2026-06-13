import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { SupplierService } from "services/master-records/supplier";
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

export default function SupplierManagement() {
  const toast = useRef(null);
  const navigate = useNavigate();
  const [supplierList, setSupplierList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const actionOverlayRef = useRef(null);
  const imageOverlayRef = useRef(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  // Delete states
  const [deleteSupplierDialog, setDeleteSupplierDialog] = useState(false);
  const [deleteSupplierId, setDeleteSupplierId] = useState(null);
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
    suppliername: { value: null, matchMode: FilterMatchMode.CONTAINS },
    cityname: { value: null, matchMode: FilterMatchMode.CONTAINS },
    statename: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const columnOptions = [
    { field: "suppliername", header: "Supplier Name" },
    { field: "supplierimage", header: "Supplier Image" },
    { field: "cityname", header: "City" },
    { field: "statename", header: "State" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("supplierList_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default columns if nothing in session - all columns visible
    return columnOptions;
  });

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await SupplierService.getFormattedSuppliers({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
      });

      if (response.success) {
        setSupplierList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        console.error("Failed to fetch suppliers:", response.error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: response.error?.message || "Failed to load supplier data",
          life: 3000,
        });
        setSupplierList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error fetching supplier data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load supplier data",
        life: 3000,
      });
      setSupplierList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchSuppliers();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchSuppliers]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("supplierTableFilters");
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
    suppliername: "",
    supplierimage: "",
    cityname: "",
    statename: "",
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
    if (supplierList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = supplierList.map((row) => {
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

    const filename = "suppliers.csv";
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
    if (supplierList.length === 0) {
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
      const body = supplierList.map((row) =>
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

      doc.save("suppliers.pdf");
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
    if (supplierList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = supplierList.map((row) => {
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

      saveAsExcelFile(excelBuffer, "suppliers");
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

    // Ensure suppliername is always included
    if (!selectedColumns.some((col) => col.field === "suppliername")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "suppliername"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "supplierList_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Supplier List
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
            onClick={() => {
              navigate("/master-records/inventory/supplier/add");
            }}
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

  const editSupplier = (rowData, event) => {
    const url = `/master-records/inventory/supplier/update/${rowData.id}`;

    // Check if Ctrl (Windows/Linux) or Cmd (Mac) is pressed
    if (event && (event.ctrlKey || event.metaKey)) {
      // Open in new tab
      window.open(url, '_blank');
    } else {
      // Navigate in same tab
      navigate(url);
    }
  };

  const confirmDeleteSupplier = (rowData) => {
    setDeleteSupplierDialog(true);
    setDeleteSupplierId(rowData.id);
  };

  const hideDeleteSupplierDialog = () => {
    setDeleteSupplierDialog(false);
  };

  const handleDeleteSupplier = async (supplierId) => {
    setDeleteLoading(true);
    try {
      const res = await SupplierService.deleteSupplier(supplierId);
      if (res.success) {
        toast.current.show({
          severity: "success",
          summary: "Success",
          detail: res.message || "Operation completed successfully",
          life: 3000,
        });
        hideDeleteSupplierDialog();
        fetchSuppliers();
      } else {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail:
            res.error?.details?.[0]?.message ||
            res.error?.message ||
            "Failed to delete supplier",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error deleting supplier:", error);
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

  const deleteSupplier = async () => {
    try {
      await handleDeleteSupplier(deleteSupplierId);
    } catch (error) {
      console.error("Error deleting supplier:", error);
    }
  };

  const deleteSupplierDialogFooter = (
    <>
      <Button
        label="No"
        icon="pi pi-times"
        style={{ marginRight: "1rem" }}
        outlined
        onClick={hideDeleteSupplierDialog}
        disabled={deleteLoading}
      />
      <Button
        label={deleteLoading ? "Deleting" : "Yes"}
        icon={deleteLoading ? "pi pi-spin pi-spinner" : "pi pi-check"}
        severity="danger"
        onClick={deleteSupplier}
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

  const supplierNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="40%" height="1.5rem" />
    ) : (
      <span>{rowData.suppliername ? rowData.suppliername : "-"}</span>
    );
  };

  const cityNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="40%" height="1.5rem" />
    ) : (
      <span>{rowData.cityname ? rowData.cityname : "-"}</span>
    );
  };

  const stateNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="40%" height="1.5rem" />
    ) : (
      <span>{rowData.statename ? rowData.statename : "-"}</span>
    );
  };

  const supplierImageBodyTemplate = (rowData) => {
    return (
      <div className="flex items-center justify-center">
        {isLoading ? (
          <Skeleton shape="circle" size="2.5rem" />
        ) : rowData.supplierimage ? (
          <img
            src={
              typeof rowData.supplierimage === "object" &&
              rowData.supplierimage.value
                ? rowData.supplierimage.value
                : rowData.supplierimage
            }
            alt="Supplier"
            loading="lazy"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              objectFit: "contain",
              border: "1px solid #ddd",
              cursor: "pointer",
            }}
            onClick={(e) => {
              setSelectedImage(
                typeof rowData.supplierimage === "object" &&
                  rowData.supplierimage.value
                  ? rowData.supplierimage.value
                  : rowData.supplierimage,
              );
              imageOverlayRef.current.toggle(e);
            }}
            onError={(e) => {
              e.target.src = "/images/Thumbnail.png";
            }}
          />
        ) : (
          <div
            style={{
              width: "40px",
              height: "40px",
              backgroundColor: "#f8f9fa",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #ddd",
              color: "#6c757d",
            }}
          >
            <i className="pi pi-image"></i>
          </div>
        )}
      </div>
    );
  };

  return (
    <Page title="Supplier List">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : supplierList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No suppliers found"
                    subtitle="No suppliers match your current filters. Try adjusting your search criteria or add a new supplier."
                  />
                }
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={["suppliername", "cityname", "statename"]}
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
                stateKey="supplierTableFilters"
                rows={lazyParams.rows}
                first={lazyParams.first}
                totalRecords={totalRecords}
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50]}
                tableStyle={{ minWidth: "60rem" }}
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
                {visibleFields.some((col) => col.field === "suppliername") && (
                  <Column
                    field="suppliername"
                    header="Supplier Name"
                    style={{ minWidth: "20rem" }}
                    body={supplierNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Supplier Name"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "supplierimage") && (
                  <Column
                    field="supplierimage"
                    header="Supplier Image"
                    style={{ minWidth: "10rem" }}
                    headerStyle={{ display: "flex", justifyContent: "center" }}
                    body={supplierImageBodyTemplate}
                    sortable={false}
                  />
                )}
                {visibleFields.some((col) => col.field === "cityname") && (
                  <Column
                    field="cityname"
                    header="City"
                    style={{ minWidth: "15rem" }}
                    body={cityNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search City"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "statename") && (
                  <Column
                    field="statename"
                    header="State"
                    style={{ minWidth: "15rem" }}
                    body={stateNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search State"
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
                      editSupplier(selectedRow, e);
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
                      confirmDeleteSupplier(selectedRow);
                      actionOverlayRef.current.hide();
                    }}
                  />
                </div>
              </OverlayPanel>

              {/* Image Preview Overlay */}
              <OverlayPanel
                ref={imageOverlayRef}
                style={{
                  width: "270px",
                  border: "1px solid #c3e6cb",
                  boxShadow:
                    "0 0 10px rgba(76, 175, 80, 0.15), 0 0 20px rgba(76, 175, 80, 0.08)",
                  borderRadius: "12px",
                }}
              >
                {selectedImage && (
                  <div className="flex items-center justify-center">
                    <img
                      src={selectedImage}
                      alt="Supplier Preview"
                      loading="lazy"
                      style={{
                        width: "250px",
                        height: "250px",
                        objectFit: "contain",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                        cursor: "pointer",
                      }}
                      onClick={() => window.open(selectedImage, "_blank")}
                      onError={(e) => {
                        e.target.src = "/images/Thumbnail.png";
                      }}
                    />
                  </div>
                )}
              </OverlayPanel>

              {/* Delete Dialog */}
              <Dialog
                visible={deleteSupplierDialog}
                style={{ width: "32rem" }}
                breakpoints={{ "960px": "75vw", "641px": "90vw" }}
                header="Confirm"
                modal
                footer={deleteSupplierDialogFooter}
                onHide={hideDeleteSupplierDialog}
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
                  <span>Are you sure you want to delete this supplier?</span>
                </div>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
