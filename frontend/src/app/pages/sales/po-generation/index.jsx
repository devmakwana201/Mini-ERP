import { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { PurchaseOrdersService } from "services/reports/purchase/purchaseOrders";
import { acceptPO } from "redux/slice/salesOrderSlice";

const MOCK_ITEMS = [
  { id: 1, name: "Premium Basmati Rice", quantity: 50, rate: 85, total: 4250 },
  { id: 2, name: "Organic Wheat Flour", quantity: 200, rate: 45, total: 9000 },
];

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "cancelled", label: "Cancelled" },
];

export default function FromPOGenerationPage() {
  const toast = useRef(null);
  const dispatch = useDispatch();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [poStatuses, setPoStatuses] = useState({});
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    const fetchPOs = async () => {
      setIsLoading(true);
      try {
        const response = await PurchaseOrdersService.getPurchaseOrders({
          length: 50,
        });
        if (response.success) {
          setPurchaseOrders(response.data);
          const statuses = {};
          response.data.forEach((_, i) => {
            statuses[i] = "pending";
          });
          setPoStatuses(statuses);
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
    fetchPOs();
  }, []);

  const toggleCollapse = (idx) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleAction = (idx, po, action) => {
    setActionLoading(`${idx}-${action}`);
    setTimeout(() => {
      setPoStatuses((prev) => ({ ...prev, [idx]: action }));
      setActionLoading(null);

      if (action === "accepted") {
        // Dispatch to Redux — creates SO in Deliver Products
        dispatch(acceptPO({ po, items: MOCK_ITEMS }));
        toast.current?.show({
          severity: "success",
          summary: "PO Accepted ✓",
          detail: `Sales Order created from ${po.ordernumber}. Check Deliver Products.`,
          life: 4000,
        });
      } else {
        toast.current?.show({
          severity: "warn",
          summary: "PO Cancelled",
          detail: `${po.ordernumber} has been cancelled`,
        });
      }
    }, 900);
  };

  const allEntries = purchaseOrders.map((po, i) => ({ po, i }));
  const counts = {
    all: allEntries.length,
    pending: allEntries.filter(({ i }) => poStatuses[i] === "pending").length,
    accepted: allEntries.filter(({ i }) => poStatuses[i] === "accepted").length,
    cancelled: allEntries.filter(({ i }) => poStatuses[i] === "cancelled").length,
  };
  const visibleEntries =
    activeTab === "all"
      ? allEntries
      : allEntries.filter(({ i }) => poStatuses[i] === activeTab);

  const tabStyles = {
    pending: { active: "bg-amber-500 text-white border-amber-500" },
    accepted: { active: "bg-green-500 text-white border-green-500" },
    cancelled: { active: "bg-red-500 text-white border-red-500" },
    all: { active: "bg-primary-500 text-white border-primary-500" },
  };

  const renderPoCard = ({ po, i }) => {
    const status = poStatuses[i] || "pending";
    const isDone = status !== "pending";
    const isCollapsed = collapsedIds.has(i);
    const isAccepting = actionLoading === `${i}-accepted`;
    const isCancelling = actionLoading === `${i}-cancelled`;

    const borderColor =
      status === "accepted"
        ? "border-l-4 border-l-green-400"
        : status === "cancelled"
          ? "border-l-4 border-l-red-400"
          : "border-l-4 border-l-amber-400";

    return (
      <div
        key={i}
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
                {po.ordernumber}
              </p>
              <p className="text-sm text-gray-500">{po.supplier}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {status === "pending" && <Tag value="Pending" severity="warning" />}
            {status === "accepted" && <Tag value="Accepted" severity="success" />}
            {status === "cancelled" && <Tag value="Cancelled" severity="danger" />}
            <button
              onClick={() => toggleCollapse(i)}
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
                  {MOCK_ITEMS.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-50 last:border-0 dark:border-dark-700"
                    >
                      <td className="py-2.5 text-gray-700 dark:text-gray-300">{item.name}</td>
                      <td className="py-2.5 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
                      <td className="py-2.5 text-right text-gray-600 dark:text-gray-400">₹{item.rate}</td>
                      <td className="py-2.5 text-right font-semibold text-gray-800 dark:text-white">
                        ₹{item.total.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  onClick={() => handleAction(i, po, "cancelled")}
                />
                <Button
                  label={isAccepting ? "Accepting..." : "Accept"}
                  icon={isAccepting ? "pi pi-spin pi-spinner" : "pi pi-check"}
                  severity="success"
                  size="small"
                  disabled={!!actionLoading}
                  onClick={() => handleAction(i, po, "accepted")}
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
                  ? "Sales Order created — visible in Deliver Products"
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
