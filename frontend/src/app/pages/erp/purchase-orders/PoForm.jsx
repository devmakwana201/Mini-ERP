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
import { PurchaseOrderService } from "services/transactions/transactions.service";
import { PartnerService } from "services/partners/partner.service";
import { ProductService } from "services/products/product.service";

export default function PoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useRef(null);
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);

  const [form, setForm] = useState({
    vendor_id: null,
    expected_date: null,
    payment_terms: "",
    notes: "",
    lines: [],
  });

  const [newLine, setNewLine] = useState({
    product_id: null,
    qty_ordered: null,
    unit_cost: null,
  });

  useEffect(() => {
    Promise.all([
      PartnerService.getVendors({ limit: 200 }).then((r) => {
        if (r.success) setVendors(r.data || []);
        else toast.current?.show({ severity: "error", summary: "Could not load vendors", detail: r.message });
      }),
      ProductService.getAll({ limit: 200 }).then((r) => {
        if (r.success) setProducts(r.data || []);
        else toast.current?.show({ severity: "error", summary: "Could not load products", detail: r.message });
      }),
    ]);

    if (isEdit) {
      setLoading(true);
      PurchaseOrderService.getById(id).then((res) => {
        if (res.success) {
          const po = res.data;
          setForm({
            vendor_id: po.vendor_id,
            expected_date: po.expected_date
              ? new Date(po.expected_date)
              : null,
            payment_terms: po.payment_terms || "",
            notes: po.notes || "",
            lines: (po.lines || []).map((l) => ({
              pol_id: l.pol_id,
              product_id: l.product_id,
              qty_ordered: l.qty_ordered,
              unit_cost: l.unit_cost,
            })),
          });
        }
        setLoading(false);
      });
    }
  }, [id, isEdit]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const setLine = (field, value) =>
    setNewLine((l) => ({ ...l, [field]: value }));

  const addLine = () => {
    if (
      !newLine.product_id ||
      !newLine.qty_ordered ||
      newLine.unit_cost === null
    ) {
      toast.current?.show({
        severity: "warn",
        summary: "Validation",
        detail: "Fill all line fields",
      });
      return;
    }
    const product = products.find((p) => p.product_id === newLine.product_id);
    setForm((f) => ({
      ...f,
      lines: [
        ...f.lines,
        {
          ...newLine,
          product_name: product?.product_name || "",
          product_code: product?.product_code || "",
        },
      ],
    }));
    setNewLine({ product_id: null, qty_ordered: null, unit_cost: null });
  };

  const removeLine = (idx) => {
    setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  };

  const calculateTotal = () => {
    return form.lines.reduce(
      (sum, l) => sum + (l.qty_ordered || 0) * (l.unit_cost || 0),
      0,
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendor_id) {
      toast.current?.show({
        severity: "warn",
        summary: "Validation",
        detail: "Select a vendor",
      });
      return;
    }
    if (form.lines.length === 0) {
      toast.current?.show({
        severity: "warn",
        summary: "Validation",
        detail: "Add at least one line item",
      });
      return;
    }

    setSaving(true);
    const payload = {
      vendor_id: form.vendor_id,
      notes: form.notes,
      expected_date: form.expected_date
        ? form.expected_date.toISOString().split("T")[0]
        : null,
      ...(!isEdit && {
        lines: form.lines.map((l) => ({
          product_id: l.product_id,
          qty_ordered: l.qty_ordered,
          unit_cost: l.unit_cost,
        })),
      }),
    };

    const res = isEdit
      ? await PurchaseOrderService.update(id, payload)
      : await PurchaseOrderService.create(payload);

    if (res.success) {
      toast.current?.show({
        severity: "success",
        summary: "Saved",
        detail: "Purchase order saved",
      });
      setTimeout(() => navigate("/erp/purchase-orders"), 1000);
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
          onClick={() => navigate("/erp/purchase-orders")}
        />
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
          {isEdit ? "Edit Purchase Order" : "New Purchase Order"}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card title="Order Info" className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Vendor</label>
              <Dropdown
                value={form.vendor_id}
                options={vendors}
                optionLabel="name"
                optionValue="partner_id"
                onChange={(e) => set("vendor_id", e.value)}
                placeholder="Select vendor"
                filter
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Expected Delivery
              </label>
              <Calendar
                value={form.expected_date}
                onChange={(e) => set("expected_date", e.value)}
                showIcon
                dateFormat="dd/mm/yy"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium">
              Payment Terms
            </label>
            <InputText
              value={form.payment_terms}
              onChange={(e) => set("payment_terms", e.target.value)}
              placeholder="e.g., Net 30, COD"
            />
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium">Notes</label>
            <InputTextarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Special instructions..."
            />
          </div>
        </Card>

        <Card title="Line Items" className="mb-4">
          <div className="mb-4 grid grid-cols-4 items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Product</label>
              <Dropdown
                value={newLine.product_id}
                options={products}
                optionLabel="product_name"
                optionValue="product_id"
                onChange={(e) => setLine("product_id", e.value)}
                placeholder="Select product"
                filter
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Qty</label>
              <InputNumber
                value={newLine.qty_ordered}
                onChange={(e) => setLine("qty_ordered", e.value)}
                placeholder="Quantity"
                useGrouping={false}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                Unit Cost
              </label>
              <InputNumber
                value={newLine.unit_cost}
                onChange={(e) => setLine("unit_cost", e.value)}
                prefix="₹"
                placeholder="Cost"
                mode="currency"
                currency="INR"
              />
            </div>
            <Button
              label="Add"
              icon="pi pi-plus"
              size="small"
              onClick={addLine}
            />
          </div>

          {form.lines.length > 0 && (
            <div className="mb-4">
              <DataTable value={form.lines} className="text-xs">
                <Column
                  field="product_code"
                  header="Code"
                  style={{ width: "80px" }}
                />
                <Column field="product_name" header="Product" />
                <Column
                  field="qty_ordered"
                  header="Qty"
                  style={{ width: "60px" }}
                />
                <Column
                  field="unit_cost"
                  header="Cost"
                  style={{ width: "80px" }}
                />
                <Column
                  header="Total"
                  style={{ width: "100px" }}
                  body={(row) => (
                    <span>
                      ₹
                      {(
                        (row.qty_ordered || 0) * (row.unit_cost || 0)
                      ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                />
                <Column
                  header=""
                  body={(row, { rowIndex }) => (
                    <Button
                      icon="pi pi-trash"
                      size="small"
                      text
                      severity="danger"
                      onClick={() => removeLine(rowIndex)}
                    />
                  )}
                  style={{ width: "60px" }}
                />
              </DataTable>

              <div className="mt-3 text-right">
                <span className="text-lg font-bold">
                  Total: ₹
                  {calculateTotal().toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          )}
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            label="Cancel"
            severity="secondary"
            onClick={() => navigate("/erp/purchase-orders")}
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

