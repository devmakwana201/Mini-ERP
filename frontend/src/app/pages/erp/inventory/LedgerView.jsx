import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { InventoryService } from "services/inventory/inventory.service";

export default function LedgerView() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLedger = async () => {
      setLoading(true);
      const res = await InventoryService.getLedger(productId);
      if (res.success) {
        setProduct(res.data.product || null);
        setLedger(res.data.ledger || []);
      }
      setLoading(false);
    };
    fetchLedger();
  }, [productId]);

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Stock Ledger</h1>
        {product && (
          <p className="text-sm text-gray-500">
            {product.product_code} - {product.product_name} | On hand {product.on_hand_qty} {product.uom} | Reserved {product.reserved_qty}
          </p>
        )}
      </div>

      <DataTable value={ledger} loading={loading} emptyMessage="No ledger entries found" stripedRows className="text-sm">
        <Column field="created_at" header="Date" />
        <Column header="Type" body={(row) => <Tag value={row.txn_type} severity={row.txn_type === "IN" ? "success" : "info"} className="text-xs" />} />
        <Column field="qty" header="Qty" />
        <Column field="qty_before" header="Before" />
        <Column field="qty_after" header="After" />
        <Column field="reference_type" header="Reference" />
        <Column field="notes" header="Notes" />
      </DataTable>
    </div>
  );
}

