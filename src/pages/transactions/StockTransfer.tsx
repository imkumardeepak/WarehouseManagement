import { useMemo, useState } from "react";
import { Plus, Trash2, Save, CheckCircle2, Printer, ArrowLeftRight, AlertCircle } from "lucide-react";
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
import { StockTransfer, StockTransferLine } from "@/types";
import { uid, cn } from "@/lib/utils";
import { formatDate, formatNumber, toDateInput, todayISO } from "@/lib/format";
import { printHtml } from "@/lib/print";

function newLine(): StockTransferLine {
  return { id: uid("trl"), itemId: "", batchNo: "", quantity: 1 };
}

export default function StockTransferPage() {
  const { state, saveTxn, postTxn, deleteTxn, peekDocNo } = useWms();
  const toast = useToast();
  const lk = useMemo(() => buildLookups(state), [state]);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [draft, setDraft] = useState<StockTransfer | null>(null);
  const [deleting, setDeleting] = useState<StockTransfer | null>(null);
  const [viewing, setViewing] = useState<StockTransfer | null>(null);

  const openNew = () => {
    setDraft({
      id: uid("trf"), docNo: peekDocNo("stockTransfers"), date: todayISO(),
      sourceWarehouseId: state.settings.defaultWarehouseId ?? "", sourceLocationId: "", destWarehouseId: "", destLocationId: "",
      remarks: "", status: "draft", lines: [newLine()], createdAt: todayISO(), updatedAt: todayISO(), postedAt: null,
    });
    setBuilderOpen(true);
  };
  const openEdit = (doc: StockTransfer) => { setDraft(JSON.parse(JSON.stringify(doc))); setBuilderOpen(true); };

  const update = (patch: Partial<StockTransfer>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const updateLine = (id: string, patch: Partial<StockTransferLine>) =>
    setDraft((d) => (d ? { ...d, lines: d.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) } : d));
  const addLine = () => setDraft((d) => (d ? { ...d, lines: [...d.lines, newLine()] } : d));
  const removeLine = (id: string) => setDraft((d) => (d ? { ...d, lines: d.lines.filter((l) => l.id !== id) } : d));

  const locOptions = (warehouseId: string) =>
    state.locations.filter((l) => l.warehouseId === warehouseId && l.status === "active").map((l) => ({ value: l.id, label: l.code }));
  const itemOptions = (warehouseId: string, locationId: string) => {
    const buckets = state.balances.filter((b) => b.warehouseId === warehouseId && b.locationId === locationId && b.quantity > 0);
    const itemIds = new Set(buckets.map((b) => b.itemId));
    return state.items.filter((i) => itemIds.has(i.id)).map((i) => ({ value: i.id, label: `${i.name} · ${i.sku}` }));
  };
  const batchOptions = (warehouseId: string, locationId: string, itemId: string) =>
    state.balances
      .filter((b) => b.warehouseId === warehouseId && b.locationId === locationId && b.itemId === itemId && b.quantity > 0)
      .map((b) => ({ value: b.batchNo, label: `${b.batchNo || "(no batch)"} · ${formatNumber(b.quantity)} avail` }));

  const lineAvailable = (l: StockTransferLine) =>
    draft ? getAvailableQty(state.balances, l.itemId, draft.sourceWarehouseId, draft.sourceLocationId, l.batchNo) : 0;

  const sameLocation = draft && draft.sourceWarehouseId === draft.destWarehouseId && draft.sourceLocationId === draft.destLocationId;

  const persist = (status: "draft" | "posted") => {
    if (!draft) return;
    const doc: StockTransfer = { ...draft, status, postedAt: status === "posted" ? todayISO() : null };
    const res = saveTxn("stockTransfers", doc);
    if (!res.ok) { toast.error("Could not post transfer", res.error); return; }
    toast.success(status === "posted" ? "Transfer posted" : "Draft saved", status === "posted" ? `${doc.docNo} posted — stock moved between locations.` : `${doc.docNo} saved as draft.`);
    setBuilderOpen(false); setDraft(null);
  };
  const postExisting = (doc: StockTransfer) => {
    const res = postTxn("stockTransfers", doc.id);
    if (!res.ok) toast.error("Could not post transfer", res.error);
    else toast.success("Transfer posted", `${doc.docNo} posted.`);
  };

  const printDoc = (doc: StockTransfer) => {
    const rows = doc.lines.map((l) => `<tr><td>${lk.item(l.itemId)?.sku ?? ""}</td><td>${lk.item(l.itemId)?.name ?? ""}</td><td>${l.batchNo || "-"}</td><td class="right">${l.quantity}</td></tr>`).join("");
    printHtml(`Stock Transfer ${doc.docNo}`, `
      <div class="brand"><div><div class="logo">StockFlow</div><div class="muted">${state.settings.companyName}</div></div>
      <div class="right"><h1>STOCK TRANSFER NOTE</h1><div class="muted">${doc.docNo}</div></div></div>
      <div class="meta">
        <div><span>Date</span> ${formatDate(doc.date)}</div>
        <div><span>Source</span> ${lk.warehouse(doc.sourceWarehouseId)?.name ?? "-"} / ${lk.location(doc.sourceLocationId)?.code ?? "-"}</div>
        <div><span>Destination</span> ${lk.warehouse(doc.destWarehouseId)?.name ?? "-"} / ${lk.location(doc.destLocationId)?.code ?? "-"}</div>
      </div>
      <table><thead><tr><th>SKU</th><th>Item</th><th>Batch</th><th class="right">Qty</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="footer"><div>Dispatched By: _______________</div><div>Received By: _______________</div></div>`);
  };

  const columns: Column<StockTransfer>[] = [
    { id: "docNo", header: "Transfer No", accessor: (r) => <span className="font-medium">{r.docNo}</span>, sortable: true, sortValue: (r) => r.docNo, csvValue: (r) => r.docNo },
    { id: "date", header: "Date", accessor: (r) => formatDate(r.date), sortable: true, sortValue: (r) => r.date, csvValue: (r) => formatDate(r.date) },
    { id: "source", header: "Source", accessor: (r) => `${lk.warehouse(r.sourceWarehouseId)?.code ?? "—"} / ${lk.location(r.sourceLocationId)?.code ?? "—"}`, csvValue: (r) => lk.warehouse(r.sourceWarehouseId)?.name ?? "" },
    { id: "dest", header: "Destination", accessor: (r) => `${lk.warehouse(r.destWarehouseId)?.code ?? "—"} / ${lk.location(r.destLocationId)?.code ?? "—"}`, csvValue: (r) => lk.warehouse(r.destWarehouseId)?.name ?? "" },
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
            ...(r.status === "draft" ? [{ label: "Post transfer", icon: <CheckCircle2 className="h-4 w-4" />, onClick: () => postExisting(r) }] : []),
            { label: "Print", icon: <Printer className="h-4 w-4" />, onClick: () => printDoc(r) },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Stock Transfer"
        description="Move stock between warehouses and locations. Total company stock stays unchanged."
        breadcrumbs={[{ label: "Transactions" }, { label: "Stock Transfer" }]}
        actions={<Button onClick={openNew}><Plus className="h-4 w-4" /> New Transfer</Button>}
      />

      <DataTable
        columns={columns}
        data={[...state.stockTransfers].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.docNo} ${lk.warehouse(r.sourceWarehouseId)?.name ?? ""} ${lk.warehouse(r.destWarehouseId)?.name ?? ""}`}
        searchPlaceholder="Search transfers..."
        csvFilename="stock-transfers"
        emptyTitle="No transfers yet"
        emptyDescription="Create a transfer to move stock between locations."
        emptyActionLabel="New Transfer"
        onEmptyAction={openNew}
      />

      <Dialog open={builderOpen} onOpenChange={(o) => { setBuilderOpen(o); if (!o) setDraft(null); }}>
        <DialogContent size="2xl" className="max-h-[92vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowLeftRight className="h-5 w-5 text-primary" /> {draft?.docNo} · Stock Transfer</DialogTitle>
            <DialogDescription>Transfer stock from a source location to a destination location.</DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Transfer Date" required>
                  <Input type="date" value={toDateInput(draft.date)} onChange={(e) => update({ date: new Date(e.target.value).toISOString() })} />
                </Field>
                <div />
                <Field label="Source Warehouse" required>
                  <PickSelect value={draft.sourceWarehouseId} onChange={(v) => update({ sourceWarehouseId: v, sourceLocationId: "", lines: draft.lines.map((l) => ({ ...l, itemId: "", batchNo: "" })) })}
                    options={state.warehouses.filter((w) => w.status === "active").map((w) => ({ value: w.id, label: w.name }))} />
                </Field>
                <Field label="Source Location" required>
                  <PickSelect value={draft.sourceLocationId} onChange={(v) => update({ sourceLocationId: v, lines: draft.lines.map((l) => ({ ...l, itemId: "", batchNo: "" })) })}
                    options={locOptions(draft.sourceWarehouseId)} disabled={!draft.sourceWarehouseId} />
                </Field>
                <Field label="Destination Warehouse" required>
                  <PickSelect value={draft.destWarehouseId} onChange={(v) => update({ destWarehouseId: v, destLocationId: "" })}
                    options={state.warehouses.filter((w) => w.status === "active").map((w) => ({ value: w.id, label: w.name }))} />
                </Field>
                <Field label="Destination Location" required>
                  <PickSelect value={draft.destLocationId} onChange={(v) => update({ destLocationId: v })}
                    options={locOptions(draft.destWarehouseId)} disabled={!draft.destWarehouseId} />
                </Field>
              </div>

              {sameLocation && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" /> Source and destination cannot be identical.
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Items to Transfer</h3>
                  <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4" /> Add Item</Button>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="min-w-[220px]">Item</TableHead>
                        <TableHead className="min-w-[160px]">Batch</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead className="text-right">Transfer Qty</TableHead>
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
                            <TableCell>
                              <PickSelect value={l.itemId} onChange={(v) => updateLine(l.id, { itemId: v, batchNo: "" })} options={itemOptions(draft.sourceWarehouseId, draft.sourceLocationId)} placeholder="Select item" disabled={!draft.sourceLocationId} className="min-w-[220px]" />
                            </TableCell>
                            <TableCell>
                              <PickSelect value={l.batchNo} onChange={(v) => updateLine(l.id, { batchNo: v })} options={batchOptions(draft.sourceWarehouseId, draft.sourceLocationId, l.itemId)} placeholder="Batch" disabled={!l.itemId} />
                            </TableCell>
                            <TableCell className="text-right tabular-nums"><span className={cn("font-medium", avail <= 0 ? "text-destructive" : "text-success")}>{formatNumber(avail)}</span></TableCell>
                            <TableCell className="text-right">
                              <Input type="number" min={0} className={cn("w-20 text-right", over && "border-destructive focus-visible:ring-destructive")} value={l.quantity} onChange={(e) => updateLine(l.id, { quantity: Number(e.target.value) })} />
                              {over && <p className="mt-1 text-[11px] font-medium text-destructive">Only {formatNumber(avail)} available</p>}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{lk.unitSymbol(l.itemId)}</TableCell>
                            <TableCell><Button variant="ghost" size="icon-sm" onClick={() => removeLine(l.id)} disabled={draft.lines.length === 1}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Field label="Remarks"><Textarea value={draft.remarks} onChange={(e) => update({ remarks: e.target.value })} placeholder="Optional notes" /></Field>

              <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex flex-col-reverse gap-2 border-t border-border bg-card px-6 pb-6 pt-4 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => persist("draft")}><Save className="h-4 w-4" /> Save as Draft</Button>
                <Button onClick={() => persist("posted")} disabled={!!sameLocation}><CheckCircle2 className="h-4 w-4" /> Post Transfer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent size="xl" className="max-h-[92vh] overflow-y-auto scrollbar-thin">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">{viewing.docNo} <DocStatusBadge status={viewing.status} /></DialogTitle>
                <DialogDescription>Stock transfer details</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{formatDate(viewing.date)}</p></div>
                <div><p className="text-xs text-muted-foreground">Source</p><p className="font-medium">{lk.warehouse(viewing.sourceWarehouseId)?.name} / {lk.location(viewing.sourceLocationId)?.code}</p></div>
                <div><p className="text-xs text-muted-foreground">Destination</p><p className="font-medium">{lk.warehouse(viewing.destWarehouseId)?.name} / {lk.location(viewing.destLocationId)?.code}</p></div>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader><TableRow className="bg-muted/40"><TableHead>Item</TableHead><TableHead>Batch</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Unit</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {viewing.lines.map((l) => (
                      <TableRow key={l.id}><TableCell>{lk.item(l.itemId)?.name ?? "—"}</TableCell><TableCell>{l.batchNo || "—"}</TableCell><TableCell className="text-right tabular-nums">{l.quantity}</TableCell><TableCell>{lk.unitSymbol(l.itemId)}</TableCell></TableRow>
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
        title="Delete draft transfer?"
        description={`This will permanently remove draft ${deleting?.docNo}.`}
        confirmLabel="Delete"
        onConfirm={() => { if (deleting) { deleteTxn("stockTransfers", deleting.id); toast.success("Draft deleted", `${deleting.docNo} removed.`); } }}
      />
    </div>
  );
}
