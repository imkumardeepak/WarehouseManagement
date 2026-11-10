import { z } from "zod";
import { Package } from "lucide-react";
import { MasterPage, MasterConfig } from "@/components/common/MasterPage";
import { ActiveBadge } from "@/components/common/StatusBadge";
import { Item } from "@/types";
import { uid } from "@/lib/utils";
import { todayISO, formatCurrency } from "@/lib/format";

const schema = z
  .object({
    sku: z.string().min(1, "SKU is required"),
    name: z.string().min(1, "Item name is required"),
    categoryId: z.string().min(1, "Category is required"),
    subcategory: z.string().optional().default(""),
    unitId: z.string().min(1, "Unit is required"),
    barcode: z.string().optional().default(""),
    description: z.string().optional().default(""),
    standardCost: z.number({ invalid_type_error: "Cost is required" }).min(0, "Cost cannot be negative"),
    sellingPrice: z.number({ invalid_type_error: "Price is required" }).min(0, "Price cannot be negative"),
    minStock: z.number().min(0, "Cannot be negative").default(0),
    maxStock: z.number().min(0, "Cannot be negative").default(0),
    reorderLevel: z.number().min(0, "Reorder level cannot be negative").default(0),
    imageUrl: z.string().optional().default(""),
    active: z.boolean().default(true),
  });
type Form = z.infer<typeof schema>;

const config: MasterConfig<Item, Form> = {
  collectionKey: "items",
  title: "Item Master",
  singular: "Item",
  description: "Manage your product catalogue, pricing and stock thresholds.",
  icon: Package,
  breadcrumbs: [{ label: "Masters" }, { label: "Item Master" }],
  schema,
  csvFilename: "items",
  formSize: "xl",
  fields: (state) => [
    { name: "sku", label: "Item Code / SKU", type: "text", placeholder: "e.g. ELE-TV-55" },
    { name: "name", label: "Item Name", type: "text", placeholder: "e.g. Samsung 55\" 4K TV" },
    {
      name: "categoryId",
      label: "Category",
      type: "select",
      placeholder: "Select category",
      options: state.categories.filter((c) => c.status === "active").map((c) => ({ value: c.id, label: c.name })),
    },
    { name: "subcategory", label: "Subcategory", type: "text", placeholder: "e.g. Television" },
    {
      name: "unitId",
      label: "Unit of Measurement",
      type: "select",
      placeholder: "Select unit",
      options: state.units.filter((u) => u.status === "active").map((u) => ({ value: u.id, label: `${u.name} (${u.symbol})` })),
    },
    { name: "barcode", label: "Barcode", type: "text", placeholder: "EAN / UPC" },
    { name: "standardCost", label: "Standard Cost", type: "number", prefix: "₹", min: 0, step: 0.01 },
    { name: "sellingPrice", label: "Selling Price", type: "number", prefix: "₹", min: 0, step: 0.01 },
    { name: "minStock", label: "Minimum Stock", type: "number", min: 0 },
    { name: "maxStock", label: "Maximum Stock", type: "number", min: 0 },
    { name: "reorderLevel", label: "Reorder Level", type: "number", min: 0 },
    { name: "imageUrl", label: "Item Image URL", type: "text", placeholder: "https://..." },
    { name: "active", label: "Status", type: "switch" },
    { name: "description", label: "Description", type: "textarea", colSpan: 2 },
  ],
  emptyForm: () => ({
    sku: "", name: "", categoryId: "", subcategory: "", unitId: "", barcode: "", description: "",
    standardCost: 0, sellingPrice: 0, minStock: 0, maxStock: 0, reorderLevel: 0, imageUrl: "", active: true,
  }),
  toForm: (r) => ({
    sku: r.sku, name: r.name, categoryId: r.categoryId, subcategory: r.subcategory, unitId: r.unitId,
    barcode: r.barcode, description: r.description, standardCost: r.standardCost, sellingPrice: r.sellingPrice,
    minStock: r.minStock, maxStock: r.maxStock, reorderLevel: r.reorderLevel, imageUrl: r.imageUrl, active: r.status === "active",
  }),
  toRecord: (v, existing) => ({
    id: existing?.id ?? uid("item"),
    sku: v.sku, name: v.name, categoryId: v.categoryId, subcategory: v.subcategory ?? "", unitId: v.unitId,
    barcode: v.barcode ?? "", description: v.description ?? "", standardCost: v.standardCost, sellingPrice: v.sellingPrice,
    minStock: v.minStock, maxStock: v.maxStock, reorderLevel: v.reorderLevel, imageUrl: v.imageUrl ?? "",
    status: v.active ? "active" : "inactive",
    createdAt: existing?.createdAt ?? todayISO(), updatedAt: todayISO(),
  }),
  columns: (lk) => [
    { id: "sku", header: "SKU", accessor: (r) => <span className="font-mono text-xs font-medium">{r.sku}</span>, sortable: true, sortValue: (r) => r.sku, csvValue: (r) => r.sku },
    {
      id: "name", header: "Item Name", sortable: true, sortValue: (r) => r.name, csvValue: (r) => r.name,
      accessor: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.name}</p>
          <p className="text-xs text-muted-foreground">{r.subcategory}</p>
        </div>
      ),
    },
    { id: "category", header: "Category", accessor: (r) => lk.category(r.categoryId)?.name ?? "—", csvValue: (r) => lk.category(r.categoryId)?.name ?? "" },
    { id: "unit", header: "Unit", accessor: (r) => lk.unit(r.unitId)?.symbol ?? "—", csvValue: (r) => lk.unit(r.unitId)?.symbol ?? "" },
    { id: "cost", header: "Cost", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => formatCurrency(r.standardCost), sortable: true, sortValue: (r) => r.standardCost, csvValue: (r) => r.standardCost },
    { id: "price", header: "Price", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => formatCurrency(r.sellingPrice), sortable: true, sortValue: (r) => r.sellingPrice, csvValue: (r) => r.sellingPrice },
    { id: "reorder", header: "Reorder", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => r.reorderLevel, csvValue: (r) => r.reorderLevel },
    { id: "status", header: "Status", accessor: (r) => <ActiveBadge status={r.status} />, csvValue: (r) => r.status },
  ],
  searchText: (r, lk) => `${r.sku} ${r.name} ${r.barcode} ${r.subcategory} ${lk.category(r.categoryId)?.name ?? ""}`,
  detail: (r, lk) => [
    { label: "SKU", value: r.sku },
    { label: "Item Name", value: r.name },
    { label: "Category", value: lk.category(r.categoryId)?.name },
    { label: "Subcategory", value: r.subcategory || "—" },
    { label: "Unit", value: lk.unit(r.unitId)?.name },
    { label: "Barcode", value: r.barcode || "—" },
    { label: "Standard Cost", value: formatCurrency(r.standardCost) },
    { label: "Selling Price", value: formatCurrency(r.sellingPrice) },
    { label: "Minimum Stock", value: r.minStock },
    { label: "Maximum Stock", value: r.maxStock },
    { label: "Reorder Level", value: r.reorderLevel },
    { label: "Status", value: <ActiveBadge status={r.status} /> },
    { label: "Description", value: r.description || "—", full: true },
  ],
  canDelete: (r, state) => (state.balances.some((b) => b.itemId === r.id && b.quantity > 0) ? "This item still has stock on hand." : null),
};

export default function ItemMaster() {
  return <MasterPage config={config} />;
}
