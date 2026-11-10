import { useMemo, useState } from "react";
import { Plus, Trash2, Save, CheckCircle2, Printer, PackagePlus } from "lucide-react";
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
import { GoodsReceipt, GoodsReceiptLine } from "@/types";
import { uid } from "@/lib/utils";
import { formatCurrency, formatDate, toDateInput, todayISO } from "@/lib/format";
import { printHtml } from "@/lib/print";

function newLine(): GoodsReceiptLine {
  return { id: uid("grl"), itemId: "", locationId: "", batchNo: "", expiryDate: null, quantity: 1, unitCost: 0 };
}

export default function GoodsReceiptPage() {
  const { state, saveTxn, postTxn, deleteTxn, peekDocNo } = useWms();
  const toast = useToast();
  const lk = useMemo(() => buildLookups(state), [state]);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [draft, setDraft] = useState<GoodsReceipt | null>(null);
  const [deleting, setDeleting] = useState<GoodsReceipt | null>(null);
  const [viewing, setViewing] = useState<GoodsReceipt | null>(null);

  const activeItems = state.items.filter((i) => i.status === "active");
  const itemOptions = activeItems.map((i) => ({ value: i.id, label: `${i.name} · ${i.sku}` }));

  const openNew = () => {
    setDraft({
      id: uid("grn"),
      docNo: peekDocNo("goodsReceipts"),
      date: todayISO(),
      supplierId: "",
      warehouseId: state.settings.defaultWarehouseId ?? "",
      poNumber: "",
      invoiceNumber: "",
      challanNumber: "",
      remarks: "",
      status: "draft",
      lines: [newLine()],
      createdAt: todayISO(),
      updatedAt: todayISO(),
      postedAt: null,
    });
    setBuilderOpen(true);
  };

  const openEdit = (doc: GoodsReceipt) => {
    setDraft(JSON.parse(JSON.stringify(doc)));
    setBuilderOpen(true);
  };

  const locOptions = (warehouseId: string) =>
    state.locations.filter((l) => l.warehouseId === warehouseId && l.status === "active").map((l) => ({ value: l.id, label: l.code }));

  const update = (patch: Partial<GoodsReceipt>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const updateLine = (id: string, patch: Partial<GoodsReceiptLine>) =>
    setDraft((d) => (d ? { ...d, lines: d.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) } : d));
  const addLine = () => setDraft((d) => (d ? { ...d, lines: [...d.lines, newLine()] } : d));
  const removeLine = (id: string) => setDraft((d) => (d ? { ...d, lines: d.lines.filter((l) => l.id !== id) } : d));

  const grandTotal = draft?.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0) ?? 0;

  const onItemPick = (lineId: string, itemId: string) => {
    const item = lk.item(itemId);
    updateLine(lineId, { itemId, unitCost: item?.standardCost ?? 0 });
  };

  const persist = (status: "draft" | "posted") => {
    if (!draft) return;
    const doc: GoodsReceipt = { ...draft, status, postedAt: status === "posted" ? todayISO() : null };
    const res = saveTxn("goodsReceipts", doc);
    if (!res.ok) {
      toast.error("Could not post", res.error);
      return;
    }
    toast.success(
      status === "posted" ? "Goods receipt posted" : "Draft saved",
      status === "posted" ? `${doc.docNo} posted — inventory updated.` : `${doc.docNo} saved as draft.`,
    );
    setBuilderOpen(false);
    setDraft(null);
  };

  const postExisting = (doc: GoodsReceipt) => {
    const res = postTxn("goodsReceipts", doc.id);
    if (!res.ok) toast.error("Could not post", res.error);
    else toast.success("Goods receipt posted", `${doc.docNo} posted — inventory updated.`);
  };

  const printDoc = (doc: GoodsReceipt) => {
    const rows = doc.lines
      .map((l) => {
        const item = lk.item(l.itemId);
        return `<tr><td>${item?.sku ?? ""}</td><td>${item?.name ?? ""}</td><td>${lk.location(l.locationId)?.code ?? ""}</td><td>${l.batchNo || "-"}</td><td class="right">${l.quantity}</td><td class="right">${formatCurrency(l.unitCost)}</td><td class="right">${formatCurrency(l.quantity * l.unitCost)}</td></tr>`;
      })
      .join("");
    const total = doc.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
    printHtml(`Goods Receipt ${doc.docNo}`, `
      <div class="brand"><div><div class="logo">StockFlow</div><div class="muted">${state.settings.companyName}</div></div>
      <div class="right"><h1>GOODS RECEIPT NOTE</h1><div class="muted">${doc.docNo}</div></div></div>
      <div class="meta">
        <div><span>Date</span> ${formatDate(doc.date)}</div>
        <div><span>Supplier</span> ${lk.supplier(doc.supplierId)?.name ?? "-"}</div>
        <div><span>Warehouse</span> ${lk.warehouse(doc.warehouseId)?.name ?? "-"}</div>
        <div><span>PO Number</span> ${doc.poNumber || "-"}</div>
        <div><span>Invoice</span> ${doc.invoiceNumber || "-"}</div>
        <div><span>Challan</span> ${doc.challanNumber || "-"}</div>
      </div>
      <table><thead><tr><th>SKU</th><th>Item</th><th>Location</th><th>Batch</th><th class="right">Qty</th><th class="right">Unit Cost</th><th class="right">Amount</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="totals">Grand Total: ${formatCurrency(total)}</div>
      <div class="footer"><div>Received By: _______________</div><div>Authorised By: _______________</div></div>`);
  };

  const columns: Column<GoodsReceipt>[] = [
    { id: "docNo", header: "GRN No", accessor: (r) => <span className="font-medium">{r.docNo}</span>, sortable: true, sortValue: (r) => r.docNo, csvValue: (r) => r.docNo },
    { id: "date", header: "Date", accessor: (r) => formatDate(r.date), sortable: true, sortValue: (r) => r.date, csvValue: (r) => formatDate(r.date) },
    { id: "supplier", header: "Supplier", accessor: (r) => lk.supplier(r.supplierId)?.name ?? "—", csvValue: (r) => lk.supplier(r.supplierId)?.name ?? "" },
    { id: "warehouse", header: "Warehouse", accessor: (r) => lk.warehouse(r.warehouseId)?.name ?? "—", csvValue: (r) => lk.warehouse(r.warehouseId)?.name ?? "" },
    { id: "items", header: "Items", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => r.lines.length, csvValue: (r) => r.lines.length },
    { id: "qty", header: "Total Qty", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => r.lines.reduce((s, l) => s + l.quantity, 0), csvValue: (r) => r.lines.reduce((s, l) => s + l.quantity, 0) },
    { id: "value", header: "Value", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => formatCurrency(r.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0)), csvValue: (r) => r.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0) },
    { id: "status", header: "Status", accessor: (r) => <DocStatusBadge status={r.status} />, csvValue: (r) => r.status },
    {
      id: "actions", header: "", headerClassName: "w-12", className: "text-right",
      accessor: (r) => (
        <RowActions
          onView={() => setViewing(r)}
          onEdit={r.status === "draft" ? () => openEdit(r) : undefined}
          onDelete={r.status === "draft" ? () => setDeleting(r) : undefined}
          extra={[
            ...(r.status === "draft" ? [{ label: "Post receipt", icon: <CheckCircle2 className="h-4 w-4" />, onClick: () => postExisting(r) }] : []),
            { label: "Print", icon: <Printer className="h-4 w-4" />, onClick: () => printDoc(r) },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Goods Receipt (Stock IN)"
        description="Receive goods from suppliers into warehouse locations."
        breadcrumbs={[{ label: "Transactions" }, { label: "Goods Receipt" }]}
        actions={<Button onClick={openNew}><Plus className="h-4 w-4" /> New Goods Receipt</Button>}
      />

      <DataTable
        columns={columns}
        data={[...state.goodsReceipts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.docNo} ${lk.supplier(r.supplierId)?.name ?? ""} ${r.invoiceNumber} ${r.poNumber}`}
        searchPlaceholder="Search receipts..."
        csvFilename="goods-receipts"
        emptyTitle="No goods receipts yet"
        emptyDescription="Create a goods receipt to bring stock into your warehouse."
        emptyActionLabel="New Goods Receipt"
        onEmptyAction={openNew}
      />

      {/* Builder */}
      <Dialog open={builderOpen} onOpenChange={(o) => { setBuilderOpen(o); if (!o) setDraft(null); }}>
        <DialogContent size="2xl" className="max-h-[92vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PackagePlus className="h-5 w-5 text-primary" /> {draft?.docNo} · Goods Receipt</DialogTitle>
            <DialogDescription>Add items, batches and quantities received from the supplier.</DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Receipt Date" required>
                  <Input type="date" value={toDateInput(draft.date)} onChange={(e) => update({ date: new Date(e.target.value).toISOString() })} />
                </Field>
                <Field label="Supplier" required>
                  <PickSelect value={draft.supplierId} onChange={(v) => update({ supplierId: v })}
                    options={state.suppliers.filter((s) => s.status === "active").map((s) => ({ value: s.id, label: s.name }))} placeholder="Select supplier" />
                </Field>
                <Field label="Warehouse" required>
                  <PickSelect value={draft.warehouseId} onChange={(v) => update({ warehouseId: v, lines: draft.lines.map((l) => ({ ...l, locationId: "" })) })}
                    options={state.warehouses.filter((w) => w.status === "active").map((w) => ({ value: w.id, label: w.name }))} placeholder="Select warehouse" />
                </Field>
                <Field label="Purchase Order No"><Input value={draft.poNumber} onChange={(e) => update({ poNumber: e.target.value })} placeholder="PO-..." /></Field>
                <Field label="Invoice Number"><Input value={draft.invoiceNumber} onChange={(e) => update({ invoiceNumber: e.target.value })} placeholder="INV-..." /></Field>
                <Field label="Challan Number"><Input value={draft.challanNumber} onChange={(e) => update({ challanNumber: e.target.value })} placeholder="CH-..." /></Field>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Item Details</h3>
                  <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4" /> Add Item</Button>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="min-w-[200px]">Item</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="min-w-[130px]">Location</TableHead>
                        <TableHead className="min-w-[120px]">Batch</TableHead>
                        <TableHead className="min-w-[140px]">Expiry</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {draft.lines.map((l) => {
                        const item = lk.item(l.itemId);
                        return (
                          <TableRow key={l.id}>
                            <TableCell>
                              <PickSelect value={l.itemId} onChange={(v) => onItemPick(l.id, v)} options={itemOptions} placeholder="Select item" className="min-w-[200px]" />
                            </TableCell>
                            <TableCell className="text-muted-foreground">{item ? lk.unit(item.unitId)?.symbol : "—"}</TableCell>
                            <TableCell>
                              <PickSelect value={l.locationId} onChange={(v) => updateLine(l.id, { locationId: v })} options={locOptions(draft.warehouseId)} placeholder="Bin" disabled={!draft.warehouseId} />
                            </TableCell>
                            <TableCell><Input value={l.batchNo} onChange={(e) => updateLine(l.id, { batchNo: e.target.value })} placeholder="Batch" /></TableCell>
                            <TableCell><Input type="date" value={toDateInput(l.expiryDate)} onChange={(e) => updateLine(l.id, { expiryDate: e.target.value ? new Date(e.target.value).toISOString() : null })} /></TableCell>
                            <TableCell className="text-right"><Input type="number" min={0} className="w-20 text-right" value={l.quantity} onChange={(e) => updateLine(l.id, { quantity: Number(e.target.value) })} /></TableCell>
                            <TableCell className="text-right"><Input type="number" min={0} className="w-24 text-right" value={l.unitCost} onChange={(e) => updateLine(l.id, { unitCost: Number(e.target.value) })} /></TableCell>
                            <TableCell className="text-right font-medium tabular-nums">{formatCurrency(l.quantity * l.unitCost)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon-sm" onClick={() => removeLine(l.id)} disabled={draft.lines.length === 1}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Field label="Remarks"><Textarea value={draft.remarks} onChange={(e) => update({ remarks: e.target.value })} placeholder="Optional notes" /></Field>

              <GrandTotalBar value={formatCurrency(grandTotal)} />

              <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex flex-col-reverse gap-2 border-t border-border bg-card px-6 pb-6 pt-4 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => persist("draft")}><Save className="h-4 w-4" /> Save as Draft</Button>
                <Button onClick={() => persist("posted")}><CheckCircle2 className="h-4 w-4" /> Post Goods Receipt</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent size="2xl" className="max-h-[92vh] overflow-y-auto scrollbar-thin">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">{viewing.docNo} <DocStatusBadge status={viewing.status} /></DialogTitle>
                <DialogDescription>Goods receipt details</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{formatDate(viewing.date)}</p></div>
                <div><p className="text-xs text-muted-foreground">Supplier</p><p className="font-medium">{lk.supplier(viewing.supplierId)?.name ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Warehouse</p><p className="font-medium">{lk.warehouse(viewing.warehouseId)?.name ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">PO Number</p><p className="font-medium">{viewing.poNumber || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Invoice</p><p className="font-medium">{viewing.invoiceNumber || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Challan</p><p className="font-medium">{viewing.challanNumber || "—"}</p></div>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader><TableRow className="bg-muted/40"><TableHead>Item</TableHead><TableHead>Location</TableHead><TableHead>Batch</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
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
              <GrandTotalBar value={formatCurrency(viewing.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0))} />
              <div className="flex justify-end"><Button variant="outline" onClick={() => printDoc(viewing)}><Printer className="h-4 w-4" /> Print</Button></div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete draft receipt?"
        description={`This will permanently remove draft ${deleting?.docNo}.`}
        confirmLabel="Delete"
        onConfirm={() => { if (deleting) { deleteTxn("goodsReceipts", deleting.id); toast.success("Draft deleted", `${deleting.docNo} removed.`); } }}
      />
    </div>
  );
}
