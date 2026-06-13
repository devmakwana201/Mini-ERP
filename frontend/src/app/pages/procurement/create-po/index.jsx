import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { InputTextarea } from "primereact/inputtextarea";
import {
  getNextPurchaseOrderId,
  getNextPurchaseOrderNumber,
  saveMockPurchaseOrder,
} from "../mockPurchaseOrders";

const supplierOptions = [
  {
    label: "PI Industries Ltd",
    value: {
      id: 101,
      name: "PI Industries Ltd",
      gstin: "24AAACP0000A1Z5",
      paymentTerms: "net30",
    },
  },
  {
    label: "Coromandel Intl.",
    value: {
      id: 102,
      name: "Coromandel Intl.",
      gstin: "24AACCC0101A1Z7",
      paymentTerms: "advance",
    },
  },
  {
    label: "UPL Limited",
    value: {
      id: 103,
      name: "UPL Limited",
      gstin: "24AAACU5050B1Z2",
      paymentTerms: "net15",
    },
  },
];

const locationOptions = [
  { label: "Ahmedabad Warehouse", value: "Ahmedabad Warehouse" },
  { label: "Surat Branch", value: "Surat Branch" },
  { label: "Vadodara Hub", value: "Vadodara Hub" },
];

const paymentTermsOptions = [
  { label: "Net30", value: "net30" },
  { label: "Net15", value: "net15" },
  { label: "Advance", value: "advance" },
  { label: "Due on Receipt", value: "due-on-receipt" },
];

const productOptions = [
  {
    label: "Urea (50kg)",
    value: {
      id: 1,
      name: "Urea (50kg)",
      uom: "Bag",
      rate: 266,
      gstPercent: 0,
    },
  },
  {
    label: "DAP Premium",
    value: {
      id: 2,
      name: "DAP Premium",
      uom: "Bag",
      rate: 2000,
      gstPercent: 5,
    },
  },
  {
    label: "Nano Urea Liquid 500ml",
    value: {
      id: 3,
      name: "Nano Urea Liquid 500ml",
      uom: "Bottle",
      rate: 370,
      gstPercent: 12,
    },
  },
  {
    label: "Micronutrient Mix",
    value: {
      id: 4,
      name: "Micronutrient Mix",
      uom: "Pack",
      rate: 1595.77,
      gstPercent: 12,
    },
  },
];

