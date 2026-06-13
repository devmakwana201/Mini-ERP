import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandService } from "services/master-records/brand";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
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
import { FileUpload } from "primereact/fileupload";
import { CommonApi } from "services/common/commonapi";
import EmptyMessage from "components/shared/EmptyMessage";

export default function BrandManagement() {
  const toast = useRef(null);
  const navigate = useNavigate();
  const [brandList, setBrandList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const actionOverlayRef = useRef(null);
  const imageOverlayRef = useRef(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  // Delete states
  const [deleteBrandDialog, setDeleteBrandDialog] = useState(false);
  const [deleteBrandId, setDeleteBrandId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Add/Edit dialog states
  const [brandDialog, setBrandDialog] = useState(false);
  const [editBrandId, setEditBrandId] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Master category dropdown states
  const [masterCategoryLoading, setMasterCategoryLoading] = useState(false);
  const [masterCategoryList, setMasterCategoryList] = useState([]);

  // Form data and validation
  const [formData, setFormData] = useState({
    brandName: "",
    brandDesc: "",
    brandIcon: null,
    brandCategory: [], // Array to store selected master category IDs
  });
  const [formErrors, setFormErrors] = useState({});

  // Image preview and remove states (matching Item Category pattern)
  const [imagePreview, setImagePreview] = useState(null);
  const [imagePreviewName, setImagePreviewName] = useState(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState(null);
  const [imageChanged, setImageChanged] = useState(false); // Track if image was changed

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [totalRecords, setTotalRecords] = useState(0);

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    brandname: { value: null, matchMode: FilterMatchMode.CONTAINS },
    branddesc: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const columnOptions = [
    { field: "brandname", header: "Brand Name" },
    { field: "branddesc", header: "Brand Description" },
    { field: "brandicon", header: "Brand Logo" },
  ];

  // Form validation
  const validateForm = () => {
    const errors = {};

    if (!formData.brandName?.trim()) {
      errors.brandName = "Brand Name is required";
    }

    if (!formData.brandCategory || formData.brandCategory.length === 0) {
      errors.brandCategory = "Master Category is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form handlers
  // Load master category data
  const loadMasterCategoryData = async () => {
    try {
      setMasterCategoryLoading(true);
      const data = await CommonApi.getMasterCategoryList();
      setMasterCategoryList(data);
    } catch (error) {
      console.error("Error loading master categories:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load master categories",
        life: 3000,
      });
    } finally {
      setMasterCategoryLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      brandName: "",
      brandDesc: "",
      brandIcon: null,
      brandCategory: [],
    });
    setFormErrors({});
    setImagePreview(null);
    setImagePreviewName(null);
    setImageChanged(false); // Reset image changed flag when resetting form
  };

  const hideDialog = () => {
    setEditBrandId(null);
    setBrandDialog(false);
    resetForm();
  };

  const openAddDialog = () => {
    setEditBrandId(null);
    setBrandDialog(true);
    resetForm();
    loadMasterCategoryData(); // Load master categories when dialog opens
  };

  // Save Brand
  const saveBrand = async () => {
    if (!validateForm()) return;

    try {
      setSaveLoading(true);

      let response;
      if (editBrandId) {
        // Update existing Brand - pass imageChanged parameter
        response = await BrandService.updateBrand(
          editBrandId,
          formData,
          imageChanged,
        );
      } else {
        // Create new Brand
        response = await BrandService.createBrand(formData);
      }

      if (response.success) {
        toast.current?.show({
          severity: "success",
          summary: "Success",
          detail: response?.message || "Operation completed successfully",
          life: 3000,
        });

        hideDialog();
        fetchBrands(); // Refresh the list
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.details?.[0]?.message ||
            response.message ||
            `Failed to ${editBrandId ? "update" : "create"} Brand`,
          life: 3000,
        });
      }
    } catch (error) {
      console.error(
        `Error ${editBrandId ? "updating" : "creating"} Brand:`,
        error,
      );
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          `Failed to ${editBrandId ? "update" : "create"} Brand`,
        life: 3000,
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("brandList_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default columns if nothing in session - all columns visible
    return columnOptions;
  });

  const fetchBrands = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await BrandService.getFormattedBrands({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
      });

      if (response.success) {
        setBrandList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        console.error("Failed to fetch brands:", response.error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: response.error?.message || "Failed to load brand data",
          life: 3000,
        });
        setBrandList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error fetching brand data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message || error.message || "Failed to load brand data",
        life: 3000,
      });
      setBrandList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchBrands();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchBrands]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("brandTableFilters");
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
    brandname: "",
    branddesc: "",
    brandicon: "",
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
    if (brandList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = brandList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (col.field === "brandicon") {
          formattedRow[col.header] = row[col.field] ? "Yes" : "No";
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

    const filename = "brands.csv";
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
    if (brandList.length === 0) {
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
      const body = brandList.map((row) =>
        visibleFields.map((col) => {
          if (col.field === "brandicon") {
            return row[col.field] ? "Yes" : "No";
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

      doc.save("brands.pdf");
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
    if (brandList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = brandList.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (col.field === "brandicon") {
            filteredRow[col.header] = row[col.field] ? "Yes" : "No";
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

      saveAsExcelFile(excelBuffer, "brands");
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

    // Ensure brandname is always included
    if (!selectedColumns.some((col) => col.field === "brandname")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "brandname"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "brandList_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Brand List
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

  const editBrand = async (rowData) => {
    try {
      setFormLoading(true);
      setEditBrandId(rowData.brandid);
      setBrandDialog(true);

      // Load master category data first
      loadMasterCategoryData();

      const response = await BrandService.getBrandById(rowData.brandid);

      if (response.success) {
        // Parse brandcategory comma-separated string back to array
        let brandCategoryArray = [];
        if (response.data.brandcategory) {
          brandCategoryArray = response.data.brandcategory
            .split(",")
            .map((id) => parseInt(id.trim()))
            .filter((id) => !isNaN(id));
        }

        setFormData({
          brandName: response.data.brandname || "",
          brandDesc: response.data.branddesc || "",
          brandIcon: null, // We'll handle the existing image separately
          brandCategory: brandCategoryArray,
        });

        // If there's an existing image, set the image preview
        if (response.data.brandicon) {
          if (
            typeof response.data.brandicon === "object" &&
            response.data.brandicon.value
          ) {
            setImagePreview(response.data.brandicon.value);
            setImagePreviewName(response.data.brandicon.key || "Current Image");
          } else if (typeof response.data.brandicon === "string") {
            setImagePreview(response.data.brandicon);
            setImagePreviewName("Current Image");
          }
        }

        // Reset image changed flag when loading existing data
        setImageChanged(false);
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.details?.[0]?.message ||
            response.message ||
            "Failed to fetch Brand data",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching Brand:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message || error.message || "Failed to fetch Brand data",
        life: 3000,
      });
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDeleteBrand = (rowData) => {
    setDeleteBrandDialog(true);
    setDeleteBrandId(rowData.brandid);
  };

  const hideDeleteBrandDialog = () => {
    setDeleteBrandDialog(false);
  };

  const handleDeleteBrand = async (brandId) => {
    setDeleteLoading(true);
    try {
      const res = await BrandService.deleteBrand(brandId);
      if (res.success) {
        toast.current.show({
          severity: "success",
          summary: "Success",
          detail: res.message || "Operation completed successfully",
          life: 3000,
        });
        hideDeleteBrandDialog();
        fetchBrands();
      } else {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail:
            res.error?.details?.[0]?.message ||
            res.message ||
            "Failed to delete Brand.",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error deleting Brand:", error);
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

  const deleteBrand = async () => {
    try {
      await handleDeleteBrand(deleteBrandId);
    } catch (error) {
      console.error("Error deleting Brand:", error);
    }
  };

  const deleteBrandDialogFooter = (
    <>
      <Button
        label="No"
        icon="pi pi-times"
        style={{ marginRight: "1rem" }}
        outlined
        onClick={hideDeleteBrandDialog}
        disabled={deleteLoading}
      />
      <Button
        label={deleteLoading ? "Deleting" : "Yes"}
        icon={deleteLoading ? "pi pi-spin pi-spinner" : "pi pi-check"}
        severity="danger"
        onClick={deleteBrand}
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

  const brandNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="20%" height="1.5rem" />
    ) : (
      <span>{rowData.brandname ? rowData.brandname : "-"}</span>
    );
  };

  const brandDescBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="30%" height="1.5rem" />
    ) : (
      <span>{rowData.branddesc ? rowData.branddesc : "-"}</span>
    );
  };

  const brandIconBodyTemplate = (rowData) => {
    return (
      <div className="flex items-center justify-center">
        {isLoading ? (
          <Skeleton shape="circle" size="2.5rem" />
        ) : rowData.brandicon ? (
          <img
            src={rowData.brandicon}
            alt="Brand Logo"
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
              setSelectedImage(rowData.brandicon);
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

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, brandIcon: null }));
    setImagePreview(null);
    setImagePreviewName(null);
    setShowRemoveDialog(false);
    setFormErrors((prev) => ({ ...prev, brandIcon: null }));
    setImageChanged(true); // Mark image as changed when removed
  };

  return (
    <Page title="Brand List">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : brandList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No brands found"
                    subtitle="No brands match your current filters. Try adjusting your search criteria or add a new brand."
                  />
                }
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={["brandname", "branddesc"]}
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
                stateKey="brandTableFilters"
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
                {visibleFields.some((col) => col.field === "brandname") && (
                  <Column
                    field="brandname"
                    header="Brand Name"
                    style={{ minWidth: "15rem" }}
                    body={brandNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Brand Name"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "branddesc") && (
                  <Column
                    field="branddesc"
                    header="Brand Description"
                    style={{ minWidth: "20rem" }}
                    body={brandDescBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Brand Description"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "brandicon") && (
                  <Column
                    field="brandicon"
                    header="Brand Logo"
                    style={{ minWidth: "8rem" }}
                    headerStyle={{ display: "flex", justifyContent: "center" }}
                    body={brandIconBodyTemplate}
                    sortable={false}
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
                      editBrand(selectedRow);
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
                      confirmDeleteBrand(selectedRow);
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
                      alt="Brand Logo Preview"
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
                visible={deleteBrandDialog}
                style={{ width: "32rem" }}
                breakpoints={{ "960px": "75vw", "641px": "90vw" }}
                header="Confirm"
                modal
                footer={deleteBrandDialogFooter}
                onHide={hideDeleteBrandDialog}
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
                  <span>Are you sure you want to delete this Brand?</span>
                </div>
              </Dialog>

              {/* Add/Update Brand Dialog */}
              <Dialog
                visible={brandDialog}
                style={{ width: "40rem" }}
                breakpoints={{ "960px": "75vw", "641px": "90vw" }}
                header={editBrandId ? "Update Brand" : "Add Brand"}
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
                          ? editBrandId
                            ? "Updating..."
                            : "Adding..."
                          : editBrandId
                            ? "Update"
                            : "Add"
                      }
                      icon={
                        saveLoading ? "pi pi-spin pi-spinner" : "pi pi-check"
                      }
                      onClick={saveBrand}
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
                  {/* Brand Name */}
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
                          htmlFor="brandName"
                          className="label-default text-base font-semibold"
                        >
                          Brand Name <span className="text-red-600">*</span>
                        </label>
                        <InputText
                          id="brandName"
                          value={formData.brandName}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              brandName: e.target.value,
                            });
                            setFormErrors({ ...formErrors, brandName: null });
                          }}
                          placeholder="Enter Brand Name"
                          autoFocus
                          className={formErrors.brandName ? "p-invalid" : ""}
                        />
                        {formErrors.brandName && (
                          <small className="p-error">
                            {formErrors.brandName}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Master Category */}
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
                          htmlFor="brandCategory"
                          className="label-default text-base font-semibold"
                        >
                          Master Category{" "}
                          <span className="text-red-600">*</span>
                        </label>
                        <MultiSelect
                          id="brandCategory"
                          value={formData.brandCategory}
                          options={masterCategoryList}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              brandCategory: e.value,
                            });
                            setFormErrors({
                              ...formErrors,
                              brandCategory: null,
                            });
                          }}
                          placeholder="Select Master Categories"
                          display="chip"
                          loading={masterCategoryLoading}
                          className={
                            formErrors.brandCategory ? "p-invalid" : ""
                          }
                          disabled={saveLoading || masterCategoryLoading}
                        />
                        {formErrors.brandCategory && (
                          <small className="p-error">
                            {formErrors.brandCategory}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Brand Description */}
                  <div className="input-root">
                    {formLoading ? (
                      <>
                        <Skeleton
                          width="50%"
                          height="1.25rem"
                          className="mb-2"
                        />
                        <Skeleton width="100%" height="4rem" />
                      </>
                    ) : (
                      <>
                        <label
                          htmlFor="brandDesc"
                          className="label-default text-base font-semibold"
                        >
                          Brand Description
                        </label>
                        <InputTextarea
                          id="brandDesc"
                          value={formData.brandDesc}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              brandDesc: e.target.value,
                            });
                            setFormErrors({ ...formErrors, brandDesc: null });
                          }}
                          placeholder="Enter Brand Description"
                          rows={3}
                          className={formErrors.brandDesc ? "p-invalid" : ""}
                        />
                        {formErrors.brandDesc && (
                          <small className="p-error">
                            {formErrors.brandDesc}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Brand Logo */}
                  <div className="input-root">
                    {formLoading ? (
                      <>
                        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
                          <div className="flex-1 lg:flex lg:min-h-[78px] lg:flex-col lg:justify-center">
                            {/* Label skeleton */}
                            <Skeleton
                              width="50%"
                              height="1.25rem"
                              className="mb-2"
                            />
                            {/* Choose button skeleton */}
                            <Skeleton width="100%" height="2.5rem" />
                          </div>
                          {/* Preview div skeleton */}
                          <div className="mt-4 lg:mt-0">
                            <div className="flex h-[78px] w-full max-w-[290px] min-w-[250px] flex-1 items-center justify-between gap-4 rounded border p-2 shadow">
                              <div className="flex items-center gap-4">
                                {/* Image skeleton */}
                                <Skeleton
                                  width="3.5rem"
                                  height="3.5rem"
                                  className="rounded"
                                />
                                <div className="flex flex-col gap-1">
                                  {/* File name skeleton */}
                                  <Skeleton width="120px" height="1rem" />
                                  {/* File info skeleton */}
                                  <Skeleton width="80px" height="0.75rem" />
                                </div>
                              </div>
                              {/* Delete icon skeleton */}
                              <Skeleton
                                width="1.5rem"
                                height="1.5rem"
                                className="rounded-full"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
                          <div className="flex-1 lg:flex lg:min-h-[78px] lg:flex-col lg:justify-center">
                            <label className="label-default text-base font-semibold">
                              Brand Logo
                            </label>
                            <FileUpload
                              mode="basic"
                              accept="image/*"
                              onSelect={(e) => {
                                if (e?.files[0]?.size > 5000000) {
                                  // Show toast notification for file size error
                                  toast.current?.show({
                                    severity: "warn",
                                    summary: "File Size Warning",
                                    detail: "Image size should not exceed 5MB",
                                    life: 3000,
                                  });
                                  setFormErrors((prev) => ({
                                    ...prev,
                                    brandIcon:
                                      "File size should be less than 5MB",
                                  }));
                                  setFormData((prev) => ({
                                    ...prev,
                                    brandIcon: null,
                                  }));
                                  setImagePreview(null);
                                } else {
                                  setFormErrors((prev) => ({
                                    ...prev,
                                    brandIcon: null,
                                  }));
                                  setFormData((prev) => ({
                                    ...prev,
                                    brandIcon: e.files[0],
                                  }));
                                  setImagePreview(
                                    URL.createObjectURL(e.files[0]),
                                  );
                                  setImageChanged(true); // Mark image as changed when new file is selected
                                }
                              }}
                              auto
                              disabled={saveLoading}
                              className={
                                formErrors.brandIcon ? "p-invalid" : ""
                              }
                            />
                            {formErrors.brandIcon && (
                              <small className="p-error">
                                {formErrors.brandIcon}
                              </small>
                            )}
                          </div>
                          {imagePreview && (
                            <div className="mt-4 lg:mt-0">
                              <div className="flex h-[78px] w-full max-w-[290px] min-w-[250px] flex-1 items-center justify-between gap-4 rounded border p-2 shadow">
                                <div className="flex items-center gap-4">
                                  <img
                                    className="h-14 w-14 cursor-pointer rounded object-contain"
                                    src={imagePreview}
                                    alt="Preview"
                                    onClick={() => {
                                      setPreviewImageSrc(imagePreview);
                                      setShowImagePreview(true);
                                    }}
                                  />
                                  <div className="flex flex-col gap-1">
                                    <span
                                      className="max-w-[150px] truncate"
                                      title={
                                        formData.brandIcon?.name ||
                                        imagePreviewName ||
                                        "Current Image"
                                      }
                                    >
                                      {formData.brandIcon?.name ||
                                        imagePreviewName ||
                                        "Current Image"}
                                    </span>
                                    {!formData.brandIcon && (
                                      <span className="text-xs text-gray-500">
                                        Existing image
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <i
                                  className="pi pi-times-circle cursor-pointer text-2xl text-red-500"
                                  onClick={() => setShowRemoveDialog(true)}
                                ></i>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Dialog>

              {/* Remove Image Confirmation Dialog */}
              <Dialog
                header="Confirm Deletion"
                visible={showRemoveDialog}
                style={{ width: "32rem" }}
                breakpoints={{ "960px": "75vw", "641px": "90vw" }}
                onHide={() => setShowRemoveDialog(false)}
                modal
                draggable={false}
                resizable={false}
                blockScroll={true}
                dismissableMask
                footer={
                  <div className="flex justify-end gap-2">
                    <Button
                      label="No"
                      icon="pi pi-times"
                      onClick={() => setShowRemoveDialog(false)}
                      className="p-button-text"
                    />
                    <Button
                      label="Yes"
                      icon="pi pi-check"
                      className="p-button-danger"
                      onClick={handleRemoveImage}
                      autoFocus
                    />
                  </div>
                }
              >
                <div className="confirmation-content flex items-center">
                  <i
                    className="pi pi-exclamation-triangle mr-3"
                    style={{ fontSize: "2rem" }}
                  />
                  <span>Are you sure you want to delete this image?</span>
                </div>
              </Dialog>

              {/* Image Preview Dialog */}
              <Dialog
                header="Image Preview"
                visible={showImagePreview}
                style={{ width: "90vw", maxWidth: "800px" }}
                modal
                onHide={() => setShowImagePreview(false)}
                draggable={false}
                resizable={false}
                blockScroll={true}
                dismissableMask
              >
                <img
                  src={previewImageSrc}
                  alt="Preview"
                  className="h-auto w-full"
                  style={{ objectFit: "contain" }}
                />
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
