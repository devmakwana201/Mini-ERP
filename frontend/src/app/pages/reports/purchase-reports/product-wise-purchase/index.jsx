import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Calendar } from "primereact/calendar";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { MultiSelect } from "primereact/multiselect";
import { Tooltip } from "primereact/tooltip";
import { unparse } from "papaparse";
import { Skeleton } from "primereact/skeleton";
import { FilterMatchMode } from "primereact/api";
import { scrollToTop } from "utils/scrollToTop";
import { ProductWisePurchaseService } from "services/reports/purchase/productWisePurchase";
import EmptyMessage from "components/shared/EmptyMessage";
import { LocationFilter } from "components/reports/LocationFilter";

export default function ProductWisePurchase() {
  const toast = useRef(null);
  const [purchaseList, setPurchaseList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [totalRecords, setTotalRecords] = useState(0);

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    supplier: { value: null, matchMode: FilterMatchMode.CONTAINS },
    suppliergst: { value: null, matchMode: FilterMatchMode.CONTAINS },
    ordernumber: { value: null, matchMode: FilterMatchMode.CONTAINS },
    createdby: { value: null, matchMode: FilterMatchMode.CONTAINS },
    referencebillnumber: { value: null, matchMode: FilterMatchMode.CONTAINS },
    podate: { value: null, matchMode: FilterMatchMode.CONTAINS },
    productcategory: { value: null, matchMode: FilterMatchMode.CONTAINS },
    brand: { value: null, matchMode: FilterMatchMode.CONTAINS },
    hsnsaccode: { value: null, matchMode: FilterMatchMode.CONTAINS },
    product: { value: null, matchMode: FilterMatchMode.CONTAINS },
    uom: { value: null, matchMode: FilterMatchMode.CONTAINS },
    batchnumber: { value: null, matchMode: FilterMatchMode.CONTAINS },
    warehouse: { value: null, matchMode: FilterMatchMode.CONTAINS },
    remarks: { value: null, matchMode: FilterMatchMode.CONTAINS },
    quantity: { value: null, matchMode: FilterMatchMode.EQUALS },
    price: { value: null, matchMode: FilterMatchMode.CONTAINS },
    total: { value: null, matchMode: FilterMatchMode.CONTAINS },
    discountpercent: { value: null, matchMode: FilterMatchMode.CONTAINS },
    discount: { value: null, matchMode: FilterMatchMode.CONTAINS },
    netamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
    taxableamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
    taxpercent: { value: null, matchMode: FilterMatchMode.CONTAINS },
    taxamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
    cgst: { value: null, matchMode: FilterMatchMode.CONTAINS },
    sgst: { value: null, matchMode: FilterMatchMode.CONTAINS },
    igst: { value: null, matchMode: FilterMatchMode.CONTAINS },
    mrp: { value: null, matchMode: FilterMatchMode.CONTAINS },
    lastpurchaseprice: { value: null, matchMode: FilterMatchMode.CONTAINS },
    grandtotal: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const columnOptions = [
    { field: "supplier", header: "Supplier" },
    { field: "suppliergst", header: "Supplier GST" },
    { field: "ordernumber", header: "Order Number" },
    { field: "createdby", header: "Created By" },
    { field: "referencebillnumber", header: "Reference Bill Number" },
    { field: "podate", header: "PO Date" },
    { field: "productcategory", header: "Product Category" },
    { field: "brand", header: "Brand" },
    { field: "hsnsaccode", header: "HSN/SAC Code" },
    { field: "product", header: "Product" },
    { field: "uom", header: "UOM" },
    { field: "batchnumber", header: "Batch Number" },
    { field: "warehouse", header: "Warehouse" },
    { field: "remarks", header: "Remarks" },
    { field: "quantity", header: "Quantity" },
    { field: "price", header: "Price" },
    { field: "total", header: "Total" },
    { field: "discountpercent", header: "Discount %" },
    { field: "discount", header: "Discount" },
    { field: "netamount", header: "Net Amount" },
    { field: "taxableamount", header: "Taxable Amount" },
    { field: "taxpercent", header: "Tax %" },
    { field: "taxamount", header: "Tax Amount" },
    { field: "cgst", header: "CGST" },
    { field: "sgst", header: "SGST" },
    { field: "igst", header: "IGST" },
    { field: "mrp", header: "MRP" },
    { field: "lastpurchaseprice", header: "Last Purchase Price" },
    { field: "grandtotal", header: "Grand Total" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("productPurchase_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default - show ALL columns
    return columnOptions;
  });

  // Fetch product purchase data
  const fetchProductPurchase = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await ProductWisePurchaseService.getProductWisePurchase({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
        locationId: selectedLocationId,
      });

      if (response.success) {
        setPurchaseList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail: response.message || "Failed to fetch product purchase data",
          life: 3000,
        });
      }
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "An error occurred while fetching data",
        life: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, selectedLocationId]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchProductPurchase();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchProductPurchase]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("productPurchaseTableFilters");
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
    supplier: "",
    suppliergst: "",
    ordernumber: "",
    createdby: "",
    referencebillnumber: "",
    podate: "",
    productcategory: "",
    brand: "",
    hsnsaccode: "",
    product: "",
    uom: "",
    batchnumber: "",
    warehouse: "",
    remarks: "",
    quantity: "",
    price: "",
    total: "",
    discountpercent: "",
    discount: "",
    netamount: "",
    taxableamount: "",
    taxpercent: "",
    taxamount: "",
    cgst: "",
    sgst: "",
    igst: "",
    mrp: "",
    lastpurchaseprice: "",
    grandtotal: "",
  };

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    const updatedFilters = {
      ...filters,
      global: { ...filters.global, value },
    };
    setFilters(updatedFilters);
  };

  const syncSessionFilters = (updatedFilters) => {
    const sessionState = sessionStorage.getItem("productPurchaseTableFilters");
    const parsedState = sessionState ? JSON.parse(sessionState) : {};

    sessionStorage.setItem(
      "productPurchaseTableFilters",
      JSON.stringify({
        ...parsedState,
        filters: updatedFilters,
        first: 0,
      }),
    );
  };

  const updateColumnFilter = (field, value) => {
    setFilters((prev) => {
      const updatedFilters = {
        ...prev,
        [field]: {
          ...prev[field],
          value,
        },
      };

      syncSessionFilters(updatedFilters);
      return updatedFilters;
    });

    setLazyParams((prev) => ({ ...prev, first: 0 }));
  };

  const formatDateFilterValue = (date) => {
    if (!date) return null;

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const parseDateFilterValue = (value) => {
    if (!value || typeof value !== "string") return null;

    const [day, month, year] = value.split("/");
    if (!day || !month || !year) return null;

    const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  };

  const dateFilterElement = (options) => (
    <Calendar
      value={parseDateFilterValue(filters[options.field]?.value)}
      onChange={(e) => updateColumnFilter(options.field, formatDateFilterValue(e.value))}
      dateFormat="dd/mm/yy"
      placeholder="Select Date"
      showIcon
      showButtonBar
      manualInput={false}
      className="w-full"
      inputClassName="p-column-filter"
    />
  );

  const textFilterElement = (options, placeholder = "Search") => (
    <InputText
      value={filters[options.field]?.value ?? ""}
      onChange={(e) => updateColumnFilter(options.field, e.target.value)}
      placeholder={placeholder}
      className="p-column-filter w-full"
    />
  );

  const numericFilterElement = (options) => (
    <InputText
      value={filters[options.field]?.value ?? ""}
      onChange={(e) => {
        const value = e.target.value;
        if (/^\d*\.?\d*$/.test(value)) {
          updateColumnFilter(options.field, value);
        }
      }}
      placeholder="Enter number"
      className="p-column-filter w-full"
    />
  );

  const fileExportMessage = () => {
    toast.current.show({
      severity: "success",
      detail: "File Exported Successfully",
      life: 3000,
    });
  };

  const exportCSV = () => {
    if (purchaseList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = purchaseList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (
          [
            "price",
            "total",
            "discountpercent",
            "discount",
            "netamount",
            "taxableamount",
            "taxpercent",
            "taxamount",
            "cgst",
            "sgst",
            "igst",
            "mrp",
            "lastpurchaseprice",
            "grandtotal",
            "quantity",
          ].includes(col.field)
        ) {
          formattedRow[col.header] =
            row[col.field] != null
              ? `${Number(row[col.field]).toFixed(2)}`
              : "0.00";
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

    const filename = "product_wise_purchase.csv";
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
    if (purchaseList.length === 0) {
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
      const body = purchaseList.map((row) =>
        visibleFields.map((col) => row[col.field] ?? "-"),
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
          fontSize: 7,
          cellPadding: 3,
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

      doc.save("product_wise_purchase.pdf");
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
    if (purchaseList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = purchaseList.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
        if (
          [
            "price",
            "total",
            "discountpercent",
            "discount",
            "netamount",
            "taxableamount",
            "taxpercent",
            "taxamount",
            "cgst",
            "sgst",
            "igst",
            "mrp",
            "lastpurchaseprice",
            "grandtotal",
            "quantity",
          ].includes(col.field)
        ) {
            filteredRow[col.header] =
              row[col.field] != null
                ? `${Number(row[col.field]).toFixed(2)}`
                : "0.00";
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

      saveAsExcelFile(excelBuffer, "product_wise_purchase");
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

    // Ensure ordernumber is always included (same pattern as itemname in Item Management)
    if (!selectedColumns.some((col) => col.field === "ordernumber")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "ordernumber"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "productPurchase_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Product Wise Purchase Report
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

        <LocationFilter
          onLocationChange={setSelectedLocationId}
          className="w-full sm:w-48"
        />

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

  // Body templates for columns
  const supplierBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span>{rowData.supplier || "-"}</span>
    );
  };

  const supplierGSTBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{rowData.suppliergst || "-"}</span>
    );
  };

  const orderNumberBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="90%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-blue-600">
        {rowData.ordernumber || "-"}
      </span>
    );
  };

  const createdByBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{rowData.createdby || "-"}</span>
    );
  };

  const referenceBillBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span>{rowData.referencebillnumber || "-"}</span>
    );
  };

  const poDateBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="90%" height="1.5rem" />
    ) : (
      <span>{rowData.podate || "-"}</span>
    );
  };

  const productCategoryBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{rowData.productcategory || "-"}</span>
    );
  };

  const brandBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{rowData.brand || "-"}</span>
    );
  };

  const hsnSacCodeBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{rowData.hsnsaccode || "-"}</span>
    );
  };

  const productBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span>{rowData.product || "-"}</span>
    );
  };

  const uomBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span>{rowData.uom || "-"}</span>
    );
  };

  const batchNumberBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{rowData.batchnumber || "-"}</span>
    );
  };

  const warehouseBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{rowData.warehouse || "-"}</span>
    );
  };

  const remarksBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{rowData.remarks || "-"}</span>
    );
  };

  const quantityBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="50%" height="1.5rem" />
    ) : (
      <span className="font-semibold">{rowData.quantity || 0}</span>
    );
  };

  const priceBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span>{"\u20B9"}{rowData.price ? Number(rowData.price).toFixed(2) : "0.00"}</span>
    );
  };

  const totalBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{"\u20B9"}{rowData.total ? Number(rowData.total).toFixed(2) : "0.00"}</span>
    );
  };

  const discountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className={rowData.discount > 0 ? "text-green-600" : ""}>
        {"\u20B9"}{rowData.discount ? Number(rowData.discount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const taxableAmountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>
        {"\u20B9"}
        {rowData.taxableamount
          ? Number(rowData.taxableamount).toFixed(2)
          : "0.00"}
      </span>
    );
  };

  const discountPercentBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span>
        {rowData.discountpercent != null
          ? Number(rowData.discountpercent).toFixed(2)
          : "0.00"}
        %
      </span>
    );
  };

  const netAmountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>
        {"\u20B9"}{rowData.netamount ? Number(rowData.netamount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const taxPercentBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span>
        {rowData.taxpercent != null
          ? Number(rowData.taxpercent).toFixed(2)
          : "0.00"}
        %
      </span>
    );
  };

  const taxAmountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>
        {"\u20B9"}{rowData.taxamount ? Number(rowData.taxamount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const cgstBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{"\u20B9"}{rowData.cgst ? Number(rowData.cgst).toFixed(2) : "0.00"}</span>
    );
  };

  const sgstBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{"\u20B9"}{rowData.sgst ? Number(rowData.sgst).toFixed(2) : "0.00"}</span>
    );
  };

  const igstBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{"\u20B9"}{rowData.igst ? Number(rowData.igst).toFixed(2) : "0.00"}</span>
    );
  };

  const mrpBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{"\u20B9"}{rowData.mrp ? Number(rowData.mrp).toFixed(2) : "0.00"}</span>
    );
  };

  const lastPurchasePriceBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>
        {"\u20B9"}
        {rowData.lastpurchaseprice
          ? Number(rowData.lastpurchaseprice).toFixed(2)
          : "0.00"}
      </span>
    );
  };

  const grandTotalBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-bold text-blue-600">
        {"\u20B9"}{rowData.grandtotal ? Number(rowData.grandtotal).toFixed(2) : "0.00"}
      </span>
    );
  };

  return (
    <Page title="Product Wise Purchase">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : purchaseList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage message="No product purchase records found" />
                }
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "supplier",
                  "suppliergst",
                  "ordernumber",
                  "createdby",
                  "referencebillnumber",
                  "podate",
                  "productcategory",
                  "brand",
                  "hsnsaccode",
                  "product",
                  "uom",
                  "batchnumber",
                  "warehouse",
                  "remarks",
                ]}
                onFilter={(e) => {
                  setFilters(e.filters);
                  setLazyParams((prev) => ({ ...prev, first: 0 }));
                  scrollToTop();
                }}
                onPage={(e) => {
                  setLazyParams((prev) => ({
                    ...prev,
                    first: e.first,
                    rows: e.rows,
                  }));
                  scrollToTop();
                }}
                onSort={(e) => {
                  setLazyParams((prev) => ({
                    ...prev,
                    sortField: e.sortField,
                    sortOrder: e.sortOrder,
                  }));
                  scrollToTop();
                }}
                stateStorage="session"
                stateKey="productPurchaseTableFilters"
                rows={lazyParams.rows}
                first={lazyParams.first}
                totalRecords={totalRecords}
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50, 100]}
                tableStyle={{ minWidth: "70rem" }}
                removableSort
              >
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
                {visibleFields.some((col) => col.field === "supplier") && (
                  <Column
                    field="supplier"
                    header="Supplier"
                    style={{ minWidth: "15rem" }}
                    body={supplierBodyTemplate}
                    filter
                    filterElement={(options) =>
                      textFilterElement(options, "Search Supplier")
                    }
                    showFilterMenu={false}
                    filterPlaceholder="Search Supplier"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "suppliergst") && (
                  <Column
                    field="suppliergst"
                    header="Supplier GST"
                    style={{ minWidth: "14rem" }}
                    body={supplierGSTBodyTemplate}
                    filter
                    filterElement={(options) =>
                      textFilterElement(options, "Search GST")
                    }
                    showFilterMenu={false}
                    filterPlaceholder="Search GST"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "ordernumber") && (
                  <Column
                    field="ordernumber"
                    header="Order Number"
                    style={{ minWidth: "12rem" }}
                    body={orderNumberBodyTemplate}
                    filter
                    filterElement={(options) =>
                      textFilterElement(options, "Search Order No")
                    }
                    showFilterMenu={false}
                    filterPlaceholder="Search Order No"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "createdby") && (
                  <Column
                    field="createdby"
                    header="Created By"
                    style={{ minWidth: "11rem" }}
                    body={createdByBodyTemplate}
                    filter
                    filterElement={(options) =>
                      textFilterElement(options, "Search Creator")
                    }
                    showFilterMenu={false}
                    filterPlaceholder="Search Creator"
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "referencebillnumber",
                ) && (
                  <Column
                    field="referencebillnumber"
                    header="Reference Bill Number"
                    style={{ minWidth: "16rem" }}
                    body={referenceBillBodyTemplate}
                    filter
                    filterElement={(options) =>
                      textFilterElement(options, "Search Reference")
                    }
                    showFilterMenu={false}
                    filterPlaceholder="Search Reference"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "podate") && (
                  <Column
                    field="podate"
                    header="PO Date"
                    style={{ minWidth: "14rem" }}
                    body={poDateBodyTemplate}
                    filter
                    filterElement={dateFilterElement}
                    showFilterMenu={false}
                    filterPlaceholder="Search Date"
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "productcategory",
                ) && (
                  <Column
                    field="productcategory"
                    header="Product Category"
                    style={{ minWidth: "14rem" }}
                    body={productCategoryBodyTemplate}
                    filter
                    filterElement={(options) =>
                      textFilterElement(options, "Search Category")
                    }
                    showFilterMenu={false}
                    filterPlaceholder="Search Category"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "brand") && (
                  <Column
                    field="brand"
                    header="Brand"
                    style={{ minWidth: "12rem" }}
                    body={brandBodyTemplate}
                    filter
                    filterElement={(options) =>
                      textFilterElement(options, "Search Brand")
                    }
                    showFilterMenu={false}
                    filterPlaceholder="Search Brand"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "hsnsaccode") && (
                  <Column
                    field="hsnsaccode"
                    header="HSN/SAC Code"
                    style={{ minWidth: "12rem" }}
                    body={hsnSacCodeBodyTemplate}
                    filter
                    filterElement={(options) =>
                      textFilterElement(options, "Search HSN/SAC")
                    }
                    showFilterMenu={false}
                    filterPlaceholder="Search HSN/SAC"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "product") && (
                  <Column
                    field="product"
                    header="Product"
                    style={{ minWidth: "16rem" }}
                    body={productBodyTemplate}
                    filter
                    filterElement={(options) =>
                      textFilterElement(options, "Search Product")
                    }
                    showFilterMenu={false}
                    filterPlaceholder="Search Product"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "uom") && (
                  <Column
                    field="uom"
                    header="UOM"
                    style={{ minWidth: "8rem" }}
                    body={uomBodyTemplate}
                    filter
                    filterElement={(options) =>
                      textFilterElement(options, "Search UOM")
                    }
                    showFilterMenu={false}
                    filterPlaceholder="Search UOM"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "batchnumber") && (
                  <Column
                    field="batchnumber"
                    header="Batch Number"
                    style={{ minWidth: "12rem" }}
                    body={batchNumberBodyTemplate}
                    filter
                    filterElement={(options) =>
                      textFilterElement(options, "Search Batch")
                    }
                    showFilterMenu={false}
                    filterPlaceholder="Search Batch"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "warehouse") && (
                  <Column
                    field="warehouse"
                    header="Warehouse"
                    style={{ minWidth: "13rem" }}
                    body={warehouseBodyTemplate}
                    filter
                    filterElement={(options) =>
                      textFilterElement(options, "Search Warehouse")
                    }
                    showFilterMenu={false}
                    filterPlaceholder="Search Warehouse"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "remarks") && (
                  <Column
                    field="remarks"
                    header="Remarks"
                    style={{ minWidth: "14rem" }}
                    body={remarksBodyTemplate}
                    filter
                    filterElement={(options) =>
                      textFilterElement(options, "Search Remarks")
                    }
                    showFilterMenu={false}
                    filterPlaceholder="Search Remarks"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "quantity") && (
                  <Column
                    field="quantity"
                    header="Quantity"
                    style={{ minWidth: "9rem" }}
                    body={quantityBodyTemplate}
                    filter
                    filterElement={numericFilterElement}
                    showFilterMenu={false}
                    filterPlaceholder="Search Qty"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "price") && (
                  <Column
                    field="price"
                    header="Price"
                    style={{ minWidth: "10rem" }}
                    body={priceBodyTemplate}
                    filter
                    filterElement={numericFilterElement}
                    showFilterMenu={false}
                    filterPlaceholder="Search Price"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "total") && (
                  <Column
                    field="total"
                    header="Total"
                    style={{ minWidth: "11rem" }}
                    body={totalBodyTemplate}
                    filter
                    filterElement={numericFilterElement}
                    showFilterMenu={false}
                    filterPlaceholder="Search Total"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "discount") && (
                  <Column
                    field="discount"
                    header="Discount"
                    style={{ minWidth: "10rem" }}
                    body={discountBodyTemplate}
                    filter
                    filterElement={numericFilterElement}
                    showFilterMenu={false}
                    filterPlaceholder="Search Discount"
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "discountpercent",
                ) && (
                  <Column
                    field="discountpercent"
                    header="Discount %"
                    style={{ minWidth: "11rem" }}
                    body={discountPercentBodyTemplate}
                    filter
                    filterElement={numericFilterElement}
                    showFilterMenu={false}
                    filterPlaceholder="Search Discount %"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "netamount") && (
                  <Column
                    field="netamount"
                    header="Net Amount"
                    style={{ minWidth: "12rem" }}
                    body={netAmountBodyTemplate}
                    filter
                    filterElement={numericFilterElement}
                    showFilterMenu={false}
                    filterPlaceholder="Search Net Amount"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "taxableamount") && (
                  <Column
                    field="taxableamount"
                    header="Taxable Amount"
                    style={{ minWidth: "13rem" }}
                    body={taxableAmountBodyTemplate}
                    filter
                    filterElement={numericFilterElement}
                    showFilterMenu={false}
                    filterPlaceholder="Search Tax Amount"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "taxpercent") && (
                  <Column
                    field="taxpercent"
                    header="Tax %"
                    style={{ minWidth: "10rem" }}
                    body={taxPercentBodyTemplate}
                    filter
                    filterElement={numericFilterElement}
                    showFilterMenu={false}
                    filterPlaceholder="Search Tax %"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "taxamount") && (
                  <Column
                    field="taxamount"
                    header="Tax Amount"
                    style={{ minWidth: "12rem" }}
                    body={taxAmountBodyTemplate}
                    filter
                    filterElement={numericFilterElement}
                    showFilterMenu={false}
                    filterPlaceholder="Search Tax Amount"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "cgst") && (
                  <Column
                    field="cgst"
                    header="CGST"
                    style={{ minWidth: "10rem" }}
                    body={cgstBodyTemplate}
                    filter
                    filterElement={numericFilterElement}
                    showFilterMenu={false}
                    filterPlaceholder="Search CGST"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "sgst") && (
                  <Column
                    field="sgst"
                    header="SGST"
                    style={{ minWidth: "10rem" }}
                    body={sgstBodyTemplate}
                    filter
                    filterElement={numericFilterElement}
                    showFilterMenu={false}
                    filterPlaceholder="Search SGST"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "igst") && (
                  <Column
                    field="igst"
                    header="IGST"
                    style={{ minWidth: "10rem" }}
                    body={igstBodyTemplate}
                    filter
                    filterElement={numericFilterElement}
                    showFilterMenu={false}
                    filterPlaceholder="Search IGST"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "mrp") && (
                  <Column
                    field="mrp"
                    header="MRP"
                    style={{ minWidth: "10rem" }}
                    body={mrpBodyTemplate}
                    filter
                    filterElement={numericFilterElement}
                    showFilterMenu={false}
                    filterPlaceholder="Search MRP"
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "lastpurchaseprice",
                ) && (
                  <Column
                    field="lastpurchaseprice"
                    header="Last Purchase Price"
                    style={{ minWidth: "15rem" }}
                    body={lastPurchasePriceBodyTemplate}
                    filter
                    filterElement={numericFilterElement}
                    showFilterMenu={false}
                    filterPlaceholder="Search Last Price"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "grandtotal") && (
                  <Column
                    field="grandtotal"
                    header="Grand Total"
                    style={{ minWidth: "12rem" }}
                    body={grandTotalBodyTemplate}
                    filter
                    filterElement={numericFilterElement}
                    showFilterMenu={false}
                    filterPlaceholder="Search Grand Total"
                    sortable
                  />
                )}
              </DataTable>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
