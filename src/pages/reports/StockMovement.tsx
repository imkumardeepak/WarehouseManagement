import { useMemo, useState } from "react";
import { Printer, ArrowDownToLine, ArrowUpFromLine, Scale } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, Column } from "@/components/common/DataTable";
import { FilterDropdown } from "@/components/common/FilterDropdown";
import { DateRangeFilter, DateRange } from "@/components/common/DateRangeFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWms } from "@/store/WmsContext";
import { useTheme } from "@/store/ThemeContext";
import { buildLookups } from "@/store/selectors";
import { formatNumber } from "@/lib/format";
import { printHtml } from "@/lib/print";
import { cn } from "@/lib/utils";

interface Agg { itemId: string; name: string; code: string; qtyIn: number; qtyOut: number; }

export default function StockMovement() {
  const { state } = useWms();
  const { primary } = useTheme();
  const lk = useMemo(() => buildLookups(state), [state]);
  const [warehouse, setWarehouse] = useState("");
  const [item, setItem] = useState("");
  const [range, setRange] = useState<DateRange>({ from: "", to: "" });

  const filteredLedger = useMemo(() => state.ledger.filter((l) => {
    if (warehouse && l.warehouseId !== warehouse) return false;
    if (item && l.itemId !== item) return false;
    if (range.from && new Date(l.date) < new Date(range.from)) return false;
    if (range.to && new Date(l.date) > new Date(range.to + "T23:59:59")) return false;
    return true;
  }), [state.ledger, warehouse, item, range]);

  const totalIn = filteredLedger.reduce((s, l) => s + l.qtyIn, 0);
  const totalOut = filteredLedger.reduce((s, l) => s + l.qtyOut, 0);

  const chartData = useMemo(() => {
    const map = new Map<string, { in: number; out: number }>();
    filteredLedger.forEach((l) => {
      const key = new Date(l.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      const e = map.get(key) ?? { in: 0, out: 0 };
      e.in += l.qtyIn; e.out += l.qtyOut; map.set(key, e);
    });
    return Array.from(map.entries()).map(([label, v]) => ({ label, ...v }));
  }, [filteredLedger]);

  const aggregated: Agg[] = useMemo(() => {
    const map = new Map<string, Agg>();
    filteredLedger.forEach((l) => {
      const e = map.get(l.itemId) ?? { itemId: l.itemId, name: lk.item(l.itemId)?.name ?? "—", code: lk.item(l.itemId)?.sku ?? "—", qtyIn: 0, qtyOut: 0 };
      e.qtyIn += l.qtyIn; e.qtyOut += l.qtyOut; map.set(l.itemId, e);
    });
    return Array.from(map.values());
  }, [filteredLedger, lk]);

  const columns: Column<Agg>[] = [
    { id: "code", header: "Code", accessor: (r) => <span className="font-mono text-xs">{r.code}</span>, sortable: true, sortValue: (r) => r.code, csvValue: (r) => r.code },
    { id: "name", header: "Item", accessor: (r) => r.name, sortable: true, sortValue: (r) => r.name, csvValue: (r) => r.name },
    { id: "in", header: "Stock IN", className: "text-right tabular-nums text-success", headerClassName: "text-right", accessor: (r) => formatNumber(r.qtyIn), sortable: true, sortValue: (r) => r.qtyIn, csvValue: (r) => r.qtyIn },
    { id: "out", header: "Stock OUT", className: "text-right tabular-nums text-destructive", headerClassName: "text-right", accessor: (r) => formatNumber(r.qtyOut), sortable: true, sortValue: (r) => r.qtyOut, csvValue: (r) => r.qtyOut },
    { id: "net", header: "Net", className: "text-right tabular-nums font-semibold", headerClassName: "text-right", accessor: (r) => { const n = r.qtyIn - r.qtyOut; return <span className={n >= 0 ? "text-success" : "text-destructive"}>{n >= 0 ? "+" : ""}{formatNumber(n)}</span>; }, sortable: true, sortValue: (r) => r.qtyIn - r.qtyOut, csvValue: (r) => r.qtyIn - r.qtyOut },
  ];

  const print = () => {
    const body = aggregated.map((r) => `<tr><td>${r.code}</td><td>${r.name}</td><td class="right">${r.qtyIn}</td><td class="right">${r.qtyOut}</td><td class="right">${r.qtyIn - r.qtyOut}</td></tr>`).join("");
    printHtml("Stock Movement Report", `<div class="brand"><div><div class="logo">StockFlow</div><div class="muted">${state.settings.companyName}</div></div><div class="right"><h1>STOCK MOVEMENT REPORT</h1></div></div>
      <table><thead><tr><th>Code</th><th>Item</th><th class="right">IN</th><th class="right">OUT</th><th class="right">Net</th></tr></thead><tbody>${body}</tbody></table>
      <div class="totals">Total IN: ${formatNumber(totalIn)} &nbsp;|&nbsp; Total OUT: ${formatNumber(totalOut)}</div>`);
  };

  const summary = [
    { label: "Total Stock IN", value: totalIn, icon: ArrowDownToLine, tone: "bg-success/10 text-success" },
    { label: "Total Stock OUT", value: totalOut, icon: ArrowUpFromLine, tone: "bg-destructive/10 text-destructive" },
    { label: "Net Movement", value: totalIn - totalOut, icon: Scale, tone: "bg-info/10 text-info" },
  ];

  return (
    <div>
      <PageHeader title="Stock Movement Report" description="IN and OUT movement over a period, by item." breadcrumbs={[{ label: "Reports" }, { label: "Stock Movement" }]}
        actions={<Button variant="outline" onClick={print}><Printer className="h-4 w-4" /> Print</Button>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterDropdown value={warehouse} onChange={setWarehouse} allLabel="All Warehouses" options={state.warehouses.map((w) => ({ value: w.id, label: w.name }))} />
        <FilterDropdown value={item} onChange={setItem} allLabel="All Items" options={state.items.map((i) => ({ value: i.id, label: i.name }))} />
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summary.map((s) => (
          <Card key={s.label}><CardContent className="flex items-center gap-3 p-4">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", s.tone)}><s.icon className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold tabular-nums">{formatNumber(s.value)}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle>Movement Trend</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ left: -16, right: 8 }}>
              <defs>
                <linearGradient id="mIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={primary} stopOpacity={0.3} /><stop offset="95%" stopColor={primary} stopOpacity={0} /></linearGradient>
                <linearGradient id="mOut" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="in" name="IN" stroke={primary} strokeWidth={2} fill="url(#mIn)" />
              <Area type="monotone" dataKey="out" name="OUT" stroke="#ef4444" strokeWidth={2} fill="url(#mOut)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <DataTable columns={columns} data={aggregated} rowKey={(r) => r.itemId} searchText={(r) => `${r.code} ${r.name}`} searchPlaceholder="Search items..." csvFilename="stock-movement-report"
        emptyTitle="No movement" emptyDescription="No stock movements match the selected filters." />
    </div>
  );
}
