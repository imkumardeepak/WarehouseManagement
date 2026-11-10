import { z } from "zod";
import { Ruler } from "lucide-react";
import { MasterPage, MasterConfig } from "@/components/common/MasterPage";
import { ActiveBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Unit } from "@/types";
import { uid } from "@/lib/utils";
import { todayISO } from "@/lib/format";

const schema = z.object({
  code: z.string().min(1, "Unit code is required"),
  name: z.string().min(1, "Unit name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  decimalAllowed: z.boolean().default(false),
  active: z.boolean().default(true),
});
type Form = z.infer<typeof schema>;

const config: MasterConfig<Unit, Form> = {
  collectionKey: "units",
  title: "Unit Master",
  singular: "Unit",
  description: "Define units of measurement used across items (PCS, KG, LTR, BOX, MTR).",
  icon: Ruler,
  breadcrumbs: [{ label: "Masters" }, { label: "Unit Master" }],
  schema,
  csvFilename: "units",
  formSize: "md",
  fields: () => [
    { name: "code", label: "Unit Code", type: "text", placeholder: "e.g. PCS" },
    { name: "name", label: "Unit Name", type: "text", placeholder: "e.g. Pieces" },
    { name: "symbol", label: "Symbol", type: "text", placeholder: "e.g. pcs" },
    { name: "decimalAllowed", label: "Allow Decimal Quantity", type: "switch" },
    { name: "active", label: "Status", type: "switch" },
  ],
  emptyForm: () => ({ code: "", name: "", symbol: "", decimalAllowed: false, active: true }),
  toForm: (r) => ({ code: r.code, name: r.name, symbol: r.symbol, decimalAllowed: r.decimalAllowed, active: r.status === "active" }),
  toRecord: (v, existing) => ({
    id: existing?.id ?? uid("unit"),
    code: v.code,
    name: v.name,
    symbol: v.symbol,
    decimalAllowed: v.decimalAllowed,
    status: v.active ? "active" : "inactive",
    createdAt: existing?.createdAt ?? todayISO(),
    updatedAt: todayISO(),
  }),
  columns: () => [
    { id: "code", header: "Code", accessor: (r) => <span className="font-medium">{r.code}</span>, sortable: true, sortValue: (r) => r.code, csvValue: (r) => r.code },
    { id: "name", header: "Name", accessor: (r) => r.name, sortable: true, sortValue: (r) => r.name, csvValue: (r) => r.name },
    { id: "symbol", header: "Symbol", accessor: (r) => <Badge variant="secondary">{r.symbol}</Badge>, csvValue: (r) => r.symbol },
    { id: "dec", header: "Decimals", accessor: (r) => (r.decimalAllowed ? "Allowed" : "Whole only"), csvValue: (r) => (r.decimalAllowed ? "Yes" : "No") },
    { id: "status", header: "Status", accessor: (r) => <ActiveBadge status={r.status} />, csvValue: (r) => r.status },
  ],
  searchText: (r) => `${r.code} ${r.name} ${r.symbol}`,
  detail: (r) => [
    { label: "Unit Code", value: r.code },
    { label: "Unit Name", value: r.name },
    { label: "Symbol", value: r.symbol },
    { label: "Decimal Quantity", value: r.decimalAllowed ? "Allowed" : "Whole numbers only" },
    { label: "Status", value: <ActiveBadge status={r.status} /> },
  ],
  canDelete: (r, state) => (state.items.some((i) => i.unitId === r.id) ? "This unit is used by one or more items." : null),
};

export default function UnitMaster() {
  return <MasterPage config={config} />;
}
