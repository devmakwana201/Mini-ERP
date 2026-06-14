import { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";
import { InventoryService } from "services/inventory/inventory.service";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Released", value: "released" },
  { label: "Consumed", value: "consumed" },
];

export default function ReservationList() {
  const [reservations, setReservations] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReservations = async () => {
      setLoading(true);
      const params = status ? { status } : {};
      const res = await InventoryService.getReservations(params);
      if (res.success) setReservations(res.data || []);
      setLoading(false);
    };
    fetchReservations();
  }, [status]);

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Stock Reservations</h1>
        <p className="text-sm text-gray-500">{reservations.length} reservations</p>
      </div>

      <div className="mb-3">
        <Dropdown value={status} options={STATUS_OPTIONS} onChange={(e) => setStatus(e.value || "")} className="w-48" />
      </div>

      <DataTable value={reservations} loading={loading} emptyMessage="No reservations found" stripedRows className="text-sm">
        <Column field="so_number" header="SO" />
        <Column field="product_code" header="Code" />
        <Column field="product_name" header="Product" />
        <Column field="qty_reserved" header="Reserved" />
        <Column field="qty_consumed" header="Consumed" />
        <Column header="Status" body={(row) => <Tag value={row.status} severity={row.status === "active" ? "info" : "success"} className="text-xs" />} />
        <Column field="created_at" header="Created" />
      </DataTable>
    </div>
  );
}

