import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Toast } from "primereact/toast";
import { Card } from "primereact/card";
import { ProgressSpinner } from "primereact/progressspinner";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ManufacturingOrderService } from "services/transactions/transactions.service";
import { ProductService } from "services/products/product.service";
import { BomService } from "services/masters/bom.service";

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
    bom_id: null,
    mo_type: "MTS",
    qty_planned: null,
    scheduled_date: null,
    components: [],
  });

  useEffect(() => {
    Promise.all([
      ProductService.getAll({ limit: 200 }).then((r) => {
        if (r.success) setProducts(r.data || []);
        else toast.current?.show({ severity: "error", summary: "Could not load products", detail: r.message });
      }),
      BomService.getAll({ limit: 200 }).then((r) => {
        if (r.success) setBoms(r.data || []);
        else toast.current?.show({ severity: "error", summary: "Could not load BOMs", detail: r.message });
      }),
    ]);

    if (isEdit) {
      setLoading(true);
      ManufacturingOrderService.getById(id).then((res) => {
        if (res.success) {
          const mo = res.data;
          setForm({
            product_id: mo.product_id,
            bom_id: mo.bom_id,
            mo_type: mo.mo_type || "MTS",
            qty_planned: mo.qty_planned,
            scheduled_date: mo.scheduled_date
              ? new Date(mo.scheduled_date)
              : null,
            components: mo.components || [],
          });
        }
        setLoading(false);
      });
    }
  }, [id, isEdit]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const loadBom = async (bomId) => {
    if (!bomId) {
      setForm((f) => ({ ...f, bom_id: null, components: [] }));
      return;
    }

    const bomRes = await BomService.getById(bomId);
    if (bomRes.success) {
      setForm((f) => ({
        ...f,
        bom_id: bomId,
        components: bomRes.data?.lines || [],
      }));
    }
  };

  const handleProductChange = async (productId) => {
    const matchingBom = boms.find(
      (bom) => bom.product_id === productId && bom.is_active,
    );
    setForm((f) => ({
      ...f,
      product_id: productId,
      bom_id: matchingBom?.bom_id || null,
      components: [],
    }));
    if (matchingBom) await loadBom(matchingBom.bom_id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_id || !form.bom_id || !form.qty_planned) {
      toast.current?.show({
        severity: "warn",
        summary: "Validation",
        detail: "Select product, BOM, and quantity",
      });
      return;
    }
    setSaving(true);
    const payload = {
      qty_planned: form.qty_planned,
      scheduled_date: form.scheduled_date
        ? form.scheduled_date.toISOString().split("T")[0]
        : null,
      ...(!isEdit && {
        product_id: form.product_id,
        bom_id: form.bom_id,
        mo_type: form.mo_type,
      }),
    };

    const res = isEdit
      ? await ManufacturingOrderService.update(id, payload)
      : await ManufacturingOrderService.create(payload);

    if (res.success) {
      toast.current?.show({
        severity: "success",
        summary: "Saved",
        detail: "Manufacturing order saved",
      });
      setTimeout(() => navigate("/erp/manufacturing-orders"), 1000);
    } else {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: res.message,
      });
    }
    setSaving(false);
  };

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <ProgressSpinner />
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl p-4">
      <Toast ref={toast} />
      <div className="mb-4 flex items-center gap-3">
        <Button
          icon="pi pi-arrow-left"
          text
          onClick={() => navigate("/erp/manufacturing-orders")}
        />
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
          {isEdit ? "Edit Manufacturing Order" : "New Manufacturing Order"}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card title="Order Info" className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Product</label>
              <Dropdown
                value={form.product_id}
                options={products}
                optionLabel="product_name"
                optionValue="product_id"
                onChange={(e) => handleProductChange(e.value)}
                placeholder="Select product"
                filter
                disabled={isEdit}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">BOM</label>
              <Dropdown
                value={form.bom_id}
                options={boms.filter(
                  (bom) => !form.product_id || bom.product_id === form.product_id,
                )}
                optionLabel="bom_name"
                optionValue="bom_id"
                onChange={(e) => loadBom(e.value)}
                placeholder="Select BOM"
                disabled={!form.product_id || isEdit}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Manufacturing Type
              </label>
              <Dropdown
                value={form.mo_type}
                options={[
                  { label: "Make to Stock", value: "MTS" },
                  { label: "Make to Order", value: "MTO" },
                ]}
                onChange={(e) => set("mo_type", e.value)}
                disabled={isEdit}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Qty to Produce
              </label>
              <InputNumber
                value={form.qty_planned}
                onChange={(e) => set("qty_planned", e.value)}
                placeholder="Quantity"
                useGrouping={false}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Target Date
              </label>
              <Calendar
                value={form.scheduled_date}
                onChange={(e) => set("scheduled_date", e.value)}
                showIcon
                dateFormat="dd/mm/yy"
              />
            </div>
          </div>

        </Card>

        {form.components.length > 0 && (
          <Card title="BOM Components (Auto-calculated)" className="mb-4">
            <DataTable value={form.components} className="text-xs">
              <Column
                field="component_code"
                header="Code"
                style={{ width: "80px" }}
              />
              <Column field="component_name" header="Component" />
              <Column
                field="qty"
                header="Per Unit"
                style={{ width: "80px" }}
              />
              <Column
                header="Total Required"
                style={{ width: "100px" }}
                body={(row) =>
                  Number(row.qty || row.qty_planned || 0) *
                  Number(form.qty_planned || 0)
                }
              />
              <Column field="uom" header="UOM" style={{ width: "60px" }} />
            </DataTable>
            <p className="mt-2 text-xs text-gray-500">
              Components are auto-calculated from BOM based on production
              quantity
            </p>
          </Card>
        )}

        <div className="flex justify-end gap-2">
          <Button
            label="Cancel"
            severity="secondary"
            onClick={() => navigate("/erp/manufacturing-orders")}
          />
          <Button
            label={isEdit ? "Update" : "Create"}
            icon="pi pi-check"
            loading={saving}
            onClick={handleSubmit}
          />
        </div>
      </form>
    </div>
  );
}

