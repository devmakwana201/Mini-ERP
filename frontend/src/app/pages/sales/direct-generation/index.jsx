import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { InputNumber } from "primereact/inputnumber";
import { Tag } from "primereact/tag";
import { ItemService } from "services/master-records/items";
import { CurrentStockReportService } from "services/reports/stock/currentStockReport";
import { generateDirectInvoice } from "redux/slice/salesOrderSlice";

const customerOptions = [
  {
    label: "Gujarat Agro Industries",
    value: { id: 1, name: "Gujarat Agro Industries", gstin: "24BBBBB2222B1Z2" },
  },
  {
    label: "Mahindra Agri Solutions",
    value: { id: 2, name: "Mahindra Agri Solutions", gstin: "27CCCCC3333C1Z3" },
  },
  {
    label: "Tata Rallis India",
    value: { id: 3, name: "Tata Rallis India", gstin: "24AAAAA0000A1Z5" },
  },
];

const locationOptions = [
  { label: "Ahmedabad Warehouse", value: "AHM-WH-01" },
  { label: "Surat Branch", value: "SUR-BR-01" },
  { label: "Vadodara Hub", value: "VAD-HB-01" },
];

const initialLineItem = {
  id: Date.now(),
  product: null,
  quantity: 1,
  rate: 0,
  gstPercent: 12,
  stock: 0,
  reserved: 0,
  isLoadingStock: false,
};

