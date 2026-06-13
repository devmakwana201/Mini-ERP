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
import { Badge } from "primereact/badge";
import { Tag } from "primereact/tag";
import { FilterMatchMode } from "primereact/api";
import { InputNumber } from "primereact/inputnumber";
import { Calendar } from "primereact/calendar";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { Checkbox } from "primereact/checkbox";
import EmptyMessage from "components/shared/EmptyMessage";
import {
  FiFileText,
  FiDollarSign,
  FiCalendar,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { Skeleton } from "primereact/skeleton";

export default function CreditNotes() {
  const toast = useRef(null);
  const [allCreditNotes, setAllCreditNotes] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [nextId, setNextId] = useState(3);
  const [nextCNNumber, setNextCNNumber] = useState(3);

  // Form state for manual creation
  const [formData, setFormData] = useState({
    customerName: "",
    date: new Date(),
    amount: 0,
    reason: "",
    issueRef: "",
    hasIssueRef: false,
    items: [{ itemName: "", qty: 1, rate: 0, amount: 0 }],
  });

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [totalRecords, setTotalRecords] = useState(0);

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    creditNoteNumber: { value: null, matchMode: FilterMatchMode.CONTAINS },
    customerName: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  // Status options
  const statusOptions = [
    { label: "All", value: null },
    { label: "Issued", value: "ISSUED" },
    { label: "Pending", value: "PENDING" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  // Mock data for now - will be replaced with API calls
  const fetchCreditNotes = useCallback(async () => {
    setIsLoading(true);

    const mockData = [
      {
        id: 1,
        creditNoteNumber: "CN-2604-0001",
        issueRef: "ISS-2604-0002",
        customerName: "Kisaan Mart",
        date: "2026-04-13",
        amount: 8500,
        status: "ISSUED",
        reason: "Wrong item delivered - Credit for returned goods",
        items: [
          { itemName: "NPK Fertilizer", qty: 2, rate: 4000, amount: 8000 },
        ],
      },
      {
        id: 2,
        creditNoteNumber: "CN-2604-0002",
        issueRef: "ISS-2604-0003",
        customerName: "Agro Plus Store",
        date: "2026-04-14",
        amount: 12500,
        status: "ISSUED",
        reason: "Damaged goods - partial credit",
        items: [
          { itemName: "DAP Fertilizer", qty: 5, rate: 2500, amount: 12500 },
        ],
      },
    ];

    setAllCreditNotes(mockData);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCreditNotes();
  }, [fetchCreditNotes]);

  // Frontend filtering
  const filteredData = useMemo(() => {
    let data = [...allCreditNotes];

    // Global search
    if (filters.global.value) {
      const searchTerm = filters.global.value.toLowerCase();
      data = data.filter(
        (note) =>
          note.creditNoteNumber.toLowerCase().includes(searchTerm) ||
          note.customerName.toLowerCase().includes(searchTerm) ||
          note.issueRef?.toLowerCase().includes(searchTerm) ||
          note.reason.toLowerCase().includes(searchTerm),
      );
    }

    // Column filters
    if (filters.creditNoteNumber.value) {
      data = data.filter((note) =>
        note.creditNoteNumber
          .toLowerCase()
          .includes(filters.creditNoteNumber.value.toLowerCase()),
      );
    }
    if (filters.customerName.value) {
      data = data.filter((note) =>
        note.customerName
          .toLowerCase()
          .includes(filters.customerName.value.toLowerCase()),
      );
    }
    if (filters.status.value) {
      data = data.filter((note) => note.status === filters.status.value);
    }

    return data;
  }, [allCreditNotes, filters]);

  useEffect(() => {
    setCreditNotes(filteredData);
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

  const totalAmount = creditNotes.reduce((sum, note) => sum + note.amount, 0);

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
            <Skeleton width="6rem" height="1.25rem" />
            <Skeleton width="5rem" height="1.25rem" />
            <Skeleton width="6rem" height="1.25rem" className="ml-auto" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-center">
        <Skeleton width="15rem" height="2rem" />
      </div>
    </div>
  );

  const statusBodyTemplate = (rowData) => (
    <Tag value={rowData.status} severity="success" />
  );

  const amountBodyTemplate = (rowData) => (
    <span className="font-semibold text-green-600">
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
          setSelectedNote(rowData);
          setViewDialog(true);
        }}
      />
      <Button
        icon="pi pi-download"
        rounded
        text
        severity="secondary"
        tooltip="Download PDF"
        onClick={() => {
          toast.current.show({
            severity: "info",
            summary: "Info",
            detail: "Download feature coming soon",
          });
        }}
      />
    </div>
  );

  // Form handling functions
  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { itemName: "", qty: 1, rate: 0, amount: 0 }],
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      // Auto-calculate amount
      if (field === "qty" || field === "rate") {
        newItems[index].amount = newItems[index].qty * newItems[index].rate;
      }
      // Update total amount
      const totalAmount = newItems.reduce((sum, item) => sum + item.amount, 0);
      return { ...prev, items: newItems, amount: totalAmount };
    });
  };

  const handleCreateCreditNote = () => {
    if (!formData.customerName || !formData.reason) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Please fill in all required fields",
      });
      return;
    }

    const newCreditNote = {
      id: nextId,
      creditNoteNumber: `CN-2604-${String(nextCNNumber).padStart(4, "0")}`,
      issueRef: formData.hasIssueRef ? formData.issueRef : "Manual",
      customerName: formData.customerName,
      date: formData.date.toISOString().split("T")[0],
      amount: formData.amount,
      status: "ISSUED",
      reason: formData.reason,
      items: formData.items.filter((item) => item.itemName && item.qty > 0),
    };

    setAllCreditNotes((prev) => [newCreditNote, ...prev]);
    setNextId((prev) => prev + 1);
    setNextCNNumber((prev) => prev + 1);

    // Reset form
    setFormData({
      customerName: "",
      date: new Date(),
      amount: 0,
      reason: "",
      issueRef: "",
      hasIssueRef: false,
      items: [{ itemName: "", qty: 1, rate: 0, amount: 0 }],
    });

    setCreateDialog(false);
    toast.current.show({
      severity: "success",
      summary: "Success",
      detail: `Credit Note ${newCreditNote.creditNoteNumber} created successfully`,
    });
  };

  const openCreateDialog = () => {
    setFormData({
      customerName: "",
      date: new Date(),
      amount: 0,
      reason: "",
      issueRef: "",
      hasIssueRef: false,
      items: [{ itemName: "", qty: 1, rate: 0, amount: 0 }],
    });
    setCreateDialog(true);
  };

  const renderHeader = () => (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h5 className="m-0 text-lg font-semibold">Credit Notes</h5>
        <Badge value={totalRecords} severity="secondary" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            value={filters.global.value || ""}
            onChange={onGlobalFilterChange}
            placeholder="Search credit notes..."
          />
        </IconField>
        <Button
          label="Create Credit Note"
          icon="pi pi-plus"
          severity="success"
          onClick={openCreateDialog}
        />
      </div>
    </div>
  );

  return (
    <Page title="Credit Notes">
      <Toast ref={toast} />

      <div className="overflow-hidden pb-8">
        {/* Stats */}
        <div className="transition-content mt-4 px-(--margin-x)">
          {isLoading ? (
            statsSkeleton
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="relative flex items-center gap-4 rounded-xl border-t-4 border-blue-500 bg-white p-5 shadow-md dark:bg-gray-800">
                <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-gray-700">
                  <FiFileText size={20} />
                </div>
                <div>
                  <p className="text-xl font-semibold text-gray-800 dark:text-white">
                    {totalRecords}
                  </p>
                  <p className="text-sm text-gray-500">Total Credit Notes</p>
                </div>
              </div>
              <div className="relative flex items-center gap-4 rounded-xl border-t-4 border-green-500 bg-white p-5 shadow-md dark:bg-gray-800">
                <div className="rounded-full bg-green-100 p-2 text-green-600 dark:bg-gray-700">
                  <FiDollarSign size={20} />
                </div>
                <div>
                  <p className="text-xl font-semibold text-gray-800 dark:text-white">
                    ₹{totalAmount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Total Amount</p>
                </div>
              </div>
              <div className="relative flex items-center gap-4 rounded-xl border-t-4 border-orange-500 bg-white p-5 shadow-md dark:bg-gray-800">
                <div className="rounded-full bg-orange-100 p-2 text-orange-600 dark:bg-gray-700">
                  <FiCalendar size={20} />
                </div>
                <div>
                  <p className="text-xl font-semibold text-gray-800 dark:text-white">
                    {totalRecords}
                  </p>
                  <p className="text-sm text-gray-500">Issued This Month</p>
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
                value={creditNotes}
                lazy
                paginator
                first={lazyParams.first}
                rows={lazyParams.rows}
                totalRecords={totalRecords}
                onPage={(e) => setLazyParams(e)}
                loading={isLoading}
                header={renderHeader}
                emptyMessage={<EmptyMessage message="No credit notes found" />}
                filters={filters}
                filterDisplay="row"
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                onSort={(e) => setLazyParams(e)}
                className="p-datatable-sm"
              >
                <Column
                  field="creditNoteNumber"
                  header="Credit Note #"
                  sortable
                  filter
                  filterPlaceholder="Search by CN #"
                />
                <Column field="issueRef" header="Issue Ref" sortable />
                <Column
                  field="customerName"
                  header="Customer"
                  sortable
                  filter
                  filterPlaceholder="Search by customer"
                />
                <Column field="date" header="Date" sortable />
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
        header={`Credit Note Details - ${selectedNote?.creditNoteNumber}`}
        visible={viewDialog}
        style={{ width: "50vw" }}
        onHide={() => setViewDialog(false)}
      >
        {selectedNote && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-500">
                  Issue Reference
                </label>
                <p className="mt-1 text-gray-800">{selectedNote.issueRef}</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500">
                  Customer
                </label>
                <p className="mt-1 text-gray-800">
                  {selectedNote.customerName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500">
                  Date
                </label>
                <p className="mt-1 text-gray-800">{selectedNote.date}</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500">
                  Amount
                </label>
                <p className="mt-1 font-bold text-green-600">
                  ₹{selectedNote.amount?.toLocaleString()}
                </p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-bold text-gray-500">
                  Reason
                </label>
                <p className="mt-1 text-gray-800">{selectedNote.reason}</p>
              </div>
            </div>

            {selectedNote.items && selectedNote.items.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-500">
                  Items
                </label>
                <DataTable
                  value={selectedNote.items}
                  className="p-datatable-sm"
                >
                  <Column field="itemName" header="Item" />
                  <Column field="qty" header="Qty" />
                  <Column
                    field="rate"
                    header="Rate"
                    body={(row) => `₹${row.rate?.toLocaleString()}`}
                  />
                  <Column
                    field="amount"
                    header="Amount"
                    body={(row) => `₹${row.amount?.toLocaleString()}`}
                  />
                </DataTable>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Create Dialog */}
      <Dialog
        header="Create Credit Note"
        visible={createDialog}
        style={{ width: "60vw", maxWidth: "800px" }}
        onHide={() => setCreateDialog(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              icon="pi pi-times"
              onClick={() => setCreateDialog(false)}
              className="p-button-text"
            />
            <Button
              label="Create Credit Note"
              icon="pi pi-check"
              onClick={handleCreateCreditNote}
              severity="success"
            />
          </div>
        }
      >
        <div className="p-4">
          {/* Issue Reference Toggle */}
          <div className="mb-4 flex items-center gap-2">
            <Checkbox
              id="hasIssueRef"
              checked={formData.hasIssueRef}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, hasIssueRef: e.checked }))
              }
            />
            <label htmlFor="hasIssueRef" className="text-sm font-medium">
              Link to existing GRN Issue
            </label>
          </div>

          {formData.hasIssueRef && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-bold text-gray-500">
                Issue Reference
              </label>
              <InputText
                value={formData.issueRef}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, issueRef: e.target.value }))
                }
                placeholder="e.g., ISS-2604-0001"
                className="w-full"
              />
            </div>
          )}

          {/* Customer & Date */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-gray-500">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <InputText
                value={formData.customerName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customerName: e.target.value,
                  }))
                }
                placeholder="Enter customer name"
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-gray-500">
                Date <span className="text-red-500">*</span>
              </label>
              <Calendar
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.value }))
                }
                dateFormat="yy-mm-dd"
                className="w-full"
                inputClassName="w-full"
              />
            </div>
          </div>

          {/* Reason */}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-bold text-gray-500">
              Reason <span className="text-red-500">*</span>
            </label>
            <InputTextarea
              value={formData.reason}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="Enter reason for credit note"
              rows={3}
              className="w-full"
            />
          </div>

          {/* Items Section */}
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-bold text-gray-500">Items</label>
              <Button
                label="Add Item"
                icon="pi pi-plus"
                size="small"
                severity="secondary"
                onClick={handleAddItem}
              />
            </div>

            {formData.items.map((item, index) => (
              <div key={index} className="mb-3 flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-gray-500">
                    Item Name
                  </label>
                  <InputText
                    value={item.itemName}
                    onChange={(e) =>
                      handleItemChange(index, "itemName", e.target.value)
                    }
                    placeholder="Item name"
                    className="w-full"
                  />
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-xs text-gray-500">
                    Qty
                  </label>
                  <InputNumber
                    value={item.qty}
                    onValueChange={(e) =>
                      handleItemChange(index, "qty", e.value || 0)
                    }
                    min={1}
                    className="w-full"
                    inputClassName="w-full"
                  />
                </div>
                <div className="w-32">
                  <label className="mb-1 block text-xs text-gray-500">
                    Rate (₹)
                  </label>
                  <InputNumber
                    value={item.rate}
                    onValueChange={(e) =>
                      handleItemChange(index, "rate", e.value || 0)
                    }
                    min={0}
                    className="w-full"
                    inputClassName="w-full"
                  />
                </div>
                <div className="w-32">
                  <label className="mb-1 block text-xs text-gray-500">
                    Amount (₹)
                  </label>
                  <InputNumber
                    value={item.amount}
                    disabled
                    className="w-full"
                    inputClassName="w-full"
                  />
                </div>
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  rounded
                  onClick={() => handleRemoveItem(index)}
                  disabled={formData.items.length === 1}
                  tooltip="Remove item"
                />
              </div>
            ))}
          </div>

          {/* Total Amount */}
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm font-bold text-gray-500">
              Total Amount:
            </span>
            <span className="text-xl font-bold text-green-600">
              ₹{formData.amount.toLocaleString()}
            </span>
          </div>
        </div>
      </Dialog>
    </Page>
  );
}
