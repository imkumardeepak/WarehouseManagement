import { z } from "zod";
import { Tags } from "lucide-react";
import { MasterPage, MasterConfig } from "@/components/common/MasterPage";
import { ActiveBadge } from "@/components/common/StatusBadge";
import { Category } from "@/types";
import { uid } from "@/lib/utils";
import { todayISO, formatDate } from "@/lib/format";

const schema = z.object({
  code: z.string().min(1, "Category code is required"),
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional().default(""),
  parentId: z.string().optional().default(""),
  active: z.boolean().default(true),
});
type Form = z.infer<typeof schema>;

const config: MasterConfig<Category, Form> = {
  collectionKey: "categories",
  title: "Category Master",
  singular: "Category",
  description: "Organise your items into logical categories and sub-groups.",
  icon: Tags,
  breadcrumbs: [{ label: "Masters" }, { label: "Category Master" }],
  schema,
  csvFilename: "categories",
  fields: (state) => [
    { name: "code", label: "Category Code", type: "text", placeholder: "e.g. CAT-ELE" },
    { name: "name", label: "Category Name", type: "text", placeholder: "e.g. Electronics" },
    {
      name: "parentId",
      label: "Parent Category",
      type: "select",
      placeholder: "None (top level)",
      options: [
        { value: "", label: "None (top level)" },
        ...state.categories.map((c) => ({ value: c.id, label: c.name })),
      ],
    },
    { name: "active", label: "Status", type: "switch" },
    { name: "description", label: "Description", type: "textarea", colSpan: 2, placeholder: "Optional description" },
  ],
  emptyForm: () => ({ code: "", name: "", description: "", parentId: "", active: true }),
  toForm: (r) => ({ code: r.code, name: r.name, description: r.description, parentId: r.parentId ?? "", active: r.status === "active" }),
  toRecord: (v, existing) => ({
    id: existing?.id ?? uid("cat"),
    code: v.code,
    name: v.name,
    description: v.description ?? "",
    parentId: v.parentId || null,
    status: v.active ? "active" : "inactive",
    createdAt: existing?.createdAt ?? todayISO(),
    updatedAt: todayISO(),
  }),
  columns: (lk) => [
    { id: "code", header: "Code", accessor: (r) => <span className="font-medium">{r.code}</span>, sortable: true, sortValue: (r) => r.code, csvValue: (r) => r.code },
    { id: "name", header: "Name", accessor: (r) => r.name, sortable: true, sortValue: (r) => r.name, csvValue: (r) => r.name },
    { id: "parent", header: "Parent", accessor: (r) => (r.parentId ? lk.category(r.parentId)?.name ?? "—" : "—"), csvValue: (r) => (r.parentId ? lk.category(r.parentId)?.name ?? "" : "") },
    { id: "desc", header: "Description", accessor: (r) => <span className="text-muted-foreground">{r.description || "—"}</span>, csvValue: (r) => r.description },
    { id: "status", header: "Status", accessor: (r) => <ActiveBadge status={r.status} />, csvValue: (r) => r.status },
  ],
  searchText: (r) => `${r.code} ${r.name} ${r.description}`,
  detail: (r, lk) => [
    { label: "Category Code", value: r.code },
    { label: "Category Name", value: r.name },
    { label: "Parent Category", value: r.parentId ? lk.category(r.parentId)?.name : "None" },
    { label: "Status", value: <ActiveBadge status={r.status} /> },
    { label: "Description", value: r.description || "—", full: true },
    { label: "Created", value: formatDate(r.createdAt) },
    { label: "Updated", value: formatDate(r.updatedAt) },
  ],
  canDelete: (r, state) => {
    const used = state.items.some((i) => i.categoryId === r.id);
    return used ? "This category is used by one or more items." : null;
  },
};

export default function CategoryMaster() {
  return <MasterPage config={config} />;
}
