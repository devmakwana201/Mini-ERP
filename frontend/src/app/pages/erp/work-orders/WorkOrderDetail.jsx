import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { ProgressSpinner } from "primereact/progressspinner";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { WorkOrderService } from "services/transactions/transactions.service";

export default function WorkOrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useRef(null);

  const [wo, setWo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [statusDialog, setStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    const res = await WorkOrderService.getById(id);
    if (res.success) {
      setWo(res.data);
      setNotes(res.data.notes || "");
    } else {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: res.message,
      });
    }
    setLoading(false);
  };

  const handleStatusChange = async () => {
    if (!newStatus) {
      toast.current?.show({
        severity: "warn",
        summary: "Validation",
        detail: "Select a status",
      });
      return;
    }

    setUpdating(true);
    const res = await WorkOrderService.updateStatus(id, {
      status: newStatus,
      notes,
    });
    if (res.success) {
      toast.current?.show({
        severity: "success",
        summary: "Updated",
        detail: "Work order status updated",
      });
      setStatusDialog(false);
      fetchDetail();
    } else {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: res.message,
      });
    }
    setUpdating(false);
  };

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <ProgressSpinner />
      </div>
    );
  if (!wo) return <div className="p-4 text-center">Work order not found</div>;

  const statusSeverity = {
    pending: "info",
    in_progress: "warning",
    completed: "success",
    hold: "danger",
  };
  const prioritySeverity = { high: "danger", medium: "warning", low: "info" };

  return (
    <div className="mx-auto max-w-5xl p-4">
      <Toast ref={toast} />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            icon="pi pi-arrow-left"
            text
            onClick={() => navigate("/work-orders")}
          />
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
              {wo.wo_number}
            </h1>
            <p className="text-sm text-gray-500">From MO: {wo.mo_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Tag
            value={wo.status}
            severity={statusSeverity[wo.status] || "secondary"}
          />
          {wo.priority && (
            <Tag
              value={wo.priority}
              severity={prioritySeverity[wo.priority] || "secondary"}
            />
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <Card title="Work Details">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500 uppercase">
                Operation
              </label>
              <p className="text-lg font-medium">{wo.operation_name}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500 uppercase">
                Equipment / Work Center
              </label>
              <p className="text-lg">
                {wo.equipment_name || wo.work_center_name || "-"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-gray-500 uppercase">
                  Sequence
                </label>
                <p className="text-lg font-bold">{wo.sequence}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500 uppercase">
                  Standard Time
                </label>
                <p className="text-lg">{wo.standard_minutes} min</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Product & Schedule">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500 uppercase">
                Product
              </label>
              <p className="text-lg font-medium">{wo.product_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-gray-500 uppercase">
                  Start Date
                </label>
                <p className="text-sm">
                  {wo.start_date
                    ? new Date(wo.start_date).toLocaleDateString()
                    : "-"}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500 uppercase">
                  Target Date
                </label>
                <p className="text-sm">
                  {wo.target_date
                    ? new Date(wo.target_date).toLocaleDateString()
                    : "-"}
                </p>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500 uppercase">
                Qty to Produce
              </label>
              <p className="text-lg font-bold">{wo.qty_planned}</p>
            </div>
          </div>
        </Card>
      </div>

      {wo.notes && (
        <Card title="Notes" className="mb-4">
          <p className="text-sm whitespace-pre-wrap">{wo.notes}</p>
        </Card>
      )}

      {wo.created_at && (
        <Card className="mb-4">
          <div className="space-y-1 text-xs text-gray-500">
            <p>Created: {new Date(wo.created_at).toLocaleString()}</p>
            {wo.updated_at && (
              <p>Updated: {new Date(wo.updated_at).toLocaleString()}</p>
            )}
            {wo.created_by_name && <p>By: {wo.created_by_name}</p>}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {wo.status !== "completed" && (
          <Button
            label={`Update Status${wo.status === "in_progress" ? " → Complete" : ""}`}
            icon="pi pi-pencil"
            onClick={() => {
              setNewStatus(
                wo.status === "in_progress" ? "completed" : "in_progress",
              );
              setStatusDialog(true);
            }}
          />
        )}
        {wo.status === "pending" && (
          <Button
            label="Start Work"
            icon="pi pi-play"
            className="p-button-info"
            onClick={() => {
              setNewStatus("in_progress");
              setStatusDialog(true);
            }}
          />
        )}
        <Button
          label="Back"
          icon="pi pi-arrow-left"
          text
          onClick={() => navigate("/work-orders")}
        />
      </div>

      <Dialog
        header="Update Work Order Status"
        visible={statusDialog}
        onHide={() => setStatusDialog(false)}
        modal
      >
        <div className="space-y-3">
          <div>
            <label className="mb-2 block text-sm font-medium">New Status</label>
            <div className="space-y-2">
              {["pending", "in_progress", "completed", "hold"].map((s) => (
                <div key={s} className="flex items-center">
                  <input
                    type="radio"
                    id={`status-${s}`}
                    name="status"
                    value={s}
                    checked={newStatus === s}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="mr-2"
                  />
                  <label
                    htmlFor={`status-${s}`}
                    className="cursor-pointer capitalize"
                  >
                    {s.replace("_", " ")}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Notes (optional)
            </label>
            <InputTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes about this status change..."
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            label="Cancel"
            severity="secondary"
            onClick={() => setStatusDialog(false)}
          />
          <Button
            label="Update"
            icon="pi pi-check"
            loading={updating}
            onClick={handleStatusChange}
          />
        </div>
      </Dialog>
    </div>
  );
}

