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
import { StockIssue } from "@/types";
import { formatDate, formatNumber } from "@/lib/format";
import { printHtml } from "@/lib/print";

export default function StockIssueReport() {
  const { state } = useWms();
  const lk = useMemo(() => buildLookups(state), [state]);
  const [customer, setCustomer] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [range, setRange] = useState<DateRange>({ from: "", to: "" });

  const rows = state.stockIssues.filter((d) => {
    if (d.status !== "posted") return false;
    if (customer && d.customerId !== customer) return false;
    if (warehouse && d.warehouseId !== warehouse) return false;
    if (range.from && new Date(d.date) < new Date(range.from)) return false;
    if (range.to && new Date(d.date) > new Date(range.to + "T23:59:59")) return false;
    return true;
  });

  const totalQty = rows.reduce((s, d) => s + d.lines.reduce((x, l) => x + l.quantity, 0), 0);

  const columns: Column<StockIssue>[] = [
    { id: "docNo", header: "Issue No", accessor: (r) => <span className="font-medium">{r.docNo}</span>, sortable: true, sortValue: (r) => r.docNo, csvValue: (r) => r.docNo },
    { id: "date", header: "Date", accessor: (r) => formatDate(r.date), sortable: true, sortValue: (r) => r.date, csvValue: (r) => formatDate(r.date) },
    { id: "cust", header: "Customer / Dept", accessor: (r) => (r.customerId ? lk.customer(r.customerId)?.name : r.issuedTo) ?? "—", csvValue: (r) => (r.customerId ? lk.customer(r.customerId)?.name : r.issuedTo) ?? "" },
    { id: "wh", header: "Warehouse", accessor: (r) => lk.warehouse(r.warehouseId)?.name ?? "—", csvValue: (r) => lk.warehouse(r.warehouseId)?.name ?? "" },
    { id: "purpose", header: "Purpose", accessor: (r) => r.purpose || "—", csvValue: (r) => r.purpose },
    { id: "ref", header: "Reference", accessor: (r) => r.referenceNo || "—", csvValue: (r) => r.referenceNo },
    { id: "qty", header: "Qty", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => formatNumber(r.lines.reduce((s, l) => s + l.quantity, 0)), sortable: true, sortValue: (r) => r.lines.reduce((s, l) => s + l.quantity, 0), csvValue: (r) => r.lines.reduce((s, l) => s + l.quantity, 0) },
    { id: "status", header: "Status", accessor: (r) => <DocStatusBadge status={r.status} />, csvValue: (r) => r.status },
  ];

  const print = () => {
    const body = rows.map((d) => `<tr><td>${d.docNo}</td><td>${formatDate(d.date)}</td><td>${(d.customerId ? lk.customer(d.customerId)?.name : d.issuedTo) ?? ""}</td><td>${lk.warehouse(d.warehouseId)?.name ?? ""}</td><td class="right">${d.lines.reduce((s, l) => s + l.quantity, 0)}</td></tr>`).join("");
    printHtml("Stock Issue Report", `<div class="brand"><div><div class="logo">StockFlow</div><div class="muted">${state.settings.companyName}</div></div><div class="right"><h1>STOCK ISSUE REPORT</h1></div></div>
      <table><thead><tr><th>Issue</th><th>Date</th><th>Customer</th><th>Warehouse</th><th class="right">Qty</th></tr></thead><tbody>${body}</tbody></table>
      <div class="totals">Total Qty Issued: ${formatNumber(totalQty)}</div>`);
  };

  return (
    <div>
      <PageHeader title="Stock Issue Report" description="Posted stock issues by customer, department and period." breadcrumbs={[{ label: "Reports" }, { label: "Stock Issue Report" }]}
        actions={<Button variant="outline" onClick={print}><Printer className="h-4 w-4" /> Print</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Issues</p><p className="mt-1 text-xl font-bold">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Qty Issued</p><p className="mt-1 text-xl font-bold">{formatNumber(totalQty)}</p></CardContent></Card>
      </div>
      <DataTable columns={columns} data={rows} rowKey={(r) => r.id} searchText={(r) => `${r.docNo} ${r.issuedTo} ${r.referenceNo}`} searchPlaceholder="Search issues..." csvFilename="stock-issue-report"
        filtersSlot={<>
          <FilterDropdown value={customer} onChange={setCustomer} allLabel="All Customers" options={state.customers.map((c) => ({ value: c.id, label: c.name }))} />
          <FilterDropdown value={warehouse} onChange={setWarehouse} allLabel="All Warehouses" options={state.warehouses.map((w) => ({ value: w.id, label: w.name }))} />
          <DateRangeFilter value={range} onChange={setRange} />
        </>} />
    </div>
  );
}
