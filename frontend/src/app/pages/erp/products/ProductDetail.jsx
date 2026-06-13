import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { TabView, TabPanel } from "primereact/tabview";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { ProgressSpinner } from "primereact/progressspinner";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { ProductService } from "services/products/product.service";
import { InventoryService } from "services/inventory/inventory.service";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useRef(null);
  const [product, setProduct] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [adjustment, setAdjustment] = useState(0);
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true);
    const [pRes, lRes] = await Promise.all([
      ProductService.getById(id),
      InventoryService.getLedger(id),
    ]);
    if (pRes.success) setProduct(pRes.data.data);
    if (lRes.success) setLedger(lRes.data.data?.ledger || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleAdjust = async () => {
    if (!adjustment) return;
    const res = await ProductService.adjustStock(id, { adjustment, reason });
    if (res.success) {
      toast.current?.show({ severity: "success", summary: "Stock adjusted" });
      setAdjustDialog(false); setAdjustment(0); setReason("");
      load();
    } else {
      toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
    }
  };

  const txnTypeSeverity = (t) => ({ IN: "success", OUT: "danger", RESERVE: "warning", UNRESERVE: "info", ADJUST: "secondary" }[t] || "secondary");

  if (loading) return <div className="flex justify-center p-8"><ProgressSpinner /></div>;
  if (!product) return <div className="p-4 text-red-500">Product not found</div>;

  return (
    <div className="p-4">
      <Toast ref={toast} />

      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button icon="pi pi-arrow-left" text onClick={() => navigate("/products")} />
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{product.product_name}</h1>
            <p className="text-sm text-gray-500">{product.product_code} · {product.uom}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button label="Adjust Stock" icon="pi pi-sliders-h" outlined onClick={() => setAdjustDialog(true)} />
          <Button label="Edit" icon="pi pi-pencil" outlined onClick={() => navigate(`/products/${id}/edit`)} />
        </div>
      </div>

      {/* Stock Card */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: "On Hand", value: product.on_hand_qty, color: "text-blue-600" },
          { label: "Reserved", value: product.reserved_qty, color: "text-orange-500" },
          { label: "Free to Use", value: product.free_to_use_qty, color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm text-center">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{parseFloat(value || 0)}</p>
            <p className="text-xs text-gray-400">{product.uom}</p>
          </div>
        ))}
      </div>

      <TabView>
        <TabPanel header="Details">
          <div className="grid grid-cols-3 gap-4 text-sm">
            {[
              ["Type", product.product_type], ["Procurement", product.procurement_type],
              ["Strategy", product.procurement_strategy], ["Sales Price", `₹ ${parseFloat(product.sales_price || 0).toFixed(2)}`],
              ["Cost Price", `₹ ${parseFloat(product.cost_price || 0).toFixed(2)}`], ["Min Stock", product.min_stock_qty],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="font-medium text-gray-500">{label}</span>
                <p className="capitalize">{value || "-"}</p>
              </div>
            ))}
          </div>
        </TabPanel>

        <TabPanel header={`Vendors (${product.vendors?.length || 0})`}>
          <DataTable value={product.vendors || []} emptyMessage="No vendors linked" className="text-sm">
            <Column field="vendor_name" header="Vendor" />
            <Column field="unit_cost" header="Unit Cost" body={(r) => `₹ ${parseFloat(r.unit_cost || 0).toFixed(2)}`} />
            <Column field="lead_time_days" header="Lead Time" body={(r) => `${r.lead_time_days || 0} d`} />
            <Column header="Preferred" body={(r) => r.is_preferred ? <Tag value="★" severity="warning" /> : null} />
          </DataTable>
        </TabPanel>

        <TabPanel header={`Ledger (${ledger.length})`}>
          <DataTable value={ledger} emptyMessage="No transactions" className="text-sm" scrollable scrollHeight="400px">
            <Column field="created_at" header="Date" body={(r) => new Date(r.created_at).toLocaleString()} />
            <Column field="txn_type" header="Type" body={(r) => <Tag value={r.txn_type} severity={txnTypeSeverity(r.txn_type)} />} />
            <Column field="reference_type" header="Ref" body={(r) => `${r.reference_type}-${r.reference_id || ""}`} />
            <Column field="qty" header="Qty" />
            <Column field="qty_before" header="Before" />
            <Column field="qty_after" header="After" />
            <Column field="notes" header="Notes" />
          </DataTable>
        </TabPanel>
      </TabView>

      <Dialog header="Adjust Stock" visible={adjustDialog} onHide={() => setAdjustDialog(false)} style={{ width: "420px" }}>
        <div className="p-4 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Adjustment Qty (positive = add, negative = subtract)</label>
            <InputNumber value={adjustment} onValueChange={(e) => setAdjustment(e.value)} showButtons className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <InputText value={reason} onChange={(e) => setReason(e.target.value)} className="w-full" placeholder="e.g. Physical count correction" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button label="Cancel" outlined severity="secondary" onClick={() => setAdjustDialog(false)} />
            <Button label="Apply Adjustment" onClick={handleAdjust} disabled={!adjustment} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
