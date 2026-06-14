import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Checkbox } from "primereact/checkbox";
import { WorkCenterService, OperationService } from "services/masters/work-center.service";

const EMPTY_WC = { name: "", code: "", description: "", capacity_per_day: 8, cost_per_hour: 0, is_active: true };
const EMPTY_OP = { name: "", code: "", description: "", work_center_id: "", duration_minutes: 30, is_active: true };

export default function WorkCenterList() {
  const toast = useRef(null);
  const [workCenters, setWorkCenters] = useState([]);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [wcDialog, setWcDialog] = useState(false);
  const [opDialog, setOpDialog] = useState(false);
  const [editWc, setEditWc] = useState(null);
  const [editOp, setEditOp] = useState(null);
  const [wcForm, setWcForm] = useState(EMPTY_WC);
  const [opForm, setOpForm] = useState(EMPTY_OP);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [wcRes, opRes] = await Promise.all([
      WorkCenterService.getAll(),
      OperationService.getAll(),
    ]);
    if (wcRes.success) setWorkCenters(wcRes.data?.data || wcRes.data || []);
    if (opRes.success) setOperations(opRes.data?.data || opRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openWcCreate = () => { setEditWc(null); setWcForm(EMPTY_WC); setWcDialog(true); };
  const openWcEdit = (wc) => { setEditWc(wc); setWcForm({ name: wc.name, code: wc.code || wc.work_center_code || "", description: wc.description || "", capacity_per_day: wc.capacity_per_day || 8, cost_per_hour: parseFloat(wc.cost_per_hour || 0), is_active: Boolean(wc.is_active) }); setWcDialog(true); };
  const openOpCreate = (work_center_id = "") => { setEditOp(null); setOpForm({ ...EMPTY_OP, work_center_id }); setOpDialog(true); };
  const openOpEdit = (op) => { setEditOp(op); setOpForm({ name: op.name || op.operation_name, code: op.code || op.operation_code || "", description: op.description || "", work_center_id: op.work_center_id, duration_minutes: op.duration_minutes || 30, is_active: Boolean(op.is_active) }); setOpDialog(true); };

  const saveWc = async () => {
    setSaving(true);
    const res = editWc ? await WorkCenterService.update(editWc.work_center_id, wcForm) : await WorkCenterService.create(wcForm);
    if (res.success) { toast.current?.show({ severity: "success", summary: "Saved" }); setWcDialog(false); load(); }
    else toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
    setSaving(false);
  };

  const saveOp = async () => {
    setSaving(true);
    const res = editOp ? await OperationService.update(editOp.operation_id, opForm) : await OperationService.create(opForm);
    if (res.success) { toast.current?.show({ severity: "success", summary: "Saved" }); setOpDialog(false); load(); }
    else toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
    setSaving(false);
  };

  const deleteWc = (id) => confirmDialog({
    message: "Delete this work center? Operations will also be affected.", header: "Confirm Delete",
    icon: "pi pi-exclamation-triangle", acceptClassName: "p-button-danger",
    accept: async () => { const r = await WorkCenterService.delete(id); if (r.success) load(); else toast.current?.show({ severity: "error", detail: r.message }); },
  });

  const deleteOp = (id) => confirmDialog({
    message: "Delete this operation?", header: "Confirm Delete",
    icon: "pi pi-exclamation-triangle", acceptClassName: "p-button-danger",
    accept: async () => { const r = await OperationService.delete(id); if (r.success) load(); else toast.current?.show({ severity: "error", detail: r.message }); },
  });

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* Work Centers */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Work Centers</h1>
            <p className="text-sm text-gray-500">{workCenters.length} production stations</p>
          </div>
          <Button label="New Work Center" icon="pi pi-plus" onClick={openWcCreate} />
        </div>

        <DataTable value={workCenters} loading={loading} emptyMessage="No work centers" stripedRows className="text-sm">
          <Column field="name" header="Name" body={(r) => <span className="font-medium">{r.name || r.work_center_name}</span>} />
          <Column field="code" header="Code" body={(r) => r.code || r.work_center_code} />
          <Column field="capacity_per_day" header="Capacity (hrs/day)" />
          <Column field="cost_per_hour" header="Cost/hr" body={(r) => `₹ ${parseFloat(r.cost_per_hour || 0).toFixed(2)}`} />
          <Column header="Status" body={(r) => <Tag value={r.is_active ? "Active" : "Inactive"} severity={r.is_active ? "success" : "danger"} className="text-xs" />} />
          <Column header="Operations" body={(r) => <span className="text-gray-500 text-xs">{operations.filter(o => o.work_center_id === r.work_center_id).length} ops</span>} />
          <Column header="" body={(r) => (
            <div className="flex gap-1">
              <Button icon="pi pi-plus" size="small" text severity="success" tooltip="Add Operation" onClick={() => openOpCreate(r.work_center_id)} />
              <Button icon="pi pi-pencil" size="small" text onClick={() => openWcEdit(r)} />
              <Button icon="pi pi-trash" size="small" text severity="danger" onClick={() => deleteWc(r.work_center_id)} />
            </div>
          )} style={{ width: "120px" }} />
        </DataTable>
      </div>

      {/* Operations */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Operations</h2>
            <p className="text-sm text-gray-500">{operations.length} operations across all work centers</p>
          </div>
          <Button label="New Operation" icon="pi pi-plus" outlined onClick={() => openOpCreate()} />
        </div>

        <DataTable value={operations} loading={loading} emptyMessage="No operations" stripedRows className="text-sm">
          <Column field="name" header="Operation" body={(r) => <span className="font-medium">{r.name || r.operation_name}</span>} />
          <Column field="code" header="Code" body={(r) => r.code || r.operation_code} />
          <Column header="Work Center" body={(r) => { const wc = workCenters.find(w => w.work_center_id === r.work_center_id); return <Tag value={wc?.name || wc?.work_center_name || "—"} severity="info" className="text-xs" />; }} />
          <Column field="duration_minutes" header="Duration (min)" />
          <Column header="Status" body={(r) => <Tag value={r.is_active ? "Active" : "Inactive"} severity={r.is_active ? "success" : "danger"} className="text-xs" />} />
          <Column header="" body={(r) => (
            <div className="flex gap-1">
              <Button icon="pi pi-pencil" size="small" text onClick={() => openOpEdit(r)} />
              <Button icon="pi pi-trash" size="small" text severity="danger" onClick={() => deleteOp(r.operation_id)} />
            </div>
          )} style={{ width: "80px" }} />
        </DataTable>
      </div>

      {/* Work Center Dialog */}
      <Dialog header={editWc ? "Edit Work Center" : "New Work Center"} visible={wcDialog} onHide={() => setWcDialog(false)} style={{ width: "500px" }}>
        <div className="p-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Name *</label>
              <InputText value={wcForm.name} onChange={(e) => setWcForm(f => ({ ...f, name: e.target.value }))} className="w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Code *</label>
              <InputText value={wcForm.code} onChange={(e) => setWcForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="w-full" placeholder="WC-CUT" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Capacity (hrs/day)</label>
              <InputNumber value={wcForm.capacity_per_day} onValueChange={(e) => setWcForm(f => ({ ...f, capacity_per_day: e.value || 8 }))} className="w-full" min={1} max={24} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cost/Hour (₹)</label>
              <InputNumber value={wcForm.cost_per_hour} onValueChange={(e) => setWcForm(f => ({ ...f, cost_per_hour: e.value || 0 }))} className="w-full" min={0} minFractionDigits={2} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={wcForm.is_active} onChange={(e) => setWcForm(f => ({ ...f, is_active: e.checked }))} />
              <label className="text-sm">Active</label>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <InputText value={wcForm.description} onChange={(e) => setWcForm(f => ({ ...f, description: e.target.value }))} className="w-full" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button label="Cancel" outlined severity="secondary" onClick={() => setWcDialog(false)} />
            <Button label={saving ? "Saving..." : "Save"} onClick={saveWc} disabled={saving || !wcForm.name} />
          </div>
        </div>
      </Dialog>

      {/* Operation Dialog */}
      <Dialog header={editOp ? "Edit Operation" : "New Operation"} visible={opDialog} onHide={() => setOpDialog(false)} style={{ width: "500px" }}>
        <div className="p-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Operation Name *</label>
              <InputText value={opForm.name} onChange={(e) => setOpForm(f => ({ ...f, name: e.target.value }))} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <InputText value={opForm.code} onChange={(e) => setOpForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="w-full" placeholder="OP-CUT-001" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Work Center *</label>
              <select className="w-full rounded border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-700"
                value={opForm.work_center_id} onChange={(e) => setOpForm(f => ({ ...f, work_center_id: parseInt(e.target.value) }))}>
                <option value="">Select Work Center</option>
                {workCenters.map(wc => <option key={wc.work_center_id} value={wc.work_center_id}>{wc.name || wc.work_center_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
              <InputNumber value={opForm.duration_minutes} onValueChange={(e) => setOpForm(f => ({ ...f, duration_minutes: e.value || 30 }))} className="w-full" min={1} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={opForm.is_active} onChange={(e) => setOpForm(f => ({ ...f, is_active: e.checked }))} />
              <label className="text-sm">Active</label>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <InputText value={opForm.description} onChange={(e) => setOpForm(f => ({ ...f, description: e.target.value }))} className="w-full" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button label="Cancel" outlined severity="secondary" onClick={() => setOpDialog(false)} />
            <Button label={saving ? "Saving..." : "Save"} onClick={saveOp} disabled={saving || !opForm.name || !opForm.work_center_id} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
