import { useMemo, useState } from "react";
import { Plus, Trash2, Save, CheckCircle2, PlayCircle } from "lucide-react";
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
import { Field, PickSelect, GrandTotalBar } from "@/components/transactions/parts";
import { useWms } from "@/store/WmsContext";
import { useToast } from "@/components/ui/toast";
import { buildLookups } from "@/store/selectors";
import { OpeningStock, OpeningStockLine } from "@/types";
import { uid } from "@/lib/utils";
import { formatCurrency, formatDate, toDateInput, todayISO } from "@/lib/format";

function newLine(): OpeningStockLine {
  return { id: uid("opl"), itemId: "", locationId: "", batchNo: "", expiryDate: null, quantity: 1, unitCost: 0 };
}

export default function OpeningStockPage() {
  const { state, saveTxn, postTxn, deleteTxn, peekDocNo } = useWms();
  const toast = useToast();
  const lk = useMemo(() => buildLookups(state), [state]);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [draft, setDraft] = useState<OpeningStock | null>(null);
  const [deleting, setDeleting] = useState<OpeningStock | null>(null);
  const [viewing, setViewing] = useState<OpeningStock | null>(null);

  const itemOptions = state.items.filter((i) => i.status === "active").map((i) => ({ value: i.id, label: `${i.name} · ${i.sku}` }));
  const locOptions = (warehouseId: string) => state.locations.filter((l) => l.warehouseId === warehouseId && l.status === "active").map((l) => ({ value: l.id, label: l.code }));

  const openNew = () => {
    setDraft({
      id: uid("op"), docNo: peekDocNo("openingStocks"), date: todayISO(),
      warehouseId: state.settings.defaultWarehouseId ?? "", remarks: "", status: "draft", lines: [newLine()],
      createdAt: todayISO(), updatedAt: todayISO(), postedAt: null,
    });
    setBuilderOpen(true);
  };
  const openEdit = (doc: OpeningStock) => { setDraft(JSON.parse(JSON.stringify(doc))); setBuilderOpen(true); };

  const update = (patch: Partial<OpeningStock>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const updateLine = (id: string, patch: Partial<OpeningStockLine>) =>
    setDraft((d) => (d ? { ...d, lines: d.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) } : d));
  const addLine = () => setDraft((d) => (d ? { ...d, lines: [...d.lines, newLine()] } : d));
  const removeLine = (id: string) => setDraft((d) => (d ? { ...d, lines: d.lines.filter((l) => l.id !== id) } : d));

  const onItemPick = (lineId: string, itemId: string) => {
    const item = lk.item(itemId);
    updateLine(lineId, { itemId, unitCost: item?.standardCost ?? 0 });
  };

  const grandTotal = draft?.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0) ?? 0;

  const persist = (status: "draft" | "posted") => {
    if (!draft) return;
    const doc: OpeningStock = { ...draft, status, postedAt: status === "posted" ? todayISO() : null };
    const res = saveTxn("openingStocks", doc);
    if (!res.ok) { toast.error("Could not post opening stock", res.error); return; }
    toast.success(status === "posted" ? "Opening stock posted" : "Draft saved", status === "posted" ? `${doc.docNo} posted — balances created.` : `${doc.docNo} saved as draft.`);
    setBuilderOpen(false); setDraft(null);
  };
  const postExisting = (doc: OpeningStock) => {
    const res = postTxn("openingStocks", doc.id);
    if (!res.ok) toast.error("Could not post opening stock", res.error);
    else toast.success("Opening stock posted", `${doc.docNo} posted.`);
  };

  const columns: Column<OpeningStock>[] = [
    { id: "docNo", header: "Opening No", accessor: (r) => <span className="font-medium">{r.docNo}</span>, sortable: true, sortValue: (r) => r.docNo, csvValue: (r) => r.docNo },
    { id: "date", header: "Date", accessor: (r) => formatDate(r.date), sortable: true, sortValue: (r) => r.date, csvValue: (r) => formatDate(r.date) },
    { id: "warehouse", header: "Warehouse", accessor: (r) => lk.warehouse(r.warehouseId)?.name ?? "—", csvValue: (r) => lk.warehouse(r.warehouseId)?.name ?? "" },
    { id: "lines", header: "Lines", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => r.lines.length, csvValue: (r) => r.lines.length },
    { id: "value", header: "Value", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => formatCurrency(r.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0)), csvValue: (r) => r.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0) },
    { id: "status", header: "Status", accessor: (r) => <DocStatusBadge status={r.status} />, csvValue: (r) => r.status },
    {
      id: "actions", header: "", headerClassName: "w-12", className: "text-right",
      accessor: (r) => (
        <RowActions
          onView={() => setViewing(r)}
          onEdit={r.status === "draft" ? () => openEdit(r) : undefined}
          onDelete={r.status === "draft" ? () => setDeleting(r) : undefined}
          extra={r.status === "draft" ? [{ label: "Post opening", icon: <CheckCircle2 className="h-4 w-4" />, onClick: () => postExisting(r) }] : []}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Opening Stock"
        description="Record initial inventory balances when onboarding a warehouse."
        breadcrumbs={[{ label: "Transactions" }, { label: "Opening Stock" }]}
        actions={<Button onClick={openNew}><Plus className="h-4 w-4" /> New Opening Stock</Button>}
      />

      <DataTable
        columns={columns}
        data={[...state.openingStocks].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.docNo} ${lk.warehouse(r.warehouseId)?.name ?? ""}`}
        searchPlaceholder="Search opening stock..."
        csvFilename="opening-stock"
        emptyTitle="No opening stock yet"
        emptyDescription="Record opening balances to initialise inventory."
        emptyActionLabel="New Opening Stock"
        onEmptyAction={openNew}
      />

      <Dialog open={builderOpen} onOpenChange={(o) => { setBuilderOpen(o); if (!o) setDraft(null); }}>
        <DialogContent size="2xl" className="max-h-[92vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PlayCircle className="h-5 w-5 text-primary" /> {draft?.docNo} · Opening Stock</DialogTitle>
            <DialogDescription>Enter opening quantities and costs for each item.</DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Date" required>
                  <Input type="date" value={toDateInput(draft.date)} onChange={(e) => update({ date: new Date(e.target.value).toISOString() })} />
                </Field>
                <Field label="Warehouse" required>
                  <PickSelect value={draft.warehouseId} onChange={(v) => update({ warehouseId: v, lines: draft.lines.map((l) => ({ ...l, locationId: "" })) })}
                    options={state.warehouses.filter((w) => w.status === "active").map((w) => ({ value: w.id, label: w.name }))} />
                </Field>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Opening Lines</h3>
                  <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4" /> Add Line</Button>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="min-w-[200px]">Item</TableHead>
                        <TableHead className="min-w-[120px]">Location</TableHead>
                        <TableHead className="min-w-[120px]">Batch</TableHead>
                        <TableHead className="min-w-[140px]">Expiry</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {draft.lines.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell><PickSelect value={l.itemId} onChange={(v) => onItemPick(l.id, v)} options={itemOptions} placeholder="Select item" className="min-w-[200px]" /></TableCell>
                          <TableCell><PickSelect value={l.locationId} onChange={(v) => updateLine(l.id, { locationId: v })} options={locOptions(draft.warehouseId)} placeholder="Location" disabled={!draft.warehouseId} /></TableCell>
                          <TableCell><Input value={l.batchNo} onChange={(e) => updateLine(l.id, { batchNo: e.target.value })} placeholder="Batch" /></TableCell>
                          <TableCell><Input type="date" value={toDateInput(l.expiryDate)} onChange={(e) => updateLine(l.id, { expiryDate: e.target.value ? new Date(e.target.value).toISOString() : null })} /></TableCell>
                          <TableCell className="text-right"><Input type="number" min={0} className="w-20 text-right" value={l.quantity} onChange={(e) => updateLine(l.id, { quantity: Number(e.target.value) })} /></TableCell>
                          <TableCell className="text-right"><Input type="number" min={0} className="w-24 text-right" value={l.unitCost} onChange={(e) => updateLine(l.id, { unitCost: Number(e.target.value) })} /></TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{formatCurrency(l.quantity * l.unitCost)}</TableCell>
                          <TableCell><Button variant="ghost" size="icon-sm" onClick={() => removeLine(l.id)} disabled={draft.lines.length === 1}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Field label="Remarks"><Textarea value={draft.remarks} onChange={(e) => update({ remarks: e.target.value })} placeholder="Optional notes" /></Field>
              <GrandTotalBar label="Total Opening Value" value={formatCurrency(grandTotal)} />

              <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex flex-col-reverse gap-2 border-t border-border bg-card px-6 pb-6 pt-4 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => persist("draft")}><Save className="h-4 w-4" /> Save as Draft</Button>
                <Button onClick={() => persist("posted")}><CheckCircle2 className="h-4 w-4" /> Post Opening Stock</Button>
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
                  <TableHeader><TableRow className="bg-muted/40"><TableHead>Item</TableHead><TableHead>Location</TableHead><TableHead>Batch</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {viewing.lines.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{lk.item(l.itemId)?.name ?? "—"}</TableCell>
                        <TableCell>{lk.location(l.locationId)?.code ?? "—"}</TableCell>
                        <TableCell>{l.batchNo || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(l.unitCost)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(l.quantity * l.unitCost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <GrandTotalBar label="Total Opening Value" value={formatCurrency(viewing.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0))} />
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete draft opening stock?"
        description={`This will permanently remove draft ${deleting?.docNo}.`}
        confirmLabel="Delete"
        onConfirm={() => { if (deleting) { deleteTxn("openingStocks", deleting.id); toast.success("Draft deleted", `${deleting.docNo} removed.`); } }}
      />
    </div>
  );
}
