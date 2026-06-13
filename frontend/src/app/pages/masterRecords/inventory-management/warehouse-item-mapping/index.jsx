import { Page } from "components/shared/Page";
import { useState, useRef } from "react";
import { MultiSelect } from "primereact/multiselect";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Skeleton } from "primereact/skeleton";
import { FilterMatchMode } from "primereact/api";
import { Tooltip } from "primereact/tooltip";
import { unparse } from "papaparse";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import EmptyMessage from "components/shared/EmptyMessage";

export default function WarehouseItemMapping() {
  const toast = useRef(null);

  // State for form data - all fields now support multiple selections
  const [formData, setFormData] = useState({
    masterCategoryIds: [],
    categoryIds: [],
    subCategoryIds: [],
    itemIds: [],
    locationIds: [],
    warehouseIds: [],
  });

  // Loading state
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [warehouseItemData, setWarehouseItemData] = useState([]);
  const [dataFetched, setDataFetched] = useState(false);

  // Selection and delete states
  const [selectedItems, setSelectedItems] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Table states
  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [totalRecords, setTotalRecords] = useState(0);

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    itemName: { value: null, matchMode: FilterMatchMode.CONTAINS },
    itemCategory: { value: null, matchMode: FilterMatchMode.CONTAINS },
    warehouseName: { value: null, matchMode: FilterMatchMode.CONTAINS },
    locationName: { value: null, matchMode: FilterMatchMode.CONTAINS },
    quantity: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  // Column options for visibility toggle
  const columnOptions = [
    { field: "itemName", header: "Item Name" },
    { field: "itemCategory", header: "Item Category" },
    { field: "warehouseName", header: "Warehouse Name" },
    { field: "locationName", header: "Location Name" },
    { field: "quantity", header: "Quantity" },
    { field: "status", header: "Status" },
  ];

  // Visible fields state with session storage
  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("warehouseItemMapping_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default columns if nothing in session - show all except none
    return columnOptions;
  });

  // Static dropdown data with value/label format for PrimeReact
  const masterCategories = [
    { value: 1, label: "Electronics" },
    { value: 2, label: "Furniture" },
    { value: 3, label: "Clothing" },
    { value: 4, label: "Food & Beverages" },
  ];

  const categories = [
    { value: 1, label: "Mobile Devices" },
    { value: 2, label: "Laptops" },
    { value: 3, label: "Audio Equipment" },
    { value: 4, label: "Accessories" },
  ];

  const subCategories = [
    { value: 1, label: "Smartphones" },
    { value: 2, label: "Tablets" },
    { value: 3, label: "Headphones" },
    { value: 4, label: "Chargers" },
  ];

  const items = [
    { value: 1, label: "iPhone 15 Pro" },
    { value: 2, label: "Samsung Galaxy S24" },
    { value: 3, label: "iPad Pro 12.9" },
    { value: 4, label: "AirPods Pro" },
  ];

  const locations = [
    { value: 1, label: "New York" },
    { value: 2, label: "Los Angeles" },
    { value: 3, label: "Chicago" },
    { value: 4, label: "Houston" },
  ];

  const warehouses = [
    { value: 1, label: "Warehouse A - North" },
    { value: 2, label: "Warehouse B - South" },
    { value: 3, label: "Warehouse C - East" },
    { value: 4, label: "Warehouse D - West" },
  ];

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Handle dependent dropdowns
    if (field === "masterCategoryIds") {
      // Reset dependent fields when master category changes
      setFormData((prev) => ({
        ...prev,
        masterCategoryIds: value,
        categoryIds: [],
        subCategoryIds: [],
        itemIds: [],
      }));
    } else if (field === "categoryIds") {
      // Reset sub category and item when category changes
      setFormData((prev) => ({
        ...prev,
        categoryIds: value,
        subCategoryIds: [],
        itemIds: [],
      }));
    } else if (field === "subCategoryIds") {
      // Reset item when sub category changes
      setFormData((prev) => ({
        ...prev,
        subCategoryIds: value,
        itemIds: [],
      }));
    }
  };

  // Dummy data generator
  const generateDummyData = () => {
    const dummyItems = [
      {
        itemName: "iPhone 15 Pro",
        itemCategory: "Electronics / Mobile Devices / Smartphones",
        warehouseName: "Warehouse A - North",
        locationName: "New York",
      },
      {
        itemName: "Samsung Galaxy S24",
        itemCategory: "Electronics / Mobile Devices / Smartphones",
        warehouseName: "Warehouse B - South",
        locationName: "Los Angeles",
      },
      {
        itemName: "iPad Pro 12.9",
        itemCategory: "Electronics / Mobile Devices / Tablets",
        warehouseName: "Warehouse C - East",
        locationName: "Chicago",
      },
      {
        itemName: "AirPods Pro",
        itemCategory: "Electronics / Audio Equipment / Headphones",
        warehouseName: "Warehouse D - West",
        locationName: "Houston",
      },
      {
        itemName: "MacBook Pro 16",
        itemCategory: "Electronics / Laptops / Premium",
        warehouseName: "Warehouse A - North",
        locationName: "New York",
      },
      {
        itemName: "Dell XPS 13",
        itemCategory: "Electronics / Laptops / Business",
        warehouseName: "Warehouse B - South",
        locationName: "Los Angeles",
      },
      {
        itemName: "Sony WH-1000XM5",
        itemCategory: "Electronics / Audio Equipment / Headphones",
        warehouseName: "Warehouse C - East",
        locationName: "Chicago",
      },
      {
        itemName: "Apple Watch Series 9",
        itemCategory: "Electronics / Mobile Devices / Wearables",
        warehouseName: "Warehouse D - West",
        locationName: "Houston",
      },
      {
        itemName: "Google Pixel 8 Pro",
        itemCategory: "Electronics / Mobile Devices / Smartphones",
        warehouseName: "Warehouse A - North",
        locationName: "New York",
      },
      {
        itemName: "Microsoft Surface Pro 9",
        itemCategory: "Electronics / Mobile Devices / Tablets",
        warehouseName: "Warehouse B - South",
        locationName: "Los Angeles",
      },
      {
        itemName: "Logitech MX Master 3",
        itemCategory: "Electronics / Accessories / Mouse",
        warehouseName: "Warehouse C - East",
        locationName: "Chicago",
      },
      {
        itemName: "Anker PowerCore 26800",
        itemCategory: "Electronics / Accessories / Chargers",
        warehouseName: "Warehouse D - West",
        locationName: "Houston",
      },
      {
        itemName: "Bose QuietComfort 45",
        itemCategory: "Electronics / Audio Equipment / Headphones",
        warehouseName: "Warehouse A - North",
        locationName: "New York",
      },
      {
        itemName: 'LG OLED C3 65"',
        itemCategory: "Electronics / Display / Television",
        warehouseName: "Warehouse B - South",
        locationName: "Los Angeles",
      },
      {
        itemName: 'Samsung Frame TV 55"',
        itemCategory: "Electronics / Display / Television",
        warehouseName: "Warehouse C - East",
        locationName: "Chicago",
      },
    ];

    return dummyItems.map((item, index) => ({
      id: index + 1,
      ...item,
      quantity: Math.floor(Math.random() * 500) + 50,
      status: Math.random() > 0.3 ? "In Stock" : "Low Stock",
    }));
  };

  const handleFetchItems = () => {
    setLoading(true);
    setTableLoading(true);

    // Validation
    const requiredFields = [];
    if (formData.masterCategoryIds.length === 0)
      requiredFields.push("Master Category");
    if (formData.categoryIds.length === 0) requiredFields.push("Category");
    if (formData.locationIds.length === 0) requiredFields.push("Location");
    if (formData.warehouseIds.length === 0) requiredFields.push("Warehouse");

    if (requiredFields.length > 0) {
      toast.current?.show({
        severity: "warn",
        summary: "Required Fields Missing",
        detail: `Please select at least one: ${requiredFields.join(", ")}`,
        life: 3000,
      });
      setLoading(false);
      setTableLoading(false);
      return;
    }

    // Simulate API call
    setTimeout(() => {
      // Generate dummy data
      const dummyData = generateDummyData();
      setWarehouseItemData(dummyData);
      setTotalRecords(dummyData.length);
      setDataFetched(true);

      toast.current?.show({
        severity: "success",
        summary: "Success",
        detail: "Items fetched successfully (Backend API pending)",
        life: 3000,
      });
      setLoading(false);
      setTableLoading(false);
    }, 1000);
  };

  // Global filter handler
  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    const updatedFilters = {
      ...filters,
      global: { ...filters.global, value },
    };
    setFilters(updatedFilters);
  };

  // Blank row for skeleton loading
  const blankRow = {
    itemName: "",
    itemCategory: "",
    warehouseName: "",
    locationName: "",
    quantity: "",
    status: "",
  };

  // Export functions
  const fileExportMessage = () => {
    toast.current?.show({
      severity: "success",
      detail: "File Exported Successfully",
      life: 3000,
    });
  };

  const exportCSV = () => {
    if (warehouseItemData.length === 0) {
      toast.current?.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = warehouseItemData.map((row) => ({
      "Item Name": row.itemName || "-",
      "Item Category": row.itemCategory || "-",
      "Warehouse Name": row.warehouseName || "-",
      "Location Name": row.locationName || "-",
      Quantity: row.quantity || "0",
      Status: row.status || "-",
    }));

    const csvData = unparse(formattedData);
    const filename = "warehouse_item_mapping.csv";
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
    if (warehouseItemData.length === 0) {
      toast.current?.show({
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

      const head = [
        [
          "Sr No.",
          "Item Name",
          "Item Category",
          "Warehouse Name",
          "Location Name",
          "Quantity",
          "Status",
        ],
      ];
      const body = warehouseItemData.map((row, index) => [
        index + 1,
        row.itemName || "-",
        row.itemCategory || "-",
        row.warehouseName || "-",
        row.locationName || "-",
        row.quantity || "0",
        row.status || "-",
      ]);

      autoTable(doc, {
        head,
        body,
        startY: 20,
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
        theme: "grid",
        didParseCell: (data) => {
          const raw = data.cell?.raw;
          if (typeof raw === "string") {
            const softened = raw.replace(/(\S{30})/g, "$1\u200B");
            if (softened !== raw) data.cell.text = [softened];
          }
        },
      });

      doc.save("warehouse_item_mapping.pdf");
      fileExportMessage();
    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to export PDF. Please try again.",
        life: 3000,
      });
    }
  };

  const exportExcel = () => {
    if (warehouseItemData.length === 0) {
      toast.current?.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const formattedData = warehouseItemData.map((row, index) => ({
        "Sr No.": index + 1,
        "Item Name": row.itemName || "-",
        "Item Category": row.itemCategory || "-",
        "Warehouse Name": row.warehouseName || "-",
        "Location Name": row.locationName || "-",
        Quantity: row.quantity || 0,
        Status: row.status || "-",
      }));

      const worksheet = xlsx.utils.json_to_sheet(formattedData);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ["data"] };
      const excelBuffer = xlsx.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      saveAsExcelFile(excelBuffer, "warehouse_item_mapping");
      fileExportMessage();
    });
  };

  const saveAsExcelFile = (buffer, fileName) => {
    import("file-saver").then((module) => {
      if (module && module.default) {
        const EXCEL_TYPE =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
        const EXCEL_EXTENSION = ".xlsx";
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

  // Column toggle functionality
  const onColumnToggle = (event) => {
    let selectedColumns = event.value;

    // Ensure itemName is always included
    if (!selectedColumns.some((col) => col.field === "itemName")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "itemName"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "warehouseItemMapping_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  // Delete functionality
  const confirmDeleteItems = () => {
    if (selectedItems.length === 0) {
      toast.current?.show({
        severity: "warn",
        summary: "No Selection",
        detail: "Please select items to delete",
        life: 3000,
      });
      return;
    }
    setDeleteDialog(true);
  };

  const hideDeleteDialog = () => {
    setDeleteDialog(false);
  };

  const deleteSelectedItems = () => {
    setDeleteLoading(true);

    // Simulate API call for deletion
    setTimeout(() => {
      // Remove selected items from data
      const remainingItems = warehouseItemData.filter(
        (item) => !selectedItems.some((selected) => selected.id === item.id),
      );

      setWarehouseItemData(remainingItems);
      setTotalRecords(remainingItems.length);
      setSelectedItems([]);
      setDeleteDialog(false);
      setDeleteLoading(false);

      toast.current?.show({
        severity: "success",
        summary: "Success",
        detail: `${selectedItems.length} item(s) deleted successfully`,
        life: 3000,
      });
    }, 1000);
  };

  const deleteDialogFooter = (
    <>
      <Button
        label="No"
        icon="pi pi-times"
        style={{ marginRight: "1rem" }}
        outlined
        onClick={hideDeleteDialog}
        disabled={deleteLoading}
      />
      <Button
        label={deleteLoading ? "Deleting..." : "Yes"}
        icon={deleteLoading ? "pi pi-spin pi-spinner" : "pi pi-check"}
        severity="danger"
        onClick={deleteSelectedItems}
        disabled={deleteLoading}
      />
    </>
  );

  // Table header template
  const renderTableHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Warehouse Item Mapping Results
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
          disabled={tableLoading}
        />

        <div className="flex gap-1">
          <Button
            className="export-icon-tooltip"
            type="button"
            icon="pi pi-file"
            rounded
            size="small"
            onClick={exportCSV}
            data-pr-tooltip="Export as CSV"
            disabled={tableLoading || warehouseItemData.length === 0}
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
            disabled={tableLoading || warehouseItemData.length === 0}
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
            disabled={tableLoading || warehouseItemData.length === 0}
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            rounded
            size="small"
            onClick={confirmDeleteItems}
            disabled={tableLoading || selectedItems.length === 0}
            data-pr-tooltip="Delete Selected Items"
            className="export-icon-tooltip"
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

  // Column body templates
  const itemNameBodyTemplate = (rowData) => {
    return tableLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span>{rowData.itemName || "-"}</span>
    );
  };

  const itemCategoryBodyTemplate = (rowData) => {
    return tableLoading ? (
      <Skeleton width="90%" height="1.5rem" />
    ) : (
      <span>{rowData.itemCategory || "-"}</span>
    );
  };

  const warehouseNameBodyTemplate = (rowData) => {
    return tableLoading ? (
      <Skeleton width="85%" height="1.5rem" />
    ) : (
      <span>{rowData.warehouseName || "-"}</span>
    );
  };

  const locationNameBodyTemplate = (rowData) => {
    return tableLoading ? (
      <Skeleton width="75%" height="1.5rem" />
    ) : (
      <span>{rowData.locationName || "-"}</span>
    );
  };

  const quantityBodyTemplate = (rowData) => {
    return tableLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className="font-semibold">{rowData.quantity || 0}</span>
    );
  };

  const statusBodyTemplate = (rowData) => {
    if (tableLoading) {
      return <Skeleton width="70%" height="1.5rem" />;
    }

    const statusClass =
      rowData.status === "In Stock"
        ? "text-green-600 bg-green-100"
        : "text-orange-600 bg-orange-100";

    return (
      <span
        className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass}`}
      >
        {rowData.status}
      </span>
    );
  };

  return (
    <Page title="Warehouse Item Mapping">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Warehouse Item Mapping
                </h3>
              </div>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Master Category Multi-Select */}
                  <div className="input-root">
                    <label className="label-default text-base font-semibold">
                      Master Category
                    </label>
                    <MultiSelect
                      value={formData.masterCategoryIds}
                      options={masterCategories}
                      onChange={(e) =>
                        handleChange("masterCategoryIds", e.value)
                      }
                      placeholder="Select Master Categories"
                      display="chip"
                      showClear
                      filter
                      maxSelectedLabels={3}
                      className="w-full"
                    />
                  </div>

                  {/* Category Multi-Select */}
                  <div className="input-root">
                    <label className="label-default text-base font-semibold">
                      Category
                    </label>
                    <MultiSelect
                      value={formData.categoryIds}
                      options={categories}
                      onChange={(e) => handleChange("categoryIds", e.value)}
                      placeholder="Select Categories"
                      display="chip"
                      showClear
                      filter
                      disabled={formData.masterCategoryIds.length === 0}
                      maxSelectedLabels={3}
                      className="w-full"
                    />
                  </div>

                  {/* Sub Category Multi-Select */}
                  <div className="input-root">
                    <label className="label-default text-base font-semibold">
                      Sub Category
                    </label>
                    <MultiSelect
                      value={formData.subCategoryIds}
                      options={subCategories}
                      onChange={(e) => handleChange("subCategoryIds", e.value)}
                      placeholder="Select Sub Categories"
                      display="chip"
                      showClear
                      filter
                      disabled={formData.categoryIds.length === 0}
                      maxSelectedLabels={3}
                      className="w-full"
                    />
                  </div>

                  {/* Item Multi-Select */}
                  <div className="input-root">
                    <label className="label-default text-base font-semibold">
                      Item
                    </label>
                    <MultiSelect
                      value={formData.itemIds}
                      options={items}
                      onChange={(e) => handleChange("itemIds", e.value)}
                      placeholder="Select Items"
                      display="chip"
                      showClear
                      filter
                      disabled={formData.subCategoryIds.length === 0}
                      maxSelectedLabels={3}
                      className="w-full"
                    />
                  </div>

                  {/* Location Multi-Select */}
                  <div className="input-root">
                    <label className="label-default text-base font-semibold">
                      Location
                    </label>
                    <MultiSelect
                      value={formData.locationIds}
                      options={locations}
                      onChange={(e) => handleChange("locationIds", e.value)}
                      placeholder="Select Locations"
                      display="chip"
                      showClear
                      filter
                      maxSelectedLabels={3}
                      className="w-full"
                    />
                  </div>

                  {/* Warehouse Multi-Select */}
                  <div className="input-root">
                    <label className="label-default text-base font-semibold">
                      Warehouse
                    </label>
                    <MultiSelect
                      value={formData.warehouseIds}
                      options={warehouses}
                      onChange={(e) => handleChange("warehouseIds", e.value)}
                      placeholder="Select Warehouses"
                      display="chip"
                      showClear
                      filter
                      maxSelectedLabels={3}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Fetch Items Button */}
                <div className="mt-6 flex justify-end">
                  <Button
                    label={loading ? "Fetching..." : "Fetch Items"}
                    icon="pi pi-search"
                    onClick={handleFetchItems}
                    disabled={loading}
                    className="border-none bg-blue-600 text-white hover:bg-blue-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DataTable Section - Always visible */}
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  tableLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : warehouseItemData
                }
                selection={selectedItems}
                onSelectionChange={(e) => setSelectedItems(e.value)}
                dataKey="id"
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderTableHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No data available"
                    subtitle='Click "Fetch Items" button above to load warehouse item mapping data'
                  />
                }
                paginator={dataFetched}
                lazy
                filterDisplay={dataFetched ? "row" : "none"}
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "itemName",
                  "itemCategory",
                  "warehouseName",
                  "locationName",
                  "quantity",
                  "status",
                ]}
                onFilter={(e) => {
                  setFilters(e.filters);
                  setLazyParams((prev) => ({ ...prev, first: 0 }));
                }}
                onPage={(e) => {
                  setLazyParams((prev) => ({
                    ...prev,
                    first: e.first,
                    rows: e.rows,
                  }));
                }}
                onSort={(e) => {
                  setLazyParams((prev) => ({
                    ...prev,
                    sortField: e.sortField,
                    sortOrder: e.sortOrder,
                  }));
                }}
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
                  selectionMode="multiple"
                  headerStyle={{ width: "3rem" }}
                  bodyStyle={{ textAlign: "center" }}
                />
                <Column
                  header="Sr No."
                  body={(rowData, options) =>
                    tableLoading ? (
                      <Skeleton width="30%" height="1.5rem" />
                    ) : (
                      options.rowIndex + 1
                    )
                  }
                  style={{ minWidth: "5rem" }}
                />
                {visibleFields.some((col) => col.field === "itemName") && (
                  <Column
                    field="itemName"
                    header="Item Name"
                    style={{ minWidth: "15rem" }}
                    body={itemNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Item Name"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "itemCategory") && (
                  <Column
                    field="itemCategory"
                    header="Item Category"
                    style={{ minWidth: "20rem" }}
                    body={itemCategoryBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Category"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "warehouseName") && (
                  <Column
                    field="warehouseName"
                    header="Warehouse Name"
                    style={{ minWidth: "15rem" }}
                    body={warehouseNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Warehouse"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "locationName") && (
                  <Column
                    field="locationName"
                    header="Location Name"
                    style={{ minWidth: "12rem" }}
                    body={locationNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Location"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "quantity") && (
                  <Column
                    field="quantity"
                    header="Quantity"
                    style={{ minWidth: "8rem" }}
                    body={quantityBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "status") && (
                  <Column
                    field="status"
                    header="Status"
                    style={{ minWidth: "10rem" }}
                    body={statusBodyTemplate}
                    sortable
                  />
                )}
              </DataTable>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        visible={deleteDialog}
        style={{ width: "32rem" }}
        breakpoints={{ "960px": "75vw", "641px": "90vw" }}
        header="Confirm Deletion"
        modal
        footer={deleteDialogFooter}
        onHide={hideDeleteDialog}
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
          <span>
            Are you sure you want to delete {selectedItems.length} selected
            item(s)?
          </span>
        </div>
      </Dialog>
    </Page>
  );
}
