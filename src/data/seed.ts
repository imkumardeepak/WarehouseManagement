import {
  Category,
  Customer,
  GoodsReceipt,
  Item,
  OpeningStock,
  StockAdjustment,
  StockIssue,
  StockTransfer,
  Supplier,
  Unit,
  Warehouse,
  WarehouseLocation,
  WmsState,
} from "@/types";
import { recomputeInventory } from "@/services/inventory";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const ts = daysAgo(90);

// ----------------------------------------------------------------------------
// Masters
// ----------------------------------------------------------------------------

const categories: Category[] = [
  { id: "cat-1", code: "CAT-ELE", name: "Electronics", description: "Electronic goods and gadgets", parentId: null, status: "active", createdAt: ts, updatedAt: ts },
  { id: "cat-2", code: "CAT-GRO", name: "Groceries", description: "Food and daily essentials", parentId: null, status: "active", createdAt: ts, updatedAt: ts },
  { id: "cat-3", code: "CAT-STA", name: "Stationery", description: "Office and school stationery", parentId: null, status: "active", createdAt: ts, updatedAt: ts },
  { id: "cat-4", code: "CAT-HRD", name: "Hardware", description: "Tools and hardware items", parentId: null, status: "active", createdAt: ts, updatedAt: ts },
  { id: "cat-5", code: "CAT-APP", name: "Apparel", description: "Clothing and textiles", parentId: null, status: "active", createdAt: ts, updatedAt: ts },
  { id: "cat-6", code: "CAT-BEV", name: "Beverages", description: "Drinks and liquid consumables", parentId: null, status: "active", createdAt: ts, updatedAt: ts },
];

const units: Unit[] = [
  { id: "unit-pcs", code: "PCS", name: "Pieces", symbol: "pcs", decimalAllowed: false, status: "active", createdAt: ts, updatedAt: ts },
  { id: "unit-kg", code: "KG", name: "Kilogram", symbol: "kg", decimalAllowed: true, status: "active", createdAt: ts, updatedAt: ts },
  { id: "unit-ltr", code: "LTR", name: "Litre", symbol: "L", decimalAllowed: true, status: "active", createdAt: ts, updatedAt: ts },
  { id: "unit-box", code: "BOX", name: "Box", symbol: "box", decimalAllowed: false, status: "active", createdAt: ts, updatedAt: ts },
  { id: "unit-mtr", code: "MTR", name: "Metre", symbol: "m", decimalAllowed: true, status: "active", createdAt: ts, updatedAt: ts },
];