export default function DirectGenerationPage() {
  const toast = useRef(null);
  const dispatch = useDispatch();
  const [status, setStatus] = useState("Draft"); // Draft -> Confirmed -> Invoiced -> Partially Delivered -> Fully Delivered
  const [formValues, setFormValues] = useState({
    customer: null,
    orderDate: new Date(),
    location: "AHM-WH-01",
    remarks: "",
  });
  const [lineItems, setLineItems] = useState([initialLineItem]);
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const response = await ItemService.getFormattedItems({ length: 100 });
        if (response.success) {
          setProducts(
            response.data.map((item) => ({
              label: item.itemname,
              value: {
                id: item.itemid,
                name: item.itemname,
                rate: item.sellingprice || 0,
                itemcode: item.itemcode,
              },
            })),
          );
        }
      } catch (error) {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: "Failed to load products",
        });
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  const fetchStockForProduct = useCallback(
    async (productName, locationId, index) => {
      setLineItems((prev) => {
        const newItems = [...prev];
        newItems[index] = { ...newItems[index], isLoadingStock: true };
        return newItems;
      });

      try {
        const response = await CurrentStockReportService.getCurrentStockReport({
          filters: {
            productname: { value: productName, matchMode: "CONTAINS" },
          },
          locationId,
        });

        if (response.success && response.data.length > 0) {
          const stockData = response.data[0];
          setLineItems((prev) => {
            const newItems = [...prev];
            newItems[index] = {
              ...newItems[index],
              stock: stockData.stock,
              isLoadingStock: false,
            };
            return newItems;
          });
        } else {
          setLineItems((prev) => {
            const newItems = [...prev];
            newItems[index] = {
              ...newItems[index],
              stock: 0,
              isLoadingStock: false,
            };
            return newItems;
          });
        }
      } catch (error) {
        setLineItems((prev) => {
          const newItems = [...prev];
          newItems[index] = {
            ...newItems[index],
            stock: 0,
            isLoadingStock: false,
          };
          return newItems;
        });
      }
    },
    [],
  );

  const addLineItem = () => {
    if (status !== "Draft") return;
    setLineItems([...lineItems, { ...initialLineItem, id: Date.now() }]);
  };

  const removeLineItem = (id) => {
    if (status !== "Draft") return;
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  const updateLineItem = (index, field, value) => {
    if (status !== "Draft") return;
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "product" && value) {
      newItems[index].rate = value.rate;
      fetchStockForProduct(value.name, formValues.location, index);
    }

    setLineItems(newItems);
  };

  const totals = useMemo(() => {
    return lineItems.reduce(
      (acc, item) => {
        const taxable = (item.quantity || 0) * (item.rate || 0);
        const tax = (taxable * (item.gstPercent || 0)) / 100;
        acc.subtotal += taxable;
        acc.tax += tax;
        acc.total += taxable + tax;
        return acc;
      },
      { subtotal: 0, tax: 0, total: 0 },
    );
  }, [lineItems]);

  const handleConfirmOrder = () => {
    if (!formValues.customer) {
      toast.current?.show({
        severity: "warn",
        summary: "Required",
        detail: "Please select a customer",
      });
      return;
    }

    const hasInsufficientStock = lineItems.some(
      (item) => item.stock < item.quantity,
    );

    // Simulate stock reservation and auto-procurement trigger
    const updatedItems = lineItems.map((item) => ({
      ...item,
      reserved: Math.min(item.quantity, item.stock),
    }));

    setLineItems(updatedItems);
    setStatus("Confirmed");

    toast.current?.show({
      severity: "success",
      summary: "SO Confirmed",
      detail: hasInsufficientStock
        ? "Order confirmed. Insufficient stock detected - procurement triggered."
        : "Order confirmed and inventory reserved.",
    });
  };

  const handleGenerateInvoice = () => {
    // Dispatch to Redux so invoice appears in Invoice section
    dispatch(
      generateDirectInvoice({
        customer: formValues.customer,
        lineItems,
        totals,
        orderDate: formValues.orderDate,
      }),
    );
    setStatus("Invoiced");
    toast.current?.show({
      severity: "success",
      summary: "Invoice Generated ✓",
      detail: "Sales Invoice created and visible in the Invoice section.",
      life: 4000,
    });
  };

  return (
    <Page title={`Direct Sales Order - ${status}`}>
      <Toast ref={toast} />
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="dark:bg-dark-800 flex items-center justify-between rounded-lg bg-white p-4 shadow-sm border-l-4 border-primary-500">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Current Status
            </span>
            <span className="text-primary-600 text-lg font-bold">{status}</span>
          </div>
          <div className="flex gap-2">
            {status === "Draft" && (
              <Button
                label="Confirm Order"
                icon="pi pi-check"
                onClick={handleConfirmOrder}
              />
            )}
            {status === "Confirmed" && (
              <Button
                label="Generate Invoice"
                icon="pi pi-file"
                severity="success"
                onClick={handleGenerateInvoice}
              />
            )}
            {status === "Invoiced" && (
              <Button
                label="Procure Delivery"
                icon="pi pi-truck"
                severity="info"
                onClick={() =>
                  toast.current.show({
                    severity: "info",
                    detail: "Delivery process initiated",
                  })
                }
              />
            )}
            {status !== "Fully Delivered" && (
              <Button
                label="Cancel"
                icon="pi pi-times"
                severity="danger"
                text
                onClick={() => setStatus("Cancelled")}
              />
            )}
          </div>
        </div>

        <div className="dark:bg-dark-800 grid grid-cols-1 gap-4 rounded-lg bg-white p-4 shadow-sm md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Customer</label>
            <Dropdown
              value={formValues.customer}
              options={customerOptions}
              onChange={(e) =>
                setFormValues({ ...formValues, customer: e.value })
              }
              placeholder="Select Customer"
              filter
              className="w-full"
              disabled={status !== "Draft"}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Order Date</label>
            <Calendar
              value={formValues.orderDate}
              onChange={(e) =>
                setFormValues({ ...formValues, orderDate: e.value })
              }
              showIcon
              className="w-full"
              disabled={status !== "Draft"}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Dispatch From</label>
            <Dropdown
              value={formValues.location}
              options={locationOptions}
              onChange={(e) =>
                setFormValues({ ...formValues, location: e.value })
              }
              placeholder="Select Location"
              className="w-full"
              disabled={status !== "Draft"}
            />
          </div>
        </div>

        <div className="dark:bg-dark-800 flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Line Items</h3>
            {status === "Draft" && (
              <Button
                label="Add Item"
                icon="pi pi-plus"
                size="small"
                text
                onClick={addLineItem}
              />
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b dark:border-dark-700 text-gray-400 text-xs uppercase">
                  <th className="p-2">Product</th>
                  <th className="p-2">In Stock</th>
                  <th className="p-2">Reserved</th>
                  <th className="p-2" style={{ width: "120px" }}>
                    Qty
                  </th>
                  <th className="p-2" style={{ width: "150px" }}>
                    Rate
                  </th>
                  <th className="p-2 text-right">Amount</th>
                  {status === "Draft" && <th className="p-2"></th>}
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={item.id} className="border-b dark:border-dark-700">
                    <td className="p-2">
                      <div className="flex flex-col gap-1">
                        <Dropdown
                          value={item.product}
                          options={products}
                          onChange={(e) =>
                            updateLineItem(index, "product", e.value)
                          }
                          placeholder="Select Product"
                          className="w-full border-none"
                          loading={isLoadingProducts}
                          disabled={status !== "Draft"}
                        />
                        {item.product && item.stock < item.quantity && (
                          <div className="flex items-center gap-2 mt-1">
                            <Tag
                              severity="warning"
                              value="MO Needed"
                              icon="pi pi-exclamation-triangle"
                              className="text-[10px]"
                            />
                            {status === "Confirmed" && (
                              <Button
                                icon="pi pi-cog"
                                label="Trigger MO"
                                size="small"
                                className="h-6 text-[10px] p-0 px-2"
                                severity="secondary"
                                onClick={() =>
                                  toast.current.show({
                                    severity: "info",
                                    summary: "MO Triggered",
                                    detail: `Manufacturing Order created for ${item.product.name}`,
                                  })
                                }
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <span
                        className={
                          item.stock < item.quantity
                            ? "font-bold text-red-500"
                            : "text-green-500"
                        }
                      >
                        {item.isLoadingStock ? (
                          <i className="pi pi-spin pi-spinner text-xs" />
                        ) : (
                          item.stock
                        )}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className="font-bold text-primary-500">
                        {item.reserved}
                      </span>
                    </td>
                    <td className="p-2">
                      <InputNumber
                        value={item.quantity}
                        onValueChange={(e) =>
                          updateLineItem(index, "quantity", e.value)
                        }
                        min={1}
                        className="w-full"
                        inputClassName="p-2 border-none"
                        disabled={status !== "Draft"}
                      />
                    </td>
                    <td className="p-2">
                      <InputNumber
                        value={item.rate}
                        onValueChange={(e) =>
                          updateLineItem(index, "rate", e.value)
                        }
                        mode="currency"
                        currency="INR"
                        className="w-full"
                        inputClassName="p-2 border-none"
                        disabled={status !== "Draft"}
                      />
                    </td>
                    <td className="p-2 text-right">
                      <span className="font-medium">
                        ₹{((item.quantity || 0) * (item.rate || 0)).toFixed(2)}
                      </span>
                    </td>
                    {status === "Draft" && (
                      <td className="p-2">
                        <Button
                          icon="pi pi-trash"
                          severity="danger"
                          text
                          rounded
                          onClick={() => removeLineItem(item.id)}
                          disabled={lineItems.length === 1}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col items-end gap-2 pr-4">
            <div className="flex gap-10">
              <span className="text-gray-500">Subtotal:</span>
              <span className="font-bold">₹{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex gap-10">
              <span className="text-gray-500">GST (12% Avg):</span>
              <span className="font-bold">₹{totals.tax.toFixed(2)}</span>
            </div>
            <div className="border-t dark:border-dark-600 flex gap-10 pt-2 text-xl">
              <span className="font-bold">Total:</span>
              <span className="text-primary-600 font-bold">
                ₹{totals.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="dark:bg-dark-800 grid grid-cols-1 gap-4 rounded-lg bg-white p-4 shadow-sm md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Internal Remarks</label>
            <InputText
              area
              value={formValues.remarks}
              onChange={(e) =>
                setFormValues({ ...formValues, remarks: e.target.value })
              }
              placeholder="Add internal notes..."
              disabled={status !== "Draft"}
            />
          </div>
          <div className="flex flex-col items-center justify-center p-4">
            {status === "Confirmed" && (
              <div className="flex flex-col items-center gap-2 rounded-lg bg-primary-50 p-4 text-center dark:bg-primary-900/20">
                <i className="pi pi-info-circle text-primary-500 text-2xl" />
                <p className="text-sm">
                  Inventory has been reserved for this order.
                  <br />
                  Sales Invoice can now be generated.
                </p>
              </div>
            )}
            {status === "Invoiced" && (
              <div className="flex flex-col items-center gap-2 rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
                <i className="pi pi-check-circle text-green-500 text-2xl" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  Invoice Generated. Waiting for logistics to start delivery.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}

