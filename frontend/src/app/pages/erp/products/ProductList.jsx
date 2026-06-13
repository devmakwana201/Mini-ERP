import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Badge } from "primereact/badge";
import { Toast } from "primereact/toast";
import { Dropdown } from "primereact/dropdown";
import { ProductService } from "services/products/product.service";

const PRODUCT_TYPES = [
  { label: "All Types", value: "" },
  { label: "Storable", value: "storable" },
  { label: "Consumable", value: "consumable" },
  { label: "Service", value: "service" },
];

export default function ProductList() {
  const navigate = useNavigate();
  const toast = useRef(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [productType, setProductType] = useState("");

  const fetch = async () => {
    setLoading(true);
    const params = { page, limit: 20, search };
    if (productType) params.product_type = productType;
    const res = await ProductService.getAll(params);
    if (res.success) {
      setProducts(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [page, search, productType]);

  const stockBody = (row) => {
    const free = parseFloat(row.free_to_use_qty || 0);
    const reserved = parseFloat(row.reserved_qty || 0);
    const onHand = parseFloat(row.on_hand_qty || 0);
    const isLow = onHand <= parseFloat(row.min_stock_qty || 0);
    return (
      <div className="flex flex-col gap-0.5 text-xs">
        <span className={`font-semibold ${isLow ? "text-red-500" : "text-green-600"}`}>
          {onHand} {row.uom}
        </span>
        <span className="text-gray-400">Res: {reserved} | Free: {free}</span>
        {isLow && <Tag value="LOW" severity="danger" className="text-xs py-0" />}
      </div>
    );
  };

  const typeBody = (row) => (
    <Tag value={row.product_type} severity="info" className="text-xs capitalize" />
  );

  const priceBody = (row) => (
    <div className="text-xs">
      <div>Sale: ₹{parseFloat(row.sales_price || 0).toFixed(2)}</div>
      <div className="text-gray-400">Cost: ₹{parseFloat(row.cost_price || 0).toFixed(2)}</div>
    </div>
  );

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Products</h1>
          <p className="text-sm text-gray-500">{total} total products</p>
        </div>
        <Button label="New Product" icon="pi pi-plus" onClick={() => navigate("/products/new")} />
      </div>

      <div className="mb-3 flex flex-wrap gap-3 items-center">
        <Dropdown value={productType} options={PRODUCT_TYPES} onChange={(e) => { setProductType(e.value); setPage(1); }}
          placeholder="Filter by type" className="w-44" />
        <InputText placeholder="Search by name or code..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-64" />
        <Button icon="pi pi-refresh" text onClick={fetch} />
      </div>

      <DataTable value={products} loading={loading} emptyMessage="No products found" stripedRows className="text-sm">
        <Column field="product_code" header="Code" sortable />
        <Column field="product_name" header="Product Name" sortable />
        <Column header="Type" body={typeBody} />
        <Column header="Stock" body={stockBody} />
        <Column header="Price" body={priceBody} />
        <Column header="" body={(row) => (
          <Button icon="pi pi-eye" size="small" text onClick={() => navigate(`/products/${row.product_id}`)} />
        )} style={{ width: "60px" }} />
      </DataTable>

      <div className="mt-3 flex gap-2 items-center text-sm text-gray-500">
        <Button icon="pi pi-chevron-left" size="small" text disabled={page <= 1}
          onClick={() => setPage(p => Math.max(1, p - 1))} />
        <span>Page {page}</span>
        <Button icon="pi pi-chevron-right" size="small" text disabled={products.length < 20}
          onClick={() => setPage(p => p + 1)} />
      </div>
    </div>
  );
}
