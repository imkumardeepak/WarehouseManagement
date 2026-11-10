import {
  InventoryBalance,
  InventoryLedger,
  LedgerType,
  StockStatus,
  WmsState,
  Item,
} from "@/types";
import { daysUntil } from "@/lib/format";

// ----------------------------------------------------------------------------
// Keys & lookups
// ----------------------------------------------------------------------------

export function balanceKey(
  itemId: string,
  warehouseId: string,
  locationId: string,
  batchNo: string,
): string {
  return `${itemId}|${warehouseId}|${locationId}|${batchNo || "-"}`;
}

/** Internal movement used while rebuilding the ledger. */
interface Movement {
  date: string;
  seq: number;
  type: LedgerType;
  docNo: string;
  docId: string;
  itemId: string;
  warehouseId: string;
  locationId: string;
  batchNo: string;
  expiryDate: string | null;
  qtyIn: number;
  qtyOut: number;
  unitCost: number;
  reference: string;
  user: string;
}

// ----------------------------------------------------------------------------
// Rebuild balances + ledger from all POSTED documents (chronological)
// This is the single authoritative derivation so balances and ledger can never
// drift out of sync.
// ----------------------------------------------------------------------------

export function recomputeInventory(state: WmsState): {
  balances: InventoryBalance[];
  ledger: InventoryLedger[];
} {
  const movements: Movement[] = [];
  let seq = 0;
  const user = state.profile?.name ?? "System";

  const push = (m: Omit<Movement, "seq">) => {
    movements.push({ ...m, seq: seq++ });
  };

  // Opening stock
  for (const doc of state.openingStocks) {
    if (doc.status !== "posted") continue;
    for (const l of doc.lines) {
      push({
        date: doc.date,
        type: "opening",
        docNo: doc.docNo,
        docId: doc.id,
        itemId: l.itemId,
        warehouseId: doc.warehouseId,
        locationId: l.locationId,
        batchNo: l.batchNo,
        expiryDate: l.expiryDate,
        qtyIn: l.quantity,
        qtyOut: 0,
        unitCost: l.unitCost,
        reference: "Opening Stock",
        user,
      });
    }
  }

  // Goods receipts
  for (const doc of state.goodsReceipts) {
    if (doc.status !== "posted") continue;
    for (const l of doc.lines) {
      push({
        date: doc.date,
        type: "receipt",
        docNo: doc.docNo,
        docId: doc.id,
        itemId: l.itemId,
        warehouseId: doc.warehouseId,
        locationId: l.locationId,
        batchNo: l.batchNo,
        expiryDate: l.expiryDate,
        qtyIn: l.quantity,
        qtyOut: 0,
        unitCost: l.unitCost,
        reference: doc.invoiceNumber || doc.poNumber || "GRN",
        user,
      });
    }
  }

  // Stock issues
  for (const doc of state.stockIssues) {
    if (doc.status !== "posted") continue;
    for (const l of doc.lines) {
      push({
        date: doc.date,
        type: "issue",
        docNo: doc.docNo,
        docId: doc.id,
        itemId: l.itemId,
        warehouseId: doc.warehouseId,
        locationId: l.locationId,
        batchNo: l.batchNo,
        expiryDate: null,
        qtyIn: 0,
        qtyOut: l.quantity,
        unitCost: 0,
        reference: doc.referenceNo || doc.purpose || "Issue",
        user,
      });
    }
  }

  // Stock transfers (out of source, into destination)
  for (const doc of state.stockTransfers) {
    if (doc.status !== "posted") continue;
    for (const l of doc.lines) {
      push({
        date: doc.date,
        type: "transfer-out",
        docNo: doc.docNo,
        docId: doc.id,
        itemId: l.itemId,
        warehouseId: doc.sourceWarehouseId,
        locationId: doc.sourceLocationId,
        batchNo: l.batchNo,
        expiryDate: null,
        qtyIn: 0,
        qtyOut: l.quantity,
        unitCost: 0,
        reference: `To ${doc.destWarehouseId}`,
        user,
      });
      push({
        date: doc.date,
        type: "transfer-in",
        docNo: doc.docNo,
        docId: doc.id,
        itemId: l.itemId,
        warehouseId: doc.destWarehouseId,
        locationId: doc.destLocationId,
        batchNo: l.batchNo,
        expiryDate: null,
        qtyIn: l.quantity,
        qtyOut: 0,
        unitCost: 0,
        reference: `From ${doc.sourceWarehouseId}`,
        user,
      });
    }
  }

  // Stock adjustments
  for (const doc of state.stockAdjustments) {
    if (doc.status !== "posted") continue;
    for (const l of doc.lines) {
      const diff = l.physicalQty - l.systemQty;
      if (diff === 0) continue;
      push({
        date: doc.date,
        type: diff > 0 ? "adjustment-in" : "adjustment-out",
        docNo: doc.docNo,
        docId: doc.id,
        itemId: l.itemId,
        warehouseId: doc.warehouseId,
        locationId: l.locationId,
        batchNo: l.batchNo,
        expiryDate: null,
        qtyIn: diff > 0 ? diff : 0,
        qtyOut: diff < 0 ? -diff : 0,
        unitCost: 0,
        reference: l.reason || "Adjustment",
        user,
      });
    }
  }

  // Sort chronologically, stable by sequence
  movements.sort((a, b) => {
    const t = new Date(a.date).getTime() - new Date(b.date).getTime();
    return t !== 0 ? t : a.seq - b.seq;
  });

  const running = new Map<string, InventoryBalance>();
  const ledger: InventoryLedger[] = [];

  for (const m of movements) {
    const key = balanceKey(m.itemId, m.warehouseId, m.locationId, m.batchNo);
    let bal = running.get(key);
    if (!bal) {
      bal = {
        id: key,
        itemId: m.itemId,
        warehouseId: m.warehouseId,
        locationId: m.locationId,
        batchNo: m.batchNo,
        expiryDate: m.expiryDate,
        quantity: 0,
        reservedQty: 0,
        avgCost: 0,
        updatedAt: m.date,
      };
      running.set(key, bal);
    }

    if (m.qtyIn > 0) {
      // weighted average cost
      const totalValue = bal.quantity * bal.avgCost + m.qtyIn * m.unitCost;
      const newQty = bal.quantity + m.qtyIn;
      bal.avgCost = newQty > 0 ? totalValue / newQty : m.unitCost;
      bal.quantity = newQty;
      if (m.expiryDate) bal.expiryDate = m.expiryDate;
    }
    if (m.qtyOut > 0) {
      bal.quantity = Math.max(0, bal.quantity - m.qtyOut);
    }
    bal.updatedAt = m.date;

    ledger.push({
      id: `${m.docId}_${m.itemId}_${m.seq}`,
      date: m.date,
      type: m.type,
      docNo: m.docNo,
      docId: m.docId,
      itemId: m.itemId,
      warehouseId: m.warehouseId,
      locationId: m.locationId,
      batchNo: m.batchNo,
      qtyIn: m.qtyIn,
      qtyOut: m.qtyOut,
      balanceAfter: bal.quantity,
      unitCost: m.unitCost || bal.avgCost,
      reference: m.reference,
      user: m.user,
      createdAt: m.date,
    });
  }

  const balances = Array.from(running.values()).filter((b) => b.quantity !== 0 || b.reservedQty !== 0);
  return { balances, ledger };
}

