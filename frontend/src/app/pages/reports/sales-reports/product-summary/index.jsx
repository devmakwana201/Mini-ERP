import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { MultiSelect } from "primereact/multiselect";
import { FilterMatchMode } from "primereact/api";
import { unparse } from "papaparse";
import { ProductSummaryService } from "services/reports/sales/productSummary";
import { useAuthContext } from "app/contexts/auth/context";
import EmptyMessage from "components/shared/EmptyMessage";
import { LocationFilter } from "components/reports/LocationFilter";

export default function ProductSummary() {
  const toast = useRef(null);
  const [salesList, setSalesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const { user } = useAuthContext();

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: "product",
    sortOrder: 1,
  });

  const [totalRecords, setTotalRecords] = useState(0);

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const columnOptions = [
    { field: "product", header: "Product" },
    { field: "productmastercategory", header: "Master Category" },
    { field: "productcategory", header: "Category" },
    { field: "productsubcategory", header: "Sub Category" },
    { field: "brand", header: "Brand" },
    { field: "uom", header: "UOM" },
    { field: "quantity", header: "Quantity" },
    { field: "price", header: "Price" },
    { field: "totalamount", header: "Total Amount" },
    { field: "discount", header: "Discount" },
    { field: "taxableamount", header: "Taxable Amount" },
    { field: "taxamount", header: "Tax Amount" },
    { field: "grandtotal", header: "Grand Total" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("productSummary_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    return columnOptions.slice(0, 8);
  });

  const loadLazyData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await ProductSummaryService.getProductSummary({
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
        filters: { ...filters, companyid: user?.companyid },
        locationId: selectedLocationId,
      });

      if (response.success) {
        setSalesList(response.data);
        setTotalRecords(response.totalRecords);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [lazyParams, filters, user?.companyid, selectedLocationId]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadLazyData();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [loadLazyData]);

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
      data: formattedData.map((row) => visibleFields.map((col) => row[col.header])),
    });

    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "product_summary.csv");
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">Product Summary Report</h3>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 lg:justify-end">
        <IconField iconPosition="left" className="w-full sm:w-64">
          <InputIcon className="pi pi-search" />
          <InputText type="search" value={filters.global?.value || ""} onChange={(e) => setFilters({ global: { value: e.target.value, matchMode: FilterMatchMode.CONTAINS } })} placeholder="Keyword Search" className="w-full" />
        </IconField>
        <LocationFilter onLocationChange={setSelectedLocationId} className="w-full sm:w-48" />
        <MultiSelect value={visibleFields} options={columnOptions} optionLabel="header" onChange={(e) => {
            setVisibleFields(e.value);
            sessionStorage.setItem("productSummary_visibleFields", JSON.stringify(e.value.map(c => c.field)));
        }} className="w-full sm:w-56" display="chip" placeholder="Visible Columns" />
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
    <Page title="Product Summary">
      <Toast ref={toast} />
      <div className="w-full px-4 pt-5">
        <div className="prime-card">
          <DataTable
            value={isLoading ? Array(10).fill({}) : salesList}
            lazy paginator
            rows={lazyParams.rows}
            first={lazyParams.first}
            totalRecords={totalRecords}
            onPage={(e) => setLazyParams(prev => ({ ...prev, first: e.first, rows: e.rows }))}
            onSort={(e) => setLazyParams(prev => ({ ...prev, sortField: e.sortField, sortOrder: e.sortOrder }))}
            sortField={lazyParams.sortField}
            sortOrder={lazyParams.sortOrder}
            loading={isLoading}
            header={renderHeader()}
            emptyMessage={<EmptyMessage />}
            className="p-datatable-sm"
          >
            <Column header="#" body={(rowData, options) => options.rowIndex + 1} style={{ width: '3rem' }} />
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
