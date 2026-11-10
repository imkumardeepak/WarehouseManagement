import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, Column } from "@/components/common/DataTable";
import { FilterDropdown } from "@/components/common/FilterDropdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWms } from "@/store/WmsContext";
import { useTheme } from "@/store/ThemeContext";
import { buildLookups } from "@/store/selectors";
import { formatCurrency, formatNumber } from "@/lib/format";
import { printHtml } from "@/lib/print";

interface Row { key: string; itemId: string; code: string; name: string; category: string; warehouse: string; qty: number; avgCost: number; value: number; }

export default function StockValuation() {
  const { state } = useWms();
  const { primary } = useTheme();
  const lk = useMemo(() => buildLookups(state), [state]);
  const [warehouse, setWarehouse] = useState("");
  const [category, setCategory] = useState("");

  const rows: Row[] = useMemo(() => state.balances.filter((b) => b.quantity > 0).map((b) => {
    const item = lk.item(b.itemId);
    return {
      key: b.id, itemId: b.itemId, code: item?.sku ?? "—", name: item?.name ?? "—",
      category: item ? lk.category(item.categoryId)?.name ?? "—" : "—",
      warehouse: lk.warehouse(b.warehouseId)?.name ?? "—",
      qty: b.quantity, avgCost: b.avgCost, value: b.quantity * b.avgCost,
    };
  }), [state, lk]);

  const filtered = rows.filter((r) =>
    (!warehouse || lk.warehouse(warehouse)?.name === r.warehouse) &&
    (!category || lk.category(category)?.name === r.category));

  const total = filtered.reduce((s, r) => s + r.value, 0);

  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => map.set(r.category, (map.get(r.category) ?? 0) + r.value));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [filtered]);

  const columns: Column<Row>[] = [
    { id: "code", header: "Code", accessor: (r) => <span className="font-mono text-xs">{r.code}</span>, sortable: true, sortValue: (r) => r.code, csvValue: (r) => r.code },
    { id: "name", header: "Item", accessor: (r) => r.name, sortable: true, sortValue: (r) => r.name, csvValue: (r) => r.name },
    { id: "cat", header: "Category", accessor: (r) => r.category, csvValue: (r) => r.category },
    { id: "wh", header: "Warehouse", accessor: (r) => r.warehouse, csvValue: (r) => r.warehouse },
    { id: "qty", header: "Qty", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => formatNumber(r.qty), sortable: true, sortValue: (r) => r.qty, csvValue: (r) => r.qty },
    { id: "cost", header: "Avg Cost", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => formatCurrency(r.avgCost), csvValue: (r) => Math.round(r.avgCost) },
    { id: "value", header: "Value", className: "text-right tabular-nums font-semibold", headerClassName: "text-right", accessor: (r) => formatCurrency(r.value), sortable: true, sortValue: (r) => r.value, csvValue: (r) => Math.round(r.value) },
  ];

  const print = () => {
    const body = filtered.map((r) => `<tr><td>${r.code}</td><td>${r.name}</td><td>${r.warehouse}</td><td class="right">${r.qty}</td><td class="right">${formatCurrency(r.avgCost)}</td><td class="right">${formatCurrency(r.value)}</td></tr>`).join("");
    printHtml("Stock Valuation Report", `<div class="brand"><div><div class="logo">StockFlow</div><div class="muted">${state.settings.companyName}</div></div><div class="right"><h1>STOCK VALUATION REPORT</h1></div></div>
      <table><thead><tr><th>Code</th><th>Item</th><th>Warehouse</th><th class="right">Qty</th><th class="right">Avg Cost</th><th class="right">Value</th></tr></thead><tbody>${body}</tbody></table>
      <div class="totals">Total Valuation: ${formatCurrency(total)}</div>`);
  };

  return (
    <div>
      <PageHeader title="Stock Valuation Report" description="Current inventory value at weighted-average cost." breadcrumbs={[{ label: "Reports" }, { label: "Stock Valuation" }]}
        actions={<Button variant="outline" onClick={print}><Printer className="h-4 w-4" /> Print</Button>} />

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Valuation by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <RTooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="value" name="Value" fill={primary} radius={[6, 6, 0, 0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="flex items-center justify-center">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Total Inventory Valuation</p>
            <p className="mt-2 text-3xl font-bold text-primary">{formatCurrency(total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{filtered.length} stock buckets</p>
          </CardContent>
        </Card>
      </div>

      <DataTable columns={columns} data={filtered} rowKey={(r) => r.key} searchText={(r) => `${r.code} ${r.name} ${r.category} ${r.warehouse}`} searchPlaceholder="Search..." csvFilename="stock-valuation-report"
        filtersSlot={<>
          <FilterDropdown value={warehouse} onChange={setWarehouse} allLabel="All Warehouses" options={state.warehouses.map((w) => ({ value: w.id, label: w.name }))} />
          <FilterDropdown value={category} onChange={setCategory} allLabel="All Categories" options={state.categories.map((c) => ({ value: c.id, label: c.name }))} />
        </>} />
    </div>
  );
}
