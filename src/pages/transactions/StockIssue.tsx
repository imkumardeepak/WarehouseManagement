import { useMemo, useState } from "react";
import { Plus, Trash2, Save, CheckCircle2, Printer, PackageMinus, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, Column } from "@/components/common/DataTable";
import { RowActions } from "@/components/common/RowActions";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { DocStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Field, PickSelect } from "@/components/transactions/parts";
import { useWms } from "@/store/WmsContext";
import { useToast } from "@/components/ui/toast";
import { buildLookups } from "@/store/selectors";
import { getAvailableQty, getItemBuckets } from "@/services/inventory";
import { StockIssue, StockIssueLine } from "@/types";
import { uid } from "@/lib/utils";
import { formatDate, formatNumber, toDateInput, todayISO } from "@/lib/format";
import { printHtml } from "@/lib/print";
import { cn } from "@/lib/utils";

function newLine(): StockIssueLine {
  return { id: uid("isl"), itemId: "", locationId: "", batchNo: "", quantity: 1, remarks: "" };
}

export default function StockIssuePage() {
  const { state, saveTxn, postTxn, deleteTxn, peekDocNo } = useWms();
  const toast = useToast();
  const lk = useMemo(() => buildLookups(state), [state]);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [draft, setDraft] = useState<StockIssue | null>(null);
  const [deleting, setDeleting] = useState<StockIssue | null>(null);
  const [viewing, setViewing] = useState<StockIssue | null>(null);

  const itemOptions = state.items.filter((i) => i.status === "active").map((i) => ({ value: i.id, label: `${i.name} · ${i.sku}` }));

  const openNew = () => {
    setDraft({
      id: uid("iss"), docNo: peekDocNo("stockIssues"), date: todayISO(),
      warehouseId: state.settings.defaultWarehouseId ?? "", customerId: null, issuedTo: "", purpose: "", referenceNo: "", remarks: "",
      status: "draft", lines: [newLine()], createdAt: todayISO(), updatedAt: todayISO(), postedAt: null,
    });
    setBuilderOpen(true);
  };
  const openEdit = (doc: StockIssue) => { setDraft(JSON.parse(JSON.stringify(doc))); setBuilderOpen(true); };

  const update = (patch: Partial<StockIssue>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const updateLine = (id: string, patch: Partial<StockIssueLine>) =>
    setDraft((d) => (d ? { ...d, lines: d.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) } : d));
  const addLine = () => setDraft((d) => (d ? { ...d, lines: [...d.lines, newLine()] } : d));
  const removeLine = (id: string) => setDraft((d) => (d ? { ...d, lines: d.lines.filter((l) => l.id !== id) } : d));

  const locOptions = (warehouseId: string, itemId: string) => {
    const buckets = itemId ? getItemBuckets(state.balances, itemId, warehouseId) : [];
    const locIds = new Set(buckets.map((b) => b.locationId));
    return state.locations
      .filter((l) => l.warehouseId === warehouseId && (!itemId || locIds.has(l.id)))
      .map((l) => ({ value: l.id, label: l.code }));
  };
  const batchOptions = (warehouseId: string, itemId: string, locationId: string) =>
    getItemBuckets(state.balances, itemId, warehouseId)
      .filter((b) => b.locationId === locationId)
      .map((b) => ({ value: b.batchNo, label: `${b.batchNo || "(no batch)"} · ${formatNumber(b.quantity)} avail` }));

  const lineAvailable = (l: StockIssueLine) =>
    draft ? getAvailableQty(state.balances, l.itemId, draft.warehouseId, l.locationId, l.batchNo) : 0;

  const persist = (status: "draft" | "posted") => {
    if (!draft) return;
    const doc: StockIssue = { ...draft, status, postedAt: status === "posted" ? todayISO() : null };
    const res = saveTxn("stockIssues", doc);
    if (!res.ok) { toast.error("Could not post issue", res.error); return; }
    toast.success(status === "posted" ? "Stock issue posted" : "Draft saved", status === "posted" ? `${doc.docNo} posted — inventory reduced.` : `${doc.docNo} saved as draft.`);
    setBuilderOpen(false); setDraft(null);
  };
  const postExisting = (doc: StockIssue) => {
    const res = postTxn("stockIssues", doc.id);
    if (!res.ok) toast.error("Could not post issue", res.error);
    else toast.success("Stock issue posted", `${doc.docNo} posted — inventory reduced.`);
  };

  const printDoc = (doc: StockIssue) => {
    const rows = doc.lines.map((l) => `<tr><td>${lk.item(l.itemId)?.sku ?? ""}</td><td>${lk.item(l.itemId)?.name ?? ""}</td><td>${lk.location(l.locationId)?.code ?? ""}</td><td>${l.batchNo || "-"}</td><td class="right">${l.quantity}</td><td>${lk.unitSymbol(l.itemId)}</td></tr>`).join("");
    printHtml(`Stock Issue ${doc.docNo}`, `
      <div class="brand"><div><div class="logo">StockFlow</div><div class="muted">${state.settings.companyName}</div></div>
      <div class="right"><h1>STOCK ISSUE VOUCHER</h1><div class="muted">${doc.docNo}</div></div></div>
      <div class="meta">
        <div><span>Date</span> ${formatDate(doc.date)}</div>
        <div><span>Warehouse</span> ${lk.warehouse(doc.warehouseId)?.name ?? "-"}</div>
        <div><span>Customer/Dept</span> ${doc.customerId ? lk.customer(doc.customerId)?.name ?? "-" : "-"}</div>
        <div><span>Issued To</span> ${doc.issuedTo || "-"}</div>
        <div><span>Purpose</span> ${doc.purpose || "-"}</div>
        <div><span>Reference</span> ${doc.referenceNo || "-"}</div>
      </div>
      <table><thead><tr><th>SKU</th><th>Item</th><th>Location</th><th>Batch</th><th class="right">Qty</th><th>Unit</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="footer"><div>Issued By: _______________</div><div>Received By: _______________</div></div>`);
  };

  const columns: Column<StockIssue>[] = [
    { id: "docNo", header: "Issue No", accessor: (r) => <span className="font-medium">{r.docNo}</span>, sortable: true, sortValue: (r) => r.docNo, csvValue: (r) => r.docNo },
    { id: "date", header: "Date", accessor: (r) => formatDate(r.date), sortable: true, sortValue: (r) => r.date, csvValue: (r) => formatDate(r.date) },
    { id: "warehouse", header: "Warehouse", accessor: (r) => lk.warehouse(r.warehouseId)?.name ?? "—", csvValue: (r) => lk.warehouse(r.warehouseId)?.name ?? "" },
    { id: "cust", header: "Customer / Dept", accessor: (r) => (r.customerId ? lk.customer(r.customerId)?.name : r.issuedTo) ?? "—", csvValue: (r) => (r.customerId ? lk.customer(r.customerId)?.name : r.issuedTo) ?? "" },
    { id: "purpose", header: "Purpose", accessor: (r) => r.purpose || "—", csvValue: (r) => r.purpose },
    { id: "qty", header: "Total Qty", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => r.lines.reduce((s, l) => s + l.quantity, 0), csvValue: (r) => r.lines.reduce((s, l) => s + l.quantity, 0) },
    { id: "status", header: "Status", accessor: (r) => <DocStatusBadge status={r.status} />, csvValue: (r) => r.status },
    {
      id: "actions", header: "", headerClassName: "w-12", className: "text-right",
      accessor: (r) => (
        <RowActions
          onView={() => setViewing(r)}
          onEdit={r.status === "draft" ? () => openEdit(r) : undefined}
          onDelete={r.status === "draft" ? () => setDeleting(r) : undefined}
          extra={[
            ...(r.status === "draft" ? [{ label: "Post issue", icon: <CheckCircle2 className="h-4 w-4" />, onClick: () => postExisting(r) }] : []),
            { label: "Print", icon: <Printer className="h-4 w-4" />, onClick: () => printDoc(r) },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Stock Issue (Stock OUT)"
        description="Issue goods out of the warehouse to customers or departments."
        breadcrumbs={[{ label: "Transactions" }, { label: "Stock Issue" }]}
        actions={<Button onClick={openNew}><Plus className="h-4 w-4" /> New Stock Issue</Button>}
      />

      <DataTable
        columns={columns}
        data={[...state.stockIssues].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.docNo} ${r.issuedTo} ${r.purpose} ${r.referenceNo}`}
        searchPlaceholder="Search issues..."
        csvFilename="stock-issues"
        emptyTitle="No stock issues yet"
        emptyDescription="Create a stock issue to move goods out of the warehouse."
        emptyActionLabel="New Stock Issue"
        onEmptyAction={openNew}
      />

      <Dialog open={builderOpen} onOpenChange={(o) => { setBuilderOpen(o); if (!o) setDraft(null); }}>
        <DialogContent size="2xl" className="max-h-[92vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PackageMinus className="h-5 w-5 text-primary" /> {draft?.docNo} · Stock Issue</DialogTitle>
            <DialogDescription>Issue available stock. Quantities cannot exceed what is on hand.</DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Issue Date" required>
                  <Input type="date" value={toDateInput(draft.date)} onChange={(e) => update({ date: new Date(e.target.value).toISOString() })} />
                </Field>
                <Field label="Warehouse" required>
                  <PickSelect value={draft.warehouseId} onChange={(v) => update({ warehouseId: v, lines: draft.lines.map((l) => ({ ...l, locationId: "", batchNo: "" })) })}
                    options={state.warehouses.filter((w) => w.status === "active").map((w) => ({ value: w.id, label: w.name }))} placeholder="Select warehouse" />
                </Field>
                <Field label="Customer / Department">
                  <PickSelect value={draft.customerId ?? ""} onChange={(v) => update({ customerId: v || null })}
                    options={state.customers.filter((c) => c.status === "active").map((c) => ({ value: c.id, label: c.name }))} placeholder="Select customer" />
                </Field>
                <Field label="Issued To"><Input value={draft.issuedTo} onChange={(e) => update({ issuedTo: e.target.value })} placeholder="Person / location" /></Field>
                <Field label="Purpose"><Input value={draft.purpose} onChange={(e) => update({ purpose: e.target.value })} placeholder="e.g. Sales Order" /></Field>
                <Field label="Reference Number"><Input value={draft.referenceNo} onChange={(e) => update({ referenceNo: e.target.value })} placeholder="SO-..." /></Field>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Item Details</h3>
                  <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4" /> Add Item</Button>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table mobileCards>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="min-w-[200px]">Item</TableHead>
                        <TableHead className="min-w-[130px]">Location</TableHead>
                        <TableHead className="min-w-[140px]">Batch</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead className="text-right">Issue Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {draft.lines.map((l) => {
                        const avail = lineAvailable(l);
                        const over = l.quantity > avail;
                        return (
                          <TableRow key={l.id}>
                            <TableCell data-label="Item">
                              <PickSelect value={l.itemId} onChange={(v) => updateLine(l.id, { itemId: v, locationId: "", batchNo: "" })} options={itemOptions} placeholder="Select item" className="min-w-[200px]" />
                            </TableCell>
                            <TableCell data-label="Location">
                              <PickSelect value={l.locationId} onChange={(v) => updateLine(l.id, { locationId: v, batchNo: "" })} options={locOptions(draft.warehouseId, l.itemId)} placeholder="Location" disabled={!l.itemId} />
                            </TableCell>
                            <TableCell data-label="Batch">
                              <PickSelect value={l.batchNo} onChange={(v) => updateLine(l.id, { batchNo: v })} options={batchOptions(draft.warehouseId, l.itemId, l.locationId)} placeholder="Batch" disabled={!l.locationId} />
                            </TableCell>
                            <TableCell data-label="Available" className="text-right tabular-nums">
                              <span className={cn("font-medium", avail <= 0 ? "text-destructive" : "text-success")}>{formatNumber(avail)}</span>
                            </TableCell>
                            <TableCell data-label="Issue Quantity" className="text-right">
                              <Input type="number" min={0} className={cn("w-20 text-right", over && "border-destructive focus-visible:ring-destructive")} value={l.quantity} onChange={(e) => updateLine(l.id, { quantity: Number(e.target.value) })} />
                              {over && <p className="mt-1 text-[11px] font-medium text-destructive">Only {formatNumber(avail)} available</p>}
                            </TableCell>
                            <TableCell data-label="Unit" className="text-muted-foreground">{lk.unitSymbol(l.itemId)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon-sm" aria-label="Remove item" onClick={() => removeLine(l.id)} disabled={draft.lines.length === 1}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {draft.lines.some((l) => l.quantity > lineAvailable(l)) && (
                  <div className="mt-2 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" /> One or more lines exceed available stock. Reduce the quantity before posting.
                  </div>
                )}
              </div>

              <Field label="Remarks"><Textarea value={draft.remarks} onChange={(e) => update({ remarks: e.target.value })} placeholder="Optional notes" /></Field>

              <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex flex-col-reverse gap-2 border-t border-border bg-card px-6 pb-6 pt-4 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => persist("draft")}><Save className="h-4 w-4" /> Save as Draft</Button>
                <Button onClick={() => persist("posted")}><CheckCircle2 className="h-4 w-4" /> Post Issue</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent size="2xl" className="max-h-[92vh] overflow-y-auto scrollbar-thin">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">{viewing.docNo} <DocStatusBadge status={viewing.status} /></DialogTitle>
                <DialogDescription>Stock issue details</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{formatDate(viewing.date)}</p></div>
                <div><p className="text-xs text-muted-foreground">Warehouse</p><p className="font-medium">{lk.warehouse(viewing.warehouseId)?.name ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Customer/Dept</p><p className="font-medium">{viewing.customerId ? lk.customer(viewing.customerId)?.name : viewing.issuedTo || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Purpose</p><p className="font-medium">{viewing.purpose || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Reference</p><p className="font-medium">{viewing.referenceNo || "—"}</p></div>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader><TableRow className="bg-muted/40"><TableHead>Item</TableHead><TableHead>Location</TableHead><TableHead>Batch</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Unit</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {viewing.lines.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{lk.item(l.itemId)?.name ?? "—"}</TableCell>
                        <TableCell>{lk.location(l.locationId)?.code ?? "—"}</TableCell>
                        <TableCell>{l.batchNo || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.quantity}</TableCell>
                        <TableCell>{lk.unitSymbol(l.itemId)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end"><Button variant="outline" onClick={() => printDoc(viewing)}><Printer className="h-4 w-4" /> Print</Button></div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete draft issue?"
        description={`This will permanently remove draft ${deleting?.docNo}.`}
        confirmLabel="Delete"
        onConfirm={() => { if (deleting) { deleteTxn("stockIssues", deleting.id); toast.success("Draft deleted", `${deleting.docNo} removed.`); } }}
      />
    </div>
  );
}
