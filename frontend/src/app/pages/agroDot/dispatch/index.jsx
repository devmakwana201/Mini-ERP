import { useMemo, useRef, useState } from "react";
import { Page } from "components/shared/Page";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";

const orders = [
  {
    id: 1,
    soNo: "SO-AHM-2604-0002",
    buyer: "Green Fields Agro",
    location: "Ahmedabad Warehouse",
    status: "READY",
    item: "Urea (50kg)",
    pickedQty: 100,
    rate: 320,
  },
  {
    id: 2,
    soNo: "SO-SRT-2604-0001",
    buyer: "Agro Plus Store",
    location: "Surat Branch",
    status: "READY",
    item: "Paddy Seeds IR-64 (25kg)",
    pickedQty: 48,
    rate: 1500,
  },
  {
    id: 3,
    soNo: "SO-AHM-2604-0004",
    buyer: "Bharath Agro Centre",
    location: "Ahmedabad Warehouse",
    status: "PICKING",
    item: "Imidacloprid 17.8% (250ml)",
    pickedQty: 80,
    rate: 450,
  },
  {
    id: 4,
    soNo: "SO-RJK-2604-0003",
    buyer: "Field Fresh Products",
    location: "Rajkot Warehouse",
    status: "READY",
    item: "DAP Fertilizer (50kg)",
    pickedQty: 120,
    rate: 1125,
  },
  {
    id: 5,
    soNo: "SO-AHM-2604-0005",
    buyer: "Harvest Pro Industries",
    location: "Ahmedabad Warehouse",
    status: "READY",
    item: "Potash (50kg)",
    pickedQty: 64,
    rate: 980,
  },
  {
    id: 6,
    soNo: "SO-SRT-2604-0002",
    buyer: "Prime Agricultural Services",
    location: "Surat Branch",
    status: "READY",
    item: "Neem Cake (25kg)",
    pickedQty: 36,
    rate: 420,
  },
];

const initialDispatches = [
  {
    id: 1,
    challanNo: "CH-AHM-2604-0001",
    soNo: "SO-AHM-2604-0001",
    buyer: "PI Industries Ltd",
    vehicleNo: "GJ-01-AB-1234",
    driver: "Ramesh Patel",
    qty: 350,
    invoiceNo: "INV-AHM-2604-0001",
    status: "DISPATCHED",
    items: [
      {
        name: "Urea (50kg)",
        quantity: 175,
        rate: 320,
      },
      {
        name: "DAP Fertilizer (50kg)",
        quantity: 175,
        rate: 1125,
      },
    ],
  },
  {
    id: 2,
    challanNo: "CH-SRT-2604-0001",
    soNo: "SO-SRT-2604-0001",
    buyer: "Agro Plus Store",
    vehicleNo: "GJ-05-CD-8821",
    driver: "Mohan Das",
    qty: 12,
    invoiceNo: "",
    status: "CREATED",
    items: [
      {
        name: "Paddy Seeds IR-64 (25kg)",
        quantity: 12,
        rate: 1500,
      },
    ],
  },
  {
    id: 3,
    challanNo: "CH-AHM-2604-0002",
    soNo: "SO-AHM-2604-0002",
    buyer: "Green Fields Agro",
    vehicleNo: "GJ-01-CD-5678",
    driver: "Suresh Kumar",
    qty: 100,
    invoiceNo: "INV-AHM-2604-0002",
    status: "GATEPASS PENDING",
    items: [
      {
        name: "Urea (50kg)",
        quantity: 100,
        rate: 320,
      },
    ],
  },
  {
    id: 4,
    challanNo: "CH-RJK-2604-0001",
    soNo: "SO-RJK-2604-0001",
    buyer: "FarmCorp Solutions",
    vehicleNo: "GJ-18-EF-9012",
    driver: "Rajesh Singh",
    qty: 80,
    invoiceNo: "INV-RJK-2604-0001",
    status: "READY FOR DISPATCH",
    items: [
      {
        name: "Imidacloprid 17.8% (250ml)",
        quantity: 80,
        rate: 450,
      },
    ],
  },
];

