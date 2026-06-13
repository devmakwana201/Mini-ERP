import { useMemo, useRef, useState } from "react";
import { Page } from "components/shared/Page";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";

const products = [
  { label: "NPK 19:19:19 (50kg)", value: "NPK 19:19:19 (50kg)", cost: 1069 },
  { label: "DAP Fertilizer (50kg)", value: "DAP Fertilizer (50kg)", cost: 1125 },
  { label: "Urea (50kg)", value: "Urea (50kg)", cost: 266 },
  {
    label: "Imidacloprid 17.8% (250ml)",
    value: "Imidacloprid 17.8% (250ml)",
    cost: 380,
  },
  { label: "Paddy Seeds IR-64 (25kg)", value: "Paddy Seeds IR-64 (25kg)", cost: 1200 },
];

const initialPolicies = [
  {
    id: 1,
    name: "Default Dealer Margin",
    product: "All Products",
    marginPct: 12,
    status: "ACTIVE",
  },
  {
    id: 2,
    name: "Fast Moving Fertilizer",
    product: "Urea (50kg)",
    marginPct: 8,
    status: "ACTIVE",
  },
];

const formatMoney = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

export default function AgroDotPricePolicy() {
  const toast = useRef(null);
  const [policies, setPolicies] = useState(initialPolicies);
  const [policyName, setPolicyName] = useState("");
  const [product, setProduct] = useState(products[0].value);
  const [marginPct, setMarginPct] = useState(10);
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  const selectedProduct = useMemo(
    () => products.find((item) => item.value === product),
    [product],
  );

  const previewPrice = useMemo(() => {
    const cost = Number(selectedProduct?.cost || 0);
    return Math.round(cost + (cost * Number(marginPct || 0)) / 100);
  }, [marginPct, selectedProduct]);

  const savePolicy = () => {
    if (!policyName.trim()) {
      toast.current.show({
        severity: "warn",
        summary: "Policy Name Required",
        detail: "Enter a policy name before saving.",
        life: 2500,
      });
      return;
    }

    setPolicies((current) => [
      {
        id: current.length + 1,
        name: policyName.trim(),
        product,
        marginPct: Number(marginPct || 0),
        status: "ACTIVE",
      },
      ...current,
    ]);
    setPolicyName("");
    toast.current.show({
      severity: "success",
      summary: "Policy Saved",
      detail: "Price policy added to the frontend list.",
      life: 2500,
    });
  };

  const applyPolicy = (row) => {
    setSelectedPolicy(row);
    toast.current.show({
      severity: "info",
      summary: "Preview",
      detail: `${row.name} is selected for frontend preview.`,
      life: 2500,
    });
  };

  return (
    <Page title="Agro Dot Price Policy">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) py-5">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Price Policy
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Build margin-based selling policies for Agro Dot items. No backend
            save is performed.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2 dark:border-dark-500 dark:bg-dark-700">
            <div className="mb-4">
              <h2 className="text-base font-semibold">Create Price Policy</h2>
              <p className="text-sm text-gray-500">
                Price = cost + configured margin percentage.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Policy Name
                </label>
                <InputText
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  placeholder="Default policy"
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Product</label>
                <Dropdown
                  value={product}
                  options={products}
                  onChange={(e) => setProduct(e.value)}
                  className="w-full"
                  filter
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Margin %
                </label>
                <InputNumber
                  value={marginPct}
                  onValueChange={(e) => setMarginPct(e.value)}
                  min={0}
                  max={100}
                  suffix="%"
                  className="w-full"
                />
              </div>
              <div className="flex items-end">
                <Button
                  label="Save Policy"
                  icon="pi pi-save"
                  className="w-full"
                  onClick={savePolicy}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900 dark:bg-dark-700" aria-live="polite">
            <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {selectedPolicy ? "Selected Policy Preview" : "Live Price Preview"}
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Product</span>
                <span className="text-right font-medium">
                  {selectedPolicy?.product || selectedProduct?.label}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Cost</span>
                <span className="font-semibold">
                  {formatMoney(
                    selectedPolicy
                      ? products.find((item) => item.value === selectedPolicy.product)?.cost
                      : selectedProduct?.cost,
                  )}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Margin</span>
                <span className="font-semibold">
                  {selectedPolicy ? selectedPolicy.marginPct : marginPct || 0}%
                </span>
              </div>
              <div className="border-t border-amber-200 pt-3">
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Suggested Sale Price
                </div>
                <div className="mt-1 text-2xl font-bold text-amber-700">
                  {formatMoney(
                    selectedPolicy
                      ? Math.round(
                          Number(
                            products.find((item) => item.value === selectedPolicy.product)?.cost || 0,
                          ) +
                            (Number(
                              products.find((item) => item.value === selectedPolicy.product)?.cost || 0,
                            ) * Number(selectedPolicy.marginPct || 0)) /
                              100,
                        )
                      : previewPrice,
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="prime-card">
          <DataTable
            value={policies}
            header="Saved Price Policies"
            paginator
            rows={10}
            tableStyle={{ minWidth: "54rem" }}
          >
            <Column field="name" header="Policy" sortable />
            <Column field="product" header="Product" sortable />
            <Column
              field="marginPct"
              header="Margin"
              body={(row) => `${row.marginPct}%`}
              sortable
            />
            <Column
              header="Status"
              body={(row) => <Tag value={row.status} severity="success" />}
            />
            <Column
              header="Action"
              body={(row) => (
                <Button
                  label="Preview"
                  icon="pi pi-eye"
                  aria-label={`Preview ${row.name} policy`}
                  size="small"
                  outlined
                  onClick={() => applyPolicy(row)}
                />
              )}
            />
          </DataTable>
        </div>
      </div>
    </Page>
  );
}
