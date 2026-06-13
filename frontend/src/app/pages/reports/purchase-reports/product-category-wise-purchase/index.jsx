import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ColumnGroup } from "primereact/columngroup";
import { Row } from "primereact/row";
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
import { ProductCategoryWisePurchaseService } from "services/reports/purchase/productCategoryWisePurchase";
import EmptyMessage from "components/shared/EmptyMessage";
import { LocationFilter } from "components/reports/LocationFilter";

export default function ProductCategoryWisePurchase() {
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
    productcategory: { value: null, matchMode: FilterMatchMode.CONTAINS },
    quantity: { value: null, matchMode: FilterMatchMode.EQUALS },
    total: { value: null, matchMode: FilterMatchMode.CONTAINS },
    discount: { value: null, matchMode: FilterMatchMode.CONTAINS },
    taxableamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
    grandtotal: { value: null, matchMode: FilterMatchMode.CONTAINS },
    noofproducts: { value: null, matchMode: FilterMatchMode.EQUALS },
    noofpos: { value: null, matchMode: FilterMatchMode.EQUALS },
    averageunitprice: { value: null, matchMode: FilterMatchMode.CONTAINS },
    netamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
    taxamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
    cgst: { value: null, matchMode: FilterMatchMode.CONTAINS },
    sgst: { value: null, matchMode: FilterMatchMode.CONTAINS },
    igst: { value: null, matchMode: FilterMatchMode.CONTAINS },
    percentoftotalpurchase: {
      value: null,
      matchMode: FilterMatchMode.CONTAINS,
    },
    returnqty: { value: null, matchMode: FilterMatchMode.EQUALS },
    returnamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
    netpurchase: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const columnOptions = [
    { field: "productcategory", header: "Product Category" },
    { field: "quantity", header: "Quantity" },
    { field: "total", header: "Total" },
    { field: "discount", header: "Discount" },
    { field: "taxableamount", header: "Taxable Amount" },
    { field: "grandtotal", header: "Grand Total" },
    { field: "noofproducts", header: "No. of Products" },
    { field: "noofpos", header: "No. of POs" },
    { field: "averageunitprice", header: "Average Unit Price" },
    { field: "netamount", header: "Net Amount" },
    { field: "taxamount", header: "Tax Amount" },
    { field: "cgst", header: "CGST" },
    { field: "sgst", header: "SGST" },
    { field: "igst", header: "IGST" },
    { field: "percentoftotalpurchase", header: "% of Total Purchase" },
    { field: "returnqty", header: "Return Qty" },
    { field: "returnamount", header: "Return Amount" },
    { field: "netpurchase", header: "Net Purchase" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("categoryPurchase_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default - show ALL columns
    return columnOptions;
  });

  // Fetch product category purchase data
  const fetchProductCategoryPurchase = useCallback(async () => {
    setIsLoading(true);
    try {
      const response =
        await ProductCategoryWisePurchaseService.getProductCategoryWisePurchase(
          {
            filters,
            start: lazyParams.first,
            length: lazyParams.rows,
            sortField: lazyParams.sortField,
            sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
            locationId: selectedLocationId,
          },
        );

      if (response.success) {
        setPurchaseList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail:
            response.message ||
            "Failed to fetch product category purchase data",
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
      fetchProductCategoryPurchase();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchProductCategoryPurchase]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("categoryPurchaseTableFilters");
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
    productcategory: "",
    quantity: "",
    total: "",
    discount: "",
    taxableamount: "",
    grandtotal: "",
    noofproducts: "",
    noofpos: "",
    averageunitprice: "",
    netamount: "",
    taxamount: "",
    cgst: "",
    sgst: "",
    igst: "",
    percentoftotalpurchase: "",
    returnqty: "",
    returnamount: "",
    netpurchase: "",
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
    const sessionState = sessionStorage.getItem("categoryPurchaseTableFilters");
    const parsedState = sessionState ? JSON.parse(sessionState) : {};

    sessionStorage.setItem(
      "categoryPurchaseTableFilters",
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

  const numericFilterElement = (options, fieldName = options.field) => (
    <InputText
      value={filters[fieldName]?.value ?? ""}
      onChange={(e) => {
        const value = e.target.value;
        if (/^\d*\.?\d*$/.test(value)) {
          updateColumnFilter(fieldName, value);
        }
      }}
      placeholder="Enter number"
      className="p-column-filter w-full"
    />
  );

  const textFilterElement = (
    options,
    fieldName = options.field,
    placeholder = "Search",
  ) => (
    <InputText
      value={filters[fieldName]?.value ?? ""}
      onChange={(e) => updateColumnFilter(fieldName, e.target.value)}
      placeholder={placeholder}
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
            "quantity",
            "total",
            "discount",
            "taxableamount",
            "grandtotal",
            "noofproducts",
            "noofpos",
            "averageunitprice",
            "netamount",
            "taxamount",
            "cgst",
            "sgst",
            "igst",
            "percentoftotalpurchase",
            "returnqty",
            "returnamount",
            "netpurchase",
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

    const filename = "product_category_wise_purchase.csv";
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
        orientation: "portrait",
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

      doc.save("product_category_wise_purchase.pdf");
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
              "quantity",
              "total",
              "discount",
              "taxableamount",
              "grandtotal",
              "noofproducts",
              "noofpos",
              "averageunitprice",
              "netamount",
              "taxamount",
              "cgst",
              "sgst",
              "igst",
              "percentoftotalpurchase",
              "returnqty",
              "returnamount",
              "netpurchase",
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

      saveAsExcelFile(excelBuffer, "product_category_wise_purchase");
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

    // Ensure productcategory is always included (same pattern as ordernumber in Product Wise)
    if (!selectedColumns.some((col) => col.field === "productcategory")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "productcategory"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "categoryPurchase_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Product Category Wise Purchase Report
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
  const productCategoryBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-purple-600">
        {rowData.productcategory || "-"}
      </span>
    );
  };

  const quantityBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className="font-semibold">{rowData.quantity || 0}</span>
    );
  };

  const totalBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>₹{rowData.total ? Number(rowData.total).toFixed(2) : "0.00"}</span>
    );
  };

  const discountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className={rowData.discount > 0 ? "text-green-600" : ""}>
        ₹{rowData.discount ? Number(rowData.discount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const taxableAmountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>
        ₹
        {rowData.taxableamount
          ? Number(rowData.taxableamount).toFixed(2)
          : "0.00"}
      </span>
    );
  };

  const grandTotalBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-bold text-blue-600">
        ₹{rowData.grandtotal ? Number(rowData.grandtotal).toFixed(2) : "0.00"}
      </span>
    );
  };

  const noOfProductsBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="55%" height="1.5rem" />
    ) : (
      <span>{rowData.noofproducts || 0}</span>
    );
  };

  const noOfPOsBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="55%" height="1.5rem" />
    ) : (
      <span>{rowData.noofpos || 0}</span>
    );
  };

  const averageUnitPriceBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>
        {"\u20B9"}
        {rowData.averageunitprice
          ? Number(rowData.averageunitprice).toFixed(2)
          : "0.00"}
      </span>
    );
  };

  const netAmountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>
        {"\u20B9"}
        {rowData.netamount ? Number(rowData.netamount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const taxAmountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>
        {"\u20B9"}
        {rowData.taxamount ? Number(rowData.taxamount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const cgstBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span>
        {"\u20B9"}
        {rowData.cgst ? Number(rowData.cgst).toFixed(2) : "0.00"}
      </span>
    );
  };

  const sgstBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span>
        {"\u20B9"}
        {rowData.sgst ? Number(rowData.sgst).toFixed(2) : "0.00"}
      </span>
    );
  };

  const igstBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span>
        {"\u20B9"}
        {rowData.igst ? Number(rowData.igst).toFixed(2) : "0.00"}
      </span>
    );
  };

  const percentOfTotalPurchaseBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="65%" height="1.5rem" />
    ) : (
      <span>
        {rowData.percentoftotalpurchase
          ? Number(rowData.percentoftotalpurchase).toFixed(2)
          : "0.00"}
        %
      </span>
    );
  };

  const returnQtyBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="55%" height="1.5rem" />
    ) : (
      <span>{rowData.returnqty || 0}</span>
    );
  };

  const returnAmountBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>
        {"\u20B9"}
        {rowData.returnamount ? Number(rowData.returnamount).toFixed(2) : "0.00"}
      </span>
    );
  };

  const netPurchaseBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-semibold">
        {"\u20B9"}
        {rowData.netpurchase ? Number(rowData.netpurchase).toFixed(2) : "0.00"}
      </span>
    );
  };

  // Calculate totals for footer
  const calculateTotals = () => {
    const totals = purchaseList.reduce(
      (acc, row) => {
        acc.quantity += row.quantity || 0;
        acc.total += row.total || 0;
        acc.discount += row.discount || 0;
        acc.taxableAmount += row.taxableamount || 0;
        acc.grandTotal += row.grandtotal || 0;
        acc.noOfProducts += row.noofproducts || 0;
        acc.noOfPOs += row.noofpos || 0;
        acc.averageUnitPrice += row.averageunitprice || 0;
        acc.netAmount += row.netamount || 0;
        acc.taxAmount += row.taxamount || 0;
        acc.cgst += row.cgst || 0;
        acc.sgst += row.sgst || 0;
        acc.igst += row.igst || 0;
        acc.percentOfTotalPurchase += row.percentoftotalpurchase || 0;
        acc.returnQty += row.returnqty || 0;
        acc.returnAmount += row.returnamount || 0;
        acc.netPurchase += row.netpurchase || 0;
        return acc;
      },
      {
        quantity: 0,
        total: 0,
        discount: 0,
        taxableAmount: 0,
        grandTotal: 0,
        noOfProducts: 0,
        noOfPOs: 0,
        averageUnitPrice: 0,
        netAmount: 0,
        taxAmount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        percentOfTotalPurchase: 0,
        returnQty: 0,
        returnAmount: 0,
        netPurchase: 0,
      },
    );
    return totals;
  };

  const totals = calculateTotals();

  const footerGroup = (
    <ColumnGroup>
      <Row>
        <Column footer="" style={{ minWidth: "5rem" }} />
        {visibleFields.some((col) => col.field === "productcategory") && (
          <Column
            footer="Total:"
            footerStyle={{ textAlign: "right", fontWeight: "bold" }}
            style={{ minWidth: "14rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "quantity") && (
          <Column
            footer={totals.quantity}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "10rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "total") && (
          <Column
            footer={`₹${totals.total.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "12rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "discount") && (
          <Column
            footer={`₹${totals.discount.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold", color: "#16a34a" }}
            style={{ minWidth: "11rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "taxableamount") && (
          <Column
            footer={`₹${totals.taxableAmount.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "13rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "grandtotal") && (
          <Column
            footer={`₹${totals.grandTotal.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold", color: "#2563eb" }}
            style={{ minWidth: "13rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "noofproducts") && (
          <Column
            footer={totals.noOfProducts.toFixed(2)}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "12rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "noofpos") && (
          <Column
            footer={totals.noOfPOs.toFixed(2)}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "10rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "averageunitprice") && (
          <Column
            footer={`\u20B9${totals.averageUnitPrice.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "14rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "netamount") && (
          <Column
            footer={`\u20B9${totals.netAmount.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "12rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "taxamount") && (
          <Column
            footer={`\u20B9${totals.taxAmount.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "12rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "cgst") && (
          <Column
            footer={`\u20B9${totals.cgst.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "10rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "sgst") && (
          <Column
            footer={`\u20B9${totals.sgst.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "10rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "igst") && (
          <Column
            footer={`\u20B9${totals.igst.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "10rem" }}
          />
        )}
        {visibleFields.some(
          (col) => col.field === "percentoftotalpurchase",
        ) && (
          <Column
            footer={`${totals.percentOfTotalPurchase.toFixed(2)}%`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "15rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "returnqty") && (
          <Column
            footer={totals.returnQty.toFixed(2)}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "10rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "returnamount") && (
          <Column
            footer={`\u20B9${totals.returnAmount.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "12rem" }}
          />
        )}
        {visibleFields.some((col) => col.field === "netpurchase") && (
          <Column
            footer={`\u20B9${totals.netPurchase.toFixed(2)}`}
            footerStyle={{ fontWeight: "bold" }}
            style={{ minWidth: "12rem" }}
          />
        )}
      </Row>
    </ColumnGroup>
  );

  return (
    <Page title="Product Category Wise Purchase">
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
                  <EmptyMessage message="No product category purchase records found" />
                }
                footerColumnGroup={!isLoading ? footerGroup : null}
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "productcategory",
                  "quantity",
                  "total",
                  "discount",
                  "taxableamount",
                  "grandtotal",
                  "noofproducts",
                  "noofpos",
                  "averageunitprice",
                  "netamount",
                  "taxamount",
                  "cgst",
                  "sgst",
                  "igst",
                  "percentoftotalpurchase",
                  "returnqty",
                  "returnamount",
                  "netpurchase",
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
                stateKey="categoryPurchaseTableFilters"
                rows={lazyParams.rows}
                first={lazyParams.first}
                totalRecords={totalRecords}
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50, 100]}
                tableStyle={{ minWidth: "50rem" }}
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
                      textFilterElement(options, "productcategory", "Search Category")
                    }
                    showFilterMenu={false}
                    filterPlaceholder="Search Category"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "quantity") && (
                  <Column
                    field="quantity"
                    header="Quantity"
                    style={{ minWidth: "10rem" }}
                    body={quantityBodyTemplate}
                    filter
                    filterElement={(options) => numericFilterElement(options, "quantity")}
                    showFilterMenu={false}
                    filterPlaceholder="Search Qty"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "total") && (
                  <Column
                    field="total"
                    header="Total"
                    style={{ minWidth: "12rem" }}
                    body={totalBodyTemplate}
                    filter
                    filterElement={(options) => numericFilterElement(options, "total")}
                    showFilterMenu={false}
                    filterPlaceholder="Search Total"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "discount") && (
                  <Column
                    field="discount"
                    header="Discount"
                    style={{ minWidth: "11rem" }}
                    body={discountBodyTemplate}
                    filter
                    filterElement={(options) => numericFilterElement(options, "discount")}
                    showFilterMenu={false}
                    filterPlaceholder="Search Discount"
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
                    filterElement={(options) => numericFilterElement(options, "taxableamount")}
                    showFilterMenu={false}
                    filterPlaceholder="Search Tax Amount"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "grandtotal") && (
                  <Column
                    field="grandtotal"
                    header="Grand Total"
                    style={{ minWidth: "13rem" }}
                    body={grandTotalBodyTemplate}
                    filter
                    filterElement={(options) => numericFilterElement(options, "grandtotal")}
                    showFilterMenu={false}
                    filterPlaceholder="Search Grand Total"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "noofproducts") && (
                  <Column
                    field="noofproducts"
                    header="No. of Products"
                    style={{ minWidth: "12rem" }}
                    body={noOfProductsBodyTemplate}
                    filter
                    filterElement={(options) => numericFilterElement(options, "noofproducts")}
                    showFilterMenu={false}
                    filterPlaceholder="Search Product Count"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "noofpos") && (
                  <Column
                    field="noofpos"
                    header="No. of POs"
                    style={{ minWidth: "10rem" }}
                    body={noOfPOsBodyTemplate}
                    filter
                    filterElement={(options) => numericFilterElement(options, "noofpos")}
                    showFilterMenu={false}
                    filterPlaceholder="Search PO Count"
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "averageunitprice",
                ) && (
                  <Column
                    field="averageunitprice"
                    header="Average Unit Price"
                    style={{ minWidth: "14rem" }}
                    body={averageUnitPriceBodyTemplate}
                    filter
                    filterElement={(options) =>
                      numericFilterElement(options, "averageunitprice")
                    }
                    showFilterMenu={false}
                    filterPlaceholder="Search Avg Price"
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
                    filterElement={(options) => numericFilterElement(options, "netamount")}
                    showFilterMenu={false}
                    filterPlaceholder="Search Net Amount"
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
                    filterElement={(options) => numericFilterElement(options, "taxamount")}
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
                    filterElement={(options) => numericFilterElement(options, "cgst")}
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
                    filterElement={(options) => numericFilterElement(options, "sgst")}
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
                    filterElement={(options) => numericFilterElement(options, "igst")}
                    showFilterMenu={false}
                    filterPlaceholder="Search IGST"
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "percentoftotalpurchase",
                ) && (
                  <Column
                    field="percentoftotalpurchase"
                    header="% of Total Purchase"
                    style={{ minWidth: "15rem" }}
                    body={percentOfTotalPurchaseBodyTemplate}
                    filter
                    filterElement={(options) =>
                      numericFilterElement(options, "percentoftotalpurchase")
                    }
                    showFilterMenu={false}
                    filterPlaceholder="Search Contribution %"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "returnqty") && (
                  <Column
                    field="returnqty"
                    header="Return Qty"
                    style={{ minWidth: "10rem" }}
                    body={returnQtyBodyTemplate}
                    filter
                    filterElement={(options) => numericFilterElement(options, "returnqty")}
                    showFilterMenu={false}
                    filterPlaceholder="Search Return Qty"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "returnamount") && (
                  <Column
                    field="returnamount"
                    header="Return Amount"
                    style={{ minWidth: "12rem" }}
                    body={returnAmountBodyTemplate}
                    filter
                    filterElement={(options) => numericFilterElement(options, "returnamount")}
                    showFilterMenu={false}
                    filterPlaceholder="Search Return Amount"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "netpurchase") && (
                  <Column
                    field="netpurchase"
                    header="Net Purchase"
                    style={{ minWidth: "12rem" }}
                    body={netPurchaseBodyTemplate}
                    filter
                    filterElement={(options) => numericFilterElement(options, "netpurchase")}
                    showFilterMenu={false}
                    filterPlaceholder="Search Net Purchase"
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
