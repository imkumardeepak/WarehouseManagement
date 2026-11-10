import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, Column } from "@/components/common/DataTable";
import { FilterDropdown } from "@/components/common/FilterDropdown";
import { StockStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWms } from "@/store/WmsContext";
import { buildItemSummaries, ItemStockSummary } from "@/store/selectors";
import { formatCurrency, formatNumber } from "@/lib/format";
import { printHtml } from "@/lib/print";

export default function StockSummary() {
  const { state } = useWms();
  const all = useMemo(() => buildItemSummaries(state), [state]);
  const [category, setCategory] = useState("");
  const rows = all.filter((r) => !category || state.items.find((i) => i.id === r.itemId)?.categoryId === category);

  const totalQty = rows.reduce((s, r) => s + r.totalQty, 0);
  const totalValue = rows.reduce((s, r) => s + r.value, 0);

  const columns: Column<ItemStockSummary>[] = [
    { id: "code", header: "Code", accessor: (r) => <span className="font-mono text-xs">{r.itemCode}</span>, sortable: true, sortValue: (r) => r.itemCode, csvValue: (r) => r.itemCode },
    { id: "name", header: "Item", accessor: (r) => r.itemName, sortable: true, sortValue: (r) => r.itemName, csvValue: (r) => r.itemName },
    { id: "cat", header: "Category", accessor: (r) => r.categoryName, csvValue: (r) => r.categoryName },
    { id: "qty", header: "Quantity", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => `${formatNumber(r.totalQty)} ${r.unitSymbol}`, sortable: true, sortValue: (r) => r.totalQty, csvValue: (r) => r.totalQty },
    { id: "value", header: "Value", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => formatCurrency(r.value), sortable: true, sortValue: (r) => r.value, csvValue: (r) => Math.round(r.value) },
    { id: "status", header: "Status", accessor: (r) => <StockStatusBadge status={r.status} />, csvValue: (r) => r.status },
  ];

  const print = () => {
    const body = rows.map((r) => `<tr><td>${r.itemCode}</td><td>${r.itemName}</td><td>${r.categoryName}</td><td class="right">${r.totalQty} ${r.unitSymbol}</td><td class="right">${formatCurrency(r.value)}</td></tr>`).join("");
    printHtml("Stock Summary Report", `
      <div class="brand"><div><div class="logo">StockFlow</div><div class="muted">${state.settings.companyName}</div></div><div class="right"><h1>STOCK SUMMARY REPORT</h1></div></div>
      <table><thead><tr><th>Code</th><th>Item</th><th>Category</th><th class="right">Qty</th><th class="right">Value</th></tr></thead><tbody>${body}</tbody></table>
      <div class="totals">Total Quantity: ${formatNumber(totalQty)} &nbsp; | &nbsp; Total Value: ${formatCurrency(totalValue)}</div>`);
  };

  return (
    <div>
      <PageHeader title="Stock Summary Report" description="Item-wise quantity and valuation across all warehouses." breadcrumbs={[{ label: "Reports" }, { label: "Stock Summary" }]}
        actions={<Button variant="outline" onClick={print}><Printer className="h-4 w-4" /> Print</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Items</p><p className="mt-1 text-xl font-bold">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Quantity</p><p className="mt-1 text-xl font-bold">{formatNumber(totalQty)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Value</p><p className="mt-1 text-xl font-bold">{formatCurrency(totalValue)}</p></CardContent></Card>
      </div>
      <DataTable columns={columns} data={rows} rowKey={(r) => r.itemId} searchText={(r) => `${r.itemCode} ${r.itemName} ${r.categoryName}`} searchPlaceholder="Search items..." csvFilename="stock-summary-report"
        filtersSlot={<FilterDropdown value={category} onChange={setCategory} allLabel="All Categories" options={state.categories.map((c) => ({ value: c.id, label: c.name }))} />} />
    </div>
  );
}
