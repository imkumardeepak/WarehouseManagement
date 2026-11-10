import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingDown, PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, Column } from "@/components/common/DataTable";
import { StockStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { useWms } from "@/store/WmsContext";
import { buildItemSummaries, ItemStockSummary } from "@/store/selectors";
import { formatCurrency, formatNumber } from "@/lib/format";

export default function LowStock() {
  const { state } = useWms();
  const navigate = useNavigate();
  const rows = useMemo(() => buildItemSummaries(state).filter((s) => s.status === "low-stock"), [state]);

  const columns: Column<ItemStockSummary>[] = [
    { id: "code", header: "Item Code", accessor: (r) => <span className="font-mono text-xs font-medium">{r.itemCode}</span>, sortable: true, sortValue: (r) => r.itemCode, csvValue: (r) => r.itemCode },
    { id: "name", header: "Item", accessor: (r) => <div><p className="font-medium">{r.itemName}</p><p className="text-xs text-muted-foreground">{r.categoryName}</p></div>, sortable: true, sortValue: (r) => r.itemName, csvValue: (r) => r.itemName },
    { id: "qty", header: "On Hand", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => <span className="font-semibold text-[hsl(32_90%_40%)]">{formatNumber(r.totalQty)} {r.unitSymbol}</span>, sortable: true, sortValue: (r) => r.totalQty, csvValue: (r) => r.totalQty },
    { id: "reorder", header: "Reorder Level", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => formatNumber(r.reorderLevel), csvValue: (r) => r.reorderLevel },
    { id: "short", header: "Shortfall", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => <span className="text-destructive">{formatNumber(Math.max(0, r.reorderLevel - r.totalQty))}</span>, csvValue: (r) => Math.max(0, r.reorderLevel - r.totalQty) },
    { id: "value", header: "Value", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => formatCurrency(r.value), csvValue: (r) => Math.round(r.value) },
    { id: "status", header: "Status", accessor: (r) => <StockStatusBadge status={r.status} />, csvValue: (r) => r.status },
    { id: "action", header: "", className: "text-right", accessor: () => <Button size="sm" variant="outline" onClick={() => navigate("/transactions/goods-receipt")}><PackagePlus className="h-4 w-4" /> Reorder</Button> },
  ];

  return (
    <div>
      <PageHeader
        title="Low Stock"
        description="Items at or below their reorder level — plan replenishment."
        breadcrumbs={[{ label: "Inventory" }, { label: "Low Stock" }]}
      />
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.itemId}
        searchText={(r) => `${r.itemCode} ${r.itemName} ${r.categoryName}`}
        searchPlaceholder="Search low stock items..."
        csvFilename="low-stock"
        emptyTitle="All stock levels healthy"
        emptyDescription="No items are below their reorder level right now."
      />
    </div>
  );
}
