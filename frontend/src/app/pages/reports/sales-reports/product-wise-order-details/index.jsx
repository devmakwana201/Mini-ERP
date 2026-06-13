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
import { ProductWiseOrderDetailsService } from "services/reports/sales/productWiseOrderDetails";
import EmptyMessage from "components/shared/EmptyMessage";
import { LocationFilter } from "components/reports/LocationFilter";

export default function ProductWiseOrderDetails() {
  const toast = useRef(null);
  const [orderList, setOrderList] = useState([]);
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
    product: { value: null, matchMode: FilterMatchMode.CONTAINS },
    productmastercategory: { value: null, matchMode: FilterMatchMode.CONTAINS },
    productcategory: { value: null, matchMode: FilterMatchMode.CONTAINS },
    productsubcategory: { value: null, matchMode: FilterMatchMode.CONTAINS },
    brand: { value: null, matchMode: FilterMatchMode.CONTAINS },
    uom: { value: null, matchMode: FilterMatchMode.CONTAINS },
    batchnumber: { value: null, matchMode: FilterMatchMode.CONTAINS },
    batchdate: { value: null, matchMode: FilterMatchMode.CONTAINS },
    price: { value: null, matchMode: FilterMatchMode.EQUALS },
    purchase: { value: null, matchMode: FilterMatchMode.EQUALS },
    purchaseatsale: { value: null, matchMode: FilterMatchMode.EQUALS },
    profitloss: { value: null, matchMode: FilterMatchMode.EQUALS },
    billno: { value: null, matchMode: FilterMatchMode.CONTAINS },
    customer: { value: null, matchMode: FilterMatchMode.CONTAINS },
    saleperson: { value: null, matchMode: FilterMatchMode.CONTAINS },
    orderdate: { value: null, matchMode: FilterMatchMode.CONTAINS },
    orderdatetime: { value: null, matchMode: FilterMatchMode.CONTAINS },
    ordertype: { value: null, matchMode: FilterMatchMode.CONTAINS },
    channel: { value: null, matchMode: FilterMatchMode.CONTAINS },
    transaction: { value: null, matchMode: FilterMatchMode.CONTAINS },
    tax: { value: null, matchMode: FilterMatchMode.CONTAINS },
    orderremark: { value: null, matchMode: FilterMatchMode.CONTAINS },
    paymentref: { value: null, matchMode: FilterMatchMode.CONTAINS },
    paymentremark: { value: null, matchMode: FilterMatchMode.CONTAINS },
    reprintremark: { value: null, matchMode: FilterMatchMode.CONTAINS },
    quantity: { value: null, matchMode: FilterMatchMode.EQUALS },
    totalamount: { value: null, matchMode: FilterMatchMode.EQUALS },
    discount: { value: null, matchMode: FilterMatchMode.EQUALS },
    taxamount: { value: null, matchMode: FilterMatchMode.EQUALS },
    totaltaxamount: { value: null, matchMode: FilterMatchMode.EQUALS },
    roundoff: { value: null, matchMode: FilterMatchMode.EQUALS },
    grandtotal: { value: null, matchMode: FilterMatchMode.EQUALS },
    locationname: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const columnOptions = [
    { field: "product", header: "Product" },
    { field: "productmastercategory", header: "Product Master Category" },
    { field: "productcategory", header: "Product Category" },
    { field: "productsubcategory", header: "Product Sub Category" },
    { field: "brand", header: "Brand" },
    { field: "uom", header: "UOM" },
    { field: "batchnumber", header: "Batch Number" },
    { field: "batchdate", header: "Batch Date" },
    { field: "price", header: "Price" },
    { field: "purchase", header: "Purchase" },
    { field: "purchaseatsale", header: "Purchase @ Sale" },
    { field: "profitloss", header: "Profit/Loss" },
    { field: "billno", header: "Bill No" },
    { field: "customer", header: "Customer" },
    { field: "saleperson", header: "Salesperson" },
    { field: "locationname", header: "Location" },
    { field: "orderdate", header: "Order Date" },
    { field: "orderdatetime", header: "Order DateTime" },
    { field: "ordertype", header: "Order Type" },
    { field: "channel", header: "Channel" },
    { field: "transaction", header: "Transaction" },
    { field: "tax", header: "Tax %" },
    { field: "orderremark", header: "Order Remark" },
    { field: "paymentref", header: "Payment Ref#" },
    { field: "paymentremark", header: "Payment Remark" },
    { field: "reprintremark", header: "Reprint Remark" },
    { field: "quantity", header: "Quantity" },
    { field: "totalamount", header: "Total Amount" },
    { field: "discount", header: "Discount" },
    { field: "taxamount", header: "Tax Amount" },
    { field: "totaltaxamount", header: "Total Tax Amount" },
    { field: "roundoff", header: "Round Off" },
    { field: "grandtotal", header: "Grand Total" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem(
      "productWiseOrderDetails_visibleFields",
    );
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default - show ALL columns
    return columnOptions;
  });

  // Fetch product-wise order details data
  const fetchOrderDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const response =
        await ProductWiseOrderDetailsService.getProductWiseOrderDetails({
          filters,
          start: lazyParams.first,
          length: lazyParams.rows,
          sortField: lazyParams.sortField,
          sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
          locationId: selectedLocationId,
        });

      if (response.success) {
        setOrderList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail: response.message || "Failed to fetch order details",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "An error occurred while fetching order details",
        life: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, selectedLocationId]);

  // Debounced effect for fetching data
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchOrderDetails();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchOrderDetails]);

  // Restore sort state from sessionStorage
  useEffect(() => {
    const savedState = sessionStorage.getItem(
      "productWiseOrderDetailsTableFilters",
    );
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        if (parsedState.sortField && parsedState.sortOrder !== undefined) {
          setLazyParams((prev) => ({
            ...prev,
            sortField: parsedState.sortField,
            sortOrder: parsedState.sortOrder,
          }));
        }
      } catch (error) {
        console.error("Error parsing saved state:", error);
      }
    }
  }, []);

  const blankRow = {
    product: "",
    productmastercategory: "",
    productcategory: "",
    productsubcategory: "",
    brand: "",
    uom: "",
    batchnumber: "",
    batchdate: "",
    price: "",
    purchase: "",
    purchaseatsale: "",
    profitloss: "",
    billno: "",
    customer: "",
    saleperson: "",
    orderdate: "",
    orderdatetime: "",
    ordertype: "",
    channel: "",
    transaction: "",
    tax: "",
    orderremark: "",
    paymentref: "",
    paymentremark: "",
    reprintremark: "",
    quantity: "",
    totalamount: "",
    discount: "",
    taxamount: "",
    totaltaxamount: "",
    roundoff: "",
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

  const fileExportMessage = () => {
    toast.current.show({
      severity: "success",
      detail: "File Exported Successfully",
      life: 3000,
    });
  };

  const exportCSV = () => {
    if (orderList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = orderList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (
          [
            "price",
            "purchase",
            "purchaseatsale",
            "profitloss",
            "quantity",
            "totalamount",
            "discount",
            "taxamount",
            "totaltaxamount",
            "roundoff",
            "grandtotal",
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

    const filename = "product_wise_order_details.csv";
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
    if (orderList.length === 0) {
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
        format: "A1", // A1 format for many columns
      });

      const head = [visibleFields.map((col) => col.header)];
      const body = orderList.map((row) =>
        visibleFields.map((col) => row[col.field] ?? "-"),
      );

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = { top: 30, bottom: 20, left: 20, right: 20 };
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
          fontSize: 4,
          cellPadding: 1,
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
            const softened = raw.replace(/(\S{15})/g, "$1\u200B");
            if (softened !== raw) data.cell.text = [softened];
          }
        },
      });

      doc.save("product_wise_order_details.pdf");
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
    if (orderList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = orderList.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (
            [
            "price",
            "purchase",
            "purchaseatsale",
            "profitloss",
            "quantity",
              "totalamount",
              "discount",
              "taxamount",
              "totaltaxamount",
              "roundoff",
              "grandtotal",
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

      saveAsExcelFile(excelBuffer, "product_wise_order_details");
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

    if (!selectedColumns.some((col) => col.field === "product")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "product"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "productWiseOrderDetails_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Product Wise Order Details Report
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
          scrollHeight="300px"
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

  // Body templates for key columns
  const productBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-blue-600">
        {rowData.product || "-"}
      </span>
    );
  };

  const profitLossBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span
        className={`font-semibold ${rowData.profitloss >= 0 ? "text-green-600" : "text-red-600"}`}
      >
        ₹{rowData.profitloss ? Number(rowData.profitloss).toFixed(2) : "0.00"}
      </span>
    );
  };

  const billNoBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span className="font-medium text-purple-600">
        {rowData.billno || "-"}
      </span>
    );
  };

  const transactionBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
        {rowData.transaction || "-"}
      </span>
    );
  };

  const grandTotalBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-bold text-green-600">
        ₹{rowData.grandtotal ? Number(rowData.grandtotal).toFixed(2) : "0.00"}
      </span>
    );
  };

  const defaultBodyTemplate = (field) => {
    const BodyTemplate = (rowData) => {
      return isLoading ? (
        <Skeleton width="70%" height="1.5rem" />
      ) : (
        <span>{rowData[field] || "-"}</span>
      );
    };
    BodyTemplate.displayName = `DefaultBodyTemplate_${field}`;
    return BodyTemplate;
  };

  const amountBodyTemplate = (field) => {
    const AmountTemplate = (rowData) => {
      return isLoading ? (
        <Skeleton width="70%" height="1.5rem" />
      ) : (
        <span>
          ₹{rowData[field] ? Number(rowData[field]).toFixed(2) : "0.00"}
        </span>
      );
    };
    AmountTemplate.displayName = `AmountBodyTemplate_${field}`;
    return AmountTemplate;
  };

  // Calculate totals for footer
  const calculateTotals = () => {
    const totals = orderList.reduce(
      (acc, row) => {
        acc.quantity += row.quantity || 0;
        acc.totalAmount += row.totalamount || 0;
        acc.discount += row.discount || 0;
        acc.taxAmount += row.taxamount || 0;
        acc.totalTaxAmount += row.totaltaxamount || 0;
        acc.grandTotal += row.grandtotal || 0;
        acc.profitLoss += row.profitloss || 0;
        return acc;
      },
      {
        quantity: 0,
        totalAmount: 0,
        discount: 0,
        taxAmount: 0,
        totalTaxAmount: 0,
        grandTotal: 0,
        profitLoss: 0,
      },
    );
    return totals;
  };

  const totals = calculateTotals();

  return (
    <Page title="Product Wise Order Details">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : orderList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "product",
                  "productmastercategory",
                  "productcategory",
                  "productsubcategory",
                  "brand",
                  "batchnumber",
                  "batchdate",
                  "customer",
                  "saleperson",
                  "billno",
                  "orderdatetime",
                  "ordertype",
                  "channel",
                  "transaction",
                  "tax",
                  "orderremark",
                ]}
                onFilter={(e) => {
                  setFilters(e.filters);
                  setLazyParams((prev) => ({ ...prev, first: 0 }));
                  setIsLoading(true);
                  scrollToTop();
                }}
                onPage={(e) => {
                  setLazyParams((prev) => ({
                    ...prev,
                    first: e.first,
                    rows: e.rows,
                  }));
                  setIsLoading(true);
                  scrollToTop();
                }}
                onSort={(e) => {
                  setLazyParams((prev) => ({
                    ...prev,
                    sortField: e.sortField,
                    sortOrder: e.sortOrder,
                  }));
                  setIsLoading(true);
                  scrollToTop();
                }}
                emptyMessage={<EmptyMessage />}
                stateStorage="session"
                stateKey="productWiseOrderDetailsTableFilters"
                rows={lazyParams.rows}
                first={lazyParams.first}
                totalRecords={totalRecords}
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50, 100]}
                tableStyle={{ minWidth: "120rem" }}
                removableSort
                footerColumnGroup={
                  !isLoading && (
                    <ColumnGroup>
                      <Row>
                        <Column footer={`Total:`} className="font-bold" />
                        {visibleFields.map((col) => {
                          switch (col.field) {
                            case "profitloss":
                              return (
                                <Column
                                  key={col.field}
                                  footer={`₹${totals.profitLoss.toFixed(2)}`}
                                  className={`font-bold ${totals.profitLoss >= 0 ? "text-green-600" : "text-red-600"}`}
                                />
                              );
                            case "quantity":
                              return (
                                <Column
                                  key={col.field}
                                  footer={`${totals.quantity}`}
                                  className="font-bold"
                                />
                              );
                            case "totalamount":
                              return (
                                <Column
                                  key={col.field}
                                  footer={`₹${totals.totalAmount.toFixed(2)}`}
                                  className="font-bold"
                                />
                              );
                            case "discount":
                              return (
                                <Column
                                  key={col.field}
                                  footer={`₹${totals.discount.toFixed(2)}`}
                                  className="font-bold"
                                />
                              );
                            case "totaltaxamount":
                              return (
                                <Column
                                  key={col.field}
                                  footer={`₹${totals.totalTaxAmount.toFixed(2)}`}
                                  className="font-bold"
                                />
                              );
                            case "grandtotal":
                              return (
                                <Column
                                  key={col.field}
                                  footer={`₹${totals.grandTotal.toFixed(2)}`}
                                  className="font-bold text-green-600"
                                />
                              );
                            default:
                              return <Column key={col.field} footer="" />;
                          }
                        })}
                      </Row>
                    </ColumnGroup>
                  )
                }
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
                  style={{ minWidth: "4rem" }}
                />

                {/* Render dynamic columns based on visibleFields */}
                {visibleFields.map((col) => {
                  let bodyTemplate;
                  let style = { minWidth: "8rem" };

                  // Special templates for specific columns
                  switch (col.field) {
                    case "product":
                      bodyTemplate = productBodyTemplate;
                      style.minWidth = "12rem";
                      break;
                    case "profitloss":
                      bodyTemplate = profitLossBodyTemplate;
                      style.minWidth = "10rem";
                      break;
                    case "billno":
                      bodyTemplate = billNoBodyTemplate;
                      style.minWidth = "10rem";
                      break;
                    case "transaction":
                      bodyTemplate = transactionBodyTemplate;
                      style.minWidth = "9rem";
                      break;
                    case "grandtotal":
                      bodyTemplate = grandTotalBodyTemplate;
                      style.minWidth = "10rem";
                      break;
                    case "price":
                    case "purchase":
                    case "purchaseatsale":
                    case "totalamount":
                    case "discount":
                    case "taxamount":
                    case "totaltaxamount":
                    case "roundoff":
                      bodyTemplate = amountBodyTemplate(col.field);
                      style.minWidth = "9rem";
                      break;
                    case "productmastercategory":
                    case "productcategory":
                    case "productsubcategory":
                    case "batchnumber":
                    case "batchdate":
                    case "saleperson":
                    case "ordertype":
                    case "channel":
                    case "tax":
                      style.minWidth = "11rem";
                      bodyTemplate = defaultBodyTemplate(col.field);
                      break;
                    case "orderremark":
                    case "paymentremark":
                    case "reprintremark":
                      style.minWidth = "12rem";
                      bodyTemplate = defaultBodyTemplate(col.field);
                      break;
                    default:
                      bodyTemplate = defaultBodyTemplate(col.field);
                  }

                  return (
                    <Column
                      key={col.field}
                      field={col.field}
                      header={col.header}
                      style={style}
                      body={bodyTemplate}
                      filter
                      showFilterMenu={false}
                      filterPlaceholder={`Search ${col.header}`}
                      sortable
                    />
                  );
                })}
              </DataTable>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
