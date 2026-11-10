import { z } from "zod";
import { Users } from "lucide-react";
import { MasterPage, MasterConfig } from "@/components/common/MasterPage";
import { ActiveBadge } from "@/components/common/StatusBadge";
import { Customer } from "@/types";
import { uid } from "@/lib/utils";
import { todayISO } from "@/lib/format";

const schema = z.object({
  code: z.string().min(1, "Customer code is required"),
  name: z.string().min(1, "Customer name is required"),
  contactPerson: z.string().optional().default(""),
  mobile: z.string().min(1, "Mobile is required"),
  email: z.string().email("Enter a valid email").or(z.literal("")).optional().default(""),
  address: z.string().optional().default(""),
  gstin: z.string().optional().default(""),
  active: z.boolean().default(true),
});
type Form = z.infer<typeof schema>;

const config: MasterConfig<Customer, Form> = {
  collectionKey: "customers",
  title: "Customer Master",
  singular: "Customer",
  description: "Manage customers and departments that receive issued stock.",
  icon: Users,
  breadcrumbs: [{ label: "Masters" }, { label: "Customer Master" }],
  schema,
  csvFilename: "customers",
  formSize: "xl",
  fields: () => [
    { name: "code", label: "Customer Code", type: "text", placeholder: "e.g. CUS-001" },
    { name: "name", label: "Customer Name", type: "text" },
    { name: "contactPerson", label: "Contact Person", type: "text" },
    { name: "mobile", label: "Mobile", type: "text", placeholder: "10-digit mobile" },
    { name: "email", label: "Email", type: "text", placeholder: "name@company.in" },
    { name: "gstin", label: "GSTIN", type: "text", placeholder: "15-digit GSTIN" },
    { name: "active", label: "Status", type: "switch" },
    { name: "address", label: "Address", type: "textarea", colSpan: 2 },
  ],
  emptyForm: () => ({ code: "", name: "", contactPerson: "", mobile: "", email: "", address: "", gstin: "", active: true }),
  toForm: (r) => ({ code: r.code, name: r.name, contactPerson: r.contactPerson, mobile: r.mobile, email: r.email, address: r.address, gstin: r.gstin, active: r.status === "active" }),
  toRecord: (v, existing) => ({
    id: existing?.id ?? uid("cust"),
    code: v.code, name: v.name, contactPerson: v.contactPerson ?? "", mobile: v.mobile, email: v.email ?? "", address: v.address ?? "", gstin: v.gstin ?? "",
    status: v.active ? "active" : "inactive", createdAt: existing?.createdAt ?? todayISO(), updatedAt: todayISO(),
  }),
  columns: () => [
    { id: "code", header: "Code", accessor: (r) => <span className="font-medium">{r.code}</span>, sortable: true, sortValue: (r) => r.code, csvValue: (r) => r.code },
    { id: "name", header: "Customer", accessor: (r) => <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.contactPerson}</p></div>, sortable: true, sortValue: (r) => r.name, csvValue: (r) => r.name },
    { id: "mobile", header: "Mobile", accessor: (r) => r.mobile, csvValue: (r) => r.mobile },
    { id: "email", header: "Email", accessor: (r) => <span className="text-muted-foreground">{r.email || "—"}</span>, csvValue: (r) => r.email },
    { id: "gstin", header: "GSTIN", accessor: (r) => <span className="font-mono text-xs">{r.gstin || "—"}</span>, csvValue: (r) => r.gstin },
    { id: "status", header: "Status", accessor: (r) => <ActiveBadge status={r.status} />, csvValue: (r) => r.status },
  ],
  searchText: (r) => `${r.code} ${r.name} ${r.contactPerson} ${r.mobile} ${r.email} ${r.gstin}`,
  detail: (r) => [
    { label: "Customer Code", value: r.code },
    { label: "Customer Name", value: r.name },
    { label: "Contact Person", value: r.contactPerson || "—" },
    { label: "Mobile", value: r.mobile },
    { label: "Email", value: r.email || "—" },
    { label: "GSTIN", value: r.gstin || "—" },
    { label: "Status", value: <ActiveBadge status={r.status} /> },
    { label: "Address", value: r.address || "—", full: true },
  ],
  canDelete: (r, state) => (state.stockIssues.some((s) => s.customerId === r.id) ? "This customer is referenced by stock issues." : null),
};

export default function CustomerMaster() {
  return <MasterPage config={config} />;
}
