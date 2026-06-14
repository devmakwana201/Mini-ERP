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
  const [starting, setStarting] = useState(false);
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
      setMo(res.data);
      setQtyCompleted(
        Math.max(
          Number(res.data.qty_planned) - Number(res.data.qty_produced),
          0,
        ),
      );
    } else {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: res.message,
      });
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    setConfirming(true);
    const res = await ManufacturingOrderService.confirm(id);
    if (res.success) {
      toast.current?.show({
        severity: "success",
        summary: "Confirmed",
        detail: "Manufacturing order confirmed. BOM will be exploded.",
      });
      fetchDetail();
    } else {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: res.message,
      });
    }
    setConfirming(false);
  };

  const handleStart = async () => {
    setStarting(true);
    const res = await ManufacturingOrderService.start(id);
    if (res.success) {
      toast.current?.show({
        severity: "success",
        summary: "Started",
        detail: "Manufacturing order started",
      });
      fetchDetail();
    } else {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: res.message,
      });
    }
    setStarting(false);
  };

  const handleReportCompletion = async () => {
    const remaining = Number(mo.qty_planned) - Number(mo.qty_produced);
    if (qtyCompleted <= 0 || qtyCompleted > remaining) {
      toast.current?.show({
        severity: "warn",
        summary: "Validation",
        detail: "Enter valid completion quantity",
      });
      return;
    }

    setReporting(true);
    const res = await ManufacturingOrderService.produce(id, qtyCompleted);
    if (res.success) {
      toast.current?.show({
        severity: "success",
        summary: "Reported",
        detail: "Production completion reported",
      });
      setReportDialog(false);
      fetchDetail();
    } else {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: res.message,
      });
    }
    setReporting(false);
  };

  const handleCancel = async () => {
    if (window.confirm("Are you sure? This will cancel the entire order.")) {
      setCancelling(true);
      const res = await ManufacturingOrderService.cancel(id);
      if (res.success) {
        toast.current?.show({
          severity: "success",
          summary: "Cancelled",
          detail: "Manufacturing order cancelled",
        });
        setTimeout(() => navigate("/erp/manufacturing-orders"), 1000);
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: res.message,
        });
      }
      setCancelling(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <ProgressSpinner />
      </div>
    );
  if (!mo)
    return <div className="p-4 text-center">Manufacturing order not found</div>;

  const statusSeverity = {
    draft: "info",
    confirmed: "warning",
    in_progress: "primary",
    done: "success",
    cancelled: "danger",
  };
  const progress = mo.qty_planned
    ? Math.round((mo.qty_produced / mo.qty_planned) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-5xl p-4">
      <Toast ref={toast} />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            icon="pi pi-arrow-left"
            text
            onClick={() => navigate("/erp/manufacturing-orders")}
          />
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
              {mo.mo_number}
            </h1>
            <p className="text-sm text-gray-500">
              Created {new Date(mo.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Tag
          value={mo.status}
          severity={statusSeverity[mo.status] || "secondary"}
        />
      </div>

      <Card className="mb-4">
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase">
              Product
            </label>
            <p className="text-lg font-medium">{mo.product_name}</p>
            <p className="text-xs text-gray-500">{mo.product_code}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase">
              Est. Cost
            </label>
            <p className="text-lg font-bold">
              ₹
              {(mo.estimated_cost || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase">
              Target Date
            </label>
            <p className="text-lg">
              {mo.scheduled_date
                ? new Date(mo.scheduled_date).toLocaleDateString()
                : "-"}
            </p>
          </div>
        </div>

        <div className="mb-4 rounded bg-blue-50 p-3 dark:bg-blue-900/20">
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium">
              Production Progress
            </label>
            <span className="text-sm font-bold">
              {mo.qty_produced || 0} / {mo.qty_planned} ({progress}%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-300">
            <div
              className="h-2 rounded-full bg-blue-600"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {mo.notes && (
          <div className="mb-4 rounded bg-gray-100 p-3 dark:bg-gray-900">
            <label className="mb-1 block text-xs text-gray-500 uppercase">
              Notes
            </label>
            <p className="text-sm">{mo.notes}</p>
          </div>
        )}
      </Card>

      {mo.components && mo.components.length > 0 && (
        <Card title="BOM Components" className="mb-4">
          <DataTable value={mo.components} className="text-sm">
            <Column
              field="component_code"
              header="Code"
              style={{ width: "80px" }}
            />
            <Column field="component_name" header="Component" />
            <Column
              field="qty_planned"
              header="Required"
              style={{ width: "80px" }}
            />
            <Column
              field="qty_consumed"
              header="Consumed"
              style={{ width: "80px" }}
            />
            <Column
              header="Status"
              body={(row) => {
                const consumed = row.qty_consumed || 0;
                const required = row.qty_planned || 0;
                if (consumed >= required)
                  return (
                    <Tag
                      value="Complete"
                      severity="success"
                      className="text-xs"
                    />
                  );
                if (consumed > 0)
                  return (
                    <Tag
                      value="Partial"
                      severity="warning"
                      className="text-xs"
                    />
                  );
                return (
                  <Tag value="Pending" severity="info" className="text-xs" />
                );
              }}
            />
          </DataTable>
        </Card>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {mo.status === "draft" && (
          <>
            <Button
              label="Confirm"
              icon="pi pi-check"
              loading={confirming}
              onClick={handleConfirm}
              className="p-button-success"
            />
            <Button
              label="Edit"
              icon="pi pi-pencil"
              text
              onClick={() => navigate(`/erp/manufacturing-orders/${id}/edit`)}
            />
          </>
        )}
        {mo.status === "confirmed" && (
          <Button
            label="Start"
            icon="pi pi-play"
            loading={starting}
            onClick={handleStart}
            className="p-button-info"
          />
        )}
        {mo.status === "in_progress" && (
          <Button
            label="Report Completion"
            icon="pi pi-check-circle"
            loading={reporting}
            onClick={() => setReportDialog(true)}
            className="p-button-info"
          />
        )}
        {(mo.status === "draft" || mo.status === "confirmed") && (
          <Button
            label="Cancel"
            icon="pi pi-times"
            severity="danger"
            loading={cancelling}
            onClick={handleCancel}
          />
        )}
        {mo.status === "done" && (
          <Button
            label="View Audit"
            icon="pi pi-list"
            text
            severity="secondary"
          />
        )}
      </div>

      <Dialog
        header="Report Production Completion"
        visible={reportDialog}
        onHide={() => setReportDialog(false)}
        modal
      >
        <div className="space-y-3">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Quantity Completed
            </label>
            <InputNumber
              value={qtyCompleted}
              onChange={(e) => setQtyCompleted(e.value)}
              min={0}
              max={Number(mo.qty_planned) - Number(mo.qty_produced)}
              placeholder="Enter completed quantity"
            />
            <p className="mt-1 text-xs text-gray-500">
              Planned: {mo.qty_planned} | Produced: {mo.qty_produced || 0}
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            label="Cancel"
            severity="secondary"
            onClick={() => setReportDialog(false)}
          />
          <Button
            label="Report"
            icon="pi pi-check"
            loading={reporting}
            onClick={handleReportCompletion}
          />
        </div>
      </Dialog>
    </div>
  );
}

