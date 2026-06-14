import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { ProcurementRuleService } from "services/inventory/inventory.service";

export default function ProcurementRuleList() {
  const navigate = useNavigate();
  const toast = useRef(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    const res = await ProcurementRuleService.getAll();
    if (res.success) setRules(res.data?.data || res.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const runCheck = async () => {
    const res = await ProcurementRuleService.runCheck();
    toast.current?.show({ severity: res.success ? "success" : "error", summary: res.success ? "Done" : "Error", detail: res.message || "Procurement check finished" });
  };

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Procurement Rules</h1>
          <p className="text-sm text-gray-500">{rules.length} rules</p>
        </div>
        <div className="flex gap-2">
          <Button label="Run Check" icon="pi pi-bolt" outlined onClick={runCheck} />
          <Button label="New Rule" icon="pi pi-plus" onClick={() => navigate("/erp/procurement-rules/new")} />
        </div>
      </div>

      <DataTable value={rules} loading={loading} emptyMessage="No procurement rules found" stripedRows className="text-sm">
        <Column field="product_code" header="Code" />
        <Column field="product_name" header="Product" />
        <Column field="strategy" header="Strategy" />
        <Column field="trigger_qty" header="Trigger Qty" />
        <Column field="order_qty" header="Order Qty" />
        <Column field="preferred_vendor_name" header="Vendor" />
        <Column header="Status" body={(row) => <Tag value={row.is_active ? "ACTIVE" : "INACTIVE"} severity={row.is_active ? "success" : "secondary"} className="text-xs" />} />
        <Column header="" body={(row) => <Button icon="pi pi-pencil" text size="small" onClick={() => navigate(`/procurement-rules/${row.rule_id}/edit`)} />} style={{ width: "60px" }} />
      </DataTable>
    </div>
  );
}

