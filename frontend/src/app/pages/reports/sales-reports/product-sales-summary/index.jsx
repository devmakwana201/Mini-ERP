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
import { ProductSalesSummaryService } from "services/reports/sales/productSalesSummary";
import EmptyMessage from "components/shared/EmptyMessage";
import { LocationFilter } from "components/reports/LocationFilter";
import { useAuthContext } from "app/contexts/auth/context";

export default function ProductSalesSummary() {
  const toast = useRef(null);
  const [salesList, setSalesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const { user } = useAuthContext();

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: "orderdate",
    sortOrder: -1,
  });

  const [totalRecords, setTotalRecords] = useState(0);

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    billno: { value: null, matchMode: FilterMatchMode.CONTAINS },
    orderdate: { value: null, matchMode: FilterMatchMode.CONTAINS },
    customer: { value: null, matchMode: FilterMatchMode.CONTAINS },
    product: { value: null, matchMode: FilterMatchMode.CONTAINS },
    brand: { value: null, matchMode: FilterMatchMode.CONTAINS },
    quantity: { value: null, matchMode: FilterMatchMode.EQUALS },
    price: { value: null, matchMode: FilterMatchMode.EQUALS },
    totalamount: { value: null, matchMode: FilterMatchMode.EQUALS },
    grandtotal: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const columnOptions = [
    { field: "billno", header: "Bill No" },
    { field: "orderdate", header: "Order Date" },
    { field: "customer", header: "Customer" },
    { field: "product", header: "Product" },
    { field: "productmastercategory", header: "Master Category" },
    { field: "productcategory", header: "Category" },
    { field: "brand", header: "Brand" },
    { field: "uom", header: "UOM" },
    { field: "quantity", header: "Quantity" },
    { field: "price", header: "Avg. Price" },
    { field: "totalamount", header: "Gross Total" },
    { field: "discount", header: "Discount" },
    { field: "taxableamount", header: "Taxable Amount" },
    { field: "taxamount", header: "Tax Amount" },
    { field: "grandtotal", header: "Grand Total" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const mandatoryFields = ["billno", "orderdate", "customer"];
    const saved = sessionStorage.getItem("productSalesSummary_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      const mergedFields = [
        ...mandatoryFields,
        ...fields.filter((field) => !mandatoryFields.includes(field)),
      ];
      return columnOptions.filter((col) => mergedFields.includes(col.field));
    }
    return columnOptions;
  });

  const fetchProductSalesSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await ProductSalesSummaryService.getProductSalesSummary({
        filters: {
            ...filters,
            companyid: user?.companyid
        },
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
        locationId: selectedLocationId,
      });

      if (response.success) {
        setSalesList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail: response.message || "Failed to fetch product sales summary",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching product sales summary:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, selectedLocationId, user?.companyid]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchProductSalesSummary();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [fetchProductSalesSummary]);

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    setFilters(prev => ({
      ...prev,
      global: { ...prev.global, value },
    }));
  };

  const exportCSV = () => {
    const formattedData = salesList.map((row) => {
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

    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "product_sales_summary.csv");
    link.click();
    URL.revokeObjectURL(url);
  };

  const onColumnToggle = (event) => {
    const mandatoryFields = ["billno", "orderdate", "customer"];
    let selectedColumns = event.value;
    const ensuredColumns = [
      ...columnOptions.filter((col) => mandatoryFields.includes(col.field)),
      ...selectedColumns.filter(
        (col) => !mandatoryFields.includes(col.field),
      ),
    ];
    let orderedSelectedColumns = columnOptions.filter((col) =>
      ensuredColumns.some((sCol) => sCol.field === col.field),
    );
    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem("productSalesSummary_visibleFields", JSON.stringify(orderedSelectedColumns.map(c => c.field)));
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">Product Sales Summary Report</h3>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 lg:justify-end">
        <IconField iconPosition="left" className="w-full sm:w-64">
          <InputIcon className="pi pi-search" />
          <InputText type="search" value={filters.global?.value || ""} onChange={onGlobalFilterChange} placeholder="Keyword Search" className="w-full" />
        </IconField>
        <LocationFilter onLocationChange={setSelectedLocationId} className="w-full sm:w-48" />
        <MultiSelect value={visibleFields} options={columnOptions} optionLabel="header" onChange={onColumnToggle} className="w-full sm:w-56" display="chip" placeholder="Visible Columns" disabled={isLoading} />
        <Button type="button" icon="pi pi-file" rounded onClick={exportCSV} disabled={isLoading} />
      </div>
    </div>
  );

  const amountBody = (field) => {
    const AmountBodyTemplate = (rowData) => (
      <span>₹{rowData[field] ? Number(rowData[field]).toFixed(2) : "0.00"}</span>
    );
    AmountBodyTemplate.displayName = `AmountBody_${field}`;
    return AmountBodyTemplate;
  };

  return (
    <Page title="Product Sales Summary">
      <Toast ref={toast} />
      <div className="w-full px-4 pt-5">
        <div className="prime-card">
          <DataTable
            value={isLoading ? Array(10).fill({}) : salesList}
            header={renderHeader()}
            paginator
            lazy
            rows={lazyParams.rows}
            first={lazyParams.first}
            totalRecords={totalRecords}
            onPage={(e) => setLazyParams(prev => ({ ...prev, first: e.first, rows: e.rows }))}
            onSort={(e) => setLazyParams(prev => ({ ...prev, sortField: e.sortField, sortOrder: e.sortOrder }))}
            sortField={lazyParams.sortField}
            sortOrder={lazyParams.sortOrder}
            loading={isLoading}
            emptyMessage={<EmptyMessage />}
            className="p-datatable-sm"
            removableSort
          >
            {visibleFields.map((col) => (
              <Column
                key={col.field}
                field={col.field}
                header={col.header}
                sortable={!isLoading}
                body={["price", "totalamount", "discount", "taxableamount", "taxamount", "grandtotal"].includes(col.field) ? amountBody(col.field) : null}
              />
            ))}
          </DataTable>
        </div>
      </div>
    </Page>
  );
}