const items: Item[] = [
  { id: "item-1", sku: "ELE-TV-55", name: "Samsung 55\" 4K Smart LED TV", categoryId: "cat-1", subcategory: "Television", unitId: "unit-pcs", barcode: "8901234500011", description: "55 inch Crystal UHD 4K Smart TV", standardCost: 42000, sellingPrice: 54990, minStock: 10, maxStock: 120, reorderLevel: 20, imageUrl: "", status: "active", createdAt: ts, updatedAt: ts },
  { id: "item-2", sku: "ELE-MOB-128", name: "Redmi Note 13 Pro 128GB", categoryId: "cat-1", subcategory: "Mobile", unitId: "unit-pcs", barcode: "8901234500028", description: "6.67 inch AMOLED smartphone", standardCost: 18500, sellingPrice: 23999, minStock: 25, maxStock: 300, reorderLevel: 50, imageUrl: "", status: "active", createdAt: ts, updatedAt: ts },
  { id: "item-3", sku: "ELE-LAP-15", name: "HP Pavilion 15 i5 Laptop", categoryId: "cat-1", subcategory: "Laptop", unitId: "unit-pcs", barcode: "8901234500035", description: "15.6 inch, i5 12th Gen, 16GB RAM", standardCost: 52000, sellingPrice: 64990, minStock: 8, maxStock: 80, reorderLevel: 15, imageUrl: "", status: "active", createdAt: ts, updatedAt: ts },
  { id: "item-4", sku: "GRO-RICE-25", name: "India Gate Basmati Rice 25kg", categoryId: "cat-2", subcategory: "Grains", unitId: "unit-kg", barcode: "8901234500042", description: "Premium aged basmati rice", standardCost: 1850, sellingPrice: 2400, minStock: 50, maxStock: 500, reorderLevel: 80, imageUrl: "", status: "active", createdAt: ts, updatedAt: ts },
  { id: "item-5", sku: "GRO-OIL-15", name: "Fortune Sunflower Oil 15L", categoryId: "cat-2", subcategory: "Edible Oil", unitId: "unit-ltr", barcode: "8901234500059", description: "Refined sunflower cooking oil", standardCost: 1650, sellingPrice: 2050, minStock: 40, maxStock: 400, reorderLevel: 70, imageUrl: "", status: "active", createdAt: ts, updatedAt: ts },
  { id: "item-6", sku: "GRO-ATA-10", name: "Aashirvaad Atta 10kg", categoryId: "cat-2", subcategory: "Flour", unitId: "unit-kg", barcode: "8901234500066", description: "Whole wheat atta", standardCost: 420, sellingPrice: 560, minStock: 60, maxStock: 600, reorderLevel: 100, imageUrl: "", status: "active", createdAt: ts, updatedAt: ts },
  { id: "item-7", sku: "STA-A4-500", name: "JK Copier A4 Paper 500 Sheets", categoryId: "cat-3", subcategory: "Paper", unitId: "unit-box", barcode: "8901234500073", description: "75 GSM A4 printing paper ream", standardCost: 280, sellingPrice: 365, minStock: 100, maxStock: 1000, reorderLevel: 150, imageUrl: "", status: "active", createdAt: ts, updatedAt: ts },
  { id: "item-8", sku: "STA-PEN-50", name: "Cello Butterflow Pen (Box of 50)", categoryId: "cat-3", subcategory: "Writing", unitId: "unit-box", barcode: "8901234500080", description: "Blue ball pens, box of 50", standardCost: 190, sellingPrice: 275, minStock: 80, maxStock: 800, reorderLevel: 120, imageUrl: "", status: "active", createdAt: ts, updatedAt: ts },
  { id: "item-9", sku: "HRD-DRL-18", name: "Bosch 18V Cordless Drill", categoryId: "cat-4", subcategory: "Power Tools", unitId: "unit-pcs", barcode: "8901234500097", description: "Brushless cordless drill driver", standardCost: 6800, sellingPrice: 8990, minStock: 15, maxStock: 150, reorderLevel: 25, imageUrl: "", status: "active", createdAt: ts, updatedAt: ts },
  { id: "item-10", sku: "HRD-WIRE-90", name: "Finolex 2.5sqmm Wire 90m", categoryId: "cat-4", subcategory: "Electricals", unitId: "unit-mtr", barcode: "8901234500103", description: "FR PVC insulated copper wire", standardCost: 1250, sellingPrice: 1620, minStock: 30, maxStock: 300, reorderLevel: 50, imageUrl: "", status: "active", createdAt: ts, updatedAt: ts },
  { id: "item-11", sku: "APP-TSH-M", name: "Allen Solly Polo T-Shirt (M)", categoryId: "cat-5", subcategory: "T-Shirts", unitId: "unit-pcs", barcode: "8901234500110", description: "Cotton polo t-shirt, medium", standardCost: 650, sellingPrice: 999, minStock: 40, maxStock: 400, reorderLevel: 60, imageUrl: "", status: "active", createdAt: ts, updatedAt: ts },
  { id: "item-12", sku: "APP-JNS-32", name: "Levi's 511 Slim Jeans (32)", categoryId: "cat-5", subcategory: "Jeans", unitId: "unit-pcs", barcode: "8901234500127", description: "Slim fit denim jeans, waist 32", standardCost: 1800, sellingPrice: 2799, minStock: 25, maxStock: 250, reorderLevel: 40, imageUrl: "", status: "active", createdAt: ts, updatedAt: ts },
  { id: "item-13", sku: "BEV-WTR-24", name: "Bisleri Water 1L (Pack of 24)", categoryId: "cat-6", subcategory: "Water", unitId: "unit-box", barcode: "8901234500134", description: "Packaged drinking water", standardCost: 220, sellingPrice: 300, minStock: 100, maxStock: 1200, reorderLevel: 180, imageUrl: "", status: "active", createdAt: ts, updatedAt: ts },
  { id: "item-14", sku: "BEV-JUC-12", name: "Real Mixed Fruit Juice (Pack of 12)", categoryId: "cat-6", subcategory: "Juice", unitId: "unit-box", barcode: "8901234500141", description: "1L tetra pack fruit juice", standardCost: 780, sellingPrice: 1080, minStock: 50, maxStock: 500, reorderLevel: 90, imageUrl: "", status: "active", createdAt: ts, updatedAt: ts },
  { id: "item-15", sku: "ELE-PWB-20", name: "Mi Power Bank 20000mAh", categoryId: "cat-1", subcategory: "Accessories", unitId: "unit-pcs", barcode: "8901234500158", description: "Fast charging 20000mAh power bank", standardCost: 1450, sellingPrice: 1999, minStock: 30, maxStock: 400, reorderLevel: 60, imageUrl: "", status: "active", createdAt: ts, updatedAt: ts },
];

