import { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { WarehouseService } from "services/inventory/inventory.service";

export default function WarehouseList() {
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [whRes, locRes] = await Promise.all([
        WarehouseService.getAll(),
        WarehouseService.getLocations(),
      ]);
      if (whRes.success) setWarehouses(whRes.data || []);
      if (locRes.success) setLocations(locRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Warehouses</h1>
        <p className="text-sm text-gray-500">{warehouses.length} warehouses, {locations.length} locations</p>
      </div>

      <DataTable value={warehouses} loading={loading} emptyMessage="No warehouses found" stripedRows className="mb-6 text-sm">
        <Column field="code" header="Code" />
        <Column field="warehouse_name" header="Warehouse" />
        <Column field="address" header="Address" />
        <Column field="location_count" header="Locations" />
        <Column header="Status" body={(row) => <Tag value={row.is_active ? "ACTIVE" : "INACTIVE"} severity={row.is_active ? "success" : "secondary"} className="text-xs" />} />
      </DataTable>

      <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">Locations</h2>
      <DataTable value={locations} loading={loading} emptyMessage="No locations found" stripedRows className="text-sm">
        <Column field="warehouse_name" header="Warehouse" />
        <Column field="code" header="Code" />
        <Column field="name" header="Location" />
        <Column field="location_type" header="Type" />
      </DataTable>
    </div>
  );
}

