import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { ProgressSpinner } from "primereact/progressspinner";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { ManufacturingOrderService } from "services/transactions/transactions.service";

export default function MoDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useRef(null);

  const [mo, setMo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [reportDialog, setReportDialog] = useState(false);
  const [qtyCompleted, setQtyCompleted] = useState(0);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    const res = await ManufacturingOrderService.getById(id);
    if (res.success) {
      setMo(res.data.data);
      setQtyCompleted(res.data.data.qty_completed || 0);
    } else {
      toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    setConfirming(true);
    const res = await ManufacturingOrderService.confirm(id);
    if (res.success) {
      toast.current?.show({ severity: "success", summary: "Confirmed", detail: "Manufacturing order confirmed. BOM will be exploded." });
      fetchDetail();
    } else {
      toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
    }
    setConfirming(false);
  };

  const handleReportCompletion = async () => {
    if (qtyCompleted <= 0 || qtyCompleted > (mo.qty_planned || 0)) {
      toast.current?.show({ severity: "warn", summary: "Validation", detail: "Enter valid completion quantity" });
      return;
    }

    setReporting(true);
    const res = await ManufacturingOrderService.reportCompletion(id, { qty_completed: qtyCompleted });
    if (res.success) {
      toast.current?.show({ severity: "success", summary: "Reported", detail: "Production completion reported" });
      setReportDialog(false);
      fetchDetail();
    } else {
      toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
    }
    setReporting(false);
  };

  const handleCancel = async () => {
    if (window.confirm("Are you sure? This will cancel the entire order.")) {
      setCancelling(true);
      const res = await ManufacturingOrderService.cancel(id);
      if (res.success) {
        toast.current?.show({ severity: "success", summary: "Cancelled", detail: "Manufacturing order cancelled" });
        setTimeout(() => navigate("/manufacturing-orders"), 1000);
      } else {
        toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
      }
      setCancelling(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><ProgressSpinner /></div>;
  if (!mo) return <div className="p-4 text-center">Manufacturing order not found</div>;

  const statusSeverity = { draft: "info", confirmed: "warning", in_progress: "primary", done: "success", cancelled: "danger" };
  const progress = mo.qty_planned ? Math.round((mo.qty_completed / mo.qty_planned) * 100) : 0;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <Toast ref={toast} />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button icon="pi pi-arrow-left" text onClick={() => navigate("/manufacturing-orders")} />
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">{mo.mo_number}</h1>
            <p className="text-sm text-gray-500">Created {new Date(mo.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <Tag value={mo.status} severity={statusSeverity[mo.status] || "secondary"} />
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase">Product</label>
            <p className="text-lg font-medium">{mo.product_name}</p>
            <p className="text-xs text-gray-500">{mo.product_code}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase">Est. Cost</label>
            <p className="text-lg font-bold">₹{(mo.estimated_cost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase">Target Date</label>
            <p className="text-lg">{mo.target_date ? new Date(mo.target_date).toLocaleDateString() : "-"}</p>
          </div>
        </div>

        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Production Progress</label>
            <span className="text-sm font-bold">{mo.qty_completed || 0} / {mo.qty_planned} ({progress}%)</span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        {mo.notes && (
          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-900 rounded">
            <label className="block text-xs text-gray-500 uppercase mb-1">Notes</label>
            <p className="text-sm">{mo.notes}</p>
          </div>
        )}
      </Card>

      {mo.mo_components && mo.mo_components.length > 0 && (
        <Card title="BOM Components" className="mb-4">
          <DataTable value={mo.mo_components} className="text-sm">
            <Column field="component_code" header="Code" style={{ width: "80px" }} />
            <Column field="component_name" header="Component" />
            <Column field="qty_per_unit" header="Per Unit" style={{ width: "80px" }} />
            <Column field="qty_required" header="Required" style={{ width: "80px" }} />
            <Column field="qty_consumed" header="Consumed" style={{ width: "80px" }} />
            <Column header="Status" body={(row) => {
              const consumed = row.qty_consumed || 0;
              const required = row.qty_required || 0;
              if (consumed >= required) return <Tag value="Complete" severity="success" className="text-xs" />;
              if (consumed > 0) return <Tag value="Partial" severity="warning" className="text-xs" />;
              return <Tag value="Pending" severity="info" className="text-xs" />;
            }} />
          </DataTable>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 justify-end">
        {mo.status === "draft" && (
          <>
            <Button label="Confirm" icon="pi pi-check" loading={confirming}
              onClick={handleConfirm} className="p-button-success" />
            <Button label="Edit" icon="pi pi-pencil" text
              onClick={() => navigate(`/manufacturing-orders/${id}/edit`)} />
          </>
        )}
        {(mo.status === "confirmed" || mo.status === "in_progress") && (
          <Button label="Report Completion" icon="pi pi-check-circle" loading={reporting}
            onClick={() => setReportDialog(true)} className="p-button-info" />
        )}
        {(mo.status === "draft" || mo.status === "confirmed") && (
          <Button label="Cancel" icon="pi pi-times" severity="danger" loading={cancelling}
            onClick={handleCancel} />
        )}
        {mo.status === "done" && (
          <Button label="View Audit" icon="pi pi-list" text severity="secondary" />
        )}
      </div>

      <Dialog header="Report Production Completion" visible={reportDialog} onHide={() => setReportDialog(false)} modal>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">Quantity Completed</label>
            <InputNumber value={qtyCompleted} onChange={(e) => setQtyCompleted(e.value)}
              min={0} max={mo.qty_planned}
              placeholder="Enter completed quantity" />
            <p className="text-xs text-gray-500 mt-1">Planned: {mo.qty_planned} | Current: {mo.qty_completed || 0}</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <Button label="Cancel" severity="secondary" onClick={() => setReportDialog(false)} />
          <Button label="Report" icon="pi pi-check" loading={reporting}
            onClick={handleReportCompletion} />
        </div>
      </Dialog>
    </div>
  );
}