const warehouses: Warehouse[] = [
  { id: "wh-1", code: "WH-MUM", name: "Mumbai Main Warehouse", type: "main", address: "Plot 14, MIDC Andheri East", city: "Mumbai", state: "Maharashtra", contactPerson: "Rajesh Sharma", contactNumber: "9820012345", status: "active", createdAt: ts, updatedAt: ts },
  { id: "wh-2", code: "WH-DEL", name: "Delhi Distribution Center", type: "distribution", address: "Sector 18, Udyog Vihar", city: "New Delhi", state: "Delhi", contactPerson: "Anita Verma", contactNumber: "9811098110", status: "active", createdAt: ts, updatedAt: ts },
  { id: "wh-3", code: "WH-BLR", name: "Bangalore Retail Hub", type: "retail", address: "Whitefield Industrial Area", city: "Bengaluru", state: "Karnataka", contactPerson: "Suresh Kumar", contactNumber: "9845098450", status: "active", createdAt: ts, updatedAt: ts },
];

const locations: WarehouseLocation[] = [
  { id: "loc-1", code: "MUM-A-01", warehouseId: "wh-1", zone: "A", rack: "R1", shelf: "S1", bin: "B01", maxCapacity: 1000, status: "active", createdAt: ts, updatedAt: ts },
  { id: "loc-2", code: "MUM-A-02", warehouseId: "wh-1", zone: "A", rack: "R1", shelf: "S2", bin: "B02", maxCapacity: 1000, status: "active", createdAt: ts, updatedAt: ts },
  { id: "loc-3", code: "MUM-B-01", warehouseId: "wh-1", zone: "B", rack: "R2", shelf: "S1", bin: "B01", maxCapacity: 800, status: "active", createdAt: ts, updatedAt: ts },
  { id: "loc-4", code: "MUM-B-02", warehouseId: "wh-1", zone: "B", rack: "R2", shelf: "S2", bin: "B02", maxCapacity: 800, status: "active", createdAt: ts, updatedAt: ts },
  { id: "loc-5", code: "MUM-C-01", warehouseId: "wh-1", zone: "C", rack: "R3", shelf: "S1", bin: "B01", maxCapacity: 1500, status: "active", createdAt: ts, updatedAt: ts },
  { id: "loc-6", code: "DEL-A-01", warehouseId: "wh-2", zone: "A", rack: "R1", shelf: "S1", bin: "B01", maxCapacity: 1200, status: "active", createdAt: ts, updatedAt: ts },
  { id: "loc-7", code: "DEL-A-02", warehouseId: "wh-2", zone: "A", rack: "R1", shelf: "S2", bin: "B02", maxCapacity: 1200, status: "active", createdAt: ts, updatedAt: ts },
  { id: "loc-8", code: "DEL-B-01", warehouseId: "wh-2", zone: "B", rack: "R2", shelf: "S1", bin: "B01", maxCapacity: 900, status: "active", createdAt: ts, updatedAt: ts },
  { id: "loc-9", code: "DEL-B-02", warehouseId: "wh-2", zone: "B", rack: "R2", shelf: "S2", bin: "B02", maxCapacity: 900, status: "active", createdAt: ts, updatedAt: ts },
  { id: "loc-10", code: "BLR-A-01", warehouseId: "wh-3", zone: "A", rack: "R1", shelf: "S1", bin: "B01", maxCapacity: 600, status: "active", createdAt: ts, updatedAt: ts },
  { id: "loc-11", code: "BLR-A-02", warehouseId: "wh-3", zone: "A", rack: "R1", shelf: "S2", bin: "B02", maxCapacity: 600, status: "active", createdAt: ts, updatedAt: ts },
  { id: "loc-12", code: "BLR-B-01", warehouseId: "wh-3", zone: "B", rack: "R2", shelf: "S1", bin: "B01", maxCapacity: 700, status: "active", createdAt: ts, updatedAt: ts },
];

