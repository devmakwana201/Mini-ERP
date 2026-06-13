import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Checkbox } from "primereact/checkbox";
import { Toast } from "primereact/toast";
import { Card } from "primereact/card";
import { ProgressSpinner } from "primereact/progressspinner";
import { PartnerService } from "services/partners/partner.service";

export default function PartnerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useRef(null);
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", city: "", state: "", country: "India",
    gstin: "", is_vendor: false, is_customer: false,
    lead_time_days: 0, payment_terms: "", is_active: true,
  });

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      PartnerService.getById(id).then((res) => {
        if (res.success) {
          const p = res.data.data;
          setForm({
            name: p.name || "", email: p.email || "", phone: p.phone || "",
            address: p.address || "", city: p.city || "", state: p.state || "",
            country: p.country || "India", gstin: p.gstin || "",
            is_vendor: Boolean(p.is_vendor), is_customer: Boolean(p.is_customer),
            lead_time_days: p.lead_time_days || 0, payment_terms: p.payment_terms || "",
            is_active: Boolean(p.is_active),
          });
        }
        setLoading(false);
      });
    }
  }, [id, isEdit]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.is_vendor && !form.is_customer) {
      toast.current?.show({ severity: "warn", summary: "Validation", detail: "Must be a Vendor, Customer, or both." });
      return;
    }
    setSaving(true);
    const res = isEdit
      ? await PartnerService.update(id, form)
      : await PartnerService.create(form);

    if (res.success) {
      toast.current?.show({ severity: "success", summary: "Saved", detail: "Partner saved successfully" });
      setTimeout(() => navigate("/partners"), 1000);
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
        <Button icon="pi pi-arrow-left" text onClick={() => navigate("/partners")} />
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
          {isEdit ? "Edit Partner" : "New Partner"}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card title="Partner Info" className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Name *</label>
              <InputText value={form.name} onChange={(e) => set("name", e.target.value)}
                className="w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <InputText value={form.email} onChange={(e) => set("email", e.target.value)}
                type="email" className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <InputText value={form.phone} onChange={(e) => set("phone", e.target.value)}
                className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">GSTIN</label>
              <InputText value={form.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())}
                className="w-full" maxLength={15} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Terms</label>
              <InputText value={form.payment_terms} onChange={(e) => set("payment_terms", e.target.value)}
                className="w-full" placeholder="e.g. Net 30" />
            </div>
          </div>
        </Card>

        <Card title="Address" className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Street Address</label>
              <InputText value={form.address} onChange={(e) => set("address", e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <InputText value={form.city} onChange={(e) => set("city", e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State</label>
              <InputText value={form.state} onChange={(e) => set("state", e.target.value)} className="w-full" />
            </div>
          </div>
        </Card>

        <Card title="Partner Role & Settings" className="mb-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox inputId="is_vendor" checked={form.is_vendor}
                  onChange={(e) => set("is_vendor", e.checked)} />
                <label htmlFor="is_vendor" className="font-medium">Is Vendor</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox inputId="is_customer" checked={form.is_customer}
                  onChange={(e) => set("is_customer", e.checked)} />
                <label htmlFor="is_customer" className="font-medium">Is Customer</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox inputId="is_active" checked={form.is_active}
                  onChange={(e) => set("is_active", e.checked)} />
                <label htmlFor="is_active" className="font-medium">Active</label>
              </div>
            </div>
            {form.is_vendor && (
              <div>
                <label className="block text-sm font-medium mb-1">Lead Time (days)</label>
                <InputText type="number" min="0" value={form.lead_time_days}
                  onChange={(e) => set("lead_time_days", parseInt(e.target.value) || 0)}
                  className="w-32" />
              </div>
            )}
          </div>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button label="Cancel" severity="secondary" outlined onClick={() => navigate("/partners")} type="button" />
          <Button label={saving ? "Saving..." : "Save Partner"} icon="pi pi-save"
            type="submit" disabled={saving} />
        </div>
      </form>
    </div>
  );
}
