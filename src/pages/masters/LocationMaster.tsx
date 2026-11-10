import { z } from "zod";
import { MapPin } from "lucide-react";
import { MasterPage, MasterConfig } from "@/components/common/MasterPage";
import { ActiveBadge } from "@/components/common/StatusBadge";
import { WarehouseLocation } from "@/types";
import { uid } from "@/lib/utils";
import { todayISO, formatNumber } from "@/lib/format";

const schema = z.object({
  code: z.string().min(1, "Location code is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  zone: z.string().optional().default(""),
  rack: z.string().optional().default(""),
  shelf: z.string().optional().default(""),
  bin: z.string().optional().default(""),
  maxCapacity: z.number().min(0, "Capacity cannot be negative").default(0),
  active: z.boolean().default(true),
});
type Form = z.infer<typeof schema>;

const config: MasterConfig<WarehouseLocation, Form> = {
  collectionKey: "locations",
  title: "Location / Bin Master",
  singular: "Location",
  description: "Define storage bins and locations within each warehouse.",
  icon: MapPin,
  breadcrumbs: [{ label: "Masters" }, { label: "Location / Bin Master" }],
  schema,
  csvFilename: "locations",
  fields: (state) => [
    { name: "code", label: "Location Code", type: "text", placeholder: "e.g. MUM-A-01" },
    { name: "warehouseId", label: "Warehouse", type: "select", options: state.warehouses.map((w) => ({ value: w.id, label: w.name })) },
    { name: "zone", label: "Zone", type: "text", placeholder: "e.g. A" },
    { name: "rack", label: "Rack", type: "text", placeholder: "e.g. R1" },
    { name: "shelf", label: "Shelf", type: "text", placeholder: "e.g. S1" },
    { name: "bin", label: "Bin", type: "text", placeholder: "e.g. B01" },
    { name: "maxCapacity", label: "Maximum Capacity", type: "number", min: 0 },
    { name: "active", label: "Status", type: "switch" },
  ],
  emptyForm: (state) => ({ code: "", warehouseId: state.warehouses[0]?.id ?? "", zone: "", rack: "", shelf: "", bin: "", maxCapacity: 1000, active: true }),
  toForm: (r) => ({ code: r.code, warehouseId: r.warehouseId, zone: r.zone, rack: r.rack, shelf: r.shelf, bin: r.bin, maxCapacity: r.maxCapacity, active: r.status === "active" }),
  toRecord: (v, existing) => ({
    id: existing?.id ?? uid("loc"),
    code: v.code, warehouseId: v.warehouseId, zone: v.zone ?? "", rack: v.rack ?? "", shelf: v.shelf ?? "", bin: v.bin ?? "",
    maxCapacity: v.maxCapacity, status: v.active ? "active" : "inactive",
    createdAt: existing?.createdAt ?? todayISO(), updatedAt: todayISO(),
  }),
  columns: (lk) => [
    { id: "code", header: "Code", accessor: (r) => <span className="font-medium">{r.code}</span>, sortable: true, sortValue: (r) => r.code, csvValue: (r) => r.code },
    { id: "warehouse", header: "Warehouse", accessor: (r) => lk.warehouse(r.warehouseId)?.name ?? "—", sortable: true, sortValue: (r) => lk.warehouse(r.warehouseId)?.name ?? "", csvValue: (r) => lk.warehouse(r.warehouseId)?.name ?? "" },
    { id: "zone", header: "Zone / Rack / Shelf / Bin", accessor: (r) => `${r.zone} / ${r.rack} / ${r.shelf} / ${r.bin}`, csvValue: (r) => `${r.zone}/${r.rack}/${r.shelf}/${r.bin}` },
    { id: "cap", header: "Capacity", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => formatNumber(r.maxCapacity), sortable: true, sortValue: (r) => r.maxCapacity, csvValue: (r) => r.maxCapacity },
    { id: "status", header: "Status", accessor: (r) => <ActiveBadge status={r.status} />, csvValue: (r) => r.status },
  ],
  searchText: (r, lk) => `${r.code} ${r.zone} ${r.rack} ${r.bin} ${lk.warehouse(r.warehouseId)?.name ?? ""}`,
  detail: (r, lk) => [
    { label: "Location Code", value: r.code },
    { label: "Warehouse", value: lk.warehouse(r.warehouseId)?.name },
    { label: "Zone", value: r.zone || "—" },
    { label: "Rack", value: r.rack || "—" },
    { label: "Shelf", value: r.shelf || "—" },
    { label: "Bin", value: r.bin || "—" },
    { label: "Maximum Capacity", value: formatNumber(r.maxCapacity) },
    { label: "Status", value: <ActiveBadge status={r.status} /> },
  ],
  canDelete: (r, state) => (state.balances.some((b) => b.locationId === r.id && b.quantity > 0) ? "This location still holds stock." : null),
};

export default function LocationMaster() {
  return <MasterPage config={config} />;
}
