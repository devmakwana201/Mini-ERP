import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { CompanyAddonService } from "services/subscription-management/companyAddons";
import { CompanyService } from "services/subscription-management/companies";
import { AddonService } from "services/subscription-management/addons";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { MultiSelect } from "primereact/multiselect";
import { Tooltip } from "primereact/tooltip";
import { unparse } from "papaparse";
import { Skeleton } from "primereact/skeleton";
import { FilterMatchMode } from "primereact/api";
import { OverlayPanel } from "primereact/overlaypanel";
import { scrollToTop } from "utils/scrollToTop";
import EmptyMessage from "components/shared/EmptyMessage";
import { Tag } from "primereact/tag";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { InputSwitch } from "primereact/inputswitch";

export default function CompanyAddonsList() {
  const toast = useRef(null);
  const [companyAddonsList, setCompanyAddonsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const actionOverlayRef = useRef(null);
  const [selectedRow, setSelectedRow] = useState(null);

  // Dialog states
  const [showDialog, setShowDialog] = useState(false);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [totalRecords, setTotalRecords] = useState(0);

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    companyname: { value: null, matchMode: FilterMatchMode.CONTAINS },
    addonname: { value: null, matchMode: FilterMatchMode.CONTAINS },
    isactive: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const columnOptions = [
    { field: "companyname", header: "Company Name" },
    { field: "addonname", header: "Addon Name" },
    { field: "price", header: "Price" },
    { field: "startdate", header: "Start Date" },
    { field: "enddate", header: "End Date" },
    { field: "isactive", header: "Status" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("companyAddonsList_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Default columns if nothing in session - show essential columns
    return columnOptions.filter(col =>
      ["companyname", "addonname", "price", "startdate", "enddate", "isactive"].includes(col.field)
    );
  });

  // Form states
  const [formData, setFormData] = useState({
    companyid: '',
    addonid: '',
    startdate: new Date(),
    enddate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    price: '',
    isactive: true
  });

  const [renewFormData, setRenewFormData] = useState({
    extensionDays: 365
  });

  const fetchCompanyAddons = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = {
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? 'asc' : lazyParams.sortOrder === -1 ? 'desc' : undefined,
        filters: {
          ...Object.keys(filters).reduce((acc, key) => {
            if (filters[key].value !== null && filters[key].value !== undefined) {
              acc[key] = filters[key].value;
            }
            return acc;
          }, {}),
          ...(selectedCompany && { companyid: selectedCompany })
        }
      };

      const response = await CompanyAddonService.getFormattedCompanyAddons(params);

      if (response.success) {
        setCompanyAddonsList(response.data || []);
        setTotalRecords(response.pagination?.total || response.totalRecords || 0);
      } else {
        console.error("Failed to fetch company addons:", response.error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: response.error?.message || "Failed to load company addons data",
          life: 3000,
        });
        setCompanyAddonsList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error fetching company addons data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: error.error?.message || error.message || "Failed to load company addons data",
        life: 3000,
      });
      setCompanyAddonsList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, selectedCompany]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCompanyAddons();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchCompanyAddons]);

  useEffect(() => {
    loadCompanies();
    const sessionState = sessionStorage.getItem("companyAddonsTableFilters");
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

  const loadCompanies = async () => {
    try {
      const response = await CompanyService.getFormattedCompanies({ length: -1 });
      if (response.success) {
        const companyOptions = response.data.map(company => ({
          label: company.companyname,
          value: company.companyid
        }));
        setCompanies(companyOptions);
      }
    } catch (error) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Error loading companies' });
    }
  };

  const loadAvailableAddons = async (companyId) => {
    try {
      const response = await CompanyAddonService.getAvailableAddons(companyId);
      if (response.success) {
        setAvailableAddons(response.data);
      }
    } catch (error) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Error loading addons' });
    }
  };

  const loadAllAddons = async () => {
    try {
      const response = await AddonService.getActiveAddons();
      if (response.success) {
        setAvailableAddons(response.data);
      }
    } catch (error) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Error loading addons' });
    }
  };

  const handleCompanyChange = async (companyId) => {
    setSelectedCompany(companyId);
    if (companyId) {
      await loadAvailableAddons(companyId);
    } else {
      setAvailableAddons([]);
    }
    // Reset pagination when company changes
    setLazyParams(prev => ({ ...prev, first: 0 }));
  };

  const blankRow = {
    companyname: "",
    addonname: "",
    price: 0,
    startdate: null,
    enddate: null,
    isactive: false,
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
    if (companyAddonsList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = companyAddonsList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (col.field === "isactive") {
          formattedRow[col.header] = row[col.field] ? "Active" : "Inactive";
        } else if (col.field === "startdate" || col.field === "enddate") {
          formattedRow[col.header] = row[col.field] ? new Date(row[col.field]).toLocaleDateString('en-GB') : "-";
        } else if (col.field === "price") {
          formattedRow[col.header] = `₹${parseFloat(row[col.field] || 0).toFixed(2)}`;
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

    const filename = "company_addons.csv";
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
    if (companyAddonsList.length === 0) {
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
      const body = companyAddonsList.map((row) =>
        visibleFields.map((col) => {
          if (col.field === "isactive") {
            return row[col.field] ? "Active" : "Inactive";
          } else if (col.field === "startdate" || col.field === "enddate") {
            return row[col.field] ? new Date(row[col.field]).toLocaleDateString('en-GB') : "-";
          } else if (col.field === "price") {
            return `₹${parseFloat(row[col.field] || 0).toFixed(2)}`;
          } else {
            return row[col.field] ?? "-";
          }
        }),
      );

      autoTable(doc, {
        head,
        body,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [71, 85, 105] },
        margin: { top: 40 },
      });

      doc.text("Company Addons List", 40, 30);
      doc.save("company_addons.pdf");
      fileExportMessage();
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to export PDF",
        life: 3000,
      });
    }
  };

  const exportExcel = async () => {
    if (companyAddonsList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const { writeFile, utils } = await import("xlsx");

    const formattedData = companyAddonsList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (col.field === "isactive") {
          formattedRow[col.header] = row[col.field] ? "Active" : "Inactive";
        } else if (col.field === "startdate" || col.field === "enddate") {
          formattedRow[col.header] = row[col.field] ? new Date(row[col.field]).toLocaleDateString('en-GB') : "-";
        } else if (col.field === "price") {
          formattedRow[col.header] = `₹${parseFloat(row[col.field] || 0).toFixed(2)}`;
        } else {
          formattedRow[col.header] = row[col.field] ?? "-";
        }
      });
      return formattedRow;
    });

    const ws = utils.json_to_sheet(formattedData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Company Addons");

    const fileName = "company_addons.xlsx";
    writeFile(wb, fileName);

    fileExportMessage();
  };

  const onColumnToggle = (event) => {
    let selectedColumns = event.value;

    if (selectedColumns.length === 0) {
      selectedColumns = [
        columnOptions.find((col) => col.field === "companyname"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "companyAddonsList_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const openNewDialog = () => {
    setFormData({
      companyid: selectedCompany || '',
      addonid: '',
      startdate: new Date(),
      enddate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      price: '',
      isactive: true
    });
    setIsEdit(false);
    setCurrentRecord(null);
    if (!selectedCompany) {
      loadAllAddons();
    }
    setShowDialog(true);
  };

  const openEditDialog = async (record) => {
    try {
      const response = await CompanyAddonService.getCompanyAddonById(record.companyaddonid);
      if (response.success) {
        const data = response.data;
        setFormData({
          companyid: data.companyid,
          addonid: data.addonid,
          startdate: new Date(data.startdate),
          enddate: new Date(data.enddate),
          price: data.price,
          isactive: data.isactive === 1 || data.isactive === true
        });
        setIsEdit(true);
        setCurrentRecord(record);
        await loadAllAddons(); // Load all addons for editing, not just available ones
        setShowDialog(true);
      }
    } catch (error) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Error loading record' });
    }
  };

  const openRenewDialog = (record) => {
    setCurrentRecord(record);
    setRenewFormData({ extensionDays: 365 });
    setShowRenewDialog(true);
  };

  const handleSave = async () => {
    try {
      const saveData = {
        ...formData,
        startdate: formData.startdate.toISOString().split('T')[0],
        enddate: formData.enddate.toISOString().split('T')[0],
        isactive: formData.isactive ? 1 : 0
      };

      if (isEdit) {
        const response = await CompanyAddonService.updateCompanyAddon(currentRecord.companyaddonid, saveData);
        if (response.success) {
          toast.current?.show({ severity: 'success', summary: 'Success', detail: 'Record updated successfully' });
          fetchCompanyAddons();
        }
      } else {
        const response = await CompanyAddonService.addAddonToCompany(formData.companyid, saveData);
        if (response.success) {
          toast.current?.show({ severity: 'success', summary: 'Success', detail: 'Record created successfully' });
          fetchCompanyAddons();
        }
      }
      setShowDialog(false);
    } catch (error) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Error saving data' });
    }
  };

  const handleRenew = async () => {
    try {
      const response = await CompanyAddonService.renewCompanyAddon(
        currentRecord.companyaddonid,
        renewFormData.extensionDays
      );
      if (response.success) {
        toast.current?.show({ severity: 'success', summary: 'Success', detail: 'Addon renewed successfully' });
        fetchCompanyAddons();
      }
      setShowRenewDialog(false);
    } catch (error) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Error renewing addon' });
    }
  };

  const handleDeactivate = async (record) => {
    try {
      const response = await CompanyAddonService.deactivateCompanyAddon(record.companyaddonid);
      if (response.success) {
        toast.current?.show({ severity: 'success', summary: 'Success', detail: 'Addon deactivated successfully' });
        fetchCompanyAddons();
      }
    } catch (error) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Error deactivating addon' });
    }
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Company Addons Management
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
            onClick={openNewDialog}
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

  const companyNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="20%" height="1.5rem" />
    ) : (
      <span className="font-semibold">{rowData.companyname || "-"}</span>
    );
  };

  const addonNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="20%" height="1.5rem" />
    ) : (
      <span>{rowData.addonname || "-"}</span>
    );
  };

  const priceBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="15%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-green-600">
        ₹{parseFloat(rowData.price || 0).toFixed(2)}
      </span>
    );
  };

  const startDateBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="15%" height="1.5rem" />
    ) : (
      <span>{rowData.startdate ? new Date(rowData.startdate).toLocaleDateString('en-GB') : "-"}</span>
    );
  };

  const endDateBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="15%" height="1.5rem" />
    ) : (
      <span>{rowData.enddate ? new Date(rowData.enddate).toLocaleDateString('en-GB') : "-"}</span>
    );
  };

  const statusBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60px" height="1.5rem" />
    ) : (
      <Tag
        value={rowData.isactive ? "Active" : "Inactive"}
        severity={rowData.isactive ? "success" : "danger"}
      />
    );
  };

  return (
    <Page title="Company Addons Management">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              {/* Company Filter */}
              <div className="mb-4">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 md:col-span-6 lg:col-span-4">
                    <label className="block text-sm font-medium mb-2">
                      Filter by Company
                    </label>
                    <Dropdown
                      value={selectedCompany}
                      options={companies}
                      onChange={(e) => handleCompanyChange(e.value)}
                      placeholder="Select Company"
                      className="w-full"
                      showClear
                    />
                  </div>
                </div>
              </div>

              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : companyAddonsList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No company addons found"
                    subtitle="No company addons match your current filters. Try adjusting your search criteria or add a new addon."
                  />
                }
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={["companyname", "addonname"]}
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
                stateKey="companyAddonsTableFilters"
                rows={lazyParams.rows}
                first={lazyParams.first}
                totalRecords={totalRecords}
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50]}
                tableStyle={{ minWidth: "75rem" }}
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
                {visibleFields.some((col) => col.field === "companyname") && (
                  <Column
                    field="companyname"
                    header="Company Name"
                    style={{ minWidth: "20rem" }}
                    body={companyNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Company Name"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "addonname") && (
                  <Column
                    field="addonname"
                    header="Addon Name"
                    style={{ minWidth: "20rem" }}
                    body={addonNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Addon Name"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "price") && (
                  <Column
                    field="price"
                    header="Price"
                    style={{ minWidth: "12rem" }}
                    body={priceBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "startdate") && (
                  <Column
                    field="startdate"
                    header="Start Date"
                    style={{ minWidth: "12rem" }}
                    body={startDateBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "enddate") && (
                  <Column
                    field="enddate"
                    header="End Date"
                    style={{ minWidth: "12rem" }}
                    body={endDateBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "isactive") && (
                  <Column
                    field="isactive"
                    header="Status"
                    style={{ minWidth: "10rem" }}
                    body={statusBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterElement={(options) => (
                      <Dropdown
                        value={options.value}
                        options={[
                          { label: 'Active', value: true },
                          { label: 'Inactive', value: false }
                        ]}
                        onChange={(e) => options.filterApplyCallback(e.value)}
                        placeholder="Select Status"
                        className="p-column-filter"
                        showClear
                      />
                    )}
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
                      openEditDialog(selectedRow);
                      actionOverlayRef.current.hide();
                    }}
                  />
                  <Button
                    icon="pi pi-refresh"
                    rounded
                    outlined
                    severity="info"
                    className="p-0 text-xs"
                    style={{
                      fontSize: "0.7rem",
                      width: "2.5rem",
                      height: "2.5rem",
                    }}
                    onClick={() => {
                      openRenewDialog(selectedRow);
                      actionOverlayRef.current.hide();
                    }}
                  />
                  <Button
                    icon="pi pi-times"
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
                      handleDeactivate(selectedRow);
                      actionOverlayRef.current.hide();
                    }}
                  />
                </div>
              </OverlayPanel>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        header={isEdit ? 'Edit Company Addon' : 'Add Company Addon'}
        visible={showDialog}
        style={{ width: '600px' }}
        breakpoints={{ "960px": "75vw", "641px": "90vw" }}
        modal
        onHide={() => setShowDialog(false)}
        blockScroll={true}
        draggable={false}
        resizable={false}
        dismissableMask
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              icon="pi pi-times"
              className="p-button-text"
              onClick={() => setShowDialog(false)}
            />
            <Button
              label="Save"
              icon="pi pi-check"
              onClick={handleSave}
            />
          </div>
        }
      >
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-6">
            <label className="block text-sm font-medium mb-2">
              Company <span className="text-red-500">*</span>
            </label>
            <Dropdown
              value={formData.companyid}
              options={companies}
              onChange={(e) => {
                setFormData({ ...formData, companyid: e.value });
                loadAvailableAddons(e.value);
              }}
              placeholder="Select Company"
              className="w-full"
              disabled={isEdit || selectedCompany}
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <label className="block text-sm font-medium mb-2">
              Addon <span className="text-red-500">*</span>
            </label>
            <Dropdown
              value={formData.addonid}
              options={availableAddons.map(addon => ({
                label: `${addon.addonname} (₹${parseFloat(addon.price).toFixed(2)})`,
                value: addon.addonid
              }))}
              onChange={(e) => {
                const selectedAddon = availableAddons.find(addon => addon.addonid === e.value);
                setFormData({
                  ...formData,
                  addonid: e.value,
                  price: selectedAddon?.price || ''
                });
              }}
              placeholder="Select Addon"
              className="w-full"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <label className="block text-sm font-medium mb-2">
              Price <span className="text-red-500">*</span>
            </label>
            <InputText
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="Enter Price"
              className="w-full"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <label className="block text-sm font-medium mb-2">
              Status
            </label>
            <InputSwitch
              checked={formData.isactive}
              onChange={(e) => setFormData({ ...formData, isactive: e.value })}
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <label className="block text-sm font-medium mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <Calendar
              value={formData.startdate}
              onChange={(e) => setFormData({ ...formData, startdate: e.value })}
              placeholder="Select Start Date"
              className="w-full"
              dateFormat="dd/mm/yy"
              showIcon
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <label className="block text-sm font-medium mb-2">
              End Date <span className="text-red-500">*</span>
            </label>
            <Calendar
              value={formData.enddate}
              onChange={(e) => setFormData({ ...formData, enddate: e.value })}
              placeholder="Select End Date"
              className="w-full"
              dateFormat="dd/mm/yy"
              showIcon
              minDate={formData.startdate}
            />
          </div>
        </div>
      </Dialog>

      {/* Renew Dialog */}
      <Dialog
        header="Renew Addon"
        visible={showRenewDialog}
        style={{ width: '400px' }}
        breakpoints={{ "960px": "75vw", "641px": "90vw" }}
        modal
        onHide={() => setShowRenewDialog(false)}
        blockScroll={true}
        draggable={false}
        resizable={false}
        dismissableMask
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              icon="pi pi-times"
              className="p-button-text"
              onClick={() => setShowRenewDialog(false)}
            />
            <Button
              label="Renew"
              icon="pi pi-check"
              onClick={handleRenew}
            />
          </div>
        }
      >
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <label className="block text-sm font-medium mb-2">
              Extension Days <span className="text-red-500">*</span>
            </label>
            <InputText
              value={renewFormData.extensionDays}
              onChange={(e) => setRenewFormData({ ...renewFormData, extensionDays: parseInt(e.target.value) || 0 })}
              placeholder="Enter Extension Days"
              className="w-full"
              keyfilter="int"
            />
          </div>
        </div>
      </Dialog>
    </Page>
  );
}