const suppliers: Supplier[] = [
  { id: "sup-1", code: "SUP-001", name: "Reliance Digital Distributors", contactPerson: "Mahesh Patel", mobile: "9820011122", email: "mahesh@reliancedist.in", address: "Lower Parel, Mumbai", gstin: "27AABCR1234F1Z5", status: "active", createdAt: ts, updatedAt: ts },
  { id: "sup-2", code: "SUP-002", name: "Adani Wilmar Foods", contactPerson: "Kiran Shah", mobile: "9879098790", email: "kiran@adaniwilmar.in", address: "Ahmedabad, Gujarat", gstin: "24AADCA5678G1Z2", status: "active", createdAt: ts, updatedAt: ts },
  { id: "sup-3", code: "SUP-003", name: "JK Paper Limited", contactPerson: "Deepak Rao", mobile: "9811122233", email: "deepak@jkpaper.in", address: "New Delhi", gstin: "07AAACJ9012H1Z8", status: "active", createdAt: ts, updatedAt: ts },
  { id: "sup-4", code: "SUP-004", name: "Bosch India Tools", contactPerson: "Vivek Nair", mobile: "9845011223", email: "vivek@bosch.in", address: "Bengaluru, Karnataka", gstin: "29AAACB3456K1Z4", status: "active", createdAt: ts, updatedAt: ts },
  { id: "sup-5", code: "SUP-005", name: "Arvind Textiles Mills", contactPerson: "Priya Mehta", mobile: "9898011334", email: "priya@arvind.in", address: "Ahmedabad, Gujarat", gstin: "24AAACA7890L1Z1", status: "active", createdAt: ts, updatedAt: ts },
];

const customers: Customer[] = [
  { id: "cust-1", code: "CUS-001", name: "Croma Retail Stores", contactPerson: "Amit Joshi", mobile: "9820033445", email: "amit@croma.in", address: "Bandra West, Mumbai", gstin: "27AABCC1122M1Z9", status: "active", createdAt: ts, updatedAt: ts },
  { id: "cust-2", code: "CUS-002", name: "BigBasket Online", contactPerson: "Sneha Reddy", mobile: "9845044556", email: "sneha@bigbasket.in", address: "Koramangala, Bengaluru", gstin: "29AABCB3344N1Z7", status: "active", createdAt: ts, updatedAt: ts },
  { id: "cust-3", code: "CUS-003", name: "DMart Hypermarket", contactPerson: "Rohit Gupta", mobile: "9811055667", email: "rohit@dmart.in", address: "Rohini, New Delhi", gstin: "07AABCD5566P1Z5", status: "active", createdAt: ts, updatedAt: ts },
  { id: "cust-4", code: "CUS-004", name: "Vijay Sales Outlets", contactPerson: "Karan Malhotra", mobile: "9820066778", email: "karan@vijaysales.in", address: "Dadar, Mumbai", gstin: "27AABCV7788Q1Z3", status: "active", createdAt: ts, updatedAt: ts },
  { id: "cust-5", code: "CUS-005", name: "Internal Production Dept", contactPerson: "Factory Floor", mobile: "9800000000", email: "production@stockflow.in", address: "In-house", gstin: "", status: "active", createdAt: ts, updatedAt: ts },
];

