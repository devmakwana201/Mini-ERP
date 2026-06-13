import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { FilterMatchMode } from "primereact/api";
import { Badge } from "primereact/badge";
import { Tag } from "primereact/tag";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";
import EmptyMessage from "components/shared/EmptyMessage";
import { FiAlertTriangle, FiCheckCircle, FiDollarSign } from "react-icons/fi";
import { Skeleton } from "primereact/skeleton";

export default function GRNIssues() {
  const toast = useRef(null);
  const [allIssues, setAllIssues] = useState([]);
  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [resolveDialog, setResolveDialog] = useState(false);
  const [resolutionType, setResolutionType] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [totalRecords, setTotalRecords] = useState(0);

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    issueNumber: { value: null, matchMode: FilterMatchMode.CONTAINS },
    customerName: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const statusOptions = [
    { label: "All", value: null },
    { label: "Open", value: "OPEN" },
    { label: "Resolved", value: "RESOLVED" },
  ];

  const resolutionTypes = [
    { label: "Credit Note", value: "CREDIT_NOTE" },
    { label: "Replacement", value: "REPLACEMENT" },
    { label: "Refund", value: "REFUND" },
  ];

  // Mock data for now - will be replaced with API calls
  const fetchIssues = useCallback(async () => {
    setIsLoading(true);

    const mockData = [
      {
        id: 1,
        issueNumber: "ISS-2604-0001",
        grnNumber: "GRN-AHM-2604-0001",
        poNumber: "PO-AHM-2604-0001",
        challanNumber: "CH-AHM-2604-0001",
        customerName: "Green Fields Agro",
        issueDate: "2026-04-10",
        amount: 15000,
        status: "OPEN",
        reason: "Damaged goods received - 5 bags torn",
        damagedQty: 5,
        resolutionType: null,
        creditNoteNumber: null,
      },
      {
        id: 2,
        issueNumber: "ISS-2604-0002",
        grnNumber: "GRN-AHM-2604-0002",
        poNumber: "PO-AHM-2604-0002",
        challanNumber: "CH-AHM-2604-0002",
        customerName: "Kisaan Mart",
        issueDate: "2026-04-12",
        amount: 8500,
        status: "RESOLVED",
        reason: "Wrong item delivered",
        damagedQty: 2,
        resolutionType: "CREDIT_NOTE",
        creditNoteNumber: "CN-2604-0001",
      },
    ];

    setAllIssues(mockData);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Frontend filtering
  const filteredData = useMemo(() => {
    let data = [...allIssues];

    // Global search
    if (filters.global.value) {
      const searchTerm = filters.global.value.toLowerCase();
      data = data.filter(
        (issue) =>
          issue.issueNumber.toLowerCase().includes(searchTerm) ||
          issue.grnNumber.toLowerCase().includes(searchTerm) ||
          issue.customerName.toLowerCase().includes(searchTerm) ||
          issue.reason.toLowerCase().includes(searchTerm) ||
          issue.poNumber?.toLowerCase().includes(searchTerm) ||
          issue.challanNumber?.toLowerCase().includes(searchTerm),
      );
    }

    // Column filters
    if (filters.issueNumber.value) {
      data = data.filter((issue) =>
        issue.issueNumber
          .toLowerCase()
          .includes(filters.issueNumber.value.toLowerCase()),
      );
    }
    if (filters.customerName.value) {
      data = data.filter((issue) =>
        issue.customerName
          .toLowerCase()
          .includes(filters.customerName.value.toLowerCase()),
      );
    }
    if (filters.status.value) {
      data = data.filter((issue) => issue.status === filters.status.value);
    }

    return data;
  }, [allIssues, filters]);

  useEffect(() => {
    setIssues(filteredData);
    setTotalRecords(filteredData.length);
    setLazyParams((prev) => ({ ...prev, first: 0 }));
  }, [filteredData]);

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    }));
  };

  const onColumnFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: { value, matchMode: FilterMatchMode.CONTAINS },
    }));
  };

  // Computed stats
  const openCount = issues.filter((i) => i.status === "OPEN").length;
  const resolvedCount = issues.filter((i) => i.status === "RESOLVED").length;
  const totalValue = issues.reduce((s, i) => s + i.amount, 0);

  // Skeleton templates
  const statsSkeleton = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative flex items-center gap-4 rounded-xl border-t-4 border-gray-200 bg-white p-5 shadow-md dark:bg-gray-800"
        >
          <Skeleton shape="circle" size="2.5rem" className="bg-gray-200" />
          <div className="flex-1">
            <Skeleton width="3rem" height="1.5rem" className="mb-1" />
            <Skeleton width="6rem" height="0.875rem" />
          </div>
        </div>
      ))}
    </div>
  );

  const tableSkeleton = (
    <div className="rounded-xl bg-white p-4 shadow-md dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton width="8rem" height="1.5rem" />
        <div className="flex gap-2">
          <Skeleton width="12rem" height="2.5rem" />
          <Skeleton width="10rem" height="2.5rem" />
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <Skeleton width="8rem" height="1.25rem" />
            <Skeleton width="10rem" height="1.25rem" />
            <Skeleton width="12rem" height="1.25rem" />
            <Skeleton width="6rem" height="1.25rem" />
            <Skeleton width="4rem" height="1.25rem" />
            <Skeleton width="6rem" height="1.25rem" />
            <Skeleton width="5rem" height="1.25rem" />
            <Skeleton width="8rem" height="1.25rem" />
            <Skeleton width="6rem" height="1.25rem" className="ml-auto" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-center">
        <Skeleton width="15rem" height="2rem" />
      </div>
    </div>
  );

  const statusBodyTemplate = (rowData) => {
    const severity = rowData.status === "OPEN" ? "danger" : "success";
    return <Tag value={rowData.status} severity={severity} />;
  };

  const amountBodyTemplate = (rowData) => (
    <span className="font-semibold text-red-500">
      ₹{rowData.amount?.toLocaleString()}
    </span>
  );

  const actionBodyTemplate = (rowData) => (
    <div className="flex gap-2">
      <Button
        icon="pi pi-eye"
        rounded
        text
        severity="info"
        onClick={() => {
          setSelectedIssue(rowData);
          setViewDialog(true);
        }}
      />
      {rowData.status === "OPEN" && (
        <Button
          icon="pi pi-check"
          rounded
          text
          severity="success"
          tooltip="Resolve Issue"
          onClick={() => {
            setSelectedIssue(rowData);
            setResolutionType(null);
            setResolutionNotes("");
            setResolveDialog(true);
          }}
        />
      )}
    </div>
  );

  const handleResolve = async () => {
    if (!resolutionType) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Please select resolution type",
      });
      return;
    }
    toast.current.show({
      severity: "success",
      summary: "Success",
      detail: `Issue ${selectedIssue.issueNumber} resolved with ${resolutionType}`,
    });
    setResolveDialog(false);
    fetchIssues();
  };

  const renderHeader = () => (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h5 className="m-0 text-lg font-semibold">GRN Issues</h5>
        <Badge value={totalRecords} severity="secondary" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            value={filters.global.value || ""}
            onChange={onGlobalFilterChange}
            placeholder="Search issues..."
          />
        </IconField>
        <Dropdown
          value={filters.status.value}
          options={statusOptions}
          onChange={(e) => {
            let _filters = { ...filters };
            _filters["status"].value = e.value;
            setFilters(_filters);
          }}
          placeholder="Filter by Status"
          showClear
          className="w-12rem"
        />
      </div>
    </div>
  );

  return (
    <Page title="GRN Issues">
      <Toast ref={toast} />

      <div className="overflow-hidden pb-8">
        {/* Stats */}
        <div className="transition-content mt-4 px-(--margin-x)">
          {isLoading ? (
            statsSkeleton
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="relative flex items-center gap-4 rounded-xl border-t-4 border-red-500 bg-white p-5 shadow-md dark:bg-gray-800">
                <div className="rounded-full bg-red-100 p-2 text-red-600 dark:bg-gray-700">
                  <FiAlertTriangle size={20} />
                </div>
                <div>
                  <p className="text-xl font-semibold text-gray-800 dark:text-white">
                    {openCount}
                  </p>
                  <p className="text-sm text-gray-500">Open Issues</p>
                </div>
              </div>
              <div className="relative flex items-center gap-4 rounded-xl border-t-4 border-green-500 bg-white p-5 shadow-md dark:bg-gray-800">
                <div className="rounded-full bg-green-100 p-2 text-green-600 dark:bg-gray-700">
                  <FiCheckCircle size={20} />
                </div>
                <div>
                  <p className="text-xl font-semibold text-gray-800 dark:text-white">
                    {resolvedCount}
                  </p>
                  <p className="text-sm text-gray-500">Resolved</p>
                </div>
              </div>
              <div className="relative flex items-center gap-4 rounded-xl border-t-4 border-orange-500 bg-white p-5 shadow-md dark:bg-gray-800">
                <div className="rounded-full bg-orange-100 p-2 text-orange-600 dark:bg-gray-700">
                  <FiDollarSign size={20} />
                </div>
                <div>
                  <p className="text-xl font-semibold text-gray-800 dark:text-white">
                    ₹{totalValue.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Total Issue Value</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="transition-content mt-5 px-(--margin-x)">
          {isLoading ? (
            tableSkeleton
          ) : (
            <div className="rounded-xl bg-white p-4 shadow-md dark:bg-gray-800">
              <DataTable
                value={issues}
                lazy
                paginator
                first={lazyParams.first}
                rows={lazyParams.rows}
                totalRecords={totalRecords}
                onPage={(e) => setLazyParams(e)}
                loading={isLoading}
                header={renderHeader}
                emptyMessage={<EmptyMessage message="No GRN issues found" />}
                filters={filters}
                filterDisplay="row"
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                onSort={(e) => setLazyParams(e)}
                className="p-datatable-sm"
              >
                <Column
                  field="issueNumber"
                  header="Issue #"
                  sortable
                  filter
                  filterPlaceholder="Search by issue #"
                />
                <Column field="grnNumber" header="GRN #" sortable />
                <Column
                  field="customerName"
                  header="Customer"
                  sortable
                  filter
                  filterPlaceholder="Search by customer"
                />
                <Column field="issueDate" header="Date" sortable />
                <Column field="damagedQty" header="Damaged Qty" sortable />
                <Column
                  field="amount"
                  header="Amount"
                  body={amountBodyTemplate}
                  sortable
                />
                <Column
                  field="status"
                  header="Status"
                  body={statusBodyTemplate}
                  sortable
                />
                <Column
                  field="creditNoteNumber"
                  header="Credit Note"
                  sortable
                />
                <Column
                  body={actionBodyTemplate}
                  header="Actions"
                  style={{ width: "8rem" }}
                />
              </DataTable>
            </div>
          )}
        </div>
      </div>

      {/* View Dialog */}
      <Dialog
        header={`Issue Details - ${selectedIssue?.issueNumber}`}
        visible={viewDialog}
        style={{ width: "50vw" }}
        onHide={() => setViewDialog(false)}
      >
        {selectedIssue && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-500">
                GRN Number
              </label>
              <p className="mt-1 text-gray-800">{selectedIssue.grnNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-500">
                PO Number
              </label>
              <p className="mt-1 text-gray-800">{selectedIssue.poNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-500">
                Challan Number
              </label>
              <p className="mt-1 text-gray-800">
                {selectedIssue.challanNumber}
              </p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-500">
                Customer
              </label>
              <p className="mt-1 text-gray-800">{selectedIssue.customerName}</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-500">
                Issue Date
              </label>
              <p className="mt-1 text-gray-800">{selectedIssue.issueDate}</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-500">
                Amount
              </label>
              <p className="mt-1 font-bold text-red-500">
                ₹{selectedIssue.amount?.toLocaleString()}
              </p>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-500">
                Reason
              </label>
              <p className="mt-1 text-gray-800">{selectedIssue.reason}</p>
            </div>
            {selectedIssue.creditNoteNumber && (
              <div className="col-span-2">
                <label className="block text-sm font-bold text-gray-500">
                  Credit Note
                </label>
                <Tag
                  value={selectedIssue.creditNoteNumber}
                  severity="success"
                  className="mt-1"
                />
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog
        header={`Resolve Issue - ${selectedIssue?.issueNumber}`}
        visible={resolveDialog}
        style={{ width: "40vw" }}
        onHide={() => setResolveDialog(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              icon="pi pi-times"
              onClick={() => setResolveDialog(false)}
              className="p-button-text"
            />
            <Button
              label="Resolve"
              icon="pi pi-check"
              onClick={handleResolve}
              severity="success"
            />
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block text-sm font-bold">
              Resolution Type <span className="text-red-500">*</span>
            </label>
            <Dropdown
              value={resolutionType}
              options={resolutionTypes}
              onChange={(e) => setResolutionType(e.value)}
              placeholder="Select resolution type"
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold">
              Resolution Notes
            </label>
            <InputTextarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={4}
              className="w-full"
              placeholder="Enter resolution details..."
            />
          </div>
        </div>
      </Dialog>
    </Page>
  );
}
