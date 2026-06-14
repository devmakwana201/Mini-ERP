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
import { PurchaseOrderService } from "services/transactions/transactions.service";

export default function PoDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useRef(null);

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [receiveDialog, setReceiveDialog] = useState(false);
  const [selectedLines, setSelectedLines] = useState([]);
  const [receivedQties, setReceivedQties] = useState({});

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    const res = await PurchaseOrderService.getById(id);
    if (res.success) {
      setPo(res.data);
      const initQties = {};
      (res.data.lines || []).forEach((l) => {
        initQties[l.pol_id] = l.qty_required - (l.qty_received || 0);
      });
      setReceivedQties(initQties);
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
    const res = await PurchaseOrderService.confirm(id);
    if (res.success) {
      toast.current?.show({
        severity: "success",
        summary: "Confirmed",
        detail: "Purchase order confirmed",
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

  const handleReceive = async () => {
    if (selectedLines.length === 0) {
      toast.current?.show({
        severity: "warn",
        summary: "Validation",
        detail: "Select lines to receive",
      });
      return;
    }

    setReceiving(true);
    const receipt_lines = selectedLines.map((polId) => ({
      pol_id: polId,
      qty_received: receivedQties[polId] || 0,
    }));

    const res = await PurchaseOrderService.receive(id, receipt_lines);
    if (res.success) {
      toast.current?.show({
        severity: "success",
        summary: "Received",
        detail: "Lines received successfully",
      });
      setReceiveDialog(false);
      setSelectedLines([]);
      fetchDetail();
    } else {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: res.message,
      });
    }
    setReceiving(false);
  };

  const handleCancel = async () => {
    if (window.confirm("Are you sure? This will cancel the entire order.")) {
      setCancelling(true);
      const res = await PurchaseOrderService.cancel(id);
      if (res.success) {
        toast.current?.show({
          severity: "success",
          summary: "Cancelled",
          detail: "Purchase order cancelled",
        });
        setTimeout(() => navigate("/erp/purchase-orders"), 1000);
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
  if (!po)
    return <div className="p-4 text-center">Purchase order not found</div>;

  const statusSeverity = {
    draft: "info",
    confirmed: "warning",
    in_progress: "primary",
    received: "success",
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
            onClick={() => navigate("/erp/purchase-orders")}
          />
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
              {po.po_number}
            </h1>
            <p className="text-sm text-gray-500">
              Created {new Date(po.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Tag
          value={po.status}
          severity={statusSeverity[po.status] || "secondary"}
        />
      </div>

      <Card className="mb-4">
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase">
              Vendor
            </label>
            <p className="text-lg font-medium">{po.vendor_name}</p>
            <p className="text-xs text-gray-500">{po.vendor_email}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase">
              Total Amount
            </label>
            <p className="text-lg font-bold">
              ₹
              {(po.total_amount || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase">
              Expected Delivery
            </label>
            <p className="text-lg">
              {po.expected_delivery
                ? new Date(po.expected_delivery).toLocaleDateString()
                : "-"}
            </p>
          </div>
        </div>

        {po.payment_terms && (
          <div className="mb-4">
            <label className="block text-xs text-gray-500 uppercase">
              Payment Terms
            </label>
            <p className="text-lg">{po.payment_terms}</p>
          </div>
        )}

        {po.notes && (
          <div className="mb-4 rounded bg-gray-100 p-3 dark:bg-gray-900">
            <label className="mb-1 block text-xs text-gray-500 uppercase">
              Notes
            </label>
            <p className="text-sm">{po.notes}</p>
          </div>
        )}
      </Card>

      <Card title="Line Items" className="mb-4">
        <DataTable value={po.lines || []} className="text-sm">
          <Column
            field="product_code"
            header="Code"
            style={{ width: "80px" }}
          />
          <Column field="product_name" header="Product" />
          <Column
            field="qty_required"
            header="Qty Required"
            style={{ width: "100px" }}
          />
          <Column
            field="qty_received"
            header="Received"
            style={{ width: "80px" }}
          />
          <Column
            field="unit_cost"
            header="Unit Cost"
            style={{ width: "100px" }}
            body={(row) => (
              <span>
                ₹
                {(row.unit_cost || 0).toLocaleString("en-IN", {
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
                  (row.qty_required || 0) * (row.unit_cost || 0)
                ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            )}
          />
        </DataTable>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        {po.status === "draft" && (
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
              onClick={() => navigate(`/erp/purchase-orders/${id}/edit`)}
            />
          </>
        )}
        {po.status === "confirmed" && (
          <Button
            label="Receive"
            icon="pi pi-box"
            loading={receiving}
            onClick={() => setReceiveDialog(true)}
            className="p-button-info"
          />
        )}
        {(po.status === "draft" || po.status === "confirmed") && (
          <Button
            label="Cancel"
            icon="pi pi-times"
            severity="danger"
            loading={cancelling}
            onClick={handleCancel}
          />
        )}
        {po.status === "received" && (
          <Button
            label="View Audit"
            icon="pi pi-list"
            text
            severity="secondary"
          />
        )}
      </div>

      <Dialog
        header="Receive Lines"
        visible={receiveDialog}
        onHide={() => setReceiveDialog(false)}
        modal
      >
        <div className="space-y-3">
          {(po.lines || []).map((line) => {
            const outstanding =
              (line.qty_required || 0) - (line.qty_received || 0);
            return (
              <div
                key={line.pol_id}
                className="flex items-center gap-3 rounded border p-2"
              >
                <Checkbox
                  checked={selectedLines.includes(line.pol_id)}
                  onChange={(e) => {
                    if (e.checked)
                      setSelectedLines([...selectedLines, line.pol_id]);
                    else
                      setSelectedLines(
                        selectedLines.filter((id) => id !== line.pol_id),
                      );
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{line.product_name}</p>
                  <p className="text-xs text-gray-500">
                    Required: {line.qty_required} | Received:{" "}
                    {line.qty_received} | Outstanding: {outstanding}
                  </p>
                </div>
                {selectedLines.includes(line.pol_id) && (
                  <input
                    type="number"
                    value={receivedQties[line.pol_id] || 0}
                    onChange={(e) =>
                      setReceivedQties({
                        ...receivedQties,
                        [line.pol_id]: parseInt(e.target.value) || 0,
                      })
                    }
                    max={outstanding}
                    className="w-20 rounded border px-2 py-1"
                    placeholder="Qty"
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            label="Cancel"
            severity="secondary"
            onClick={() => setReceiveDialog(false)}
          />
          <Button
            label="Receive"
            icon="pi pi-check"
            loading={receiving}
            onClick={handleReceive}
          />
        </div>
      </Dialog>
    </div>
  );
}

