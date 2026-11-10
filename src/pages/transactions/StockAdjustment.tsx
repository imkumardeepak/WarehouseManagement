import { useMemo, useState } from "react";
import { Plus, Trash2, Save, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, Column } from "@/components/common/DataTable";
import { RowActions } from "@/components/common/RowActions";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { DocStatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
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
import { StockAdjustment, StockAdjustmentLine } from "@/types";
import { uid, cn } from "@/lib/utils";
import { formatDate, formatNumber, toDateInput, todayISO } from "@/lib/format";

const reasons = ["Cycle count correction", "Damaged goods", "Theft / loss", "Found stock", "Data entry error", "Expired write-off", "Other"];

function newLine(): StockAdjustmentLine {
  return { id: uid("adl"), itemId: "", locationId: "", batchNo: "", type: "increase", systemQty: 0, physicalQty: 0, reason: reasons[0] };
}

export default function StockAdjustmentPage() {
  const { state, saveTxn, postTxn, deleteTxn, peekDocNo } = useWms();
  const toast = useToast();
  const lk = useMemo(() => buildLookups(state), [state]);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [draft, setDraft] = useState<StockAdjustment | null>(null);
  const [deleting, setDeleting] = useState<StockAdjustment | null>(null);
  const [viewing, setViewing] = useState<StockAdjustment | null>(null);

  const itemOptions = state.items.filter((i) => i.status === "active").map((i) => ({ value: i.id, label: `${i.name} · ${i.sku}` }));

  const openNew = () => {
    setDraft({
      id: uid("adj"), docNo: peekDocNo("stockAdjustments"), date: todayISO(),
      warehouseId: state.settings.defaultWarehouseId ?? "", remarks: "", status: "draft", lines: [newLine()],
      createdAt: todayISO(), updatedAt: todayISO(), postedAt: null,
    });
    setBuilderOpen(true);
  };
  const openEdit = (doc: StockAdjustment) => { setDraft(JSON.parse(JSON.stringify(doc))); setBuilderOpen(true); };

  const update = (patch: Partial<StockAdjustment>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const updateLine = (id: string, patch: Partial<StockAdjustmentLine>) =>
    setDraft((d) => (d ? { ...d, lines: d.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) } : d));
  const addLine = () => setDraft((d) => (d ? { ...d, lines: [...d.lines, newLine()] } : d));
  const removeLine = (id: string) => setDraft((d) => (d ? { ...d, lines: d.lines.filter((l) => l.id !== id) } : d));

  const locOptions = (warehouseId: string, itemId: string) => {
    const buckets = itemId ? getItemBuckets(state.balances, itemId, warehouseId) : [];
    const locIds = new Set(buckets.map((b) => b.locationId));
    return state.locations.filter((l) => l.warehouseId === warehouseId && (!itemId || locIds.has(l.id))).map((l) => ({ value: l.id, label: l.code }));
  };
  const batchOptions = (warehouseId: string, itemId: string, locationId: string) =>
    getItemBuckets(state.balances, itemId, warehouseId).filter((b) => b.locationId === locationId).map((b) => ({ value: b.batchNo, label: `${b.batchNo || "(no batch)"} · ${formatNumber(b.quantity)}` }));

  const onBatchPick = (lineId: string, batchNo: string) => {
    if (!draft) return;
    const line = draft.lines.find((l) => l.id === lineId);
    if (!line) return;
    const sys = getAvailableQty(state.balances, line.itemId, draft.warehouseId, line.locationId, batchNo);
    updateLine(lineId, { batchNo, systemQty: sys, physicalQty: sys });
  };

  const diffOf = (l: StockAdjustmentLine) => l.physicalQty - l.systemQty;

  const persist = (status: "draft" | "posted") => {
    if (!draft) return;
    const lines = draft.lines.map((l) => ({ ...l, type: diffOf(l) >= 0 ? ("increase" as const) : ("decrease" as const) }));
    const doc: StockAdjustment = { ...draft, lines, status, postedAt: status === "posted" ? todayISO() : null };
    const res = saveTxn("stockAdjustments", doc);
    if (!res.ok) { toast.error("Could not post adjustment", res.error); return; }
    toast.success(status === "posted" ? "Adjustment posted" : "Draft saved", status === "posted" ? `${doc.docNo} posted — inventory corrected.` : `${doc.docNo} saved as draft.`);
    setBuilderOpen(false); setDraft(null);
  };
  const postExisting = (doc: StockAdjustment) => {
    const res = postTxn("stockAdjustments", doc.id);
    if (!res.ok) toast.error("Could not post adjustment", res.error);
    else toast.success("Adjustment posted", `${doc.docNo} posted.`);
  };

  const columns: Column<StockAdjustment>[] = [
    { id: "docNo", header: "Adj No", accessor: (r) => <span className="font-medium">{r.docNo}</span>, sortable: true, sortValue: (r) => r.docNo, csvValue: (r) => r.docNo },
    { id: "date", header: "Date", accessor: (r) => formatDate(r.date), sortable: true, sortValue: (r) => r.date, csvValue: (r) => formatDate(r.date) },
    { id: "warehouse", header: "Warehouse", accessor: (r) => lk.warehouse(r.warehouseId)?.name ?? "—", csvValue: (r) => lk.warehouse(r.warehouseId)?.name ?? "" },
    { id: "lines", header: "Lines", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => r.lines.length, csvValue: (r) => r.lines.length },
    { id: "net", header: "Net Change", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => { const net = r.lines.reduce((s, l) => s + (l.physicalQty - l.systemQty), 0); return <span className={net >= 0 ? "text-success" : "text-destructive"}>{net >= 0 ? "+" : ""}{net}</span>; }, csvValue: (r) => r.lines.reduce((s, l) => s + (l.physicalQty - l.systemQty), 0) },
    { id: "status", header: "Status", accessor: (r) => <DocStatusBadge status={r.status} />, csvValue: (r) => r.status },
    {
      id: "actions", header: "", headerClassName: "w-12", className: "text-right",
      accessor: (r) => (
        <RowActions
          onView={() => setViewing(r)}
          onEdit={r.status === "draft" ? () => openEdit(r) : undefined}
          onDelete={r.status === "draft" ? () => setDeleting(r) : undefined}
          extra={r.status === "draft" ? [{ label: "Post adjustment", icon: <CheckCircle2 className="h-4 w-4" />, onClick: () => postExisting(r) }] : []}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Stock Adjustment"
        description="Correct stock levels after physical counts. Stock can never go negative."
        breadcrumbs={[{ label: "Transactions" }, { label: "Stock Adjustment" }]}
        actions={<Button onClick={openNew}><Plus className="h-4 w-4" /> New Adjustment</Button>}
      />

      <DataTable
        columns={columns}
        data={[...state.stockAdjustments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.docNo} ${lk.warehouse(r.warehouseId)?.name ?? ""} ${r.remarks}`}
        searchPlaceholder="Search adjustments..."
        csvFilename="stock-adjustments"
        emptyTitle="No adjustments yet"
        emptyDescription="Create an adjustment to reconcile physical stock."
        emptyActionLabel="New Adjustment"
        onEmptyAction={openNew}
      />

      <Dialog open={builderOpen} onOpenChange={(o) => { setBuilderOpen(o); if (!o) setDraft(null); }}>
        <DialogContent size="2xl" className="max-h-[92vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-primary" /> {draft?.docNo} · Stock Adjustment</DialogTitle>
            <DialogDescription>Enter the physical count. The difference adjusts the system balance.</DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Date" required>
                  <Input type="date" value={toDateInput(draft.date)} onChange={(e) => update({ date: new Date(e.target.value).toISOString() })} />
                </Field>
                <Field label="Warehouse" required>
                  <PickSelect value={draft.warehouseId} onChange={(v) => update({ warehouseId: v, lines: draft.lines.map((l) => ({ ...l, locationId: "", batchNo: "", systemQty: 0, physicalQty: 0 })) })}
                    options={state.warehouses.filter((w) => w.status === "active").map((w) => ({ value: w.id, label: w.name }))} />
                </Field>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Adjustment Lines</h3>
                  <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4" /> Add Line</Button>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table mobileCards>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="min-w-[200px]">Item</TableHead>
                        <TableHead className="min-w-[120px]">Location</TableHead>
                        <TableHead className="min-w-[140px]">Batch</TableHead>
                        <TableHead className="text-right">System</TableHead>
                        <TableHead className="text-right">Physical</TableHead>
                        <TableHead className="text-right">Difference</TableHead>
                        <TableHead className="min-w-[160px]">Reason</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {draft.lines.map((l) => {
                        const diff = diffOf(l);
                        const negative = l.physicalQty < 0;
                        return (
                          <TableRow key={l.id}>
                            <TableCell data-label="Item">
                              <PickSelect value={l.itemId} onChange={(v) => updateLine(l.id, { itemId: v, locationId: "", batchNo: "", systemQty: 0, physicalQty: 0 })} options={itemOptions} placeholder="Select item" className="min-w-[200px]" />
                            </TableCell>
                            <TableCell data-label="Location">
                              <PickSelect value={l.locationId} onChange={(v) => updateLine(l.id, { locationId: v, batchNo: "", systemQty: 0, physicalQty: 0 })} options={locOptions(draft.warehouseId, l.itemId)} placeholder="Location" disabled={!l.itemId} />
                            </TableCell>
                            <TableCell data-label="Batch">
                              <PickSelect value={l.batchNo} onChange={(v) => onBatchPick(l.id, v)} options={batchOptions(draft.warehouseId, l.itemId, l.locationId)} placeholder="Batch" disabled={!l.locationId} />
                            </TableCell>
                            <TableCell data-label="System Quantity" className="text-right tabular-nums text-muted-foreground">{formatNumber(l.systemQty)}</TableCell>
                            <TableCell data-label="Physical Quantity" className="text-right">
                              <Input type="number" min={0} className={cn("w-20 text-right", negative && "border-destructive")} value={l.physicalQty} onChange={(e) => updateLine(l.id, { physicalQty: Number(e.target.value) })} />
                            </TableCell>
                            <TableCell data-label="Difference" className="text-right tabular-nums">
                              <Badge variant={diff === 0 ? "muted" : diff > 0 ? "success" : "destructive"}>{diff > 0 ? "+" : ""}{diff}</Badge>
                            </TableCell>
                            <TableCell data-label="Reason">
                              <PickSelect value={l.reason} onChange={(v) => updateLine(l.id, { reason: v })} options={reasons.map((r) => ({ value: r, label: r }))} />
                            </TableCell>
                            <TableCell><Button variant="ghost" size="icon-sm" aria-label="Remove item" onClick={() => removeLine(l.id)} disabled={draft.lines.length === 1}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
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
                <Button onClick={() => persist("posted")}><CheckCircle2 className="h-4 w-4" /> Post Adjustment</Button>
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
                <DialogDescription>{formatDate(viewing.date)} · {lk.warehouse(viewing.warehouseId)?.name}</DialogDescription>
              </DialogHeader>
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader><TableRow className="bg-muted/40"><TableHead>Item</TableHead><TableHead>Location</TableHead><TableHead>Batch</TableHead><TableHead className="text-right">System</TableHead><TableHead className="text-right">Physical</TableHead><TableHead className="text-right">Diff</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {viewing.lines.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{lk.item(l.itemId)?.name ?? "—"}</TableCell>
                        <TableCell>{lk.location(l.locationId)?.code ?? "—"}</TableCell>
                        <TableCell>{l.batchNo || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.systemQty}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.physicalQty}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.physicalQty - l.systemQty}</TableCell>
                        <TableCell>{l.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete draft adjustment?"
        description={`This will permanently remove draft ${deleting?.docNo}.`}
        confirmLabel="Delete"
        onConfirm={() => { if (deleting) { deleteTxn("stockAdjustments", deleting.id); toast.success("Draft deleted", `${deleting.docNo} removed.`); } }}
      />
    </div>
  );
}
