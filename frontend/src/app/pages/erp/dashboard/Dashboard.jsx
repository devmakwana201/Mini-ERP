import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { Tag } from "primereact/tag";
import { ProgressBar } from "primereact/progressbar";
import { DashboardService } from "services/inventory/inventory.service";
import { SalesOrderService, PurchaseOrderService, ManufacturingOrderService } from "services/transactions/transactions.service";

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useRef(null);
  const [summary, setSummary] = useState(null);
  const [soStats, setSoStats] = useState(null);
  const [poStats, setPoStats] = useState(null);
  const [moStats, setMoStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [sumRes, soRes, poRes, moRes, invRes] = await Promise.all([
      DashboardService.getSummary(),
      SalesOrderService.getStats(),
      PurchaseOrderService.getStats(),
      ManufacturingOrderService.getStats(),
      DashboardService.getInventorySummary(),
    ]);
    if (sumRes.success) setSummary(sumRes.data?.data || sumRes.data);
    if (soRes.success) setSoStats(soRes.data?.data || soRes.data);
    if (poRes.success) setPoStats(poRes.data?.data || poRes.data);
    if (moRes.success) setMoStats(moRes.data?.data || moRes.data);
    if (invRes.success) setLowStock(invRes.data?.data || invRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const v = (obj, path, fallback = 0) =>
    path.split(".").reduce((o, k) => o?.[k], obj) ?? fallback;

  const kpis = [
    { label: "Total Sales Orders", value: v(soStats, "total", 0), icon: "pi pi-shopping-cart", color: "from-violet-500 to-purple-600", path: "/sales-orders" },
    { label: "Open SO (Pending)", value: v(soStats, "open", 0) + v(soStats, "confirmed", 0), icon: "pi pi-clock", color: "from-amber-400 to-orange-500", path: "/sales-orders" },
    { label: "Pending Purchase Orders", value: v(poStats, "pending", 0) + v(poStats, "sent", 0), icon: "pi pi-truck", color: "from-cyan-500 to-blue-600", path: "/purchase-orders" },
    { label: "Active Manufacturing", value: v(moStats, "in_progress", 0) + v(moStats, "confirmed", 0), icon: "pi pi-cog", color: "from-emerald-500 to-green-600", path: "/manufacturing-orders" },
  ];

  const stockHealth = lowStock.filter ? {
    lowCount: lowStock.filter(r => parseFloat(r.free_to_use_qty || 0) <= parseFloat(r.min_stock_qty || 0)).length,
    outOfStock: lowStock.filter(r => parseFloat(r.on_hand_qty || 0) === 0).length,
    total: lowStock.length,
  } : { lowCount: 0, outOfStock: 0, total: 0 };

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">ERP Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Shiv Furniture Works — real-time overview</p>
        </div>
        <Button icon="pi pi-refresh" text loading={loading} onClick={load} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
        {kpis.map(({ label, value, icon, color, path }) => (
          <div key={label}
            onClick={() => navigate(path)}
            className={`cursor-pointer rounded-2xl bg-gradient-to-br ${color} p-4 text-white shadow-md hover:shadow-lg transition-shadow`}>
            <div className="flex items-start justify-between">
              <i className={`${icon} text-2xl opacity-80`} />
              <span className="text-4xl font-bold">{value}</span>
            </div>
            <p className="mt-3 text-xs font-medium opacity-90">{label}</p>
          </div>
        ))}
      </div>

      {/* Middle Row: Stock Health + Recent Activity */}
      <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-3">
        {/* Stock Health Card */}
        <div className="col-span-1 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 dark:text-white">Inventory Health</h2>
            <Tag value={stockHealth.lowCount > 0 ? "NEEDS ATTENTION" : "HEALTHY"}
              severity={stockHealth.lowCount > 0 ? "danger" : "success"} className="text-xs" />
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Low Stock Products</span>
                <span className="font-semibold text-orange-500">{stockHealth.lowCount}</span>
              </div>
              <ProgressBar value={stockHealth.total ? Math.round((stockHealth.lowCount / Math.max(stockHealth.total, 1)) * 100) : 0}
                style={{ height: "6px" }} className="[&_.p-progressbar-value]:bg-orange-400" showValue={false} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Out of Stock</span>
                <span className="font-semibold text-red-500">{stockHealth.outOfStock}</span>
              </div>
              <ProgressBar value={stockHealth.total ? Math.round((stockHealth.outOfStock / Math.max(stockHealth.total, 1)) * 100) : 0}
                style={{ height: "6px" }} className="[&_.p-progressbar-value]:bg-red-500" showValue={false} />
            </div>
          </div>
          <Button label="View All Products" text size="small" className="mt-3 w-full text-xs"
            onClick={() => navigate("/erp/products")} />
        </div>

        {/* SO Stats */}
        <div className="col-span-1 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-3">Sales Orders</h2>
          <div className="space-y-2 text-sm">
            {[["Draft", v(soStats,"draft",0), "secondary"],["Confirmed", v(soStats,"confirmed",0), "info"],
              ["In Progress", v(soStats,"in_progress",0), "warning"],["Done", v(soStats,"done",0), "success"],
              ["Cancelled", v(soStats,"cancelled",0), "danger"]].map(([label, val, sev]) => (
              <div key={label} className="flex items-center justify-between">
                <Tag value={label} severity={sev} className="text-xs" />
                <span className="font-bold text-gray-700 dark:text-gray-200">{val}</span>
              </div>
            ))}
          </div>
          <Button label="View Orders" text size="small" className="mt-3 w-full text-xs"
            onClick={() => navigate("/erp/sales-orders")} />
        </div>

        {/* MO Stats */}
        <div className="col-span-1 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-3">Manufacturing</h2>
          <div className="space-y-2 text-sm">
            {[["Draft", v(moStats,"draft",0), "secondary"],["Confirmed", v(moStats,"confirmed",0), "info"],
              ["In Progress", v(moStats,"in_progress",0), "warning"],["Done", v(moStats,"done",0), "success"],
              ["Cancelled", v(moStats,"cancelled",0), "danger"]].map(([label, val, sev]) => (
              <div key={label} className="flex items-center justify-between">
                <Tag value={label} severity={sev} className="text-xs" />
                <span className="font-bold text-gray-700 dark:text-gray-200">{val}</span>
              </div>
            ))}
          </div>
          <Button label="View MOs" text size="small" className="mt-3 w-full text-xs"
            onClick={() => navigate("/erp/manufacturing-orders")} />
        </div>
      </div>

      {/* Low Stock Alert Table */}
      {Array.isArray(lowStock) && lowStock.length > 0 && (
        <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm dark:border-red-900 dark:bg-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <i className="pi pi-exclamation-triangle text-red-500" />
            <h2 className="font-semibold text-red-700 dark:text-red-400">Low Stock Products — Action Required</h2>
          </div>
          <DataTable value={lowStock.filter(r => parseFloat(r.free_to_use_qty || 0) <= parseFloat(r.min_stock_qty || 0)).slice(0, 8)}
            className="text-sm" emptyMessage="All products healthy">
            <Column field="product_code" header="Code" />
            <Column field="product_name" header="Product" />
            <Column header="On Hand" body={(r) => <span className="font-semibold">{parseFloat(r.on_hand_qty || 0)} {r.uom}</span>} />
            <Column header="Reserved" body={(r) => <span className="text-orange-500">{parseFloat(r.reserved_qty || 0)}</span>} />
            <Column header="Free" body={(r) => <span className="text-red-500 font-bold">{parseFloat(r.free_to_use_qty || 0)}</span>} />
            <Column header="Min" body={(r) => parseFloat(r.min_stock_qty || 0)} />
            <Column header="" body={(r) => (
              <Button label="View" text size="small" onClick={() => navigate(`/erp/products/${r.product_id}`)} />
            )} />
          </DataTable>
        </div>
      )}
    </div>
  );
}
