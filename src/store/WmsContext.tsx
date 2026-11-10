import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Category,
  Customer,
  GeneralSettings,
  GoodsReceipt,
  Item,
  OpeningStock,
  StockAdjustment,
  StockIssue,
  StockTransfer,
  Supplier,
  Unit,
  UserProfile,
  Warehouse,
  WarehouseLocation,
  WmsState,
} from "@/types";
import { storage } from "@/services/storage";
import { buildSeedState } from "@/data/seed";
import {
  getAvailableQty,
  recomputeInventory,
} from "@/services/inventory";
import { todayISO } from "@/lib/format";

// ---------------------------------------------------------------------------
// Collection maps
// ---------------------------------------------------------------------------

type MasterKey =
  | "categories"
  | "units"
  | "items"
  | "warehouses"
  | "locations"
  | "suppliers"
  | "customers";

type TxnKey =
  | "goodsReceipts"
  | "stockIssues"
  | "stockTransfers"
  | "stockAdjustments"
  | "openingStocks";

export type MasterRecord =
  | Category
  | Unit
  | Item
  | Warehouse
  | WarehouseLocation
  | Supplier
  | Customer;

export type TxnRecord =
  | GoodsReceipt
  | StockIssue
  | StockTransfer
  | StockAdjustment
  | OpeningStock;

export type ActionResult = { ok: boolean; error?: string };

const PREFIX_FOR: Record<TxnKey, string> = {
  goodsReceipts: "GRN",
  stockIssues: "ISS",
  stockTransfers: "TRF",
  stockAdjustments: "ADJ",
  openingStocks: "OPEN",
};

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

interface WmsContextValue {
  state: WmsState;
  ready: boolean;

  saveMaster: <K extends MasterKey>(key: K, record: WmsState[K][number]) => void;
  deleteMaster: (key: MasterKey, id: string) => void;

  peekDocNo: (key: TxnKey) => string;
  saveTxn: <K extends TxnKey>(key: K, doc: WmsState[K][number]) => ActionResult;
  postTxn: (key: TxnKey, id: string) => ActionResult;
  deleteTxn: (key: TxnKey, id: string) => ActionResult;

  updateSettings: (patch: Partial<GeneralSettings>) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  resetDemo: () => void;
}

const WmsContext = createContext<WmsContextValue | null>(null);

// ---------------------------------------------------------------------------
// Posting validation (critical business rules)
// ---------------------------------------------------------------------------

