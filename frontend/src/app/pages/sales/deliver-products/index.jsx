import { useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import {
  selectConfirmedOrders,
  recordDelivery,
  generateInvoice,
} from "redux/slice/salesOrderSlice";

const STATUS_SEVERITY = {
  Confirmed: "info",
  "Partially Delivered": "warning",
  "Fully Delivered": "success",
  Invoiced: "success",
};

const TABS = [
  { key: "all", label: "All" },
  { key: "Confirmed", label: "Confirmed" },
  { key: "Partially Delivered", label: "Partially Delivered" },
  { key: "Fully Delivered", label: "Fully Delivered" },
  { key: "Invoiced", label: "Invoiced" },
];

export default function DeliverProductsPage() {
  const toast = useRef(null);
  const dispatch = useDispatch();
  const orders = useSelector(selectConfirmedOrders);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryDialog, setDeliveryDialog] = useState(false);
  const [deliveryItems, setDeliveryItems] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  const openDeliveryDialog = (order) => {
    setSelectedOrder(order);
    setDeliveryItems(
      order.items.map((item) => ({ ...item, currentDelivery: 0 })),
    );
    setDeliveryDialog(true);
  };

  const handleDelivery = () => {
    dispatch(
      recordDelivery({ soNumber: selectedOrder.soNumber, deliveryItems }),
    );
    setDeliveryDialog(false);
    toast.current.show({
      severity: "success",
      summary: "Delivery Recorded",
      detail: `Delivery updated for ${selectedOrder.soNumber}`,
    });
  };

  const handleGenerateInvoice = (order) => {
    dispatch(generateInvoice({ soNumber: order.soNumber }));
    toast.current.show({
      severity: "success",
      summary: "Invoice Generated ✓",
      detail: `Invoice created for ${order.soNumber}. View it in the Invoice section.`,
      life: 4000,
    });
  };

  const counts = TABS.reduce((acc, tab) => {
    acc[tab.key] =
      tab.key === "all"
        ? orders.length
        : orders.filter((o) => o.status === tab.key).length;
    return acc;
  }, {});

  const visibleOrders =
    activeTab === "all" ? orders : orders.filter((o) => o.status === activeTab);

  const renderOrderCard = (order) => {
    const isDone = order.status === "Fully Delivered" || order.status === "Invoiced";
    const canDeliver = ["Confirmed", "Partially Delivered"].includes(order.status);
    const canInvoice = order.status === "Fully Delivered" && !order.invoiceNumber;

    return (
      <div
        key={order.soNumber}
        className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
              <i className="pi pi-truck text-primary-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-800 dark:text-white">
                  {order.soNumber}
                </p>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-dark-700">
                  from {order.poNumber}
                </span>
              </div>
              <p className="text-sm text-gray-500">{order.supplier}</p>
              <p className="text-xs text-gray-400">Created: {order.createdAt}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Tag
              value={order.status}
              severity={STATUS_SEVERITY[order.status] || "info"}
            />
            {order.invoiceNumber && (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600 dark:bg-green-900/20 dark:text-green-400">
                {order.invoiceNumber}
              </span>
            )}
          </div>
        </div>

        {/* Items table */}
        <div className="border-t border-gray-100 px-5 py-3 dark:border-dark-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400 dark:border-dark-700">
                <th className="pb-2 text-left font-semibold">Product</th>
                <th className="pb-2 text-right font-semibold">Ordered</th>
                <th className="pb-2 text-right font-semibold">Delivered</th>
                <th className="pb-2 text-right font-semibold">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => {
                const remaining = item.quantity - item.delivered;
                return (
                  <tr
                    key={idx}
                    className="border-b border-gray-50 last:border-0 dark:border-dark-700"
                  >
                    <td className="py-2 text-gray-700 dark:text-gray-300">
                      {item.name}
                    </td>
                    <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                      {item.quantity}
                    </td>
                    <td className="py-2 text-right font-semibold text-green-600 dark:text-green-400">
                      {item.delivered}
                    </td>
                    <td
                      className={`py-2 text-right font-semibold ${remaining > 0 ? "text-amber-500" : "text-gray-400"}`}
                    >
                      {remaining > 0 ? remaining : "✓"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-dark-700">
          {canDeliver && (
            <Button
              label="Record Delivery"
              icon="pi pi-truck"
              size="small"
              severity="info"
              onClick={() => openDeliveryDialog(order)}
            />
          )}
          {canInvoice && (
            <Button
              label="Generate Invoice"
              icon="pi pi-file-export"
              size="small"
              severity="success"
              onClick={() => handleGenerateInvoice(order)}
            />
          )}
          {order.status === "Invoiced" && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
              <i className="pi pi-check-circle" />
              Invoice generated — view in Invoice section
            </span>
          )}
          {isDone && !canInvoice && order.status !== "Invoiced" && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <i className="pi pi-check-circle text-green-400" />
              Fully delivered. Ready to invoice.
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Page title="Deliver Products">
      <Toast ref={toast} />
      <div className="flex flex-col gap-5 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between rounded-xl border-l-4 border-primary-500 bg-white px-6 py-4 shadow-sm dark:bg-dark-800">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              Deliver Products
            </h2>
            <p className="text-sm text-gray-500">
              Track deliveries for Sales Orders generated from Purchase Orders
            </p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-500">
                {counts["Confirmed"] || 0}
              </p>
              <p className="text-xs text-gray-400">Confirmed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-500">
                {counts["Partially Delivered"] || 0}
              </p>
              <p className="text-xs text-gray-400">Partial</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">
                {counts["Fully Delivered"] || 0}
              </p>
              <p className="text-xs text-gray-400">Delivered</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 rounded-xl bg-white p-1.5 shadow-sm dark:bg-dark-800">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? "border-primary-500 bg-primary-500 text-white"
                    : "border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-700"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-gray-100 text-gray-500 dark:bg-dark-700"
                  }`}
                >
                  {counts[tab.key] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Orders */}
        {visibleOrders.length > 0 ? (
          <div className="flex flex-col gap-4">
            {visibleOrders.map(renderOrderCard)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white p-20 shadow-sm dark:border-dark-700 dark:bg-dark-800">
            <i className="pi pi-inbox mb-4 text-6xl text-gray-300" />
            <p className="font-semibold text-gray-600 dark:text-gray-400">
              No Orders Here
            </p>
            <p className="text-sm text-gray-400">
              Accept POs in "From PO Generation" to see Sales Orders here.
            </p>
          </div>
        )}
      </div>

      {/* Delivery Dialog */}
      <Dialog
        header={`Record Delivery — ${selectedOrder?.soNumber}`}
        visible={deliveryDialog}
        style={{ width: "50vw" }}
        onHide={() => setDeliveryDialog(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              text
              onClick={() => setDeliveryDialog(false)}
            />
            <Button
              label="Confirm Delivery"
              icon="pi pi-check"
              onClick={handleDelivery}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider text-gray-400">
                <th className="pb-2 text-left">Product</th>
                <th className="pb-2 text-center">Ordered</th>
                <th className="pb-2 text-center">Already Delivered</th>
                <th className="pb-2 text-center">Deliver Now</th>
              </tr>
            </thead>
            <tbody>
              {deliveryItems.map((item, idx) => (
                <tr key={idx} className="border-b py-2">
                  <td className="py-3">{item.name}</td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3 text-center text-green-600">
                    {item.delivered}
                  </td>
                  <td className="py-3 text-center">
                    <InputNumber
                      value={item.currentDelivery}
                      onValueChange={(e) => {
                        const newItems = [...deliveryItems];
                        newItems[idx] = {
                          ...newItems[idx],
                          currentDelivery: e.value || 0,
                        };
                        setDeliveryItems(newItems);
                      }}
                      max={item.quantity - item.delivered}
                      min={0}
                      className="w-24"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Dialog>
    </Page>
  );
}
