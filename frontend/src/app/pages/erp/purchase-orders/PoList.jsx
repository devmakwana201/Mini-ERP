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
import { PurchaseOrderService } from "services/transactions/transactions.service";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Confirmed", value: "confirmed" },
  { label: "In Progress", value: "in_progress" },
  { label: "Received", value: "received" },
  { label: "Cancelled", value: "cancelled" },
];

export default function PoList() {
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
    if (dateRange[0])
      params.date_from = dateRange[0].toISOString().split("T")[0];
    if (dateRange[1]) params.date_to = dateRange[1].toISOString().split("T")[0];

    const res = await PurchaseOrderService.getAll(params);
    if (res.success) {
      setOrders(res.data || []);
      setTotal(res.pagination?.total || 0);
    } else {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: res.message,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [page, search, status, dateRange]);

  const statusBody = (row) => {
    const severityMap = {
      draft: "info",
      confirmed: "warning",
      in_progress: "primary",
      received: "success",
      cancelled: "danger",
    };
    return (
      <Tag
        value={row.status}
        severity={severityMap[row.status] || "secondary"}
        className="text-xs"
      />
    );
  };

  const amountBody = (row) => (
    <span className="font-medium">
      ₹
      {(row.total_amount || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      })}
    </span>
  );

  const actionBody = (row) => (
    <Button
      icon="pi pi-eye"
      size="small"
      text
      onClick={() => navigate(`/purchase-orders/${row.po_id}`)}
    />
  );

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Purchase Orders
          </h1>
          <p className="text-sm text-gray-500">{total} total</p>
        </div>
        <Button
          label="New Order"
          icon="pi pi-plus"
          onClick={() => navigate("/purchase-orders/new")}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <SelectButton
          value={status}
          options={STATUS_OPTIONS}
          onChange={(e) => {
            setStatus(e.value || "");
            setPage(1);
          }}
        />
        <Calendar
          selectionMode="range"
          rangeIcon
          value={dateRange}
          onChange={(e) => {
            setDateRange(e.value || [null, null]);
            setPage(1);
          }}
          className="w-64"
          placeholder="Date range"
        />
        <InputText
          placeholder="Search by PO#, vendor..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-64"
        />
      </div>

      <DataTable
        value={orders}
        loading={loading}
        emptyMessage="No purchase orders found"
        className="text-sm"
        stripedRows
      >
        <Column field="po_number" header="PO#" />
        <Column field="vendor_name" header="Vendor" />
        <Column field="line_count" header="Lines" style={{ width: "60px" }} />
        <Column
          field="total_amount"
          header="Amount"
          body={amountBody}
          style={{ width: "120px" }}
        />
        <Column
          field="expected_delivery"
          header="Expected Delivery"
          style={{ width: "120px" }}
        />
        <Column header="Status" body={statusBody} style={{ width: "100px" }} />
        <Column header="" body={actionBody} style={{ width: "60px" }} />
      </DataTable>

      <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
        <Button
          icon="pi pi-chevron-left"
          size="small"
          text
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        />
        <span>Page {page}</span>
        <Button
          icon="pi pi-chevron-right"
          size="small"
          text
          disabled={orders.length < 20}
          onClick={() => setPage((p) => p + 1)}
        />
      </div>
    </div>
  );
}