// ----------------------------------------------------------------------------
// Transactions (all posted historical documents = 20)
// ----------------------------------------------------------------------------

const openingStocks: OpeningStock[] = [
  {
    id: "op-1",
    docNo: "OPEN-0001",
    date: daysAgo(75),
    warehouseId: "wh-1",
    remarks: "Initial opening stock — Mumbai Main",
    status: "posted",
    createdAt: daysAgo(75),
    updatedAt: daysAgo(75),
    postedAt: daysAgo(75),
    lines: [
      { id: "opl-1", itemId: "item-1", locationId: "loc-1", batchNo: "B-TV-01", expiryDate: null, quantity: 60, unitCost: 42000 },
      { id: "opl-2", itemId: "item-2", locationId: "loc-1", batchNo: "B-MOB-01", expiryDate: null, quantity: 180, unitCost: 18500 },
      { id: "opl-3", itemId: "item-3", locationId: "loc-2", batchNo: "B-LAP-01", expiryDate: null, quantity: 45, unitCost: 52000 },
      { id: "opl-4", itemId: "item-4", locationId: "loc-3", batchNo: "B-RICE-01", expiryDate: daysFromNow(240), quantity: 300, unitCost: 1850 },
      { id: "opl-5", itemId: "item-5", locationId: "loc-3", batchNo: "B-OIL-01", expiryDate: daysFromNow(120), quantity: 220, unitCost: 1650 },
      { id: "opl-6", itemId: "item-7", locationId: "loc-5", batchNo: "B-A4-01", expiryDate: null, quantity: 600, unitCost: 280 },
      { id: "opl-7", itemId: "item-9", locationId: "loc-4", batchNo: "B-DRL-01", expiryDate: null, quantity: 90, unitCost: 6800 },
      { id: "opl-8", itemId: "item-13", locationId: "loc-5", batchNo: "B-WTR-01", expiryDate: daysFromNow(60), quantity: 700, unitCost: 220 },
      { id: "opl-9", itemId: "item-15", locationId: "loc-1", batchNo: "B-PWB-01", expiryDate: null, quantity: 240, unitCost: 1450 },
    ],
  },
];

