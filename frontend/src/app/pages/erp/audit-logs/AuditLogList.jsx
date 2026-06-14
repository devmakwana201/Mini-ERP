import { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";
import { AuditLogService } from "services/inventory/inventory.service";

const ACTIONS = [
  { label: "All", value: "" },
  { label: "Insert", value: "INSERT" },
  { label: "Update", value: "UPDATE" },
  { label: "Delete", value: "DELETE" },
];

export default function AuditLogList() {
  const [logs, setLogs] = useState([]);
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const params = action ? { action } : {};
      const res = await AuditLogService.getAll(params);
      if (res.success) setLogs(res.data?.data || res.data || []);
      setLoading(false);
    };
    fetchLogs();
  }, [action]);

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Audit Logs</h1>
        <p className="text-sm text-gray-500">{logs.length} entries</p>
      </div>

      <div className="mb-3">
        <Dropdown value={action} options={ACTIONS} onChange={(e) => setAction(e.value || "")} className="w-44" />
      </div>

      <DataTable value={logs} loading={loading} emptyMessage="No audit logs found" stripedRows className="text-sm">
        <Column field="created_at" header="Date" />
        <Column field="table_name" header="Table" />
        <Column field="record_id" header="Record" />
        <Column header="Action" body={(row) => <Tag value={row.action} severity={row.action === "DELETE" ? "danger" : row.action === "UPDATE" ? "warning" : "success"} className="text-xs" />} />
        <Column field="user_name" header="User" />
        <Column field="ip_address" header="IP" />
      </DataTable>
    </div>
  );
}

