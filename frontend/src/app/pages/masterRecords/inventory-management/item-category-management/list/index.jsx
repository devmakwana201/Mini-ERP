import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { ItemCategoryService } from "services/master-records/category";
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

export default function ItemCategoryManagement() {
  const toast = useRef(null);
  const navigate = useNavigate();
  const [categoryList, setCategoryList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const actionOverlayRef = useRef(null);
  const imageOverlayRef = useRef(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  // Delete states
  const [deleteCategoryDialog, setDeleteCategoryDialog] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState(null);
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
    itemcategoryname: { value: null, matchMode: FilterMatchMode.CONTAINS },
    displayname: { value: null, matchMode: FilterMatchMode.CONTAINS },
    itemcategoryorder: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const columnOptions = [
    { field: "itemcategoryname", header: "Category Name" },
    { field: "displayname", header: "Display Name" },
    { field: "itemcategoryorder", header: "Display Order" },
    { field: "itemcategoryimage", header: "Item Category Image" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("categoryList_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default columns if nothing in session - all columns visible
    return columnOptions;
  });

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await ItemCategoryService.getFormattedItemCategories({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
      });

      if (response.success) {
        setCategoryList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        console.error("Failed to fetch categories:", response.error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: response.error?.message || "Failed to load category data",
          life: 3000,
        });
        setCategoryList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error fetching category data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load category data",
        life: 3000,
      });
      setCategoryList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCategories();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchCategories]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("categoryTableFilters");
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
    itemcategoryname: "",
    displayname: "",
    itemcategoryorder: "",
    itemcategoryimage: "",
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
    if (categoryList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = categoryList.map((row) => {
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

    const filename = "item-categories.csv";
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
    if (categoryList.length === 0) {
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
      const body = categoryList.map((row) =>
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

      doc.save("item-categories.pdf");
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
    if (categoryList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = categoryList.map((row) => {
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

      saveAsExcelFile(excelBuffer, "item-categories");
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

    // Ensure itemcategoryname is always included
    if (!selectedColumns.some((col) => col.field === "itemcategoryname")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "itemcategoryname"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "categoryList_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Item Category List
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
              navigate("/master-records/inventory/item-category/add");
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

  const editCategory = (rowData, event) => {
    const url = `/master-records/inventory/item-category/update/${rowData.itemcategoryid}`;

    // Check if Ctrl (Windows/Linux) or Cmd (Mac) is pressed
    if (event && (event.ctrlKey || event.metaKey)) {
      // Open in new tab
      window.open(url, '_blank');
    } else {
      // Navigate in same tab
      navigate(url);
    }
  };

  const confirmDeleteCategory = (rowData) => {
    setDeleteCategoryDialog(true);
    setDeleteCategoryId(rowData.itemcategoryid);
  };

  const hideDeleteCategoryDialog = () => {
    setDeleteCategoryDialog(false);
  };

  const handleDeleteCategory = async (categoryId) => {
    setDeleteLoading(true);
    try {
      const response = await ItemCategoryService.deleteItemCategory(categoryId);
      if (response.success) {
        toast.current.show({
          severity: "success",
          summary: "Success",
          detail: response.message || "Operation completed successfully",
          life: 3000,
        });
        hideDeleteCategoryDialog();
        fetchCategories();
      } else {
        console.error("Failed to delete category:", response.error);
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.details?.[0]?.message ||
            response.error?.message ||
            "Failed to delete category",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error deleting category:", error);
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

  const deleteCategory = async () => {
    try {
      await handleDeleteCategory(deleteCategoryId);
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const deleteCategoryDialogFooter = (
    <>
      <Button
        label="No"
        icon="pi pi-times"
        style={{ marginRight: "1rem" }}
        outlined
        onClick={hideDeleteCategoryDialog}
        disabled={deleteLoading}
      />
      <Button
        label={deleteLoading ? "Deleting" : "Yes"}
        icon={deleteLoading ? "pi pi-spin pi-spinner" : "pi pi-check"}
        severity="danger"
        onClick={deleteCategory}
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

  const categoryNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="40%" height="1.5rem" />
    ) : (
      <span>{rowData.itemcategoryname ? rowData.itemcategoryname : "-"}</span>
    );
  };

  const displayNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="40%" height="1.5rem" />
    ) : (
      <span>{rowData.displayname ? rowData.displayname : "-"}</span>
    );
  };

  const displayOrderBodyTemplate = (rowData) => {
    return (
      <div className="flex items-center justify-center">
        {isLoading ? (
          <Skeleton shape="circle" size="2.5rem" />
        ) : (
          <div
            style={{
              width: "40px",
              height: "40px",
              backgroundColor: "#d1e7dd",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #ddd",
              color: "#0f5132",
            }}
          >
            {rowData.itemcategoryorder ? rowData.itemcategoryorder : "-"}
          </div>
        )}
      </div>
    );
  };

  const imageBodyTemplate = (rowData) => {
    return (
      <div className="flex items-center justify-center">
        {isLoading ? (
          <Skeleton shape="circle" size="2.5rem" />
        ) : rowData.itemcategoryimage ? (
          <img
            src={rowData.itemcategoryimage}
            alt="Category"
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
              setSelectedImage(rowData.itemcategoryimage);
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
    <Page title="Item Category List">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : categoryList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No categories found"
                    subtitle="No categories match your current filters. Try adjusting your search criteria or add a new category."
                  />
                }
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "itemcategoryname",
                  "displayname",
                  "itemcategoryorder",
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
                stateKey="categoryTableFilters"
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
                      <Skeleton width="20%" height="1.5rem" />
                    ) : (
                      options.rowIndex + 1
                    )
                  }
                  style={{ minWidth: "5rem" }}
                />
                {visibleFields.some(
                  (col) => col.field === "itemcategoryname",
                ) && (
                  <Column
                    field="itemcategoryname"
                    header="Category Name"
                    style={{ minWidth: "17rem" }}
                    body={categoryNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Category Name"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "displayname") && (
                  <Column
                    field="displayname"
                    header="Display Name"
                    style={{ minWidth: "16rem" }}
                    body={displayNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Display Name"
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "itemcategoryorder",
                ) && (
                  <Column
                    field="itemcategoryorder"
                    header="Display Order"
                    style={{ minWidth: "16rem" }}
                    body={displayOrderBodyTemplate}
                    filter
                    dataType="numeric"
                    showFilterMenu={false}
                    filterPlaceholder="Search Display Order"
                    // headerClassName="flex item-center justify-center"
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "itemcategoryimage",
                ) && (
                  <Column
                    field="itemcategoryimage"
                    header="Item Category Image"
                    style={{ minWidth: "13rem" }}
                    body={imageBodyTemplate}
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
                    onClick={(e) => {
                      editCategory(selectedRow, e);
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
                      confirmDeleteCategory(selectedRow);
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
                      alt="Category Preview"
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
                visible={deleteCategoryDialog}
                style={{ width: "32rem" }}
                breakpoints={{ "960px": "75vw", "641px": "90vw" }}
                header="Confirm"
                modal
                footer={deleteCategoryDialogFooter}
                onHide={hideDeleteCategoryDialog}
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
                  <span>Are you sure you want to delete this category?</span>
                </div>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
