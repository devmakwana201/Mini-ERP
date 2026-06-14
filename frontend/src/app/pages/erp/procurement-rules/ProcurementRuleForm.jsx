import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputSwitch } from "primereact/inputswitch";
import { Toast } from "primereact/toast";
import { ProcurementRuleService } from "services/inventory/inventory.service";
import { ProductService } from "services/products/product.service";
import { PartnerService } from "services/partners/partner.service";

const STRATEGIES = [
  { label: "MTS", value: "MTS" },
  { label: "MTO", value: "MTO" },
  { label: "MTS/MTO", value: "MTS_MTO" },
];

export default function ProcurementRuleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useRef(null);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({
    product_id: null,
    strategy: "MTS",
    trigger_qty: 0,
    order_qty: 1,
    preferred_vendor_id: null,
    is_active: true,
  });

  useEffect(() => {
    const load = async () => {
      const [productRes, vendorRes, ruleRes] = await Promise.all([
        ProductService.getAll({ page: 1, limit: 100 }),
        PartnerService.getVendors({ page: 1, limit: 100 }),
        id ? ProcurementRuleService.getById(id) : Promise.resolve(null),
      ]);
      if (productRes.success) setProducts(productRes.data?.data || productRes.data || []);
      if (vendorRes.success) setVendors(vendorRes.data?.data || vendorRes.data || []);
      if (ruleRes?.success) setForm((prev) => ({ ...prev, ...ruleRes.data }));
    };
    load();
  }, [id]);

  const save = async () => {
    const payload = { ...form };
    const res = id ? await ProcurementRuleService.update(id, payload) : await ProcurementRuleService.create(payload);
    if (res.success) navigate("/procurement-rules");
    else toast.current?.show({ severity: "error", summary: "Error", detail: res.message || res.error?.message });
  };

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{id ? "Edit" : "New"} Procurement Rule</h1>
      </div>

      <div className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
        <Dropdown value={form.product_id} options={products} optionLabel="product_name" optionValue="product_id" filter placeholder="Product" onChange={(e) => setForm({ ...form, product_id: e.value })} />
        <Dropdown value={form.strategy} options={STRATEGIES} placeholder="Strategy" onChange={(e) => setForm({ ...form, strategy: e.value })} />
        <InputNumber value={Number(form.trigger_qty || 0)} min={0} placeholder="Trigger qty" onValueChange={(e) => setForm({ ...form, trigger_qty: e.value || 0 })} />
        <InputNumber value={Number(form.order_qty || 0)} min={0} placeholder="Order qty" onValueChange={(e) => setForm({ ...form, order_qty: e.value || 0 })} />
        <Dropdown value={form.preferred_vendor_id} options={vendors} optionLabel="name" optionValue="partner_id" filter showClear placeholder="Preferred vendor" onChange={(e) => setForm({ ...form, preferred_vendor_id: e.value })} />
        <div className="flex items-center gap-3">
          <InputSwitch checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.value })} />
          <span className="text-sm text-gray-600">Active</span>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <Button label="Save" icon="pi pi-check" onClick={save} />
        <Button label="Cancel" icon="pi pi-times" outlined onClick={() => navigate("/procurement-rules")} />
      </div>
    </div>
  );
}