const goodsReceipts: GoodsReceipt[] = [
  {
    id: "grn-1", docNo: "GRN-0001", date: daysAgo(60), supplierId: "sup-1", warehouseId: "wh-1", poNumber: "PO-2025-101", invoiceNumber: "INV-RD-5521", challanNumber: "CH-9001", remarks: "Electronics restock", status: "posted", createdAt: daysAgo(60), updatedAt: daysAgo(60), postedAt: daysAgo(60),
    lines: [
      { id: "grl-1", itemId: "item-1", locationId: "loc-1", batchNo: "B-TV-02", expiryDate: null, quantity: 40, unitCost: 42500 },
      { id: "grl-2", itemId: "item-2", locationId: "loc-1", batchNo: "B-MOB-02", expiryDate: null, quantity: 120, unitCost: 18700 },
    ],
  },
  {
    id: "grn-2", docNo: "GRN-0002", date: daysAgo(55), supplierId: "sup-2", warehouseId: "wh-1", poNumber: "PO-2025-102", invoiceNumber: "INV-AW-3310", challanNumber: "CH-9002", remarks: "Grocery bulk purchase", status: "posted", createdAt: daysAgo(55), updatedAt: daysAgo(55), postedAt: daysAgo(55),
    lines: [
      { id: "grl-3", itemId: "item-4", locationId: "loc-3", batchNo: "B-RICE-02", expiryDate: daysFromNow(300), quantity: 200, unitCost: 1880 },
      { id: "grl-4", itemId: "item-6", locationId: "loc-3", batchNo: "B-ATA-01", expiryDate: daysFromNow(5), quantity: 150, unitCost: 420 },
      { id: "grl-5", itemId: "item-5", locationId: "loc-3", batchNo: "B-OIL-02", expiryDate: daysFromNow(25), quantity: 160, unitCost: 1680 },
    ],
  },
  {
    id: "grn-3", docNo: "GRN-0003", date: daysAgo(50), supplierId: "sup-3", warehouseId: "wh-2", poNumber: "PO-2025-103", invoiceNumber: "INV-JK-7742", challanNumber: "CH-9003", remarks: "Stationery for Delhi DC", status: "posted", createdAt: daysAgo(50), updatedAt: daysAgo(50), postedAt: daysAgo(50),
    lines: [
      { id: "grl-6", itemId: "item-7", locationId: "loc-6", batchNo: "B-A4-02", expiryDate: null, quantity: 500, unitCost: 285 },
      { id: "grl-7", itemId: "item-8", locationId: "loc-6", batchNo: "B-PEN-01", expiryDate: null, quantity: 400, unitCost: 190 },
    ],
  },
  {
    id: "grn-4", docNo: "GRN-0004", date: daysAgo(45), supplierId: "sup-4", warehouseId: "wh-2", poNumber: "PO-2025-104", invoiceNumber: "INV-BO-1190", challanNumber: "CH-9004", remarks: "Hardware tools", status: "posted", createdAt: daysAgo(45), updatedAt: daysAgo(45), postedAt: daysAgo(45),
    lines: [
      { id: "grl-8", itemId: "item-9", locationId: "loc-8", batchNo: "B-DRL-02", expiryDate: null, quantity: 70, unitCost: 6900 },
      { id: "grl-9", itemId: "item-10", locationId: "loc-8", batchNo: "B-WIRE-01", expiryDate: null, quantity: 150, unitCost: 1250 },
    ],
  },
  {
    id: "grn-5", docNo: "GRN-0005", date: daysAgo(40), supplierId: "sup-5", warehouseId: "wh-3", poNumber: "PO-2025-105", invoiceNumber: "INV-AT-8820", challanNumber: "CH-9005", remarks: "Apparel for retail hub", status: "posted", createdAt: daysAgo(40), updatedAt: daysAgo(40), postedAt: daysAgo(40),
    lines: [
      { id: "grl-10", itemId: "item-11", locationId: "loc-10", batchNo: "B-TSH-01", expiryDate: null, quantity: 200, unitCost: 650 },
      { id: "grl-11", itemId: "item-12", locationId: "loc-10", batchNo: "B-JNS-01", expiryDate: null, quantity: 120, unitCost: 1800 },
    ],
  },
  {
    id: "grn-6", docNo: "GRN-0006", date: daysAgo(30), supplierId: "sup-2", warehouseId: "wh-3", poNumber: "PO-2025-106", invoiceNumber: "INV-AW-3390", challanNumber: "CH-9006", remarks: "Beverages", status: "posted", createdAt: daysAgo(30), updatedAt: daysAgo(30), postedAt: daysAgo(30),
    lines: [
      { id: "grl-12", itemId: "item-13", locationId: "loc-12", batchNo: "B-WTR-02", expiryDate: daysFromNow(2), quantity: 300, unitCost: 225 },
      { id: "grl-13", itemId: "item-14", locationId: "loc-12", batchNo: "B-JUC-01", expiryDate: daysFromNow(80), quantity: 180, unitCost: 780 },
    ],
  },
  {
    id: "grn-7", docNo: "GRN-0007", date: daysAgo(20), supplierId: "sup-1", warehouseId: "wh-1", poNumber: "PO-2025-107", invoiceNumber: "INV-RD-5599", challanNumber: "CH-9007", remarks: "Power banks and laptops", status: "posted", createdAt: daysAgo(20), updatedAt: daysAgo(20), postedAt: daysAgo(20),
    lines: [
      { id: "grl-14", itemId: "item-15", locationId: "loc-1", batchNo: "B-PWB-02", expiryDate: null, quantity: 160, unitCost: 1470 },
      { id: "grl-15", itemId: "item-3", locationId: "loc-2", batchNo: "B-LAP-02", expiryDate: null, quantity: 30, unitCost: 52500 },
    ],
  },
  {
    id: "grn-8", docNo: "GRN-0008", date: daysAgo(10), supplierId: "sup-2", warehouseId: "wh-1", poNumber: "PO-2025-108", invoiceNumber: "INV-AW-3401", challanNumber: "CH-9008", remarks: "Expired batch received (demo)", status: "posted", createdAt: daysAgo(10), updatedAt: daysAgo(10), postedAt: daysAgo(10),
    lines: [
      { id: "grl-16", itemId: "item-14", locationId: "loc-3", batchNo: "B-JUC-EXP", expiryDate: daysAgo(4), quantity: 40, unitCost: 790 },
    ],
  },
];

