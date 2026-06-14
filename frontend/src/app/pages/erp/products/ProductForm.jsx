import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { ProgressSpinner } from "primereact/progressspinner";
import { ProductService } from "services/products/product.service";

const PRODUCT_TYPES = [
  { label: "Storable Product", value: "storable" },
  { label: "Consumable", value: "consumable" },
  { label: "Service", value: "service" },
];
const PROCUREMENT_TYPES = [
  { label: "Buy", value: "buy" },
  { label: "Manufacture", value: "manufacture" },
  { label: "Buy or Manufacture", value: "both" },
];
const PROCUREMENT_STRATEGIES = [
  { label: "Make to Stock (MTS)", value: "MTS" },
  { label: "Make to Order (MTO)", value: "MTO" },
];

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useRef(null);
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    product_code: "", product_name: "", product_type: "storable",
    procurement_type: "buy", procurement_strategy: "MTS",
    uom: "Pcs", sales_price: 0, cost_price: 0, min_stock_qty: 0,
    description: "", is_active: true,
  });

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      ProductService.getById(id).then((res) => {
        if (res.success) {
          const p = res.data;
          setForm({ ...form, ...p });
        }
        setLoading(false);
      });
    }
  }, [id]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = isEdit
      ? await ProductService.update(id, form)
      : await ProductService.create(form);
    if (res.success) {
      toast.current?.show({ severity: "success", summary: "Saved", detail: "Product saved" });
      setTimeout(() => navigate("/products"), 800);
    } else {
      toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center p-8"><ProgressSpinner /></div>;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Toast ref={toast} />
      <div className="mb-4 flex items-center gap-3">
        <Button icon="pi pi-arrow-left" text onClick={() => navigate("/products")} />
        <h1 className="text-xl font-bold">{isEdit ? "Edit Product" : "New Product"}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card title="Basic Info" className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Product Code *</label>
              <InputText value={form.product_code} onChange={(e) => set("product_code", e.target.value)}
                className="w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">UOM</label>
              <InputText value={form.uom} onChange={(e) => set("uom", e.target.value)} className="w-full" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Product Name *</label>
              <InputText value={form.product_name} onChange={(e) => set("product_name", e.target.value)}
                className="w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Product Type</label>
              <Dropdown value={form.product_type} options={PRODUCT_TYPES}
                onChange={(e) => set("product_type", e.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min Stock Qty</label>
              <InputNumber value={form.min_stock_qty} onValueChange={(e) => set("min_stock_qty", e.value || 0)}
                className="w-full" min={0} />
            </div>
          </div>
        </Card>

        <Card title="Procurement" className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Procurement Type</label>
              <Dropdown value={form.procurement_type} options={PROCUREMENT_TYPES}
                onChange={(e) => set("procurement_type", e.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Strategy</label>
              <Dropdown value={form.procurement_strategy} options={PROCUREMENT_STRATEGIES}
                onChange={(e) => set("procurement_strategy", e.value)} className="w-full" />
            </div>
          </div>
        </Card>

        <Card title="Pricing" className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Sales Price (₹)</label>
              <InputNumber value={form.sales_price} onValueChange={(e) => set("sales_price", e.value || 0)}
                className="w-full" min={0} minFractionDigits={2} maxFractionDigits={2} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cost Price (₹)</label>
              <InputNumber value={form.cost_price} onValueChange={(e) => set("cost_price", e.value || 0)}
                className="w-full" min={0} minFractionDigits={2} maxFractionDigits={2} />
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-2 mb-4">
          <Checkbox inputId="is_active" checked={form.is_active} onChange={(e) => set("is_active", e.checked)} />
          <label htmlFor="is_active" className="font-medium">Active</label>
        </div>

        <div className="flex gap-3 justify-end">
          <Button label="Cancel" severity="secondary" outlined onClick={() => navigate("/products")} type="button" />
          <Button label={saving ? "Saving..." : "Save Product"} icon="pi pi-save" type="submit" disabled={saving} />
        </div>
      </form>
    </div>
  );
}

