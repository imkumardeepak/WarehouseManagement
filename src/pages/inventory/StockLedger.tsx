import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, Column } from "@/components/common/DataTable";
import { FilterDropdown } from "@/components/common/FilterDropdown";
import { DateRangeFilter, DateRange } from "@/components/common/DateRangeFilter";
import { Badge } from "@/components/ui/badge";
import { useWms } from "@/store/WmsContext";
import { buildLookups } from "@/store/selectors";
import { InventoryLedger, LedgerType } from "@/types";
import { formatDate, formatNumber } from "@/lib/format";

const typeLabels: Record<LedgerType, { label: string; variant: "success" | "destructive" | "info" | "warning" | "muted" }> = {
  opening: { label: "Opening", variant: "muted" },
  receipt: { label: "Receipt", variant: "success" },
  issue: { label: "Issue", variant: "destructive" },
  "transfer-in": { label: "Transfer In", variant: "info" },
  "transfer-out": { label: "Transfer Out", variant: "warning" },
  "adjustment-in": { label: "Adj (+)", variant: "success" },
  "adjustment-out": { label: "Adj (−)", variant: "destructive" },
};

const typeFilterOptions = Object.entries(typeLabels).map(([value, v]) => ({ value, label: v.label }));

export default function StockLedger() {
  const { state } = useWms();
  const lk = useMemo(() => buildLookups(state), [state]);

  const [item, setItem] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [type, setType] = useState("");
  const [range, setRange] = useState<DateRange>({ from: "", to: "" });

  const sorted = useMemo(
    () => [...state.ledger].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [state.ledger],
  );

  const filtered = sorted.filter((l) => {
    if (item && l.itemId !== item) return false;
    if (warehouse && l.warehouseId !== warehouse) return false;
    if (type && l.type !== type) return false;
    if (range.from && new Date(l.date) < new Date(range.from)) return false;
    if (range.to && new Date(l.date) > new Date(range.to + "T23:59:59")) return false;
    return true;
  });

  const columns: Column<InventoryLedger>[] = [
    { id: "date", header: "Date", accessor: (r) => formatDate(r.date), sortable: true, sortValue: (r) => r.date, csvValue: (r) => formatDate(r.date) },
    { id: "doc", header: "Document", accessor: (r) => <span className="font-medium">{r.docNo}</span>, csvValue: (r) => r.docNo },
    { id: "type", header: "Type", accessor: (r) => <Badge variant={typeLabels[r.type].variant}>{typeLabels[r.type].label}</Badge>, csvValue: (r) => typeLabels[r.type].label },
    { id: "item", header: "Item", accessor: (r) => lk.item(r.itemId)?.name ?? "—", csvValue: (r) => lk.item(r.itemId)?.name ?? "" },
    { id: "wh", header: "Warehouse", accessor: (r) => lk.warehouse(r.warehouseId)?.code ?? "—", csvValue: (r) => lk.warehouse(r.warehouseId)?.name ?? "" },
    { id: "loc", header: "Location", accessor: (r) => <span className="font-mono text-xs">{lk.location(r.locationId)?.code ?? "—"}</span>, csvValue: (r) => lk.location(r.locationId)?.code ?? "" },
    { id: "batch", header: "Batch", accessor: (r) => r.batchNo || "—", csvValue: (r) => r.batchNo },
    { id: "in", header: "IN", className: "text-right tabular-nums text-success", headerClassName: "text-right", accessor: (r) => (r.qtyIn ? `+${formatNumber(r.qtyIn)}` : "—"), csvValue: (r) => r.qtyIn },
    { id: "out", header: "OUT", className: "text-right tabular-nums text-destructive", headerClassName: "text-right", accessor: (r) => (r.qtyOut ? `−${formatNumber(r.qtyOut)}` : "—"), csvValue: (r) => r.qtyOut },
    { id: "bal", header: "Balance", className: "text-right tabular-nums font-semibold", headerClassName: "text-right", accessor: (r) => formatNumber(r.balanceAfter), csvValue: (r) => r.balanceAfter },
    { id: "ref", header: "Reference", accessor: (r) => <span className="text-muted-foreground">{r.reference || "—"}</span>, csvValue: (r) => r.reference },
    { id: "user", header: "User", accessor: (r) => r.user, csvValue: (r) => r.user },
  ];

  return (
    <div>
      <PageHeader
        title="Stock Ledger"
        description="Every stock movement with running balances per item, location and batch."
        breadcrumbs={[{ label: "Inventory" }, { label: "Stock Ledger" }]}
      />

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.docNo} ${lk.item(r.itemId)?.name ?? ""} ${r.reference} ${r.batchNo}`}
        searchPlaceholder="Search ledger..."
        csvFilename="stock-ledger"
        pageSize={15}
        filtersSlot={
          <>
            <FilterDropdown value={item} onChange={setItem} allLabel="All Items" options={state.items.map((i) => ({ value: i.id, label: i.name }))} />
            <FilterDropdown value={warehouse} onChange={setWarehouse} allLabel="All Warehouses" options={state.warehouses.map((w) => ({ value: w.id, label: w.name }))} />
            <FilterDropdown value={type} onChange={setType} allLabel="All Types" options={typeFilterOptions} />
            <DateRangeFilter value={range} onChange={setRange} />
          </>
        }
        emptyTitle="No ledger entries"
        emptyDescription="No movements match the selected filters."
      />
    </div>
  );
}
