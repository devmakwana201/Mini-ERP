import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Checkbox } from "primereact/checkbox";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { Card } from "primereact/card";
import { ProgressSpinner } from "primereact/progressspinner";
import { BomService } from "services/masters/bom.service";

const BOM_TYPES = [
  { label: "Manufacture", value: "manufacture" },
  { label: "Phantom", value: "phantom" },
  { label: "Kit", value: "kit" },
];

const EMPTY_LINE = { component_id: "", qty: 1, uom: "Pcs", notes: "" };

export default function BomForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useRef(null);
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    product_id: "", bom_name: "", bom_type: "manufacture", qty: 1, is_active: true,
  });
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      BomService.getById(id).then((res) => {
        if (res.success) {
          const b = res.data.data;
          setForm({ product_id: b.product_id, bom_name: b.bom_name, bom_type: b.bom_type, qty: b.qty, is_active: Boolean(b.is_active) });
          if (b.lines?.length) {
            setLines(b.lines.map((l) => ({ component_id: l.component_id, qty: l.qty, uom: l.component_uom || l.uom || "Pcs", notes: l.notes || "" })));
          }
        }
        setLoading(false);
      });
    }
  }, [id]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const setLine = (index, field, value) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const addLine = () => setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  const removeLine = (index) => setLines((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validLines = lines.filter((l) => l.component_id && l.qty > 0);
    if (!form.product_id) {
      toast.current?.show({ severity: "warn", summary: "Validation", detail: "Product ID is required" });
      return;
    }

    setSaving(true);
    const payload = { ...form, lines: validLines };
    const res = isEdit
      ? await BomService.update(id, { bom_name: form.bom_name, bom_type: form.bom_type, qty: form.qty, is_active: form.is_active })
      : await BomService.create(payload);

    if (res.success) {
      toast.current?.show({ severity: "success", summary: "Saved", detail: "BOM saved successfully" });
      setTimeout(() => navigate("/bom"), 800);
    } else {
      toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center p-8"><ProgressSpinner /></div>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <Toast ref={toast} />
      <div className="mb-4 flex items-center gap-3">
        <Button icon="pi pi-arrow-left" text onClick={() => navigate("/bom")} />
        <h1 className="text-xl font-bold">{isEdit ? "Edit BOM" : "New Bill of Materials"}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card title="BOM Header" className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">BOM Name *</label>
              <InputText value={form.bom_name} onChange={(e) => set("bom_name", e.target.value)}
                className="w-full" required placeholder="e.g. BOM - Wooden Dining Table v1" />
            </div>
            {!isEdit && (
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Finished Product ID *</label>
                <InputText value={form.product_id} onChange={(e) => set("product_id", e.target.value)}
                  className="w-full" placeholder="Enter product_id" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">BOM Type</label>
              <Dropdown value={form.bom_type} options={BOM_TYPES} onChange={(e) => set("bom_type", e.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Output Qty (per production run)</label>
              <InputNumber value={form.qty} onValueChange={(e) => set("qty", e.value || 1)} className="w-full" min={0.001} minFractionDigits={3} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox inputId="is_active" checked={form.is_active} onChange={(e) => set("is_active", e.checked)} />
              <label htmlFor="is_active" className="font-medium">Set as Active BOM</label>
            </div>
          </div>
        </Card>

        {!isEdit && (
          <Card title="Components" className="mb-4">
            <DataTable value={lines} className="text-sm" emptyMessage="No components added yet">
              <Column header="Component Product ID" body={(row, { rowIndex }) => (
                <InputText value={row.component_id} onChange={(e) => setLine(rowIndex, "component_id", e.target.value)}
                  className="w-full" placeholder="product_id" />
              )} />
              <Column header="Qty" body={(row, { rowIndex }) => (
                <InputNumber value={row.qty} onValueChange={(e) => setLine(rowIndex, "qty", e.value || 1)}
                  className="w-28" min={0.001} minFractionDigits={3} />
              )} />
              <Column header="UOM" body={(row, { rowIndex }) => (
                <InputText value={row.uom} onChange={(e) => setLine(rowIndex, "uom", e.target.value)} className="w-20" />
              )} />
              <Column header="Notes" body={(row, { rowIndex }) => (
                <InputText value={row.notes} onChange={(e) => setLine(rowIndex, "notes", e.target.value)} className="w-full" />
              )} />
              <Column header="" body={(_, { rowIndex }) => (
                <Button icon="pi pi-minus" size="small" severity="danger" text onClick={() => removeLine(rowIndex)} />
              )} style={{ width: "50px" }} />
            </DataTable>
            <Button label="Add Component" icon="pi pi-plus" text className="mt-2" onClick={addLine} type="button" />
          </Card>
        )}

        <div className="flex gap-3 justify-end">
          <Button label="Cancel" severity="secondary" outlined onClick={() => navigate("/bom")} type="button" />
          <Button label={saving ? "Saving..." : "Save BOM"} icon="pi pi-save" type="submit" disabled={saving} />
        </div>
      </form>
    </div>
  );
}
