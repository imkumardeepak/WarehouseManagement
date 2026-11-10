import {
  Category,
  Customer,
  Item,
  StockStatus,
  Supplier,
  Unit,
  Warehouse,
  WarehouseLocation,
  WmsState,
} from "@/types";
import { getStockStatus } from "@/services/inventory";
import { daysUntil } from "@/lib/format";

export interface Lookups {
  item: (id: string) => Item | undefined;
  category: (id: string) => Category | undefined;
  unit: (id: string) => Unit | undefined;
  warehouse: (id: string) => Warehouse | undefined;
  location: (id: string) => WarehouseLocation | undefined;
  supplier: (id: string) => Supplier | undefined;
  customer: (id: string) => Customer | undefined;
  unitSymbol: (itemId: string) => string;
}

export function buildLookups(state: WmsState): Lookups {
  const items = new Map(state.items.map((x) => [x.id, x]));
  const categories = new Map(state.categories.map((x) => [x.id, x]));
  const units = new Map(state.units.map((x) => [x.id, x]));
  const warehouses = new Map(state.warehouses.map((x) => [x.id, x]));
  const locations = new Map(state.locations.map((x) => [x.id, x]));
  const suppliers = new Map(state.suppliers.map((x) => [x.id, x]));
  const customers = new Map(state.customers.map((x) => [x.id, x]));
  return {
    item: (id) => items.get(id),
    category: (id) => categories.get(id),
    unit: (id) => units.get(id),
    warehouse: (id) => warehouses.get(id),
    location: (id) => locations.get(id),
    supplier: (id) => suppliers.get(id),
    customer: (id) => customers.get(id),
    unitSymbol: (itemId) => {
      const it = items.get(itemId);
      const u = it ? units.get(it.unitId) : undefined;
      return u?.symbol ?? "";
    },
  };
}

export interface StockRow {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  warehouseId: string;
  warehouseName: string;
  locationId: string;
  locationCode: string;
  batchNo: string;
  expiryDate: string | null;
  unitSymbol: string;
  quantity: number;
  reservedQty: number;
  reorderLevel: number;
  stockValue: number;
  status: StockStatus;
}

export function buildStockRows(state: WmsState): StockRow[] {
  const lk = buildLookups(state);
  const warningDays = state.settings.expiryWarningDays;
  return state.balances.map((b) => {
    const item = lk.item(b.itemId);
    const cat = item ? lk.category(item.categoryId) : undefined;
    const wh = lk.warehouse(b.warehouseId);
    const loc = lk.location(b.locationId);
    return {
      id: b.id,
      itemId: b.itemId,
      itemCode: item?.sku ?? "—",
      itemName: item?.name ?? "Unknown item",
      categoryId: item?.categoryId ?? "",
      categoryName: cat?.name ?? "—",
      warehouseId: b.warehouseId,
      warehouseName: wh?.name ?? "—",
      locationId: b.locationId,
      locationCode: loc?.code ?? "—",
      batchNo: b.batchNo || "—",
      expiryDate: b.expiryDate,
      unitSymbol: lk.unitSymbol(b.itemId),
      quantity: b.quantity,
      reservedQty: b.reservedQty,
      reorderLevel: item?.reorderLevel ?? 0,
      stockValue: b.quantity * b.avgCost,
      status: getStockStatus(b.quantity, item, b.expiryDate, warningDays),
    };
  });
}

export interface ItemStockSummary {
  itemId: string;
  itemCode: string;
  itemName: string;
  categoryName: string;
  unitSymbol: string;
  totalQty: number;
  reorderLevel: number;
  minStock: number;
  value: number;
  status: StockStatus;
}

export function buildItemSummaries(state: WmsState): ItemStockSummary[] {
  const lk = buildLookups(state);
  return state.items.map((item) => {
    const buckets = state.balances.filter((b) => b.itemId === item.id);
    const totalQty = buckets.reduce((s, b) => s + b.quantity, 0);
    const value = buckets.reduce((s, b) => s + b.quantity * b.avgCost, 0);
    const cat = lk.category(item.categoryId);
    let status: StockStatus = "in-stock";
    if (totalQty <= 0) status = "out-of-stock";
    else if (totalQty <= item.reorderLevel) status = "low-stock";
    return {
      itemId: item.id,
      itemCode: item.sku,
      itemName: item.name,
      categoryName: cat?.name ?? "—",
      unitSymbol: lk.unitSymbol(item.id),
      totalQty,
      reorderLevel: item.reorderLevel,
      minStock: item.minStock,
      value,
      status,
    };
  });
}

