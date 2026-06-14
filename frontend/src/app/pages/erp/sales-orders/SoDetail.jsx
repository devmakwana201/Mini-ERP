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
import { Checkbox } from "primereact/checkbox";
import { SalesOrderService } from "services/transactions/transactions.service";

export default function SoDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useRef(null);

  const [so, setSo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [deliveryDialog, setDeliveryDialog] = useState(false);
  const [selectedLines, setSelectedLines] = useState([]);
  const [deliveryQties, setDeliveryQties] = useState({});

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    const res = await SalesOrderService.getById(id);
    if (res.success) {
      setSo(res.data);
      const initQties = {};
      (res.data.lines || []).forEach((l) => {
        initQties[l.sol_id] = Math.max(
          Number(l.qty) - Number(l.delivered_qty),
          0,
        );
      });
      setDeliveryQties(initQties);
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
    const res = await SalesOrderService.confirm(id);
    if (res.success) {
      toast.current?.show({
        severity: "success",
        summary: "Confirmed",
        detail: "Sales order confirmed",
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

  const handleDeliver = async () => {
    if (selectedLines.length === 0) {
      toast.current?.show({
        severity: "warn",
        summary: "Validation",
        detail: "Select lines to deliver",
      });
      return;
    }

    setDelivering(true);
    const delivery_lines = selectedLines.map((solId) => {
      const line = so.lines.find((item) => item.sol_id === solId);
      return {
        sol_id: solId,
        product_id: line.product_id,
        qty_to_deliver: Number(deliveryQties[solId]),
      };
    });

    const invalidLine = delivery_lines.find((line) => {
      const orderLine = so.lines.find((item) => item.sol_id === line.sol_id);
      const remainingQty =
        Number(orderLine.qty) - Number(orderLine.delivered_qty);
      return line.qty_to_deliver <= 0 || line.qty_to_deliver > remainingQty;
    });

    if (invalidLine) {
      toast.current?.show({
        severity: "warn",
        summary: "Validation",
        detail:
          "Delivery quantity must be greater than zero and within the remaining quantity",
      });
      setDelivering(false);
      return;
    }

    const res = await SalesOrderService.deliver(id, delivery_lines);
    if (res.success) {
      toast.current?.show({
        severity: "success",
        summary: "Delivered",
        detail: "Lines delivered successfully",
      });
      setDeliveryDialog(false);
      setSelectedLines([]);
      fetchDetail();
    } else {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: res.message,
      });
    }
    setDelivering(false);
  };

  const handleCancel = async () => {
    if (window.confirm("Are you sure? This will cancel the entire order.")) {
      setCancelling(true);
      const res = await SalesOrderService.cancel(id);
      if (res.success) {
        toast.current?.show({
          severity: "success",
          summary: "Cancelled",
          detail: "Sales order cancelled",
        });
        setTimeout(() => navigate("/erp/sales-orders"), 1000);
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
  if (!so) return <div className="p-4 text-center">Sales order not found</div>;

  const statusSeverity = {
    draft: "info",
    confirmed: "warning",
    in_progress: "primary",
    done: "success",
    cancelled: "danger",
  };

  return (
    <div className="mx-auto max-w-5xl p-4">
      <Toast ref={toast} />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            icon="pi pi-arrow-left"
            text
            onClick={() => navigate("/erp/sales-orders")}
          />
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
              {so.so_number}
            </h1>
            <p className="text-sm text-gray-500">
              Created {new Date(so.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Tag
          value={so.status}
          severity={statusSeverity[so.status] || "secondary"}
        />
      </div>

      <Card className="mb-4">
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase">
              Customer
            </label>
            <p className="text-lg font-medium">{so.customer_name}</p>
            <p className="text-xs text-gray-500">{so.customer_email}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase">
              Type
            </label>
            <Tag
              value={so.so_type}
              severity={so.so_type === "MTS" ? "info" : "success"}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase">
              Total Amount
            </label>
            <p className="text-lg font-bold">
              ₹
              {(so.total_amount || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        {so.delivery_date && (
          <div className="mb-4">
            <label className="block text-xs text-gray-500 uppercase">
              Delivery Date
            </label>
            <p className="text-lg">
              {new Date(so.delivery_date).toLocaleDateString()}
            </p>
          </div>
        )}

        {so.notes && (
          <div className="mb-4 rounded bg-gray-100 p-3 dark:bg-gray-900">
            <label className="mb-1 block text-xs text-gray-500 uppercase">
              Notes
            </label>
            <p className="text-sm">{so.notes}</p>
          </div>
        )}
      </Card>

      <Card title="Line Items" className="mb-4">
        <DataTable value={so.lines || []} className="text-sm">
          <Column
            field="product_code"
            header="Code"
            style={{ width: "80px" }}
          />
          <Column field="product_name" header="Product" />
          <Column
            field="qty"
            header="Qty Required"
            style={{ width: "100px" }}
          />
          <Column
            field="delivered_qty"
            header="Delivered"
            style={{ width: "80px" }}
          />
          <Column
            field="unit_price"
            header="Unit Price"
            style={{ width: "100px" }}
            body={(row) => (
              <span>
                ₹
                {(row.unit_price || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            )}
          />
          <Column
            header="Total"
            style={{ width: "120px" }}
            body={(row) => (
              <span className="font-medium">
                ₹
                {(
                  (row.qty || 0) * (row.unit_price || 0)
                ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            )}
          />
        </DataTable>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        {so.status === "draft" && (
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
              onClick={() => navigate(`/erp/sales-orders/${id}/edit`)}
            />
          </>
        )}
        {["confirmed", "in_progress"].includes(so.status) && (
          <Button
            label="Deliver"
            icon="pi pi-truck"
            loading={delivering}
            onClick={() => setDeliveryDialog(true)}
            className="p-button-info"
          />
        )}
        {(so.status === "draft" || so.status === "confirmed") && (
          <Button
            label="Cancel"
            icon="pi pi-times"
            severity="danger"
            loading={cancelling}
            onClick={handleCancel}
          />
        )}
        {so.status === "done" && (
          <Button
            label="View Audit"
            icon="pi pi-list"
            text
            severity="secondary"
          />
        )}
      </div>

      <Dialog
        header="Deliver Lines"
        visible={deliveryDialog}
        onHide={() => setDeliveryDialog(false)}
        modal
      >
        <div className="space-y-3">
          {(so.lines || []).map((line) => (
            <div
              key={line.sol_id}
              className="flex items-center gap-3 rounded border p-2"
            >
              <Checkbox
                checked={selectedLines.includes(line.sol_id)}
                disabled={Number(line.qty) <= Number(line.delivered_qty)}
                onChange={(e) => {
                  if (e.checked)
                    setSelectedLines([...selectedLines, line.sol_id]);
                  else
                    setSelectedLines(
                      selectedLines.filter((id) => id !== line.sol_id),
                    );
                }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{line.product_name}</p>
                <p className="text-xs text-gray-500">
                  Required: {line.qty} | Delivered: {line.delivered_qty}
                </p>
              </div>
              {selectedLines.includes(line.sol_id) && (
                <input
                  type="number"
                  value={deliveryQties[line.sol_id] || 0}
                  onChange={(e) =>
                    setDeliveryQties({
                      ...deliveryQties,
                      [line.sol_id]: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0.001"
                  step="0.001"
                  max={Number(line.qty) - Number(line.delivered_qty)}
                  className="w-20 rounded border px-2 py-1"
                  placeholder="Qty"
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            label="Cancel"
            severity="secondary"
            onClick={() => setDeliveryDialog(false)}
          />
          <Button
            label="Deliver"
            icon="pi pi-check"
            loading={delivering}
            onClick={handleDeliver}
          />
        </div>
      </Dialog>
    </div>
  );
}

