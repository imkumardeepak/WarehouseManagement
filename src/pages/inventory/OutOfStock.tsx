import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, Column } from "@/components/common/DataTable";
import { StockStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { useWms } from "@/store/WmsContext";
import { buildItemSummaries, ItemStockSummary } from "@/store/selectors";
import { formatNumber } from "@/lib/format";

export default function OutOfStock() {
  const { state } = useWms();
  const navigate = useNavigate();
  const rows = useMemo(() => buildItemSummaries(state).filter((s) => s.status === "out-of-stock"), [state]);

  const columns: Column<ItemStockSummary>[] = [
    { id: "code", header: "Item Code", accessor: (r) => <span className="font-mono text-xs font-medium">{r.itemCode}</span>, sortable: true, sortValue: (r) => r.itemCode, csvValue: (r) => r.itemCode },
    { id: "name", header: "Item", accessor: (r) => <div><p className="font-medium">{r.itemName}</p><p className="text-xs text-muted-foreground">{r.categoryName}</p></div>, sortable: true, sortValue: (r) => r.itemName, csvValue: (r) => r.itemName },
    { id: "reorder", header: "Reorder Level", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => formatNumber(r.reorderLevel), csvValue: (r) => r.reorderLevel },
    { id: "min", header: "Min Stock", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => formatNumber(r.minStock), csvValue: (r) => r.minStock },
    { id: "status", header: "Status", accessor: (r) => <StockStatusBadge status={r.status} />, csvValue: (r) => r.status },
    { id: "action", header: "", className: "text-right", accessor: () => <Button size="sm" variant="outline" onClick={() => navigate("/transactions/goods-receipt")}><PackagePlus className="h-4 w-4" /> Receive Stock</Button> },
  ];

  return (
    <div>
      <PageHeader
        title="Out of Stock"
        description="Items with zero available quantity across all warehouses."
        breadcrumbs={[{ label: "Inventory" }, { label: "Out of Stock" }]}
      />
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.itemId}
        searchText={(r) => `${r.itemCode} ${r.itemName} ${r.categoryName}`}
        searchPlaceholder="Search out of stock items..."
        csvFilename="out-of-stock"
        emptyTitle="Nothing out of stock"
        emptyDescription="Every item currently has stock on hand."
      />
    </div>
  );
}
