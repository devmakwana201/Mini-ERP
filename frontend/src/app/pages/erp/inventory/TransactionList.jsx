import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";
import { InventoryService } from "services/inventory/inventory.service";

const rowsFrom = (res) => res?.data?.data || res?.data || [];

const TXN_TYPES = [
  { label: "All", value: "" },
  { label: "IN", value: "IN" },
  { label: "OUT", value: "OUT" },
  { label: "RESERVE", value: "RESERVE" },
  { label: "UNRESERVE", value: "UNRESERVE" },
  { label: "ADJUST", value: "ADJUST" },
];

export default function TransactionList() {
  const [transactions, setTransactions] = useState([]);
  const [txnType, setTxnType] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    const params = { page: 1, limit: 50 };
    if (txnType) params.txn_type = txnType;
    const res = await InventoryService.getTransactions(params);
    if (res.success) setTransactions(rowsFrom(res));
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, [txnType]);

  const typeBody = (row) => {
    const severity = row.txn_type === "IN" ? "success" : row.txn_type === "OUT" ? "danger" : row.txn_type === "ADJUST" ? "warning" : "info";
    return <Tag value={row.txn_type} severity={severity} className="text-xs" />;
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Inventory Transactions</h1>
          <p className="text-sm text-gray-500">{transactions.length} movements</p>
        </div>
        <Button icon="pi pi-refresh" text onClick={fetchTransactions} />
      </div>

      <div className="mb-3">
        <Dropdown value={txnType} options={TXN_TYPES} onChange={(e) => setTxnType(e.value || "")} className="w-48" />
      </div>

      <DataTable value={transactions} loading={loading} emptyMessage="No transactions found" stripedRows className="text-sm">
        <Column field="created_at" header="Date" />
        <Column field="product_code" header="Code" />
        <Column field="product_name" header="Product" />
        <Column header="Type" body={typeBody} style={{ width: "110px" }} />
        <Column field="qty" header="Qty" />
        <Column field="qty_after" header="Balance" />
        <Column field="reference_type" header="Ref" />
        <Column field="location_name" header="Location" />
      </DataTable>
    </div>
  );
}

