import { z } from "zod";
import { Warehouse as WarehouseIcon } from "lucide-react";
import { MasterPage, MasterConfig } from "@/components/common/MasterPage";
import { ActiveBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Warehouse, WarehouseType } from "@/types";
import { uid } from "@/lib/utils";
import { todayISO } from "@/lib/format";

const types: { value: WarehouseType; label: string }[] = [
  { value: "main", label: "Main Warehouse" },
  { value: "distribution", label: "Distribution Center" },
  { value: "retail", label: "Retail Hub" },
  { value: "cold-storage", label: "Cold Storage" },
  { value: "transit", label: "Transit Point" },
];

const schema = z.object({
  code: z.string().min(1, "Warehouse code is required"),
  name: z.string().min(1, "Warehouse name is required"),
  type: z.string().min(1, "Type is required"),
  address: z.string().optional().default(""),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  contactPerson: z.string().optional().default(""),
  contactNumber: z.string().optional().default(""),
  active: z.boolean().default(true),
});
type Form = z.infer<typeof schema>;

const config: MasterConfig<Warehouse, Form> = {
  collectionKey: "warehouses",
  title: "Warehouse Master",
  singular: "Warehouse",
  description: "Maintain your warehouse network and facility details.",
  icon: WarehouseIcon,
  breadcrumbs: [{ label: "Masters" }, { label: "Warehouse Master" }],
  schema,
  csvFilename: "warehouses",
  formSize: "xl",
  fields: () => [
    { name: "code", label: "Warehouse Code", type: "text", placeholder: "e.g. WH-MUM" },
    { name: "name", label: "Warehouse Name", type: "text", placeholder: "e.g. Mumbai Main Warehouse" },
    { name: "type", label: "Warehouse Type", type: "select", options: types },
    { name: "contactPerson", label: "Contact Person", type: "text" },
    { name: "contactNumber", label: "Contact Number", type: "text", placeholder: "10-digit mobile" },
    { name: "city", label: "City", type: "text" },
    { name: "state", label: "State", type: "text" },
    { name: "active", label: "Status", type: "switch" },
    { name: "address", label: "Address", type: "textarea", colSpan: 2 },
  ],
  emptyForm: () => ({ code: "", name: "", type: "main", address: "", city: "", state: "", contactPerson: "", contactNumber: "", active: true }),
  toForm: (r) => ({ code: r.code, name: r.name, type: r.type, address: r.address, city: r.city, state: r.state, contactPerson: r.contactPerson, contactNumber: r.contactNumber, active: r.status === "active" }),
  toRecord: (v, existing) => ({
    id: existing?.id ?? uid("wh"),
    code: v.code, name: v.name, type: v.type as WarehouseType, address: v.address ?? "", city: v.city, state: v.state,
    contactPerson: v.contactPerson ?? "", contactNumber: v.contactNumber ?? "",
    status: v.active ? "active" : "inactive", createdAt: existing?.createdAt ?? todayISO(), updatedAt: todayISO(),
  }),
  columns: () => [
    { id: "code", header: "Code", accessor: (r) => <span className="font-medium">{r.code}</span>, sortable: true, sortValue: (r) => r.code, csvValue: (r) => r.code },
    { id: "name", header: "Name", accessor: (r) => r.name, sortable: true, sortValue: (r) => r.name, csvValue: (r) => r.name },
    { id: "type", header: "Type", accessor: (r) => <Badge variant="info">{types.find((t) => t.value === r.type)?.label ?? r.type}</Badge>, csvValue: (r) => r.type },
    { id: "city", header: "City", accessor: (r) => `${r.city}, ${r.state}`, csvValue: (r) => `${r.city}, ${r.state}` },
    { id: "contact", header: "Contact", accessor: (r) => <div className="text-sm"><p>{r.contactPerson || "—"}</p><p className="text-xs text-muted-foreground">{r.contactNumber}</p></div>, csvValue: (r) => `${r.contactPerson} ${r.contactNumber}` },
    { id: "status", header: "Status", accessor: (r) => <ActiveBadge status={r.status} />, csvValue: (r) => r.status },
  ],
  searchText: (r) => `${r.code} ${r.name} ${r.city} ${r.state} ${r.contactPerson}`,
  detail: (r) => [
    { label: "Warehouse Code", value: r.code },
    { label: "Warehouse Name", value: r.name },
    { label: "Type", value: types.find((t) => t.value === r.type)?.label },
    { label: "City", value: r.city },
    { label: "State", value: r.state },
    { label: "Contact Person", value: r.contactPerson || "—" },
    { label: "Contact Number", value: r.contactNumber || "—" },
    { label: "Status", value: <ActiveBadge status={r.status} /> },
    { label: "Address", value: r.address || "—", full: true },
  ],
  canDelete: (r, state) =>
    state.locations.some((l) => l.warehouseId === r.id)
      ? "Remove the warehouse's locations first."
      : state.balances.some((b) => b.warehouseId === r.id && b.quantity > 0)
        ? "This warehouse still holds stock."
        : null,
};

export default function WarehouseMaster() {
  return <MasterPage config={config} />;
}