const initialLineItem = {
  id: 1,
  product: null,
  uom: "",
  quantity: 0,
  rate: 0,
  gstPercent: 0,
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (date) => {
  if (!date) return "";

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

export default function ProcurementCreatePo() {
  const toast = useRef(null);
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({
    supplier: null,
    buyerGstin: "24AAAAA0000A1Z5",
    supplierGstin: "",
    location: "Ahmedabad Warehouse",
    poDate: new Date("2026-04-14T00:00:00"),
    deliveryDate: null,
    paymentTerms: "net30",
    remarks: "",
  });
  const [lineItems, setLineItems] = useState([initialLineItem]);

  const computedItems = useMemo(
    () =>
      lineItems.map((item) => {
        const quantity = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        const gstPercent = Number(item.gstPercent) || 0;
        const taxable = quantity * rate;
        const taxAmount = (taxable * gstPercent) / 100;
        const total = taxable + taxAmount;

        return {
          ...item,
          taxable,
          taxAmount,
          total,
        };
      }),
    [lineItems],
  );

  const totals = useMemo(
    () =>
      computedItems.reduce(
        (acc, item) => {
          acc.subtotal += item.taxable;
          acc.gst += item.taxAmount;
          acc.grandTotal += item.total;
          return acc;
        },
        { subtotal: 0, gst: 0, grandTotal: 0 },
      ),
    [computedItems],
  );

  const hasCompletedHeader = useMemo(
    () =>
      Boolean(
        formValues.supplier &&
          formValues.buyerGstin.trim() &&
          formValues.supplierGstin.trim() &&
          formValues.location &&
          formValues.poDate &&
          formValues.paymentTerms,
      ),
    [formValues],
  );

  const hasCompletedLineItems = useMemo(
    () =>
      computedItems.some(
        (item) =>
          item.product &&
          Number(item.quantity) > 0 &&
          Number(item.rate) > 0 &&
          Number(item.total) > 0,
      ),
    [computedItems],
  );

  const isReadyToSubmit = useMemo(
    () => hasCompletedHeader && hasCompletedLineItems && totals.grandTotal > 0,
    [hasCompletedHeader, hasCompletedLineItems, totals.grandTotal],
  );

  const progressSteps = [
    {
      step: 1,
      label: "PO Details",
      active: true,
      complete: hasCompletedHeader,
    },
    {
      step: 2,
      label: "Line Items",
      active: hasCompletedHeader,
      complete: hasCompletedLineItems,
    },
    {
      step: 3,
      label: "Submit",
      active: hasCompletedHeader && hasCompletedLineItems,
      complete: isReadyToSubmit,
    },
  ];

  const updateFormValue = (field, value) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSupplierChange = (supplier) => {
    setFormValues((prev) => ({
      ...prev,
      supplier,
      supplierGstin: supplier?.gstin || "",
      paymentTerms: supplier?.paymentTerms || prev.paymentTerms,
    }));
  };

  const updateLineItem = (id, updates) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  const handleProductChange = (id, product) => {
    updateLineItem(id, {
      product,
      uom: product?.uom || "",
      rate: product?.rate || 0,
      gstPercent: product?.gstPercent || 0,
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { ...initialLineItem, id: Date.now() },
    ]);
  };

  const removeLineItem = (id) => {
    setLineItems((prev) =>
      prev.length === 1 ? prev : prev.filter((item) => item.id !== id),
    );
  };

  const getPayload = (status) => ({
    header: {
      supplierId: formValues.supplier?.id || null,
      buyerGstin: formValues.buyerGstin,
      supplierGstin: formValues.supplierGstin,
      location: formValues.location,
      poDate: formValues.poDate ? formValues.poDate.toISOString() : null,
      deliveryDate: formValues.deliveryDate
        ? formValues.deliveryDate.toISOString()
        : null,
      paymentTerms: formValues.paymentTerms,
      remarks: formValues.remarks,
      status,
    },
    lineItems: computedItems.map((item, index) => ({
      lineNumber: index + 1,
      productId: item.product?.id || null,
      productName: item.product?.name || "",
      uom: item.uom,
      quantity: Number(item.quantity) || 0,
      rate: Number(item.rate) || 0,
      gstPercent: Number(item.gstPercent) || 0,
      taxableAmount: item.taxable,
      taxAmount: item.taxAmount,
      lineTotal: item.total,
    })),
    totals,
  });

  const showActionMessage = (status) => {
    const payload = getPayload(status);
    const newRecord = {
      id: getNextPurchaseOrderId(),
      poNumber: getNextPurchaseOrderNumber(formValues.location),
      supplierId: payload.header.supplierId,
      supplier: formValues.supplier?.name || "Unknown Supplier",
      locationId: null,
      location: formValues.location,
      orderDate: formValues.poDate
        ? formValues.poDate.toISOString().slice(0, 10)
        : "",
      total: payload.totals.grandTotal,
      currency: "INR",
      status,
      linkedSo: null,
      canSubmit: status === "draft",
      remarks: payload.header.remarks,
      createdBy: "Current User",
      items: payload.lineItems.map((item, index) => ({
        id: index + 1,
        itemName: item.productName,
        orderedQty: item.quantity,
        freeQty: 0,
        totalQty: item.quantity,
        rate: item.rate,
        gst: `${item.gstPercent}%`,
        offerApplied: "-",
        total: item.lineTotal,
      })),
    };

    saveMockPurchaseOrder(newRecord);
    console.log("Create PO payload preview:", payload);

    toast.current?.show({
      severity: "success",
      summary: status === "draft" ? "Draft Saved" : "Submitted",
      detail:
        status === "draft"
          ? "Purchase order draft prepared with dummy data flow"
          : "Purchase order prepared for approval flow",
      life: 3000,
    });

    if (status === "submitted") {
      navigate("/procurement/purchase-order");
    }
  };

  return (
    <Page title="Procurement - Create PO">
      <Toast ref={toast} />

      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-800">
                Create Purchase Order
              </h2>
            </div>

            <div className="prime-card mb-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {progressSteps.map((item, index) => (
                  <div key={item.step} className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          item.complete
                            ? "bg-emerald-600 text-white"
                            : item.active
                            ? "bg-primary-700 text-white"
                            : "border border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {item.step}
                      </span>
                      <span
                        className={
                          item.complete
                            ? "font-medium text-emerald-700"
                            : item.active
                            ? "font-medium text-slate-700"
                            : "text-slate-400"
                        }
                      >
                        {item.label}
                      </span>
                    </div>
                    {index < 2 && <span className="text-slate-300">-</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="prime-card mb-4">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <i className="pi pi-file-edit text-xs text-primary-700" />
                <span>Header</span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <Dropdown
                    value={formValues.supplier}
                    options={supplierOptions}
                    optionLabel="label"
                    optionValue="value"
                    onChange={(e) => handleSupplierChange(e.value)}
                    placeholder="Select..."
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Buyer GSTIN (Agro Manager)
                  </label>
                  <InputText
                    value={formValues.buyerGstin}
                    onChange={(e) => updateFormValue("buyerGstin", e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Supplier GSTIN
                  </label>
                  <InputText
                    value={formValues.supplierGstin}
                    onChange={(e) =>
                      updateFormValue("supplierGstin", e.target.value)
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Location
                  </label>
                  <Dropdown
                    value={formValues.location}
                    options={locationOptions}
                    onChange={(e) => updateFormValue("location", e.value)}
                    placeholder="Select location"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    PO Date
                  </label>
                  <Calendar
                    value={formValues.poDate}
                    onChange={(e) => updateFormValue("poDate", e.value)}
                    dateFormat="mm/dd/yy"
                    showIcon
                    className="w-full"
                    inputClassName="w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Delivery Date
                  </label>
                  <Calendar
                    value={formValues.deliveryDate}
                    onChange={(e) => updateFormValue("deliveryDate", e.value)}
                    dateFormat="mm/dd/yy"
                    showIcon
                    className="w-full"
                    inputClassName="w-full"
                    placeholder="mm/dd/yyyy"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Payment Terms
                  </label>
                  <Dropdown
                    value={formValues.paymentTerms}
                    options={paymentTermsOptions}
                    optionLabel="label"
                    optionValue="value"
                    onChange={(e) => updateFormValue("paymentTerms", e.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="mt-4 max-w-xl">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Remarks
                </label>
                <InputTextarea
                  value={formValues.remarks}
                  onChange={(e) => updateFormValue("remarks", e.target.value)}
                  rows={2}
                  autoResize
                  placeholder="Optional..."
                  className="w-full"
                />
              </div>
            </div>

            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Different GSTIN - GST will be applied as per item tax
            </div>

            <div className="prime-card">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <i className="pi pi-box text-xs text-primary-700" />
                  <span>Line Items</span>
                </div>

                <Button
                  label="Add Item"
                  icon="pi pi-plus"
                  size="small"
                  outlined
                  onClick={addLineItem}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-lg border border-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">#</th>
                      <th className="px-3 py-3">Product</th>
                      <th className="px-3 py-3">UOM</th>
                      <th className="px-3 py-3">Qty</th>
                      <th className="px-3 py-3">Rate (Rs)</th>
                      <th className="px-3 py-3">GST%</th>
                      <th className="px-3 py-3">Taxable</th>
                      <th className="px-3 py-3">Tax Amt</th>
                      <th className="px-3 py-3">Total</th>
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {computedItems.map((item, index) => (
                      <tr key={item.id} className="border-t border-slate-200">
                        <td className="px-3 py-3 align-top text-slate-600">
                          {index + 1}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <Dropdown
                            value={item.product}
                            options={productOptions}
                            optionLabel="label"
                            optionValue="value"
                            onChange={(e) =>
                              handleProductChange(item.id, e.value)
                            }
                            placeholder="Select..."
                            className="w-52"
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <InputText
                            value={item.uom}
                            onChange={(e) =>
                              updateLineItem(item.id, { uom: e.target.value })
                            }
                            className="w-20"
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <InputText
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineItem(item.id, {
                                quantity: e.target.value,
                              })
                            }
                            className="w-20"
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <InputText
                            value={item.rate}
                            onChange={(e) =>
                              updateLineItem(item.id, { rate: e.target.value })
                            }
                            className="w-24"
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <InputText
                            value={item.gstPercent}
                            onChange={(e) =>
                              updateLineItem(item.id, {
                                gstPercent: e.target.value,
                              })
                            }
                            className="w-16"
                          />
                        </td>
                        <td className="px-3 py-3 align-top font-medium text-slate-700">
                          {formatCurrency(item.taxable)}
                        </td>
                        <td className="px-3 py-3 align-top font-medium text-slate-700">
                          {formatCurrency(item.taxAmount)}
                        </td>
                        <td className="px-3 py-3 align-top font-semibold text-slate-800">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <Button
                            icon="pi pi-times"
                            rounded
                            severity="danger"
                            size="small"
                            onClick={() => removeLineItem(item.id)}
                            disabled={lineItems.length === 1}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
                <div className="min-h-20 rounded-lg bg-slate-100" />

                <div className="flex min-h-20 flex-col items-center justify-center border-l border-slate-200 px-4 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Subtotal (Pre-Discount)
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-800">
                    {formatCurrency(totals.subtotal)}
                  </div>
                </div>

                <div className="flex min-h-20 flex-col items-center justify-center border-l border-slate-200 px-4 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    GST
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-800">
                    {formatCurrency(totals.gst)}
                  </div>
                </div>

                <div className="flex min-h-20 flex-col items-center justify-center rounded-lg bg-emerald-50 px-4 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
                    Grand Total
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-emerald-700">
                    {formatCurrency(totals.grandTotal)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                label="Cancel"
                outlined
                onClick={() => navigate("/procurement/purchase-order")}
              />
              <Button
                label="Save Draft"
                severity="secondary"
                onClick={() => showActionMessage("draft")}
              />
              <Button
                label="Submit for Approval"
                onClick={() => showActionMessage("submitted")}
                disabled={!isReadyToSubmit}
              />
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="font-semibold text-slate-700">Backend-ready preview</div>
              <div className="mt-2">
                Supplier: {formValues.supplier?.name || "Not selected"} | PO Date:{" "}
                {formatDate(formValues.poDate) || "-"} | Delivery Date:{" "}
                {formatDate(formValues.deliveryDate) || "-"} | Items:{" "}
                {computedItems.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