const stockIssues: StockIssue[] = [
  {
    id: "iss-1", docNo: "ISS-0001", date: daysAgo(48), warehouseId: "wh-1", customerId: "cust-1", issuedTo: "Croma Bandra", purpose: "Sales Order", referenceNo: "SO-4401", remarks: "", status: "posted", createdAt: daysAgo(48), updatedAt: daysAgo(48), postedAt: daysAgo(48),
    lines: [
      { id: "isl-1", itemId: "item-1", locationId: "loc-1", batchNo: "B-TV-01", quantity: 20, remarks: "" },
      { id: "isl-2", itemId: "item-2", locationId: "loc-1", batchNo: "B-MOB-01", quantity: 50, remarks: "" },
    ],
  },
  {
    id: "iss-2", docNo: "ISS-0002", date: daysAgo(42), warehouseId: "wh-1", customerId: "cust-4", issuedTo: "Vijay Sales Dadar", purpose: "Sales Order", referenceNo: "SO-4402", remarks: "", status: "posted", createdAt: daysAgo(42), updatedAt: daysAgo(42), postedAt: daysAgo(42),
    lines: [
      { id: "isl-3", itemId: "item-3", locationId: "loc-2", batchNo: "B-LAP-01", quantity: 15, remarks: "" },
      { id: "isl-4", itemId: "item-15", locationId: "loc-1", batchNo: "B-PWB-01", quantity: 80, remarks: "" },
    ],
  },
  {
    id: "iss-3", docNo: "ISS-0003", date: daysAgo(35), warehouseId: "wh-1", customerId: "cust-2", issuedTo: "BigBasket DC", purpose: "Sales Order", referenceNo: "SO-4403", remarks: "", status: "posted", createdAt: daysAgo(35), updatedAt: daysAgo(35), postedAt: daysAgo(35),
    lines: [
      { id: "isl-5", itemId: "item-4", locationId: "loc-3", batchNo: "B-RICE-01", quantity: 120, remarks: "" },
      { id: "isl-6", itemId: "item-5", locationId: "loc-3", batchNo: "B-OIL-01", quantity: 90, remarks: "" },
    ],
  },
  {
    id: "iss-4", docNo: "ISS-0004", date: daysAgo(25), warehouseId: "wh-2", customerId: "cust-3", issuedTo: "DMart Rohini", purpose: "Sales Order", referenceNo: "SO-4404", remarks: "", status: "posted", createdAt: daysAgo(25), updatedAt: daysAgo(25), postedAt: daysAgo(25),
    lines: [
      { id: "isl-7", itemId: "item-7", locationId: "loc-6", batchNo: "B-A4-02", quantity: 200, remarks: "" },
      { id: "isl-8", itemId: "item-8", locationId: "loc-6", batchNo: "B-PEN-01", quantity: 150, remarks: "" },
    ],
  },
  {
    id: "iss-5", docNo: "ISS-0005", date: daysAgo(15), warehouseId: "wh-3", customerId: "cust-2", issuedTo: "BigBasket South", purpose: "Sales Order", referenceNo: "SO-4405", remarks: "", status: "posted", createdAt: daysAgo(15), updatedAt: daysAgo(15), postedAt: daysAgo(15),
    lines: [
      { id: "isl-9", itemId: "item-11", locationId: "loc-10", batchNo: "B-TSH-01", quantity: 70, remarks: "" },
      { id: "isl-10", itemId: "item-13", locationId: "loc-12", batchNo: "B-WTR-02", quantity: 120, remarks: "" },
    ],
  },
  {
    id: "iss-6", docNo: "ISS-0006", date: daysAgo(5), warehouseId: "wh-1", customerId: "cust-5", issuedTo: "Production Dept", purpose: "Internal Consumption", referenceNo: "REQ-220", remarks: "", status: "posted", createdAt: daysAgo(5), updatedAt: daysAgo(5), postedAt: daysAgo(5),
    lines: [
      { id: "isl-11", itemId: "item-9", locationId: "loc-4", batchNo: "B-DRL-01", quantity: 30, remarks: "" },
    ],
  },
];

