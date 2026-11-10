import { WmsState } from "@/types";

const STORAGE_KEY = "stockflow_wms_state";
const VERSION_KEY = "stockflow_wms_version";
const CURRENT_VERSION = "1.0.0";

/** Minimal shape check so corrupted/old data is rejected safely. */
function isValidState(value: unknown): value is WmsState {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  const requiredArrays = [
    "categories",
    "units",
    "items",
    "warehouses",
    "locations",
    "suppliers",
    "customers",
    "goodsReceipts",
    "stockIssues",
    "stockTransfers",
    "stockAdjustments",
    "openingStocks",
    "balances",
    "ledger",
  ];
  return (
    requiredArrays.every((k) => Array.isArray(s[k])) &&
    typeof s.settings === "object" &&
    typeof s.profile === "object"
  );
}

export const storage = {
  load(): WmsState | null {
    try {
      const version = localStorage.getItem(VERSION_KEY);
      if (version !== CURRENT_VERSION) {
        return null; // schema changed → re-seed
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!isValidState(parsed)) {
        console.warn("[storage] Stored WMS state failed validation — re-seeding.");
        return null;
      }
      return parsed;
    } catch (err) {
      console.warn("[storage] Failed to read stored state — re-seeding.", err);
      return null;
    }
  },

  save(state: WmsState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    } catch (err) {
      console.error("[storage] Failed to persist state.", err);
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(VERSION_KEY);
    } catch (err) {
      console.error("[storage] Failed to clear state.", err);
    }
  },
};
