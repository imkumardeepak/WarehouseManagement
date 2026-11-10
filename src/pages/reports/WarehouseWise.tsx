import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, Column } from "@/components/common/DataTable";
import { FilterDropdown } from "@/components/common/FilterDropdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWms } from "@/store/WmsContext";
import { buildLookups } from "@/store/selectors";
import { formatCurrency, formatNumber } from "@/lib/format";
import { printHtml } from "@/lib/print";

interface Row { key: string; warehouse: string; itemCode: string; itemName: string; qty: number; value: number; }

export default function WarehouseWise() {
  const { state } = useWms();
  const lk = useMemo(() => buildLookups(state), [state]);
  const [warehouse, setWarehouse] = useState("");

  const rows: Row[] = useMemo(() => {
    const map = new Map<string, Row>();
    state.balances.filter((b) => b.quantity > 0).forEach((b) => {
      const key = `${b.warehouseId}|${b.itemId}`;
      const e = map.get(key) ?? { key, warehouse: lk.warehouse(b.warehouseId)?.name ?? "—", itemCode: lk.item(b.itemId)?.sku ?? "—", itemName: lk.item(b.itemId)?.name ?? "—", qty: 0, value: 0 };
      e.qty += b.quantity; e.value += b.quantity * b.avgCost; map.set(key, e);
    });
    return Array.from(map.values());
  }, [state.balances, lk]);

  const filtered = rows.filter((r) => !warehouse || r.warehouse === lk.warehouse(warehouse)?.name);
  const totalValue = filtered.reduce((s, r) => s + r.value, 0);

  const perWarehouse = useMemo(() => state.warehouses.map((w) => ({
    name: w.name,
    qty: state.balances.filter((b) => b.warehouseId === w.id).reduce((s, b) => s + b.quantity, 0),
    value: state.balances.filter((b) => b.warehouseId === w.id).reduce((s, b) => s + b.quantity * b.avgCost, 0),
  })), [state]);

  const columns: Column<Row>[] = [
    { id: "wh", header: "Warehouse", accessor: (r) => <span className="font-medium">{r.warehouse}</span>, sortable: true, sortValue: (r) => r.warehouse, csvValue: (r) => r.warehouse },
    { id: "code", header: "Item Code", accessor: (r) => <span className="font-mono text-xs">{r.itemCode}</span>, csvValue: (r) => r.itemCode },
    { id: "name", header: "Item", accessor: (r) => r.itemName, sortable: true, sortValue: (r) => r.itemName, csvValue: (r) => r.itemName },
    { id: "qty", header: "Quantity", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => formatNumber(r.qty), sortable: true, sortValue: (r) => r.qty, csvValue: (r) => r.qty },
    { id: "value", header: "Value", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => formatCurrency(r.value), sortable: true, sortValue: (r) => r.value, csvValue: (r) => Math.round(r.value) },
  ];

  const print = () => {
    const body = filtered.map((r) => `<tr><td>${r.warehouse}</td><td>${r.itemCode}</td><td>${r.itemName}</td><td class="right">${r.qty}</td><td class="right">${formatCurrency(r.value)}</td></tr>`).join("");
    printHtml("Warehouse-wise Stock Report", `<div class="brand"><div><div class="logo">StockFlow</div><div class="muted">${state.settings.companyName}</div></div><div class="right"><h1>WAREHOUSE-WISE STOCK REPORT</h1></div></div>
      <table><thead><tr><th>Warehouse</th><th>Code</th><th>Item</th><th class="right">Qty</th><th class="right">Value</th></tr></thead><tbody>${body}</tbody></table>
      <div class="totals">Total Value: ${formatCurrency(totalValue)}</div>`);
  };

  return (
    <div>
      <PageHeader title="Warehouse-wise Stock Report" description="Stock quantity and value broken down by warehouse." breadcrumbs={[{ label: "Reports" }, { label: "Warehouse-wise" }]}
        actions={<Button variant="outline" onClick={print}><Printer className="h-4 w-4" /> Print</Button>} />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {perWarehouse.map((w) => (
          <Card key={w.name}><CardContent className="p-4">
            <p className="truncate text-sm font-semibold">{w.name}</p>
            <div className="mt-2 flex items-end justify-between">
              <div><p className="text-xs text-muted-foreground">Qty</p><p className="text-lg font-bold tabular-nums">{formatNumber(w.qty)}</p></div>
              <div className="text-right"><p className="text-xs text-muted-foreground">Value</p><p className="text-lg font-bold tabular-nums text-primary">{formatCurrency(w.value)}</p></div>
            </div>
          </CardContent></Card>
        ))}
      </div>
      <DataTable columns={columns} data={filtered} rowKey={(r) => r.key} searchText={(r) => `${r.warehouse} ${r.itemCode} ${r.itemName}`} searchPlaceholder="Search..." csvFilename="warehouse-wise-report" pageSize={12}
        filtersSlot={<FilterDropdown value={warehouse} onChange={setWarehouse} allLabel="All Warehouses" options={state.warehouses.map((w) => ({ value: w.id, label: w.name }))} />} />
    </div>
  );
}