const stockTransfers: StockTransfer[] = [
  {
    id: "trf-1", docNo: "TRF-0001", date: daysAgo(38), sourceWarehouseId: "wh-1", sourceLocationId: "loc-1", destWarehouseId: "wh-2", destLocationId: "loc-7", remarks: "Rebalance mobiles to Delhi", status: "posted", createdAt: daysAgo(38), updatedAt: daysAgo(38), postedAt: daysAgo(38),
    lines: [
      { id: "trl-1", itemId: "item-2", batchNo: "B-MOB-02", quantity: 60 },
    ],
  },
  {
    id: "trf-2", docNo: "TRF-0002", date: daysAgo(28), sourceWarehouseId: "wh-1", sourceLocationId: "loc-5", destWarehouseId: "wh-3", destLocationId: "loc-11", remarks: "Water stock to Bangalore", status: "posted", createdAt: daysAgo(28), updatedAt: daysAgo(28), postedAt: daysAgo(28),
    lines: [
      { id: "trl-2", itemId: "item-13", batchNo: "B-WTR-01", quantity: 150 },
    ],
  },
  {
    id: "trf-3", docNo: "TRF-0003", date: daysAgo(12), sourceWarehouseId: "wh-2", sourceLocationId: "loc-8", destWarehouseId: "wh-1", destLocationId: "loc-4", remarks: "Return drills to Mumbai", status: "posted", createdAt: daysAgo(12), updatedAt: daysAgo(12), postedAt: daysAgo(12),
    lines: [
      { id: "trl-3", itemId: "item-9", batchNo: "B-DRL-02", quantity: 20 },
    ],
  },
];

const stockAdjustments: StockAdjustment[] = [
  {
    id: "adj-1", docNo: "ADJ-0001", date: daysAgo(18), warehouseId: "wh-1", remarks: "Cycle count correction", status: "posted", createdAt: daysAgo(18), updatedAt: daysAgo(18), postedAt: daysAgo(18),
    lines: [
      { id: "adl-1", itemId: "item-7", locationId: "loc-5", batchNo: "B-A4-01", type: "decrease", systemQty: 600, physicalQty: 585, reason: "Damaged during handling" },
    ],
  },
  {
    id: "adj-2", docNo: "ADJ-0002", date: daysAgo(8), warehouseId: "wh-1", remarks: "Found extra stock", status: "posted", createdAt: daysAgo(8), updatedAt: daysAgo(8), postedAt: daysAgo(8),
    lines: [
      { id: "adl-2", itemId: "item-15", locationId: "loc-1", batchNo: "B-PWB-02", type: "increase", systemQty: 160, physicalQty: 168, reason: "Miscount in previous receipt" },
    ],
  },
];

// ----------------------------------------------------------------------------
// Assemble & derive inventory
// ----------------------------------------------------------------------------

export function buildSeedState(): WmsState {
  const base: WmsState = {
    categories,
    units,
    items,
    warehouses,
    locations,
    suppliers,
    customers,
    goodsReceipts,
    stockIssues,
    stockTransfers,
    stockAdjustments,
    openingStocks,
    balances: [],
    ledger: [],
    settings: {
      companyName: "StockFlow Traders Pvt. Ltd.",
      currency: "INR",
      expiryWarningDays: 30,
      defaultWarehouseId: "wh-1",
      dateFormat: "dd MMM yyyy",
    },
    profile: {
      name: "Rajesh Sharma",
      email: "rajesh@stockflow.in",
      role: "Warehouse Manager",
      avatarUrl: "",
    },
    counters: {
      GRN: goodsReceipts.length,
      ISS: stockIssues.length,
      TRF: stockTransfers.length,
      ADJ: stockAdjustments.length,
      OPEN: openingStocks.length,
    },
  };

  const { balances, ledger } = recomputeInventory(base);
  return { ...base, balances, ledger };
}
