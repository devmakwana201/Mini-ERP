import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { Dropdown } from "primereact/dropdown";
import { BomService } from "services/masters/bom.service";

const BOM_TYPES = [
  { label: "All Types", value: "" },
  { label: "Manufacture", value: "manufacture" },
  { label: "Phantom", value: "phantom" },
  { label: "Kit", value: "kit" },
];

export default function BomList() {
  const navigate = useNavigate();
  const toast = useRef(null);
  const [boms, setBoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [bomType, setBomType] = useState("");

  const fetch = async () => {
    setLoading(true);
    const params = { page, limit: 20, search };
    if (bomType) params.bom_type = bomType;
    const res = await BomService.getAll(params);
    if (res.success) { setBoms(res.data.data || []); setTotal(res.data.pagination?.total || 0); }
    else toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [page, search, bomType]);

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Bill of Materials</h1>
          <p className="text-sm text-gray-500">{total} total BOMs</p>
        </div>
        <Button label="New BOM" icon="pi pi-plus" onClick={() => navigate("/erp/bom/new")} />
      </div>

      <div className="mb-3 flex flex-wrap gap-3 items-center">
        <Dropdown value={bomType} options={BOM_TYPES} onChange={(e) => { setBomType(e.value); setPage(1); }} className="w-44" />
        <InputText placeholder="Search by name or product..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-64" />
        <Button icon="pi pi-refresh" text onClick={fetch} />
      </div>

      <DataTable value={boms} loading={loading} emptyMessage="No BOMs found" stripedRows className="text-sm">
        <Column field="product_code" header="Product Code" />
        <Column field="product_name" header="Product" />
        <Column field="bom_name" header="BOM Name" />
        <Column field="bom_type" header="Type" body={(r) => <Tag value={r.bom_type} severity="info" className="capitalize text-xs" />} />
        <Column field="qty" header="Qty" />
        <Column field="line_count" header="Components" />
        <Column header="Status" body={(r) => <Tag value={r.is_active ? "Active" : "Inactive"} severity={r.is_active ? "success" : "danger"} className="text-xs" />} />
        <Column header="" body={(row) => (
          <Button icon="pi pi-eye" size="small" text onClick={() => navigate(`/erp/bom/${row.bom_id}`)} />
        )} style={{ width: "60px" }} />
      </DataTable>

      <div className="mt-3 flex gap-2 items-center text-sm text-gray-500">
        <Button icon="pi pi-chevron-left" size="small" text disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} />
        <span>Page {page}</span>
        <Button icon="pi pi-chevron-right" size="small" text disabled={boms.length < 20} onClick={() => setPage(p => p + 1)} />
      </div>
    </div>
  );
}
