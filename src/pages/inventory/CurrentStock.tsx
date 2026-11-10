import { useMemo, useState } from "react";
import { Boxes } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, Column } from "@/components/common/DataTable";
import { FilterDropdown } from "@/components/common/FilterDropdown";
import { StockStatusBadge } from "@/components/common/StatusBadge";
import { DetailDialog } from "@/components/common/DetailDialog";
import { useWms } from "@/store/WmsContext";
import { buildStockRows, StockRow } from "@/store/selectors";
import { formatCurrency, formatNumber } from "@/lib/format";

const statusOptions = [
  { value: "in-stock", label: "In Stock" },
  { value: "low-stock", label: "Low Stock" },
  { value: "out-of-stock", label: "Out of Stock" },
  { value: "expiring-soon", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
];

export default function CurrentStock() {
  const { state } = useWms();
  const rows = useMemo(() => buildStockRows(state), [state]);

  const [warehouse, setWarehouse] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [viewing, setViewing] = useState<StockRow | null>(null);

  const filtered = rows.filter(
    (r) =>
      (!warehouse || r.warehouseId === warehouse) &&
      (!category || r.categoryId === category) &&
      (!status || r.status === status),
  );

  const columns: Column<StockRow>[] = [
    { id: "code", header: "Item Code", accessor: (r) => <span className="font-mono text-xs font-medium">{r.itemCode}</span>, sortable: true, sortValue: (r) => r.itemCode, csvValue: (r) => r.itemCode },
    { id: "name", header: "Item", accessor: (r) => <div><p className="font-medium">{r.itemName}</p><p className="text-xs text-muted-foreground">{r.categoryName}</p></div>, sortable: true, sortValue: (r) => r.itemName, csvValue: (r) => r.itemName },
    { id: "warehouse", header: "Warehouse", accessor: (r) => r.warehouseName, csvValue: (r) => r.warehouseName },
    { id: "location", header: "Location", accessor: (r) => <span className="font-mono text-xs">{r.locationCode}</span>, csvValue: (r) => r.locationCode },
    { id: "batch", header: "Batch", accessor: (r) => r.batchNo, csvValue: (r) => r.batchNo },
    { id: "qty", header: "Available", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => <span className="font-semibold">{formatNumber(r.quantity)} {r.unitSymbol}</span>, sortable: true, sortValue: (r) => r.quantity, csvValue: (r) => r.quantity },
    { id: "value", header: "Stock Value", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => formatCurrency(r.stockValue), sortable: true, sortValue: (r) => r.stockValue, csvValue: (r) => Math.round(r.stockValue) },
    { id: "status", header: "Status", accessor: (r) => <StockStatusBadge status={r.status} />, csvValue: (r) => r.status },
  ];

  const itemBuckets = viewing ? rows.filter((r) => r.itemId === viewing.itemId) : [];

  return (
    <div>
      <PageHeader
        title="Current Stock"
        description="Live inventory balances across every warehouse, location and batch."
        breadcrumbs={[{ label: "Inventory" }, { label: "Current Stock" }]}
      />

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.itemCode} ${r.itemName} ${r.batchNo} ${r.locationCode} ${r.warehouseName}`}
        searchPlaceholder="Search stock..."
        csvFilename="current-stock"
        pageSize={12}
        onRowClick={(r) => setViewing(r)}
        filtersSlot={
          <>
            <FilterDropdown value={warehouse} onChange={setWarehouse} allLabel="All Warehouses" options={state.warehouses.map((w) => ({ value: w.id, label: w.name }))} />
            <FilterDropdown value={category} onChange={setCategory} allLabel="All Categories" options={state.categories.map((c) => ({ value: c.id, label: c.name }))} />
            <FilterDropdown value={status} onChange={setStatus} allLabel="All Statuses" options={statusOptions} />
          </>
        }
        emptyTitle="No stock found"
        emptyDescription="No inventory matches the selected filters."
      />

      {viewing && (
        <DetailDialog
          open={!!viewing}
          onOpenChange={(o) => !o && setViewing(null)}
          title={viewing.itemName}
          description={`${viewing.itemCode} · ${viewing.categoryName}`}
          rows={[
            { label: "Total Available (all buckets)", value: `${formatNumber(itemBuckets.reduce((s, b) => s + b.quantity, 0))} ${viewing.unitSymbol}` },
            { label: "Total Stock Value", value: formatCurrency(itemBuckets.reduce((s, b) => s + b.stockValue, 0)) },
            { label: "Reorder Level", value: formatNumber(viewing.reorderLevel) },
            { label: "Buckets", value: itemBuckets.length },
            {
              label: "Breakdown by location / batch",
              full: true,
              value: (
                <div className="mt-1 space-y-1.5">
                  {itemBuckets.map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                      <span>{b.warehouseName} · {b.locationCode} · {b.batchNo}</span>
                      <span className="font-semibold tabular-nums">{formatNumber(b.quantity)} {b.unitSymbol}</span>
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
