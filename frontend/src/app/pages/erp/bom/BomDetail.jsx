import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { ProgressSpinner } from "primereact/progressspinner";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { BomService } from "services/masters/bom.service";
import { ProductService } from "services/products/product.service";

export default function BomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useRef(null);
  const [bom, setBom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addLineDialog, setAddLineDialog] = useState(false);
  const [newLine, setNewLine] = useState({ component_id: "", qty: 1, uom: "Pcs", notes: "" });

  const load = async () => {
    setLoading(true);
    const res = await BomService.getById(id);
    if (res.success) setBom(res.data.data);
    else toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = () => {
    confirmDialog({
      message: "Delete this BOM? This cannot be undone if MOs reference it.",
      header: "Delete BOM", icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        const res = await BomService.delete(id);
        if (res.success) navigate("/erp/bom");
        else toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
      },
    });
  };

  const handleAddLine = async () => {
    if (!newLine.component_id || !newLine.qty) return;
    const res = await BomService.addLine(id, newLine);
    if (res.success) {
      toast.current?.show({ severity: "success", summary: "Component added" });
      setAddLineDialog(false);
      setNewLine({ component_id: "", qty: 1, uom: "Pcs", notes: "" });
      load();
    } else {
      toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
    }
  };

  const handleRemoveLine = async (lineId) => {
    confirmDialog({
      message: "Remove this component from the BOM?",
      header: "Remove Component", icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        const res = await BomService.removeLine(id, lineId);
        if (res.success) load();
        else toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
      },
    });
  };

  if (loading) return <div className="flex justify-center p-8"><ProgressSpinner /></div>;
  if (!bom) return <div className="p-4 text-red-500">BOM not found</div>;

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button icon="pi pi-arrow-left" text onClick={() => navigate("/erp/bom")} />
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{bom.bom_name}</h1>
            <div className="flex gap-2 mt-1">
              <Tag value={bom.bom_type} severity="info" className="capitalize" />
              <Tag value={bom.is_active ? "Active" : "Inactive"} severity={bom.is_active ? "success" : "danger"} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button label="Add Component" icon="pi pi-plus" outlined onClick={() => setAddLineDialog(true)} />
          <Button label="Edit" icon="pi pi-pencil" outlined onClick={() => navigate(`/erp/bom/${id}/edit`)} />
          <Button label="Delete" icon="pi pi-trash" severity="danger" outlined onClick={handleDelete} />
        </div>
      </div>

      {/* BOM Header Info */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500">Product</p>
          <p className="font-semibold">{bom.product_name}</p>
          <p className="text-xs text-gray-400">{bom.product_code}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500">Output Qty per Run</p>
          <p className="font-semibold text-xl">{bom.qty}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500">Components</p>
          <p className="font-semibold text-xl">{bom.lines?.length || 0}</p>
        </div>
      </div>

      {/* Components Table */}
      <h2 className="text-lg font-semibold mb-2">Components</h2>
      <DataTable value={bom.lines || []} emptyMessage="No components defined" className="text-sm" stripedRows>
        <Column field="component_code" header="Code" />
        <Column field="component_name" header="Component" />
        <Column field="qty" header="Qty per Run" />
        <Column field="component_uom" header="UOM" />
        <Column field="operation_name" header="Operation" body={(r) => r.operation_name || "-"} />
        <Column field="work_center_name" header="Work Center" body={(r) => r.work_center_name || "-"} />
        <Column field="on_hand_qty" header="On Hand" body={(r) => (
          <span className={parseFloat(r.free_to_use_qty || 0) < parseFloat(r.qty) ? "text-red-500 font-semibold" : "text-green-600"}>
            {parseFloat(r.on_hand_qty || 0)} {r.component_uom}
          </span>
        )} />
        <Column field="notes" header="Notes" body={(r) => r.notes || "-"} />
        <Column header="" body={(row) => (
          <Button icon="pi pi-trash" size="small" text severity="danger"
            onClick={() => handleRemoveLine(row.bom_line_id)} />
        )} style={{ width: "60px" }} />
      </DataTable>

      {/* Add Line Dialog */}
      <Dialog header="Add Component" visible={addLineDialog} onHide={() => setAddLineDialog(false)} style={{ width: "480px" }}>
        <div className="p-4 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Component Product ID *</label>
            <InputText value={newLine.component_id} onChange={(e) => setNewLine(l => ({ ...l, component_id: e.target.value }))}
              className="w-full" placeholder="Enter product_id" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Qty per Run *</label>
              <InputNumber value={newLine.qty} onValueChange={(e) => setNewLine(l => ({ ...l, qty: e.value || 1 }))}
                className="w-full" min={0.001} minFractionDigits={3} />
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium mb-1">UOM</label>
              <InputText value={newLine.uom} onChange={(e) => setNewLine(l => ({ ...l, uom: e.target.value }))} className="w-full" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <InputText value={newLine.notes} onChange={(e) => setNewLine(l => ({ ...l, notes: e.target.value }))}
              className="w-full" placeholder="Optional" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button label="Cancel" outlined severity="secondary" onClick={() => setAddLineDialog(false)} />
            <Button label="Add Component" onClick={handleAddLine} disabled={!newLine.component_id || !newLine.qty} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
