import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Toolbar } from "primereact/toolbar";
import { Toast } from "primereact/toast";
import { SelectButton } from "primereact/selectbutton";
import { PartnerService } from "services/partners/partner.service";

const FILTER_OPTIONS = [
  { label: "All", value: "" },
  { label: "Vendors", value: "vendors" },
  { label: "Customers", value: "customers" },
];

export default function PartnerList() {
  const navigate = useNavigate();
  const toast = useRef(null);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");

  const fetchPartners = async () => {
    setLoading(true);
    const params = { page, limit: 20, search };
    if (filterType === "vendors") params.is_vendor = true;
    if (filterType === "customers") params.is_customer = true;

    const res = await PartnerService.getAll(params);
    if (res.success) {
      setPartners(res.data || []);
      setTotal(res.pagination?.total || 0);
    } else {
      toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
    }
    setLoading(false);
  };

  useEffect(() => { fetchPartners(); }, [page, search, filterType]);

  const typeBody = (row) => (
    <div className="flex gap-1">
      {row.is_vendor && <Tag value="Vendor" severity="info" className="text-xs" />}
      {row.is_customer && <Tag value="Customer" severity="success" className="text-xs" />}
    </div>
  );

  const statusBody = (row) => (
    <Tag value={row.is_active ? "Active" : "Inactive"}
      severity={row.is_active ? "success" : "danger"} className="text-xs" />
  );

  const actionBody = (row) => (
    <Button icon="pi pi-eye" size="small" text
      onClick={() => navigate(`/erp/partners/${row.partner_id}`)} />
  );

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Partners</h1>
          <p className="text-sm text-gray-500">{total} total — vendors &amp; customers</p>
        </div>
        <Button label="New Partner" icon="pi pi-plus"
          onClick={() => navigate("/erp/partners/new")} />
      </div>

      <div className="mb-3 flex flex-wrap gap-3 items-center">
        <SelectButton value={filterType} options={FILTER_OPTIONS}
          onChange={(e) => { setFilterType(e.value || ""); setPage(1); }} />
        <InputText placeholder="Search by name, email, phone..."
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-64" />
      </div>

      <DataTable value={partners} loading={loading}
        emptyMessage="No partners found"
        className="text-sm" stripedRows>
        <Column field="name" header="Name" />
        <Column field="email" header="Email" />
        <Column field="phone" header="Phone" />
        <Column field="gstin" header="GSTIN" />
        <Column header="Type" body={typeBody} />
        <Column header="Status" body={statusBody} />
        <Column header="" body={actionBody} style={{ width: "60px" }} />
      </DataTable>

      <div className="mt-3 flex gap-2 items-center text-sm text-gray-500">
        <Button icon="pi pi-chevron-left" size="small" text disabled={page <= 1}
          onClick={() => setPage(p => Math.max(1, p - 1))} />
        <span>Page {page}</span>
        <Button icon="pi pi-chevron-right" size="small" text disabled={partners.length < 20}
          onClick={() => setPage(p => p + 1)} />
      </div>
    </div>
  );
}

