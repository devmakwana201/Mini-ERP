import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Toast } from "primereact/toast";
import { Card } from "primereact/card";
import { ProgressSpinner } from "primereact/progressspinner";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputTextarea } from "primereact/inputtextarea";
import { ManufacturingOrderService } from "services/transactions/transactions.service";
import { ProductService } from "services/products/product.service";
import { BomService } from "services/master-records/bom.service";

export default function MoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useRef(null);
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [boms, setBoms] = useState([]);

  const [form, setForm] = useState({
    product_id: null,
    qty_planned: null,
    target_date: null,
    notes: "",
    mo_components: [],
  });

  useEffect(() => {
    Promise.all([
      ProductService.getAll({ limit: 1000 }).then(r => {
        if (r.success) setProducts(r.data.data || []);
      }),
      BomService.getAll({ limit: 1000 }).then(r => {
        if (r.success) setBoms(r.data.data || []);
      }),
    ]);

    if (isEdit) {
      setLoading(true);
      ManufacturingOrderService.getById(id).then((res) => {
        if (res.success) {
          const mo = res.data.data;
          setForm({
            product_id: mo.product_id,
            qty_planned: mo.qty_planned,
            target_date: mo.target_date ? new Date(mo.target_date) : null,
            notes: mo.notes || "",
            mo_components: mo.mo_components || [],
          });
        }
        setLoading(false);
      });
    }
  }, [id, isEdit]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleProductChange = async (productId) => {
    set("product_id", productId);

    const product = products.find(p => p.product_id === productId);
    if (product && product.bom_id) {
      const bomRes = await BomService.getById(product.bom_id);
      if (bomRes.success) {
        const bomItems = (bomRes.data.data.bom_items || []).map(item => ({
          ...item,
          qty_required: (item.qty_per_unit || 1) * (form.qty_planned || 1),
        }));
        setForm(f => ({ ...f, mo_components: bomItems }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_id || !form.qty_planned) {
      toast.current?.show({ severity: "warn", summary: "Validation", detail: "Select product and quantity" });
      return;
    }
    if (form.mo_components.length === 0) {
      toast.current?.show({ severity: "warn", summary: "Note", detail: "No BOM components. MO will be created with empty components." });
    }

    setSaving(true);
    const payload = {
      ...form,
      target_date: form.target_date ? form.target_date.toISOString().split("T")[0] : null,
    };

    const res = isEdit
      ? await ManufacturingOrderService.update(id, payload)
      : await ManufacturingOrderService.create(payload);

    if (res.success) {
      toast.current?.show({ severity: "success", summary: "Saved", detail: "Manufacturing order saved" });
      setTimeout(() => navigate("/manufacturing-orders"), 1000);
    } else {
      toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center p-8"><ProgressSpinner /></div>;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <Toast ref={toast} />
      <div className="mb-4 flex items-center gap-3">
        <Button icon="pi pi-arrow-left" text onClick={() => navigate("/manufacturing-orders")} />
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
          {isEdit ? "Edit Manufacturing Order" : "New Manufacturing Order"}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card title="Order Info" className="mb-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Product</label>
              <Dropdown value={form.product_id} options={products}
                optionLabel="product_name" optionValue="product_id"
                onChange={(e) => handleProductChange(e.value)}
                placeholder="Select product" filter />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Qty to Produce</label>
              <InputNumber value={form.qty_planned}
                onChange={(e) => set("qty_planned", e.value)}
                placeholder="Quantity" useGrouping={false} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Target Date</label>
              <Calendar value={form.target_date}
                onChange={(e) => set("target_date", e.value)}
                showIcon dateFormat="dd/mm/yy" />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Notes</label>
            <InputTextarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
              rows={3} placeholder="Special instructions..." />
          </div>
        </Card>

        {form.mo_components.length > 0 && (
          <Card title="BOM Components (Auto-calculated)" className="mb-4">
            <DataTable value={form.mo_components} className="text-xs">
              <Column field="component_code" header="Code" style={{ width: "80px" }} />
              <Column field="component_name" header="Component" />
              <Column field="qty_per_unit" header="Per Unit" style={{ width: "80px" }} />
              <Column field="qty_required" header="Total Required" style={{ width: "100px" }} />
              <Column field="uom" header="UOM" style={{ width: "60px" }} />
            </DataTable>
            <p className="text-xs text-gray-500 mt-2">
              Components are auto-calculated from BOM based on production quantity
            </p>
          </Card>
        )}

        <div className="flex gap-2 justify-end">
          <Button label="Cancel" severity="secondary" onClick={() => navigate("/manufacturing-orders")} />
          <Button label={isEdit ? "Update" : "Create"} icon="pi pi-check"
            loading={saving} onClick={handleSubmit} />
        </div>
      </form>
    </div>
  );
}
