import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, Column } from "@/components/common/DataTable";
import { FilterDropdown } from "@/components/common/FilterDropdown";
import { DateRangeFilter, DateRange } from "@/components/common/DateRangeFilter";
import { DocStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWms } from "@/store/WmsContext";
import { buildLookups } from "@/store/selectors";
import { GoodsReceipt } from "@/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { printHtml } from "@/lib/print";

export default function GoodsReceiptReport() {
  const { state } = useWms();
  const lk = useMemo(() => buildLookups(state), [state]);
  const [supplier, setSupplier] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [range, setRange] = useState<DateRange>({ from: "", to: "" });

  const rows = state.goodsReceipts.filter((d) => {
    if (d.status !== "posted") return false;
    if (supplier && d.supplierId !== supplier) return false;
    if (warehouse && d.warehouseId !== warehouse) return false;
    if (range.from && new Date(d.date) < new Date(range.from)) return false;
    if (range.to && new Date(d.date) > new Date(range.to + "T23:59:59")) return false;
    return true;
  });

  const totalValue = rows.reduce((s, d) => s + d.lines.reduce((x, l) => x + l.quantity * l.unitCost, 0), 0);
  const totalQty = rows.reduce((s, d) => s + d.lines.reduce((x, l) => x + l.quantity, 0), 0);

  const columns: Column<GoodsReceipt>[] = [
    { id: "docNo", header: "GRN No", accessor: (r) => <span className="font-medium">{r.docNo}</span>, sortable: true, sortValue: (r) => r.docNo, csvValue: (r) => r.docNo },
    { id: "date", header: "Date", accessor: (r) => formatDate(r.date), sortable: true, sortValue: (r) => r.date, csvValue: (r) => formatDate(r.date) },
    { id: "supplier", header: "Supplier", accessor: (r) => lk.supplier(r.supplierId)?.name ?? "—", csvValue: (r) => lk.supplier(r.supplierId)?.name ?? "" },
    { id: "wh", header: "Warehouse", accessor: (r) => lk.warehouse(r.warehouseId)?.name ?? "—", csvValue: (r) => lk.warehouse(r.warehouseId)?.name ?? "" },
    { id: "inv", header: "Invoice", accessor: (r) => r.invoiceNumber || "—", csvValue: (r) => r.invoiceNumber },
    { id: "qty", header: "Qty", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => formatNumber(r.lines.reduce((s, l) => s + l.quantity, 0)), csvValue: (r) => r.lines.reduce((s, l) => s + l.quantity, 0) },
    { id: "value", header: "Value", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => formatCurrency(r.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0)), sortable: true, sortValue: (r) => r.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0), csvValue: (r) => Math.round(r.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0)) },
    { id: "status", header: "Status", accessor: (r) => <DocStatusBadge status={r.status} />, csvValue: (r) => r.status },
  ];

  const print = () => {
    const body = rows.map((d) => `<tr><td>${d.docNo}</td><td>${formatDate(d.date)}</td><td>${lk.supplier(d.supplierId)?.name ?? ""}</td><td>${lk.warehouse(d.warehouseId)?.name ?? ""}</td><td class="right">${d.lines.reduce((s, l) => s + l.quantity, 0)}</td><td class="right">${formatCurrency(d.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0))}</td></tr>`).join("");
    printHtml("Goods Receipt Report", `<div class="brand"><div><div class="logo">StockFlow</div><div class="muted">${state.settings.companyName}</div></div><div class="right"><h1>GOODS RECEIPT REPORT</h1></div></div>
      <table><thead><tr><th>GRN</th><th>Date</th><th>Supplier</th><th>Warehouse</th><th class="right">Qty</th><th class="right">Value</th></tr></thead><tbody>${body}</tbody></table>
      <div class="totals">Total Qty: ${formatNumber(totalQty)} &nbsp;|&nbsp; Total Value: ${formatCurrency(totalValue)}</div>`);
  };

  return (
    <div>
      <PageHeader title="Goods Receipt Report" description="Posted goods receipts with quantities and values." breadcrumbs={[{ label: "Reports" }, { label: "Goods Receipt Report" }]}
        actions={<Button variant="outline" onClick={print}><Printer className="h-4 w-4" /> Print</Button>} />
      <div className="mb-4 grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Receipts</p><p className="mt-1 text-xl font-bold">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Qty</p><p className="mt-1 text-xl font-bold">{formatNumber(totalQty)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Value</p><p className="mt-1 text-xl font-bold">{formatCurrency(totalValue)}</p></CardContent></Card>
      </div>
      <DataTable columns={columns} data={rows} rowKey={(r) => r.id} searchText={(r) => `${r.docNo} ${lk.supplier(r.supplierId)?.name ?? ""} ${r.invoiceNumber}`} searchPlaceholder="Search receipts..." csvFilename="goods-receipt-report"
        filtersSlot={<>
          <FilterDropdown value={supplier} onChange={setSupplier} allLabel="All Suppliers" options={state.suppliers.map((s) => ({ value: s.id, label: s.name }))} />
          <FilterDropdown value={warehouse} onChange={setWarehouse} allLabel="All Warehouses" options={state.warehouses.map((w) => ({ value: w.id, label: w.name }))} />
          <DateRangeFilter value={range} onChange={setRange} />
        </>} />
    </div>
  );
}
