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
import { SalesOrderService } from "services/transactions/transactions.service";
import { PartnerService } from "services/partners/partner.service";
import { ProductService } from "services/products/product.service";

export default function SoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useRef(null);
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [form, setForm] = useState({
    so_type: "MTS",
    customer_id: null,
    delivery_date: null,
    notes: "",
    lines: [],
  });

  const [newLine, setNewLine] = useState({
    product_id: null,
    qty_required: null,
    unit_price: null,
  });

  useEffect(() => {
    Promise.all([
      PartnerService.getCustomers({ limit: 200 }).then((r) => {
        if (r.success) setCustomers(r.data || []);
        else toast.current?.show({ severity: "error", summary: "Could not load customers", detail: r.message });
      }),
      ProductService.getAll({ limit: 200 }).then((r) => {
        if (r.success) setProducts(r.data || []);
        else toast.current?.show({ severity: "error", summary: "Could not load products", detail: r.message });
      }),
    ]);

    if (isEdit) {
      setLoading(true);
      SalesOrderService.getById(id).then((res) => {
        if (res.success) {
          const so = res.data;
          setForm({
            so_type: so.so_type || "MTS",
            customer_id: so.customer_id,
            delivery_date: so.delivery_date ? new Date(so.delivery_date) : null,
            notes: so.notes || "",
            lines: (so.lines || []).map((l) => ({
              sol_id: l.sol_id,
              product_id: l.product_id,
              qty_required: l.qty_required,
              unit_price: l.unit_price,
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
    if (!newLine.product_id || !newLine.qty_required || !newLine.unit_price) {
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
    setNewLine({ product_id: null, qty_required: null, unit_price: null });
  };

  const removeLine = (idx) => {
    setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  };

  const calculateTotal = () => {
    return form.lines.reduce(
      (sum, l) => sum + (l.qty_required || 0) * (l.unit_price || 0),
      0,
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_id) {
      toast.current?.show({
        severity: "warn",
        summary: "Validation",
        detail: "Select a customer",
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
      ...form,
      total_amount: calculateTotal(),
      delivery_date: form.delivery_date
        ? form.delivery_date.toISOString().split("T")[0]
        : null,
      lines: form.lines.map((l) => ({
        product_id: l.product_id,
        qty_required: l.qty_required,
        unit_price: l.unit_price,
      })),
    };

    const res = isEdit
      ? await SalesOrderService.update(id, payload)
      : await SalesOrderService.create(payload);

    if (res.success) {
      toast.current?.show({
        severity: "success",
        summary: "Saved",
        detail: "Sales order saved",
      });
      setTimeout(() => navigate("/erp/sales-orders"), 1000);
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
          onClick={() => navigate("/erp/sales-orders")}
        />
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
          {isEdit ? "Edit Sales Order" : "New Sales Order"}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card title="Order Info" className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Customer</label>
              <Dropdown
                value={form.customer_id}
                options={customers}
                optionLabel="name"
                optionValue="partner_id"
                onChange={(e) => set("customer_id", e.value)}
                placeholder="Select customer"
                filter
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Type (MTS/MTO)
              </label>
              <Dropdown
                value={form.so_type}
                options={[
                  { label: "Make to Stock", value: "MTS" },
                  { label: "Make to Order", value: "MTO" },
                ]}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => set("so_type", e.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Delivery Date
              </label>
              <Calendar
                value={form.delivery_date}
                onChange={(e) => set("delivery_date", e.value)}
                showIcon
                dateFormat="dd/mm/yy"
              />
            </div>
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
                value={newLine.qty_required}
                onChange={(e) => setLine("qty_required", e.value)}
                placeholder="Quantity"
                useGrouping={false}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                Unit Price
              </label>
              <InputNumber
                value={newLine.unit_price}
                onChange={(e) => setLine("unit_price", e.value)}
                prefix="₹"
                placeholder="Price"
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
                  field="qty_required"
                  header="Qty"
                  style={{ width: "60px" }}
                />
                <Column
                  field="unit_price"
                  header="Price"
                  style={{ width: "80px" }}
                />
                <Column
                  header="Total"
                  style={{ width: "100px" }}
                  body={(row) => (
                    <span>
                      ₹
                      {(
                        (row.qty_required || 0) * (row.unit_price || 0)
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
            onClick={() => navigate("/erp/sales-orders")}
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

