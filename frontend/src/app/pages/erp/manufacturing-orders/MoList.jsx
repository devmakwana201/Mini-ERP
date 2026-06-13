import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { SelectButton } from "primereact/selectbutton";
import { Calendar } from "primereact/calendar";
import { ManufacturingOrderService } from "services/transactions/transactions.service";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Confirmed", value: "confirmed" },
  { label: "In Progress", value: "in_progress" },
  { label: "Done", value: "done" },
  { label: "Cancelled", value: "cancelled" },
];

export default function MoList() {
  const navigate = useNavigate();
  const toast = useRef(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateRange, setDateRange] = useState([null, null]);

  const fetchOrders = async () => {
    setLoading(true);
    const params = { page, limit: 20, search, status };
    if (dateRange[0]) params.date_from = dateRange[0].toISOString().split("T")[0];
    if (dateRange[1]) params.date_to = dateRange[1].toISOString().split("T")[0];

    const res = await ManufacturingOrderService.getAll(params);
    if (res.success) {
      setOrders(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } else {
      toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [page, search, status, dateRange]);

  const statusBody = (row) => {
    const severityMap = { draft: "info", confirmed: "warning", in_progress: "primary", done: "success", cancelled: "danger" };
    return <Tag value={row.status} severity={severityMap[row.status] || "secondary"} className="text-xs" />;
  };

  const amountBody = (row) => (
    <span className="font-medium">₹{(row.estimated_cost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
  );

  const actionBody = (row) => (
    <Button icon="pi pi-eye" size="small" text
      onClick={() => navigate(`/manufacturing-orders/${row.mo_id}`)} />
  );

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Manufacturing Orders</h1>
          <p className="text-sm text-gray-500">{total} total</p>
        </div>
        <Button label="New Order" icon="pi pi-plus"
          onClick={() => navigate("/manufacturing-orders/new")} />
      </div>

      <div className="mb-3 flex flex-wrap gap-3 items-center">
        <SelectButton value={status} options={STATUS_OPTIONS}
          onChange={(e) => { setStatus(e.value || ""); setPage(1); }} />
        <Calendar selectionMode="range" rangeIcon
          value={dateRange} onChange={(e) => { setDateRange(e.value || [null, null]); setPage(1); }}
          className="w-64" placeholder="Date range" />
        <InputText placeholder="Search by MO#, product..."
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-64" />
      </div>

      <DataTable value={orders} loading={loading}
        emptyMessage="No manufacturing orders found"
        className="text-sm" stripedRows>
        <Column field="mo_number" header="MO#" />
        <Column field="product_name" header="Product" />
        <Column field="qty_planned" header="Qty Planned" style={{ width: "100px" }} />
        <Column field="qty_completed" header="Completed" style={{ width: "80px" }} />
        <Column field="estimated_cost" header="Est. Cost" body={amountBody} style={{ width: "120px" }} />
        <Column field="target_date" header="Target Date" style={{ width: "100px" }} />
        <Column header="Status" body={statusBody} style={{ width: "100px" }} />
        <Column header="" body={actionBody} style={{ width: "60px" }} />
      </DataTable>

      <div className="mt-3 flex gap-2 items-center text-sm text-gray-500">
        <Button icon="pi pi-chevron-left" size="small" text disabled={page <= 1}
          onClick={() => setPage(p => Math.max(1, p - 1))} />
        <span>Page {page}</span>
        <Button icon="pi pi-chevron-right" size="small" text disabled={orders.length < 20}
          onClick={() => setPage(p => p + 1)} />
      </div>
    </div>
  );
}
