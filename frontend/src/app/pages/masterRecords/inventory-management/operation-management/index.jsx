import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { OperationService } from "services/master-records/operation";
import { WorkCenterService } from "services/master-records/work-center";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { MultiSelect } from "primereact/multiselect";
import { Dropdown } from "primereact/dropdown";
import { Tooltip } from "primereact/tooltip";
import { Skeleton } from "primereact/skeleton";
import { FilterMatchMode } from "primereact/api";
import { OverlayPanel } from "primereact/overlaypanel";
import { Tag } from "primereact/tag";
import { InputSwitch } from "primereact/inputswitch";
import { InputNumber } from "primereact/inputnumber";
import { unparse } from "papaparse";
import EmptyMessage from "components/shared/EmptyMessage";

export default function OperationManagement() {
  const toast = useRef(null);
  const actionOverlayRef = useRef(null);

  const [list, setList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedRow, setSelectedRow] = useState(null);

  // Work Centers dropdown
  const [workCenters, setWorkCenters] = useState([]);
  const [workCentersLoading, setWorkCentersLoading] = useState(false);

  // Dialog state
  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formData, setFormData] = useState({
    work_center_id: null,
    name: "",
    code: "",
    description: "",
    duration_minutes: 0.0,
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState({});

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    code: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const columnOptions = [
    { field: "name", header: "Name" },
    { field: "code", header: "Code" },
    { field: "work_center_name", header: "Work Center" },
    { field: "duration_minutes", header: "Duration (mins)" },
    { field: "is_active", header: "Status" },
    { field: "created_at", header: "Created At" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("operationList_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    return columnOptions;
  });

  const blankRow = { name: "", code: "", work_center_name: "", duration_minutes: "", is_active: "", created_at: "" };

  // ─── Load work centers dropdown ───────────────────────────────
  const loadWorkCenters = async () => {
    setWorkCentersLoading(true);
    try {
      const res = await WorkCenterService.getActiveWorkCenters();
      if (res.success) {
        setWorkCenters(
          (res.data || []).map((wc) => ({ label: `${wc.name} (${wc.code})`, value: wc.work_center_id }))
        );
      }
    } catch (error) {
      console.error("Error loading Work Centers:", error);
    } finally {
      setWorkCentersLoading(false);
    }
  };

  // ─── Validation ─────────────────────────────────────────────
  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = "Name is required";
    if (!formData.code?.trim()) errors.code = "Code is required";
    if (!formData.work_center_id) errors.work_center_id = "Work Center is required";
    if (formData.duration_minutes < 0) errors.duration_minutes = "Must be ≥ 0";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({ work_center_id: null, name: "", code: "", description: "", duration_minutes: 0.0, is_active: true });
    setFormErrors({});
  };

  const hideDialog = () => { setEditId(null); setDialog(false); resetForm(); };

  const openAddDialog = () => {
    setEditId(null);
    resetForm();
    setDialog(true);
    loadWorkCenters();
  };

  // ─── Fetch ───────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await OperationService.getFormattedOperations({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
      });
      if (response.success) {
        setList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        toast.current?.show({ severity: "error", summary: "Error", detail: response.error?.message || "Failed to load data", life: 3000 });
        setList([]); setTotalRecords(0);
      }
    } catch (error) {
      toast.current?.show({ severity: "error", summary: "Error", detail: error.message || "Failed to load data", life: 3000 });
      setList([]); setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams]);

  useEffect(() => {
    const delay = setTimeout(() => fetchList(), 500);
    return () => clearTimeout(delay);
  }, [filters, fetchList]);

  // ─── Save ────────────────────────────────────────────────────
  const save = async () => {
    if (!validateForm()) return;
    setSaveLoading(true);
    try {
      const response = editId
        ? await OperationService.updateOperation(editId, formData)
        : await OperationService.createOperation(formData);
      if (response.success) {
        toast.current?.show({ severity: "success", summary: "Success", detail: response.message || "Saved successfully", life: 3000 });
        hideDialog(); fetchList();
      } else {
        toast.current?.show({ severity: "error", summary: "Error", detail: response.error?.details?.[0]?.message || response.message || "Failed to save", life: 3000 });
      }
    } catch (error) {
      toast.current?.show({ severity: "error", summary: "Error", detail: error.message || "Failed to save", life: 3000 });
    } finally {
      setSaveLoading(false);
    }
  };

  // ─── Edit ────────────────────────────────────────────────────
  const handleEdit = async (rowData) => {
    setFormLoading(true);
    setEditId(rowData.operation_id);
    setDialog(true);
    loadWorkCenters();
    try {
      const response = await OperationService.getOperationById(rowData.operation_id);
      if (response.success) {
        const d = response.data;
        setFormData({ work_center_id: d.work_center_id, name: d.name || "", code: d.code || "", description: d.description || "", duration_minutes: d.duration_minutes ?? 0.0, is_active: !!d.is_active });
      } else {
        toast.current?.show({ severity: "error", summary: "Error", detail: response.message || "Failed to fetch", life: 3000 });
      }
    } catch (error) {
      toast.current?.show({ severity: "error", summary: "Error", detail: error.message || "Failed to fetch", life: 3000 });
    } finally {
      setFormLoading(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────
  const confirmDelete = (rowData) => { setDeleteId(rowData.operation_id); setDeleteDialog(true); };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await OperationService.deleteOperation(deleteId);
      if (res.success) {
        toast.current?.show({ severity: "success", summary: "Success", detail: res.message || "Deleted successfully", life: 3000 });
        setDeleteDialog(false); fetchList();
      } else {
        toast.current?.show({ severity: "error", summary: "Error", detail: res.error?.details?.[0]?.message || res.message || "Failed to delete", life: 3000 });
      }
    } catch (error) {
      toast.current?.show({ severity: "error", summary: "Error", detail: error.message || "Failed to delete", life: 3000 });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Export & Toggle ─────────────────────────────────────────
  const formatDate = (d) => {
    if (!d) return "-";
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  };

  const exportCSV = () => {
    if (!list.length) { toast.current?.show({ severity: "warn", summary: "Warning", detail: "No data to export", life: 3000 }); return; }
    const data = list.map((row) => {
      const obj = {};
      visibleFields.forEach((col) => {
        if (col.field === "is_active") obj[col.header] = row[col.field] ? "Active" : "Inactive";
        else if (col.field === "created_at") obj[col.header] = formatDate(row[col.field]);
        else obj[col.header] = row[col.field] ?? "-";
      });
      return obj;
    });
    const csv = unparse({ fields: visibleFields.map((c) => c.header), data: data.map((r) => visibleFields.map((c) => r[c.header])) });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.setAttribute("download", "operations.csv");
    document.body.appendChild(link); link.click();
    document.body.removeChild(link); URL.revokeObjectURL(url);
    toast.current?.show({ severity: "success", detail: "File exported successfully", life: 2000 });
  };

  const onColumnToggle = (e) => {
    let sel = e.value;
    if (!sel.some((c) => c.field === "name")) sel = [...sel, columnOptions.find((c) => c.field === "name")];
    const ordered = columnOptions.filter((c) => sel.some((s) => s.field === c.field));
    setVisibleFields(ordered);
    sessionStorage.setItem("operationList_visibleFields", JSON.stringify(ordered.map((c) => c.field)));
  };

  // ─── Templates ───────────────────────────────────────────────
  const textTemplate = (field) => (rowData) =>
    isLoading ? <Skeleton width="70%" height="1.5rem" /> : <span>{rowData[field] ?? "-"}</span>;

  const statusTemplate = (rowData) =>
    isLoading ? <Skeleton width="60%" height="1.5rem" /> : (
      <Tag value={rowData.is_active ? "Active" : "Inactive"} severity={rowData.is_active ? "success" : "danger"} />
    );

  const dateTemplate = (rowData) =>
    isLoading ? <Skeleton width="80%" height="1.5rem" /> : <span>{formatDate(rowData.created_at)}</span>;

  const actionTemplate = (rowData) =>
    isLoading ? <Skeleton shape="circle" size="2.5rem" /> : (
      <Button icon="pi pi-ellipsis-v" className="h-[2.5rem] w-[2.5rem]" rounded text
        onClick={(e) => { setSelectedRow(rowData); actionOverlayRef.current.toggle(e); }} />
    );

  // ─── Header ──────────────────────────────────────────────────
  const header = (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">Operations List</h3>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 lg:justify-end">
        <IconField iconPosition="left" className="w-full sm:w-64">
          <InputIcon className="pi pi-search" />
          <InputText type="search" value={filters.global?.value || ""}
            onChange={(e) => setFilters((p) => ({ ...p, global: { ...p.global, value: e.target.value } }))}
            placeholder="Keyword Search" className="w-full" />
        </IconField>
        <MultiSelect value={visibleFields} options={columnOptions} optionLabel="header" onChange={onColumnToggle}
          className="w-full sm:w-56" display="chip" placeholder="Visible Columns" disabled={isLoading} />
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <Button className="export-icon-tooltip" icon="pi pi-file" rounded size="small" onClick={exportCSV}
            data-pr-tooltip="Export as CSV" disabled={isLoading} />
          <Button label="Add" icon="pi pi-plus" size="small" onClick={openAddDialog} />
          <Tooltip target=".export-icon-tooltip" position="top" style={{ fontSize: "12px" }} showDelay={100} hideDelay={100} />
        </div>
      </div>
    </div>
  );

  const dialogFooter = (
    <>
      <Button label="Cancel" icon="pi pi-times" outlined onClick={hideDialog} disabled={saveLoading} />
      <Button label={saveLoading ? "Saving..." : "Save"} icon={saveLoading ? "pi pi-spin pi-spinner" : "pi pi-check"} onClick={save} disabled={saveLoading} />
    </>
  );

  const deleteDialogFooter = (
    <>
      <Button label="No" icon="pi pi-times" outlined onClick={() => setDeleteDialog(false)} disabled={deleteLoading} style={{ marginRight: "1rem" }} />
      <Button label={deleteLoading ? "Deleting..." : "Yes"} icon={deleteLoading ? "pi pi-spin pi-spinner" : "pi pi-check"} severity="danger" onClick={handleDelete} disabled={deleteLoading} />
    </>
  );

  return (
    <Page title="Operations Management">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={isLoading ? Array.from({ length: 10 }, () => blankRow) : list}
                header={header} lazy paginator
                first={lazyParams.first} rows={lazyParams.rows}
                totalRecords={totalRecords}
                onPage={(e) => setLazyParams((p) => ({ ...p, first: e.first, rows: e.rows }))}
                onSort={(e) => setLazyParams((p) => ({ ...p, sortField: e.sortField, sortOrder: e.sortOrder }))}
                sortField={lazyParams.sortField} sortOrder={lazyParams.sortOrder}
                rowsPerPageOptions={[10, 25, 50]}
                dataKey="operation_id"
                emptyMessage={<EmptyMessage />}
                className="overflow-hidden rounded-lg border border-gray-300"
              >
                {visibleFields.some((c) => c.field === "name") && <Column field="name" header="Name" sortable body={textTemplate("name")} />}
                {visibleFields.some((c) => c.field === "code") && <Column field="code" header="Code" sortable body={textTemplate("code")} />}
                {visibleFields.some((c) => c.field === "work_center_name") && <Column field="work_center_name" header="Work Center" body={textTemplate("work_center_name")} />}
                {visibleFields.some((c) => c.field === "duration_minutes") && <Column field="duration_minutes" header="Duration (mins)" sortable body={textTemplate("duration_minutes")} />}
                {visibleFields.some((c) => c.field === "is_active") && <Column field="is_active" header="Status" body={statusTemplate} />}
                {visibleFields.some((c) => c.field === "created_at") && <Column field="created_at" header="Created At" sortable body={dateTemplate} />}
                <Column header="Actions" body={actionTemplate} style={{ width: "4rem" }} />
              </DataTable>
            </div>
          </div>
        </div>
      </div>

      {/* Action overlay */}
      <OverlayPanel ref={actionOverlayRef} className="action-overlay-panel">
        <div className="flex flex-col gap-1">
          <Button label="Edit" icon="pi pi-pencil" text size="small" onClick={() => { actionOverlayRef.current.hide(); handleEdit(selectedRow); }} />
          <Button label="Delete" icon="pi pi-trash" text size="small" severity="danger" onClick={() => { actionOverlayRef.current.hide(); confirmDelete(selectedRow); }} />
        </div>
      </OverlayPanel>

      {/* Add/Edit Dialog */}
      <Dialog header={editId ? "Edit Operation" : "Add Operation"} visible={dialog} onHide={hideDialog}
        style={{ width: "500px" }} footer={dialogFooter} draggable={false}>
        {formLoading ? (
          <div className="flex flex-col gap-4">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height="2.5rem" />)}</div>
        ) : (
          <div className="flex flex-col gap-4 pt-2">
            {/* Work Center */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Work Center <span className="text-red-500">*</span></label>
              <Dropdown value={formData.work_center_id} options={workCenters}
                onChange={(e) => setFormData((p) => ({ ...p, work_center_id: e.value }))}
                placeholder={workCentersLoading ? "Loading..." : "Select Work Center"}
                disabled={workCentersLoading}
                className={`w-full ${formErrors.work_center_id ? "p-invalid" : ""}`} />
              {formErrors.work_center_id && <small className="text-red-500">{formErrors.work_center_id}</small>}
            </div>
            {/* Name */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Name <span className="text-red-500">*</span></label>
              <InputText value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Welding" className={formErrors.name ? "p-invalid" : ""} />
              {formErrors.name && <small className="text-red-500">{formErrors.name}</small>}
            </div>
            {/* Code */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Code <span className="text-red-500">*</span></label>
              <InputText value={formData.code} onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
                placeholder="e.g. OP-001" className={formErrors.code ? "p-invalid" : ""} />
              {formErrors.code && <small className="text-red-500">{formErrors.code}</small>}
            </div>
            {/* Description */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Description</label>
              <InputText value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
            </div>
            {/* Duration */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Duration (minutes)</label>
              <InputNumber value={formData.duration_minutes} onValueChange={(e) => setFormData((p) => ({ ...p, duration_minutes: e.value ?? 0 }))}
                min={0} mode="decimal" minFractionDigits={2} maxFractionDigits={2}
                className={formErrors.duration_minutes ? "p-invalid" : ""} />
              {formErrors.duration_minutes && <small className="text-red-500">{formErrors.duration_minutes}</small>}
            </div>
            {/* Active */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Active</label>
              <InputSwitch checked={formData.is_active} onChange={(e) => setFormData((p) => ({ ...p, is_active: e.value }))} />
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog header="Confirm Delete" visible={deleteDialog} onHide={() => setDeleteDialog(false)}
        style={{ width: "400px" }} footer={deleteDialogFooter} draggable={false}>
        <p>Are you sure you want to delete this Operation? This action cannot be undone.</p>
      </Dialog>
    </Page>
  );
}
