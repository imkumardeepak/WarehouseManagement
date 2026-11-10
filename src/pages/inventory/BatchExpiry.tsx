import { useMemo, useState } from "react";
import { CalendarClock, AlertTriangle, XCircle, Clock } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, Column } from "@/components/common/DataTable";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWms } from "@/store/WmsContext";
import { buildBatchRows, BatchRow } from "@/store/selectors";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const buckets = [
  { key: "expired", label: "Expired", icon: XCircle, tone: "text-destructive bg-destructive/10" },
  { key: "7", label: "Within 7 days", icon: AlertTriangle, tone: "text-destructive bg-destructive/10" },
  { key: "30", label: "Within 30 days", icon: Clock, tone: "text-[hsl(32_90%_40%)] bg-warning/10" },
  { key: "90", label: "Within 90 days", icon: CalendarClock, tone: "text-info bg-info/10" },
] as const;

export default function BatchExpiry() {
  const { state } = useWms();
  const rows = useMemo(() => buildBatchRows(state).filter((r) => r.expiryDate), [state]);
  const [active, setActive] = useState<string>("");

  const counts = {
    expired: rows.filter((r) => r.bucket === "expired").length,
    "7": rows.filter((r) => r.bucket === "7").length,
    "30": rows.filter((r) => r.bucket === "30").length,
    "90": rows.filter((r) => r.bucket === "90").length,
  };

  const filtered = active ? rows.filter((r) => r.bucket === active) : rows;

  const daysBadge = (r: BatchRow) => {
    if (r.daysLeft === null) return <span className="text-muted-foreground">—</span>;
    if (r.daysLeft < 0) return <Badge variant="destructive">Expired {Math.abs(r.daysLeft)}d ago</Badge>;
    if (r.daysLeft <= 7) return <Badge variant="destructive">{r.daysLeft}d left</Badge>;
    if (r.daysLeft <= 30) return <Badge variant="warning">{r.daysLeft}d left</Badge>;
    if (r.daysLeft <= 90) return <Badge variant="info">{r.daysLeft}d left</Badge>;
    return <Badge variant="success">{r.daysLeft}d left</Badge>;
  };

  const columns: Column<BatchRow>[] = [
    { id: "batch", header: "Batch", accessor: (r) => <span className="font-medium">{r.batchNo}</span>, sortable: true, sortValue: (r) => r.batchNo, csvValue: (r) => r.batchNo },
    { id: "item", header: "Item", accessor: (r) => <div><p className="font-medium">{r.itemName}</p><p className="text-xs text-muted-foreground">{r.itemCode}</p></div>, csvValue: (r) => r.itemName },
    { id: "wh", header: "Warehouse", accessor: (r) => r.warehouseName, csvValue: (r) => r.warehouseName },
    { id: "loc", header: "Location", accessor: (r) => <span className="font-mono text-xs">{r.locationCode}</span>, csvValue: (r) => r.locationCode },
    { id: "qty", header: "Quantity", className: "text-right tabular-nums", headerClassName: "text-right", accessor: (r) => `${formatNumber(r.quantity)} ${r.unitSymbol}`, sortable: true, sortValue: (r) => r.quantity, csvValue: (r) => r.quantity },
    { id: "expiry", header: "Expiry Date", accessor: (r) => formatDate(r.expiryDate), sortable: true, sortValue: (r) => r.expiryDate ?? "", csvValue: (r) => (r.expiryDate ? formatDate(r.expiryDate) : "") },
    { id: "days", header: "Status", accessor: (r) => daysBadge(r), csvValue: (r) => (r.daysLeft ?? "") },
  ];

  return (
    <div>
      <PageHeader
        title="Batch & Expiry Tracking"
        description="Monitor batch-wise stock and act on items nearing expiry."
        breadcrumbs={[{ label: "Inventory" }, { label: "Batch & Expiry" }]}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {buckets.map((b, i) => (
          <motion.div key={b.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card
              className={cn("cursor-pointer p-4 transition-all hover:shadow-elevated", active === b.key && "ring-2 ring-primary")}
              onClick={() => setActive(active === b.key ? "" : b.key)}
            >
              <div className="flex items-center justify-between">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", b.tone)}>
                  <b.icon className="h-5 w-5" />
                </div>
                <span className="text-2xl font-bold tabular-nums">{counts[b.key]}</span>
              </div>
              <p className="mt-2 text-sm font-medium text-muted-foreground">{b.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.key}
        searchText={(r) => `${r.batchNo} ${r.itemName} ${r.itemCode} ${r.warehouseName}`}
        searchPlaceholder="Search batches..."
        csvFilename="batch-expiry"
        initialSort={{ columnId: "expiry", dir: "asc" }}
        emptyTitle={active ? "No batches in this window" : "No tracked batches"}
        emptyDescription="Batches with expiry dates will appear here."
      />
    </div>
  );
}
