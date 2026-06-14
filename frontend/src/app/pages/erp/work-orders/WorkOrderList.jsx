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
import { WorkOrderService } from "services/transactions/transactions.service";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Hold", value: "hold" },
];

export default function WorkOrderList() {
  const navigate = useNavigate();
  const toast = useRef(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateRange, setDateRange] = useState([null, null]);

  const fetchWorkOrders = async () => {
    setLoading(true);
    const params = { page, limit: 20, search, status };
    if (dateRange[0])
      params.date_from = dateRange[0].toISOString().split("T")[0];
    if (dateRange[1]) params.date_to = dateRange[1].toISOString().split("T")[0];

    const res = await WorkOrderService.getAll(params);
    if (res.success) {
      setWorkOrders(res.data || []);
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
    fetchWorkOrders();
  }, [page, search, status, dateRange]);

  const statusBody = (row) => {
    const severityMap = {
      pending: "info",
      in_progress: "warning",
      completed: "success",
      hold: "danger",
    };
    return (
      <Tag
        value={row.status}
        severity={severityMap[row.status] || "secondary"}
        className="text-xs"
      />
    );
  };

  const priorityBody = (row) => {
    const priorityMap = { high: "danger", medium: "warning", low: "info" };
    return (
      <Tag
        value={row.priority || "medium"}
        severity={priorityMap[row.priority] || "secondary"}
        className="text-xs"
      />
    );
  };

  const actionBody = (row) => (
    <Button
      icon="pi pi-eye"
      size="small"
      text
      onClick={() => navigate(`/erp/work-orders/${row.wo_id}`)}
    />
  );

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Work Orders
          </h1>
          <p className="text-sm text-gray-500">
            {total} total — auto-generated from MOs
          </p>
        </div>
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
          placeholder="Search by WO#, operation, equipment..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-80"
        />
      </div>

      <DataTable
        value={workOrders}
        loading={loading}
        emptyMessage="No work orders found"
        className="text-sm"
        stripedRows
      >
        <Column field="wo_number" header="WO#" />
        <Column field="mo_number" header="MO#" />
        <Column field="operation_name" header="Operation" />
        <Column field="equipment_name" header="Equipment" />
        <Column field="sequence" header="Seq" style={{ width: "50px" }} />
        <Column
          field="standard_minutes"
          header="Std. Time (min)"
          style={{ width: "100px" }}
        />
        <Column
          header="Priority"
          body={priorityBody}
          style={{ width: "80px" }}
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
          disabled={workOrders.length < 20}
          onClick={() => setPage((p) => p + 1)}
        />
      </div>
    </div>
  );
}

