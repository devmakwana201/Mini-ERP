import { useRef, useState } from "react";
import { Page } from "components/shared/Page";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { MultiSelect } from "primereact/multiselect";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";

const typeOptions = [
  { label: "Percentage Discount", value: "PERCENTAGE_DISCOUNT" },
  { label: "Flat Discount", value: "FLAT_DISCOUNT" },
];

const customerOptions = [
  { label: "All Customers", value: "All Customers" },
  { label: "Ravi Kumar", value: "Ravi Kumar" },
  { label: "Anita Sharma", value: "Anita Sharma" },
  { label: "Mohan Patel", value: "Mohan Patel" },
  { label: "Suresh Gupta", value: "Suresh Gupta" },
];

const initialOffers = [
  {
    id: 1,
    name: "Monsoon Urea Support",
    type: "PERCENTAGE_DISCOUNT",
    discountValue: 10,
    applicableCustomers: ["All Customers"],
    status: "ACTIVE",
  },
  {
    id: 2,
    name: "Seed Starter Scheme",
    type: "FLAT_DISCOUNT",
    discountValue: 500,
    applicableCustomers: ["Ravi Kumar", "Anita Sharma"],
    status: "ACTIVE",
  },
];

const ruleText = (offer) =>
  offer.type === "PERCENTAGE_DISCOUNT"
    ? `${offer.discountValue}% discount`
    : `₹${offer.discountValue} flat discount`;

export default function AgroDotOffers() {
  const toast = useRef(null);
  const [offers, setOffers] = useState(initialOffers);
  const [form, setForm] = useState({
    name: "",
    type: "PERCENTAGE_DISCOUNT",
    discountValue: 10,
    applicableCustomers: ["All Customers"],
  });

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveOffer = () => {
    if (!form.name.trim()) {
      toast.current.show({
        severity: "warn",
        summary: "Offer Name Required",
        detail: "Enter an offer name before saving.",
        life: 2500,
      });
      return;
    }

    setOffers((current) => [
      {
        id: current.length + 1,
        ...form,
        name: form.name.trim(),
        status: "ACTIVE",
      },
      ...current,
    ]);
    setForm((current) => ({ ...current, name: "" }));
    toast.current.show({
      severity: "success",
      summary: "Offer Saved",
      detail: "Offer is available in the frontend demo list.",
      life: 2500,
    });
  };

  const toggleOffer = (id) => {
    setOffers((current) =>
      current.map((offer) =>
        offer.id === id
          ? {
              ...offer,
              status: offer.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
            }
          : offer,
      ),
    );
  };

  return (
    <Page title="Agro Dot Offer Scheme">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) py-5">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Offer / Scheme
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Maintain distributor-side offers that can be shown to buyer users
            during purchase order creation.
          </p>
        </div>

        <div className="mb-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-dark-500 dark:bg-dark-700">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Create Offer</h2>
              <p className="text-sm text-gray-500">
                This is a frontend-only rule builder.
              </p>
            </div>
            <Tag value="Agro Dot" severity="warning" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Offer Name</label>
              <InputText
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
                placeholder="Spring Discount"
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Rule Type</label>
              <Dropdown
                value={form.type}
                options={typeOptions}
                onChange={(e) => updateForm("type", e.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Applicable Customers</label>
              <MultiSelect
                value={form.applicableCustomers}
                options={customerOptions}
                onChange={(e) => updateForm("applicableCustomers", e.value)}
                display="chip"
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {form.type === "PERCENTAGE_DISCOUNT"
                  ? "Discount %"
                  : "Flat Discount Amount"}
              </label>
              <InputNumber
                value={form.discountValue}
                onValueChange={(e) => updateForm("discountValue", e.value)}
                min={1}
                max={form.type === "PERCENTAGE_DISCOUNT" ? 100 : undefined}
                suffix={form.type === "PERCENTAGE_DISCOUNT" ? "%" : ""}
                prefix={form.type === "FLAT_DISCOUNT" ? "₹" : ""}
                className="w-full"
              />
            </div>

            <div className="flex items-end">
              <Button
                label="Save Offer"
                icon="pi pi-plus"
                className="w-full"
                onClick={saveOffer}
              />
            </div>
          </div>
        </div>

        <div className="prime-card">
          <DataTable
            value={offers}
            header="Current Offers"
            paginator
            rows={10}
            tableStyle={{ minWidth: "58rem" }}
          >
            <Column field="name" header="Name" sortable />
            <Column header="Rule" body={ruleText} />
            <Column
              header="Customers"
              body={(row) => row.applicableCustomers?.join(", ")}
            />
            <Column
              field="status"
              header="Status"
              body={(row) => (
                <Tag
                  value={row.status}
                  severity={row.status === "ACTIVE" ? "success" : "secondary"}
                />
              )}
            />
            <Column
              header="Action"
              body={(row) => (
                <Button
                  label={row.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  size="small"
                  outlined
                  onClick={() => toggleOffer(row.id)}
                />
              )}
            />
          </DataTable>
        </div>
      </div>
    </Page>
  );
}
