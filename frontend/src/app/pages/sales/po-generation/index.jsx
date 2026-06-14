import { useState, useRef, useEffect } from "react";
import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { PurchaseOrderService, SalesOrderService } from "services/transactions/transactions.service";

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "cancelled", label: "Cancelled" },
];

export default function FromPOGenerationPage() {
  const toast = useRef(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [poLines, setPoLines] = useState({});
  const [linesLoading, setLinesLoading] = useState({});

  const fetchPOs = async () => {
    setIsLoading(true);
    try {
      const response = await PurchaseOrderService.getAll({
        limit: 100,
      });
      if (response.success && response.data) {
        setPurchaseOrders(response.data);
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: response.message || "Failed to load purchase orders",
        });
      }
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to load purchase orders",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, []);

  const toggleCollapse = async (poId) => {
    const isCurrentlyCollapsed = !collapsedIds.has(poId);
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.has(poId) ? next.delete(poId) : next.add(poId);
      return next;
    });

    if (isCurrentlyCollapsed && !poLines[poId]) {
      setLinesLoading((prev) => ({ ...prev, [poId]: true }));
      try {
        const res = await PurchaseOrderService.getById(poId);
        if (res.success && res.data) {
          setPoLines((prev) => ({ ...prev, [poId]: res.data.lines || [] }));
        }
      } catch {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: "Failed to load purchase order details",
        });
      } finally {
        setLinesLoading((prev) => ({ ...prev, [poId]: false }));
      }
    }
  };

  const handleAccept = async (po) => {
    setActionLoading(`${po.po_id}-accepted`);
    try {
      const res = await SalesOrderService.createFromPO(po.po_id);
      if (res.success) {
        toast.current?.show({
          severity: "success",
          summary: "PO Accepted ✓",
          detail: `Sales Order ${res.data.so_number} created from ${po.po_number}. You can confirm/approve it in Sales Orders.`,
          life: 5000,
        });
        await fetchPOs();
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: res.message || "Failed to generate Sales Order",
        });
      }
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to generate Sales Order due to server or network error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (po) => {
    setActionLoading(`${po.po_id}-cancelled`);
    try {
      const res = await PurchaseOrderService.cancel(po.po_id);
      if (res.success) {
        toast.current?.show({
          severity: "warn",
          summary: "PO Cancelled",
          detail: `${po.po_number} has been cancelled`,
          life: 4000,
        });
        await fetchPOs();
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: res.message || "Failed to cancel PO",
        });
      }
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to cancel PO due to server or network error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getClientStatus = (po) => {
    if (po.status === "cancelled") return "cancelled";
    if (po.linked_so_id) return "accepted";
    return "pending";
  };

  const allEntries = purchaseOrders.map((po) => ({ po, status: getClientStatus(po) }));
  const counts = {
    all: allEntries.length,
    pending: allEntries.filter((e) => e.status === "pending").length,
    accepted: allEntries.filter((e) => e.status === "accepted").length,
    cancelled: allEntries.filter((e) => e.status === "cancelled").length,
  };
  const visibleEntries =
    activeTab === "all"
      ? allEntries
      : allEntries.filter((e) => e.status === activeTab);

  const tabStyles = {
    pending: { active: "bg-amber-500 text-white border-amber-500" },
    accepted: { active: "bg-green-500 text-white border-green-500" },
    cancelled: { active: "bg-red-500 text-white border-red-500" },
    all: { active: "bg-primary-500 text-white border-primary-500" },
  };

  const renderPoCard = ({ po, status }) => {
    const isDone = status !== "pending";
    const isCollapsed = !collapsedIds.has(po.po_id);
    const isAccepting = actionLoading === `${po.po_id}-accepted`;
    const isCancelling = actionLoading === `${po.po_id}-cancelled`;
    const lines = poLines[po.po_id] || [];
    const isLinesLoading = linesLoading[po.po_id];

    const borderColor =
      status === "accepted"
        ? "border-l-4 border-l-green-400"
        : status === "cancelled"
          ? "border-l-4 border-l-red-400"
          : "border-l-4 border-l-amber-400";

    return (
      <div
        key={po.po_id}
        className={`rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 dark:border-dark-600 dark:bg-dark-800 ${borderColor} ${isDone ? "opacity-75" : ""}`}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                status === "accepted"
                  ? "bg-green-50 dark:bg-green-900/20"
                  : status === "cancelled"
                    ? "bg-red-50 dark:bg-red-900/20"
                    : "bg-amber-50 dark:bg-amber-900/20"
              }`}
            >
              <i
                className={`pi ${
                  status === "accepted"
                    ? "pi-check-circle text-green-500"
                    : status === "cancelled"
                      ? "pi-times-circle text-red-500"
                      : "pi-file-edit text-amber-500"
                }`}
              />
            </div>
            <div>
              <p className="font-bold text-gray-800 dark:text-white">
                {po.po_number}
              </p>
              <p className="text-sm text-gray-500">{po.vendor_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {status === "pending" && <Tag value="Pending" severity="warning" />}
            {status === "accepted" && <Tag value="Accepted" severity="success" />}
            {status === "cancelled" && <Tag value="Cancelled" severity="danger" />}
            <button
              onClick={() => toggleCollapse(po.po_id)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700"
            >
              <i
                className={`pi pi-chevron-up text-xs transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Expanded Content */}
        {!isCollapsed && (
          <div className="border-t border-gray-100 dark:border-dark-700">
            <div className="px-5 py-4">
              {isLinesLoading ? (
                <div className="flex items-center justify-center py-6">
                  <i className="pi pi-spin pi-spinner text-primary-500 text-2xl" />
                </div>
              ) : lines.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400 dark:border-dark-700">
                      <th className="pb-2 text-left font-semibold">Product</th>
                      <th className="pb-2 text-right font-semibold">Qty</th>
                      <th className="pb-2 text-right font-semibold">Rate</th>
                      <th className="pb-2 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr
                        key={line.pol_id}
                        className="border-b border-gray-50 last:border-0 dark:border-dark-700"
                      >
                        <td className="py-2.5 text-gray-700 dark:text-gray-300">
                          {line.product_name} ({line.product_code})
                        </td>
                        <td className="py-2.5 text-right text-gray-600 dark:text-gray-400">
                          {parseFloat(line.qty_ordered)} {line.uom}
                        </td>
                        <td className="py-2.5 text-right text-gray-600 dark:text-gray-400">
                          ₹{parseFloat(line.unit_cost).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-gray-800 dark:text-white">
                          ₹{parseFloat(line.subtotal).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500 text-center py-4">No line items in this order.</p>
              )}
            </div>

            {/* Action Buttons */}
            {!isDone && (
              <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-dark-700">
                <Button
                  label={isCancelling ? "Cancelling..." : "Cancel"}
                  icon={isCancelling ? "pi pi-spin pi-spinner" : "pi pi-times"}
                  severity="danger"
                  outlined
                  size="small"
                  disabled={!!actionLoading}
                  onClick={() => handleCancel(po)}
                />
                <Button
                  label={isAccepting ? "Accepting..." : "Accept"}
                  icon={isAccepting ? "pi pi-spin pi-spinner" : "pi pi-check"}
                  severity="success"
                  size="small"
                  disabled={!!actionLoading}
                  onClick={() => handleAccept(po)}
                />
              </div>
            )}

            {isDone && (
              <div
                className={`flex items-center gap-2 px-5 py-3 text-xs ${
                  status === "accepted"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-500 dark:text-red-400"
                }`}
              >
                <i className={`pi ${status === "accepted" ? "pi-check-circle" : "pi-times-circle"}`} />
                {status === "accepted"
                  ? `Sales Order ${po.linked_so_number} created — confirm/approve it in Sales Orders`
                  : "This PO was cancelled"}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Page title="Generate Sales Order from PO">
      <Toast ref={toast} />
      <div className="flex flex-col gap-5 p-4 md:p-6">
        {/* Header Banner */}
        <div className="flex items-center justify-between rounded-xl border-l-4 border-primary-500 bg-white px-6 py-4 shadow-sm dark:bg-dark-800">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Purchase Orders</h2>
            <p className="text-sm text-gray-500">
              Accept POs to generate Sales Orders → Deliver Products → Invoice
            </p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-amber-500">{counts.pending}</p>
              <p className="text-xs text-gray-400">Pending</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">{counts.accepted}</p>
              <p className="text-xs text-gray-400">Accepted</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{counts.cancelled}</p>
              <p className="text-xs text-gray-400">Cancelled</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        {!isLoading && (
          <div className="flex gap-2 rounded-xl bg-white p-1.5 shadow-sm dark:bg-dark-800">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? tabStyles[tab.key].active
                      : "border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-700"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                      isActive ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500 dark:bg-dark-700"
                    }`}
                  >
                    {counts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <i className="pi pi-spin pi-spinner text-primary-500 text-4xl" />
          </div>
        )}

        {/* PO Cards */}
        {!isLoading && visibleEntries.length > 0 && (
          <div className="flex flex-col gap-4">{visibleEntries.map(renderPoCard)}</div>
        )}

        {/* Empty state */}
        {!isLoading && visibleEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white p-20 shadow-sm dark:border-dark-700 dark:bg-dark-800">
            <i
              className={`pi mb-4 text-6xl ${
                activeTab === "accepted"
                  ? "pi-check-circle text-green-400"
                  : activeTab === "cancelled"
                    ? "pi-times-circle text-red-400"
                    : "pi-inbox text-gray-300"
              }`}
            />
            <p className="font-semibold text-gray-600 dark:text-gray-400">
              {activeTab === "pending" ? "No Pending Orders"
                : activeTab === "accepted" ? "No Accepted Orders Yet"
                : activeTab === "cancelled" ? "No Cancelled Orders"
                : "No Purchase Orders"}
            </p>
            <p className="text-sm text-gray-400">
              {activeTab === "pending"
                ? "All purchase orders have been processed."
                : "Switch tabs to see other orders."}
            </p>
          </div>
        )}
      </div>
    </Page>
  );
}