export interface DashboardStats {
  totalItems: number;
  totalWarehouses: number;
  totalQty: number;
  totalValue: number;
  todayIn: number;
  todayOut: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export function buildDashboardStats(state: WmsState): DashboardStats {
  const summaries = buildItemSummaries(state);
  const totalQty = state.balances.reduce((s, b) => s + b.quantity, 0);
  const totalValue = state.balances.reduce((s, b) => s + b.quantity * b.avgCost, 0);

  const today = new Date().toDateString();
  let todayIn = 0;
  let todayOut = 0;
  for (const l of state.ledger) {
    if (new Date(l.date).toDateString() === today) {
      todayIn += l.qtyIn;
      todayOut += l.qtyOut;
    }
  }

  return {
    totalItems: state.items.length,
    totalWarehouses: state.warehouses.length,
    totalQty,
    totalValue,
    todayIn,
    todayOut,
    lowStockCount: summaries.filter((s) => s.status === "low-stock").length,
    outOfStockCount: summaries.filter((s) => s.status === "out-of-stock").length,
  };
}

/** Daily IN/OUT series for the last N days. */
export function buildMovementSeries(state: WmsState, days: number) {
  const buckets: { date: string; label: string; in: number; out: number }[] = [];
  const map = new Map<string, { in: number; out: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    map.set(key, { in: 0, out: 0 });
    buckets.push({
      date: key,
      label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      in: 0,
      out: 0,
    });
  }
  for (const l of state.ledger) {
    const key = new Date(l.date).toDateString();
    const agg = map.get(key);
    if (agg) {
      agg.in += l.qtyIn;
      agg.out += l.qtyOut;
    }
  }
  return buckets.map((b) => ({ ...b, ...(map.get(b.date) ?? { in: 0, out: 0 }) }));
}

export function buildWarehouseDistribution(state: WmsState) {
  return state.warehouses.map((wh) => {
    const qty = state.balances
      .filter((b) => b.warehouseId === wh.id)
      .reduce((s, b) => s + b.quantity, 0);
    const value = state.balances
      .filter((b) => b.warehouseId === wh.id)
      .reduce((s, b) => s + b.quantity * b.avgCost, 0);
    return { id: wh.id, name: wh.name, code: wh.code, qty, value };
  });
}

export function buildCategoryDistribution(state: WmsState) {
  const lk = buildLookups(state);
  const map = new Map<string, { name: string; qty: number; value: number }>();
  for (const b of state.balances) {
    const item = lk.item(b.itemId);
    if (!item) continue;
    const cat = lk.category(item.categoryId);
    const key = item.categoryId;
    const entry = map.get(key) ?? { name: cat?.name ?? "Other", qty: 0, value: 0 };
    entry.qty += b.quantity;
    entry.value += b.quantity * b.avgCost;
    map.set(key, entry);
  }
  return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
}

export function buildTopMovingItems(state: WmsState, limit = 5) {
  const lk = buildLookups(state);
  const map = new Map<string, number>();
  for (const l of state.ledger) {
    map.set(l.itemId, (map.get(l.itemId) ?? 0) + l.qtyIn + l.qtyOut);
  }
  return Array.from(map.entries())
    .map(([itemId, moved]) => ({
      itemId,
      name: lk.item(itemId)?.name ?? "Unknown",
      sku: lk.item(itemId)?.sku ?? "—",
      moved,
    }))
    .sort((a, b) => b.moved - a.moved)
    .slice(0, limit);
}

export interface RecentTxn {
  id: string;
  docNo: string;
  type: string;
  date: string;
  qty: number;
  status: string;
  tone: "in" | "out" | "move";
}

export function buildRecentTransactions(state: WmsState, limit = 8): RecentTxn[] {
  const rows: RecentTxn[] = [];
  for (const d of state.goodsReceipts)
    rows.push({ id: d.id, docNo: d.docNo, type: "Goods Receipt", date: d.date, qty: d.lines.reduce((s, l) => s + l.quantity, 0), status: d.status, tone: "in" });
  for (const d of state.stockIssues)
    rows.push({ id: d.id, docNo: d.docNo, type: "Stock Issue", date: d.date, qty: d.lines.reduce((s, l) => s + l.quantity, 0), status: d.status, tone: "out" });
  for (const d of state.stockTransfers)
    rows.push({ id: d.id, docNo: d.docNo, type: "Stock Transfer", date: d.date, qty: d.lines.reduce((s, l) => s + l.quantity, 0), status: d.status, tone: "move" });
  for (const d of state.stockAdjustments)
    rows.push({ id: d.id, docNo: d.docNo, type: "Adjustment", date: d.date, qty: d.lines.reduce((s, l) => s + Math.abs(l.physicalQty - l.systemQty), 0), status: d.status, tone: "move" });
  for (const d of state.openingStocks)
    rows.push({ id: d.id, docNo: d.docNo, type: "Opening Stock", date: d.date, qty: d.lines.reduce((s, l) => s + l.quantity, 0), status: d.status, tone: "in" });
  return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit);
}

export interface BatchRow {
  key: string;
  batchNo: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  warehouseName: string;
  locationCode: string;
  quantity: number;
  unitSymbol: string;
  expiryDate: string | null;
  daysLeft: number | null;
  bucket: "expired" | "7" | "30" | "90" | "safe";
}

export function buildBatchRows(state: WmsState): BatchRow[] {
  const lk = buildLookups(state);
  return state.balances
    .filter((b) => b.batchNo && b.quantity > 0)
    .map((b) => {
      const d = daysUntil(b.expiryDate);
      let bucket: BatchRow["bucket"] = "safe";
      if (d !== null) {
        if (d < 0) bucket = "expired";
        else if (d <= 7) bucket = "7";
        else if (d <= 30) bucket = "30";
        else if (d <= 90) bucket = "90";
      }
      return {
        key: b.id,
        batchNo: b.batchNo,
        itemId: b.itemId,
        itemName: lk.item(b.itemId)?.name ?? "Unknown",
        itemCode: lk.item(b.itemId)?.sku ?? "—",
        warehouseName: lk.warehouse(b.warehouseId)?.name ?? "—",
        locationCode: lk.location(b.locationId)?.code ?? "—",
        quantity: b.quantity,
        unitSymbol: lk.unitSymbol(b.itemId),
        expiryDate: b.expiryDate,
        daysLeft: d,
        bucket,
      };
    });
}
