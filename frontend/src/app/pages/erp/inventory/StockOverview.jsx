import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { ProductService } from "services/products/product.service";

const rowsFrom = (res) => res?.data?.data || res?.data || [];

export default function StockOverview() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    const res = await ProductService.getAll({ page: 1, limit: 100, search });
    if (res.success) setProducts(rowsFrom(res));
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const stockBody = (row) => {
    const onHand = Number(row.on_hand_qty || 0);
    const reserved = Number(row.reserved_qty || 0);
    const free = Number(row.free_to_use_qty ?? onHand - reserved);
    const min = Number(row.min_stock_qty || 0);
    const low = free <= min;

    return (
      <div className="flex flex-col gap-1">
        <div className="flex gap-2 text-xs">
          <span>On hand: {onHand.toFixed(3)} {row.uom}</span>
          <span className="text-amber-600">Reserved: {reserved.toFixed(3)}</span>
          <span className={low ? "text-red-600" : "text-green-600"}>Free: {free.toFixed(3)}</span>
        </div>
        <Tag value={low ? "LOW STOCK" : "HEALTHY"} severity={low ? "danger" : "success"} className="w-fit text-xs" />
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Stock Overview</h1>
          <p className="text-sm text-gray-500">{products.length} products loaded</p>
        </div>
        <div className="flex gap-2">
          <Button label="Transactions" icon="pi pi-list" outlined onClick={() => navigate("/inventory/transactions")} />
          <Button label="Reservations" icon="pi pi-lock" outlined onClick={() => navigate("/inventory/reservations")} />
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="w-72" />
        <Button icon="pi pi-refresh" text onClick={fetchProducts} />
      </div>

      <DataTable value={products} loading={loading} emptyMessage="No stock records found" stripedRows className="text-sm">
        <Column field="product_code" header="Code" sortable />
        <Column field="product_name" header="Product" sortable />
        <Column header="Stock" body={stockBody} />
        <Column field="procurement_strategy" header="Strategy" />
        <Column header="" body={(row) => (
          <Button icon="pi pi-chart-line" text size="small" onClick={() => navigate(`/inventory/ledger/${row.product_id}`)} />
        )} style={{ width: "60px" }} />
      </DataTable>
    </div>
  );
}

