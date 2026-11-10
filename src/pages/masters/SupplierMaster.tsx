import { z } from "zod";
import { Truck } from "lucide-react";
import { MasterPage, MasterConfig } from "@/components/common/MasterPage";
import { ActiveBadge } from "@/components/common/StatusBadge";
import { Supplier } from "@/types";
import { uid } from "@/lib/utils";
import { todayISO } from "@/lib/format";

const schema = z.object({
  code: z.string().min(1, "Supplier code is required"),
  name: z.string().min(1, "Supplier name is required"),
  contactPerson: z.string().optional().default(""),
  mobile: z.string().min(1, "Mobile is required"),
  email: z.string().email("Enter a valid email").or(z.literal("")).optional().default(""),
  address: z.string().optional().default(""),
  gstin: z.string().optional().default(""),
  active: z.boolean().default(true),
});
type Form = z.infer<typeof schema>;

const config: MasterConfig<Supplier, Form> = {
  collectionKey: "suppliers",
  title: "Supplier Master",
  singular: "Supplier",
  description: "Manage vendors who supply goods to your warehouses.",
  icon: Truck,
  breadcrumbs: [{ label: "Masters" }, { label: "Supplier Master" }],
  schema,
  csvFilename: "suppliers",
  formSize: "xl",
  fields: () => [
    { name: "code", label: "Supplier Code", type: "text", placeholder: "e.g. SUP-001" },
    { name: "name", label: "Supplier Name", type: "text" },
    { name: "contactPerson", label: "Contact Person", type: "text" },
    { name: "mobile", label: "Mobile Number", type: "text", placeholder: "10-digit mobile" },
    { name: "email", label: "Email", type: "text", placeholder: "name@company.in" },
    { name: "gstin", label: "GSTIN", type: "text", placeholder: "15-digit GSTIN" },
    { name: "active", label: "Status", type: "switch" },
    { name: "address", label: "Address", type: "textarea", colSpan: 2 },
  ],
  emptyForm: () => ({ code: "", name: "", contactPerson: "", mobile: "", email: "", address: "", gstin: "", active: true }),
  toForm: (r) => ({ code: r.code, name: r.name, contactPerson: r.contactPerson, mobile: r.mobile, email: r.email, address: r.address, gstin: r.gstin, active: r.status === "active" }),
  toRecord: (v, existing) => ({
    id: existing?.id ?? uid("sup"),
    code: v.code, name: v.name, contactPerson: v.contactPerson ?? "", mobile: v.mobile, email: v.email ?? "", address: v.address ?? "", gstin: v.gstin ?? "",
    status: v.active ? "active" : "inactive", createdAt: existing?.createdAt ?? todayISO(), updatedAt: todayISO(),
  }),
  columns: () => [
    { id: "code", header: "Code", accessor: (r) => <span className="font-medium">{r.code}</span>, sortable: true, sortValue: (r) => r.code, csvValue: (r) => r.code },
    { id: "name", header: "Supplier", accessor: (r) => <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.contactPerson}</p></div>, sortable: true, sortValue: (r) => r.name, csvValue: (r) => r.name },
    { id: "mobile", header: "Mobile", accessor: (r) => r.mobile, csvValue: (r) => r.mobile },
    { id: "email", header: "Email", accessor: (r) => <span className="text-muted-foreground">{r.email || "—"}</span>, csvValue: (r) => r.email },
    { id: "gstin", header: "GSTIN", accessor: (r) => <span className="font-mono text-xs">{r.gstin || "—"}</span>, csvValue: (r) => r.gstin },
    { id: "status", header: "Status", accessor: (r) => <ActiveBadge status={r.status} />, csvValue: (r) => r.status },
  ],
  searchText: (r) => `${r.code} ${r.name} ${r.contactPerson} ${r.mobile} ${r.email} ${r.gstin}`,
  detail: (r) => [
    { label: "Supplier Code", value: r.code },
    { label: "Supplier Name", value: r.name },
    { label: "Contact Person", value: r.contactPerson || "—" },
    { label: "Mobile", value: r.mobile },
    { label: "Email", value: r.email || "—" },
    { label: "GSTIN", value: r.gstin || "—" },
    { label: "Status", value: <ActiveBadge status={r.status} /> },
    { label: "Address", value: r.address || "—", full: true },
  ],
  canDelete: (r, state) => (state.goodsReceipts.some((g) => g.supplierId === r.id) ? "This supplier is referenced by goods receipts." : null),
};

export default function SupplierMaster() {
  return <MasterPage config={config} />;
}