// ----------------------------------------------------------------------------
// Query helpers (operate on current balances)
// ----------------------------------------------------------------------------

export function getBalanceByKey(
  balances: InventoryBalance[],
  itemId: string,
  warehouseId: string,
  locationId: string,
  batchNo: string,
): InventoryBalance | undefined {
  const key = balanceKey(itemId, warehouseId, locationId, batchNo);
  return balances.find((b) => b.id === key);
}

/** Available = quantity - reserved for a specific bucket. */
export function getAvailableQty(
  balances: InventoryBalance[],
  itemId: string,
  warehouseId: string,
  locationId: string,
  batchNo: string,
): number {
  const b = getBalanceByKey(balances, itemId, warehouseId, locationId, batchNo);
  return b ? Math.max(0, b.quantity - b.reservedQty) : 0;
}

/** Total quantity of an item in a warehouse across all locations/batches. */
export function getItemWarehouseQty(
  balances: InventoryBalance[],
  itemId: string,
  warehouseId: string,
): number {
  return balances
    .filter((b) => b.itemId === itemId && b.warehouseId === warehouseId)
    .reduce((sum, b) => sum + b.quantity, 0);
}

/** Total quantity of an item everywhere. */
export function getItemTotalQty(balances: InventoryBalance[], itemId: string): number {
  return balances.filter((b) => b.itemId === itemId).reduce((sum, b) => sum + b.quantity, 0);
}

/** All buckets for an item + warehouse that currently have stock. */
export function getItemBuckets(
  balances: InventoryBalance[],
  itemId: string,
  warehouseId: string,
): InventoryBalance[] {
  return balances.filter(
    (b) => b.itemId === itemId && b.warehouseId === warehouseId && b.quantity > 0,
  );
}

// ----------------------------------------------------------------------------
// Stock status
// ----------------------------------------------------------------------------

export function getExpiryStatus(
  expiryDate: string | null,
  warningDays: number,
): StockStatus | null {
  if (!expiryDate) return null;
  const d = daysUntil(expiryDate);
  if (d === null) return null;
  if (d < 0) return "expired";
  if (d <= warningDays) return "expiring-soon";
  return null;
}

export function getStockStatus(
  qty: number,
  item: Item | undefined,
  expiryDate: string | null,
  warningDays: number,
): StockStatus {
  const expiry = getExpiryStatus(expiryDate, warningDays);
  if (expiry) return expiry;
  if (qty <= 0) return "out-of-stock";
  if (item && qty <= item.reorderLevel) return "low-stock";
  return "in-stock";
}
