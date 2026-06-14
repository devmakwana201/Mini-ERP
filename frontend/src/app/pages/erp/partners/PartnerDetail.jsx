import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { TabView, TabPanel } from "primereact/tabview";
import { Toast } from "primereact/toast";
import { ProgressSpinner } from "primereact/progressspinner";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { PartnerService } from "services/partners/partner.service";

export default function PartnerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useRef(null);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await PartnerService.getById(id);
    if (res.success) setPartner(res.data);
    else toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = () => {
    confirmDialog({
      message: "Are you sure you want to delete this partner?",
      header: "Delete Partner",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        const res = await PartnerService.delete(id);
        if (res.success) navigate("/partners");
        else toast.current?.show({ severity: "error", summary: "Error", detail: res.message });
      },
    });
  };

  if (loading) return <div className="flex justify-center p-8"><ProgressSpinner /></div>;
  if (!partner) return <div className="p-4 text-red-500">Partner not found</div>;

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button icon="pi pi-arrow-left" text onClick={() => navigate("/partners")} />
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{partner.name}</h1>
            <div className="flex gap-2 mt-1">
              {partner.is_vendor && <Tag value="Vendor" severity="info" />}
              {partner.is_customer && <Tag value="Customer" severity="success" />}
              <Tag value={partner.is_active ? "Active" : "Inactive"}
                severity={partner.is_active ? "success" : "danger"} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button label="Edit" icon="pi pi-pencil" outlined
            onClick={() => navigate(`/partners/${id}/edit`)} />
          <Button label="Delete" icon="pi pi-trash" severity="danger" outlined
            onClick={handleDelete} />
        </div>
      </div>

      <TabView>
        <TabPanel header="Info">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ["Email", partner.email], ["Phone", partner.phone],
              ["GSTIN", partner.gstin], ["City", partner.city],
              ["State", partner.state], ["Country", partner.country],
              ["Payment Terms", partner.payment_terms],
              ["Lead Time", partner.lead_time_days ? `${partner.lead_time_days} days` : "-"],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="font-medium text-gray-500">{label}</span>
                <p className="mt-0.5 text-gray-800 dark:text-white">{value || "-"}</p>
              </div>
            ))}
            {partner.address && (
              <div className="col-span-2">
                <span className="font-medium text-gray-500">Address</span>
                <p className="mt-0.5 text-gray-800 dark:text-white">{partner.address}</p>
              </div>
            )}
          </div>
        </TabPanel>

        {partner.is_vendor && (
          <TabPanel header="Products">
            <DataTable value={partner.product_links || []} emptyMessage="No products linked" className="text-sm">
              <Column field="product_code" header="Code" />
              <Column field="product_name" header="Product" />
              <Column field="unit_cost" header="Unit Cost" body={(r) => `₹ ${parseFloat(r.unit_cost || 0).toFixed(2)}`} />
              <Column field="lead_time_days" header="Lead Time" body={(r) => `${r.lead_time_days || 0} d`} />
              <Column header="Preferred" body={(r) => r.is_preferred ? <Tag value="★ Preferred" severity="warning" /> : null} />
            </DataTable>
          </TabPanel>
        )}
      </TabView>
    </div>
  );
}

