// ============================================================================
// StockFlow WMS — Domain Model
// All entities are strongly typed. These interfaces are the single source of
// truth for the application's data shape.
// ============================================================================

export type Status = "active" | "inactive";

export type ID = string;

// ----------------------------------------------------------------------------
// Masters
// ----------------------------------------------------------------------------

export interface Category {
  id: ID;
  code: string;
  name: string;
  description: string;
  parentId: ID | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: ID;
  code: string;
  name: string;
  symbol: string;
  decimalAllowed: boolean;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: ID;
  sku: string;
  name: string;
  categoryId: ID;
  subcategory: string;
  unitId: ID;
  barcode: string;
  description: string;
  standardCost: number;
  sellingPrice: number;
  minStock: number;
  maxStock: number;
  reorderLevel: number;
  imageUrl: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export type WarehouseType = "main" | "distribution" | "retail" | "cold-storage" | "transit";

export interface Warehouse {
  id: ID;
  code: string;
  name: string;
  type: WarehouseType;
  address: string;
  city: string;
  state: string;
  contactPerson: string;
  contactNumber: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseLocation {
  id: ID;
  code: string;
  warehouseId: ID;
  zone: string;
  rack: string;
  shelf: string;
  bin: string;
  maxCapacity: number;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: ID;
  code: string;
  name: string;
  contactPerson: string;
  mobile: string;
  email: string;
  address: string;
  gstin: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: ID;
  code: string;
  name: string;
  contactPerson: string;
  mobile: string;
  email: string;
  address: string;
  gstin: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// Transactions
// ----------------------------------------------------------------------------

export type DocStatus = "draft" | "posted" | "cancelled";

export interface GoodsReceiptLine {
  id: ID;
  itemId: ID;
  locationId: ID;
  batchNo: string;
  expiryDate: string | null;
  quantity: number;
  unitCost: number;
}

export interface GoodsReceipt {
  id: ID;
  docNo: string;
  date: string;
  supplierId: ID;
  warehouseId: ID;
  poNumber: string;
  invoiceNumber: string;
  challanNumber: string;
  remarks: string;
  status: DocStatus;
  lines: GoodsReceiptLine[];
  createdAt: string;
  updatedAt: string;
  postedAt: string | null;
}

export interface StockIssueLine {
  id: ID;
  itemId: ID;
  locationId: ID;
  batchNo: string;
  quantity: number;
  remarks: string;
}

export interface StockIssue {
  id: ID;
  docNo: string;
  date: string;
  warehouseId: ID;
  customerId: ID | null;
  issuedTo: string;
  purpose: string;
  referenceNo: string;
  remarks: string;
  status: DocStatus;
  lines: StockIssueLine[];
  createdAt: string;
  updatedAt: string;
  postedAt: string | null;
}

export interface StockTransferLine {
  id: ID;
  itemId: ID;
  batchNo: string;
  quantity: number;
}

export interface StockTransfer {
  id: ID;
  docNo: string;
  date: string;
  sourceWarehouseId: ID;
  sourceLocationId: ID;
  destWarehouseId: ID;
  destLocationId: ID;
  remarks: string;
  status: DocStatus;
  lines: StockTransferLine[];
  createdAt: string;
  updatedAt: string;
  postedAt: string | null;
}

export type AdjustmentType = "increase" | "decrease";

export interface StockAdjustmentLine {
  id: ID;
  itemId: ID;
  locationId: ID;
  batchNo: string;
  type: AdjustmentType;
  systemQty: number;
  physicalQty: number;
  reason: string;
}

export interface StockAdjustment {
  id: ID;
  docNo: string;
  date: string;
  warehouseId: ID;
  remarks: string;
  status: DocStatus;
  lines: StockAdjustmentLine[];
  createdAt: string;
  updatedAt: string;
  postedAt: string | null;
}

export interface OpeningStockLine {
  id: ID;
  itemId: ID;
  locationId: ID;
  batchNo: string;
  expiryDate: string | null;
  quantity: number;
  unitCost: number;
}

export interface OpeningStock {
  id: ID;
  docNo: string;
  date: string;
  warehouseId: ID;
  remarks: string;
  status: DocStatus;
  lines: OpeningStockLine[];
  createdAt: string;
  updatedAt: string;
  postedAt: string | null;
}

// ----------------------------------------------------------------------------
// Inventory
// ----------------------------------------------------------------------------

/** A unique inventory bucket keyed by item + warehouse + location + batch. */
export interface InventoryBalance {
  id: ID; // itemId|warehouseId|locationId|batchNo
  itemId: ID;
  warehouseId: ID;
  locationId: ID;
  batchNo: string;
  expiryDate: string | null;
  quantity: number;
  reservedQty: number;
  avgCost: number;
  updatedAt: string;
}

export type LedgerType =
  | "opening"
  | "receipt"
  | "issue"
  | "transfer-in"
  | "transfer-out"
  | "adjustment-in"
  | "adjustment-out";

export interface InventoryLedger {
  id: ID;
  date: string;
  type: LedgerType;
  docNo: string;
  docId: ID;
  itemId: ID;
  warehouseId: ID;
  locationId: ID;
  batchNo: string;
  qtyIn: number;
  qtyOut: number;
  balanceAfter: number;
  unitCost: number;
  reference: string;
  user: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// Settings & aggregate state
// ----------------------------------------------------------------------------

export interface GeneralSettings {
  companyName: string;
  currency: string;
  expiryWarningDays: number;
  defaultWarehouseId: ID | null;
  dateFormat: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
}

export interface WmsState {
  categories: Category[];
  units: Unit[];
  items: Item[];
  warehouses: Warehouse[];
  locations: WarehouseLocation[];
  suppliers: Supplier[];
  customers: Customer[];
  goodsReceipts: GoodsReceipt[];
  stockIssues: StockIssue[];
  stockTransfers: StockTransfer[];
  stockAdjustments: StockAdjustment[];
  openingStocks: OpeningStock[];
  balances: InventoryBalance[];
  ledger: InventoryLedger[];
  settings: GeneralSettings;
  profile: UserProfile;
  counters: Record<string, number>;
}

export type StockStatus =
  | "in-stock"
  | "low-stock"
  | "out-of-stock"
  | "expiring-soon"
  | "expired";