const batchOptions = [
  { label: "FIFO: BAT-AHM-001", value: "BAT-AHM-001" },
  { label: "BAT-SRT-014", value: "BAT-SRT-014" },
  { label: "BAT-RJK-008", value: "BAT-RJK-008" },
];

const statusSeverity = {
  READY: "success",
  PICKING: "warning",
  CREATED: "info",
  "GATEPASS PENDING": "danger",
  "READY FOR DISPATCH": "success",
  DISPATCHED: "warning",
  DELIVERED: "success",
};

const statusLabel = {
  READY: "Ready",
  PICKING: "Picking",
  CREATED: "Invoice Generation Pending",
  "GATEPASS PENDING": "Gatepass Pending",
  "READY FOR DISPATCH": "Ready for dispatch",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
};

const formatMoney = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

export default function AgroDotDispatch() {
  const toast = useRef(null);
  const [dispatches, setDispatches] = useState(initialDispatches);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDispatchForView, setSelectedDispatchForView] = useState(null);
  const [dispatchQty, setDispatchQty] = useState(0);
  const [batchNo, setBatchNo] = useState(batchOptions[0].value);
  const [vehicleNo, setVehicleNo] = useState("");
  const [driver, setDriver] = useState("");

  const readyOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "READY" &&
          !dispatches.some((dispatch) => dispatch.soNo === order.soNo),
      ),
    [dispatches],
  );

  const totals = useMemo(
    () => ({
      ready: readyOrders.length,
      created: dispatches.filter((dispatch) => dispatch.status === "CREATED")
        .length,
      readyForDispatch: dispatches.filter(
        (dispatch) => dispatch.status === "READY FOR DISPATCH",
      ).length,
      inTransit: dispatches.filter(
        (dispatch) => dispatch.status === "DISPATCHED",
      ).length,
      delivered: dispatches.filter((dispatch) => dispatch.status === "DELIVERED")
        .length,
    }),
    [dispatches, readyOrders.length],
  );

  const openDispatchDialog = (order) => {
    setSelectedOrder(order);
    setDispatchQty(order.pickedQty);
    setBatchNo(batchOptions[0].value);
    setVehicleNo("");
    setDriver("");
  };

  const saveDispatch = () => {
    if (!vehicleNo.trim() || !driver.trim()) {
      toast.current.show({
        severity: "warn",
        summary: "Missing Details",
        detail: "Driver and vehicle details are required.",
        life: 2500,
      });
      return;
    }

    if (!dispatchQty || dispatchQty <= 0) {
      toast.current.show({
        severity: "warn",
        summary: "Invalid Quantity",
        detail: "Dispatch quantity must be greater than zero.",
        life: 2500,
      });
      return;
    }

    const locationCode = selectedOrder.location.startsWith("Surat")
      ? "SRT"
      : "AHM";
    const nextId = dispatches.length + 1;

    setDispatches((current) => [
      {
        id: nextId,
        challanNo: `CH-${locationCode}-2604-${String(nextId).padStart(4, "0")}`,
        soNo: selectedOrder.soNo,
        buyer: selectedOrder.buyer,
        vehicleNo,
        driver,
        qty: dispatchQty,
        batchNo,
        invoiceNo: "",
        status: "CREATED",
        items: [
          {
            name: selectedOrder.item,
            quantity: dispatchQty,
            rate: selectedOrder.rate,
          },
        ],
      },
      ...current,
    ]);
    setSelectedOrder(null);
    toast.current.show({
      severity: "success",
      summary: "Challan Created",
      detail: "Dispatch challan is ready for invoice and final dispatch.",
      life: 2500,
    });
  };

  const updateDispatch = (id, changes, message) => {
    setDispatches((current) =>
      current.map((dispatch) =>
        dispatch.id === id ? { ...dispatch, ...changes } : dispatch,
      ),
    );
    toast.current.show({
      severity: "success",
      summary: "Updated",
      detail: message,
      life: 2500,
    });
  };

  const actionTemplate = (row) => (
    <div className="flex flex-wrap gap-2">
      <Button
        label="View Items"
        icon="pi pi-eye"
        size="small"
        outlined
        onClick={() => setSelectedDispatchForView(row)}
      />
      {row.status === "READY FOR DISPATCH" && (
        <Button
          label="Dispatch"
          icon="pi pi-send"
          size="small"
          onClick={() =>
            updateDispatch(
              row.id,
              { status: "DISPATCHED" },
              "Goods marked as dispatched.",
            )
          }
        />
      )}
      {row.status === "DISPATCHED" && (
        <Button
          label="Mark as Delivered"
          icon="pi pi-check"
          size="small"
          severity="success"
          onClick={() =>
            updateDispatch(
              row.id,
              { status: "DELIVERED" },
              "Delivery completed.",
            )
          }
        />
      )}
    </div>
  );

  return (
    <Page title="Agro Dot Dispatch">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) py-5">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dispatch
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create challans from ready sales orders, generate invoice numbers,
            and move goods through dispatch.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Ready Orders", totals.ready, "text-emerald-600"],
            ["Challan Created", totals.created, "text-sky-600"],
            ["Ready for Dispatch", totals.readyForDispatch, "text-blue-600"],
            ["In Transit", totals.inTransit, "text-amber-600"],
            ["Delivered", totals.delivered, "text-green-700"],
          ].map(([label, value, color]) => (
            <div
              key={label}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-dark-500 dark:bg-dark-700"
            >
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        <div className="prime-card">
          <DataTable
            value={dispatches}
            header="Dispatch Records"
            paginator
            rows={10}
            tableStyle={{ minWidth: "64rem" }}
            emptyMessage="No dispatch records yet."
          >
            <Column field="challanNo" header="Challan#" sortable />
            <Column field="soNo" header="SO#" sortable />
            <Column field="buyer" header="Buyer" sortable />
            <Column field="qty" header="Dispatch Qty" sortable />
            <Column
              field="invoiceNo"
              header="Invoice#"
              body={(row) => row.invoiceNo || "-"}
            />
            <Column
              field="status"
              header="Status"
              body={(row) => (
                <Tag
                  value={statusLabel[row.status]}
                  severity={statusSeverity[row.status]}
                />
              )}
            />
            <Column header="Action" body={actionTemplate} />
          </DataTable>
        </div>
      </div>

      <Dialog
        header={`Create Dispatch ${selectedOrder?.soNo || ""}`}
        visible={!!selectedOrder}
        style={{ width: "min(92vw, 720px)" }}
        modal
        onHide={() => setSelectedOrder(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              outlined
              onClick={() => setSelectedOrder(null)}
            />
            <Button
              label="Save Challan"
              icon="pi pi-check"
              onClick={saveDispatch}
            />
          </div>
        }
      >
        {selectedOrder && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Buyer</label>
              <InputText value={selectedOrder.buyer} className="w-full" disabled />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Item</label>
              <InputText value={selectedOrder.item} className="w-full" disabled />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Batch</label>
              <Dropdown
                value={batchNo}
                options={batchOptions}
                onChange={(e) => setBatchNo(e.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Dispatch Qty
              </label>
              <InputNumber
                value={dispatchQty}
                onValueChange={(e) => setDispatchQty(e.value)}
                min={1}
                max={selectedOrder.pickedQty}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Vehicle No</label>
              <InputText
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                placeholder="GJ-01-AB-1234"
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Driver</label>
              <InputText
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                placeholder="Driver name"
                className="w-full"
              />
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        header={`Dispatch Items ${selectedDispatchForView?.challanNo || ""}`}
        visible={!!selectedDispatchForView}
        style={{ width: "min(92vw, 600px)" }}
        modal
        onHide={() => setSelectedDispatchForView(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Close"
              severity="secondary"
              outlined
              onClick={() => setSelectedDispatchForView(null)}
            />
          </div>
        }
      >
        {selectedDispatchForView && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="text-sm text-gray-500">Challan</div>
                <div className="font-semibold">{selectedDispatchForView.challanNo}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Buyer</div>
                <div className="font-semibold">{selectedDispatchForView.buyer}</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-100 divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Item</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Qty</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Rate</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedDispatchForView.items?.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(item.rate)}</td>
                      <td className="px-3 py-2 text-right">
                        {formatMoney(item.quantity * item.rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Dialog>
    </Page>
  );
}