function validatePosting(state: WmsState, key: TxnKey, doc: TxnRecord): string | null {
  if (key === "stockIssues") {
    const d = doc as StockIssue;
    if (!d.warehouseId) return "A warehouse must be selected.";
    if (!d.lines.length) return "Add at least one item to issue.";
    // aggregate requested per bucket
    const req = new Map<string, number>();
    for (const l of d.lines) {
      if (l.quantity <= 0) return "Issue quantity must be greater than zero.";
      const k = `${l.itemId}|${l.locationId}|${l.batchNo}`;
      req.set(k, (req.get(k) ?? 0) + l.quantity);
    }
    for (const l of d.lines) {
      const k = `${l.itemId}|${l.locationId}|${l.batchNo}`;
      const need = req.get(k) ?? 0;
      const avail = getAvailableQty(state.balances, l.itemId, d.warehouseId, l.locationId, l.batchNo);
      if (need > avail) {
        const item = state.items.find((i) => i.id === l.itemId);
        return `Insufficient stock for ${item?.name ?? "item"}. Only ${avail} available, requested ${need}.`;
      }
    }
  }

  if (key === "stockTransfers") {
    const d = doc as StockTransfer;
    if (!d.sourceWarehouseId || !d.destWarehouseId) return "Source and destination warehouses are required.";
    if (d.sourceWarehouseId === d.destWarehouseId && d.sourceLocationId === d.destLocationId)
      return "Source and destination cannot be identical.";
    if (!d.lines.length) return "Add at least one item to transfer.";
    const req = new Map<string, number>();
    for (const l of d.lines) {
      if (l.quantity <= 0) return "Transfer quantity must be greater than zero.";
      const k = `${l.itemId}|${l.batchNo}`;
      req.set(k, (req.get(k) ?? 0) + l.quantity);
    }
    for (const l of d.lines) {
      const k = `${l.itemId}|${l.batchNo}`;
      const need = req.get(k) ?? 0;
      const avail = getAvailableQty(state.balances, l.itemId, d.sourceWarehouseId, d.sourceLocationId, l.batchNo);
      if (need > avail) {
        const item = state.items.find((i) => i.id === l.itemId);
        return `Insufficient source stock for ${item?.name ?? "item"}. Only ${avail} available, requested ${need}.`;
      }
    }
  }

  if (key === "stockAdjustments") {
    const d = doc as StockAdjustment;
    if (!d.warehouseId) return "A warehouse must be selected.";
    if (!d.lines.length) return "Add at least one adjustment line.";
    for (const l of d.lines) {
      const diff = l.physicalQty - l.systemQty;
      const current = getAvailableQty(state.balances, l.itemId, d.warehouseId, l.locationId, l.batchNo);
      if (current + diff < 0) {
        const item = state.items.find((i) => i.id === l.itemId);
        return `Adjustment would make stock negative for ${item?.name ?? "item"}.`;
      }
    }
  }

  if (key === "goodsReceipts") {
    const d = doc as GoodsReceipt;
    if (!d.supplierId) return "A supplier is required.";
    if (!d.warehouseId) return "A warehouse is required.";
    if (!d.lines.length) return "Add at least one item to receive.";
    for (const l of d.lines) {
      if (l.quantity <= 0) return "Received quantity must be greater than zero.";
    }
  }

  if (key === "openingStocks") {
    const d = doc as OpeningStock;
    if (!d.warehouseId) return "A warehouse is required.";
    if (!d.lines.length) return "Add at least one opening line.";
    for (const l of d.lines) {
      if (l.quantity <= 0) return "Opening quantity must be greater than zero.";
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function WmsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WmsState>(() => storage.load() ?? buildSeedState());
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    // persist seed immediately if freshly built
    storage.save(stateRef.current);
    const t = setTimeout(() => setReady(true), 350);
    return () => clearTimeout(t);
  }, []);

  const commit = (
    fn: (draft: WmsState) => void,
    opts: { recompute?: boolean } = {},
  ) => {
    setState((prev) => {
      const draft = clone(prev);
      fn(draft);
      let next = draft;
      if (opts.recompute) {
        const { balances, ledger } = recomputeInventory(next);
        next = { ...next, balances, ledger };
      }
      storage.save(next);
      return next;
    });
  };

  const value = useMemo<WmsContextValue>(() => {
    return {
      state,
      ready,

      saveMaster: (key, record) => {
        commit((draft) => {
          const list = draft[key] as unknown as MasterRecord[];
          const now = todayISO();
          const idx = list.findIndex((r) => r.id === (record as MasterRecord).id);
          const rec = { ...(record as MasterRecord), updatedAt: now };
          if (idx >= 0) {
            rec.createdAt = list[idx].createdAt;
            list[idx] = rec;
          } else {
            if (!rec.createdAt) rec.createdAt = now;
            list.push(rec);
          }
        });
      },

      deleteMaster: (key, id) => {
        commit((draft) => {
          const list = draft[key] as unknown as MasterRecord[];
          const idx = list.findIndex((r) => r.id === id);
          if (idx >= 0) list.splice(idx, 1);
        });
      },

      peekDocNo: (key) => {
        const prefix = PREFIX_FOR[key];
        const n = (stateRef.current.counters[prefix] ?? 0) + 1;
        return `${prefix}-${String(n).padStart(4, "0")}`;
      },

      saveTxn: (key, doc) => {
        const prefix = PREFIX_FOR[key];
        // guard: only basic validation on draft save when posting
        const typed = doc as TxnRecord;
        if (typed.status === "posted") {
          const err = validatePosting(stateRef.current, key, typed);
          if (err) return { ok: false, error: err };
        }
        commit(
          (draft) => {
            const list = draft[key] as unknown as TxnRecord[];
            const now = todayISO();
            const idx = list.findIndex((r) => r.id === typed.id);
            if (idx >= 0) {
              if (list[idx].status === "posted") {
                // do not silently overwrite a posted document
                return;
              }
              list[idx] = { ...typed, updatedAt: now };
            } else {
              list.push({ ...typed, createdAt: now, updatedAt: now });
              draft.counters[prefix] = (draft.counters[prefix] ?? 0) + 1;
            }
          },
          { recompute: true },
        );
        return { ok: true };
      },

      postTxn: (key, id) => {
        const list = stateRef.current[key] as unknown as TxnRecord[];
        const doc = list.find((r) => r.id === id);
        if (!doc) return { ok: false, error: "Document not found." };
        if (doc.status === "posted") return { ok: false, error: "Document is already posted." };
        const err = validatePosting(stateRef.current, key, doc);
        if (err) return { ok: false, error: err };
        commit(
          (draft) => {
            const dlist = draft[key] as unknown as TxnRecord[];
            const target = dlist.find((r) => r.id === id);
            if (target) {
              target.status = "posted";
              target.postedAt = todayISO();
              target.updatedAt = todayISO();
            }
          },
          { recompute: true },
        );
        return { ok: true };
      },

      deleteTxn: (key, id) => {
        const list = stateRef.current[key] as unknown as TxnRecord[];
        const doc = list.find((r) => r.id === id);
        if (!doc) return { ok: false, error: "Document not found." };
        commit(
          (draft) => {
            const dlist = draft[key] as unknown as TxnRecord[];
            const idx = dlist.findIndex((r) => r.id === id);
            if (idx >= 0) dlist.splice(idx, 1);
          },
          { recompute: true },
        );
        return { ok: true };
      },

      updateSettings: (patch) => {
        commit((draft) => {
          draft.settings = { ...draft.settings, ...patch };
        });
      },

      updateProfile: (patch) => {
        commit((draft) => {
          draft.profile = { ...draft.profile, ...patch };
        });
      },

      resetDemo: () => {
        const fresh = buildSeedState();
        storage.save(fresh);
        setState(fresh);
      },
    };
  }, [state, ready]);

  return <WmsContext.Provider value={value}>{children}</WmsContext.Provider>;
}

export function useWms(): WmsContextValue {
  const ctx = useContext(WmsContext);
  if (!ctx) throw new Error("useWms must be used within a WmsProvider");
  return ctx;
}
