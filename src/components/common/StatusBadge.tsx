import { Badge } from "@/components/ui/badge";
import { DocStatus, StockStatus, Status } from "@/types";
import {
  CheckCircle2,
  CircleSlash,
  Clock,
  AlertTriangle,
  XCircle,
  PackageCheck,
  PackageX,
  FileEdit,
  Ban,
} from "lucide-react";

export function ActiveBadge({ status }: { status: Status }) {
  return status === "active" ? (
    <Badge variant="success">
      <CheckCircle2 className="h-3 w-3" /> Active
    </Badge>
  ) : (
    <Badge variant="muted">
      <CircleSlash className="h-3 w-3" /> Inactive
    </Badge>
  );
}

export function DocStatusBadge({ status }: { status: DocStatus }) {
  if (status === "posted")
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3 w-3" /> Posted
      </Badge>
    );
  if (status === "cancelled")
    return (
      <Badge variant="destructive">
        <Ban className="h-3 w-3" /> Cancelled
      </Badge>
    );
  return (
    <Badge variant="warning">
      <FileEdit className="h-3 w-3" /> Draft
    </Badge>
  );
}

const stockMeta: Record<StockStatus, { label: string; variant: Parameters<typeof Badge>[0]["variant"]; icon: React.ReactNode }> = {
  "in-stock": { label: "In Stock", variant: "success", icon: <PackageCheck className="h-3 w-3" /> },
  "low-stock": { label: "Low Stock", variant: "warning", icon: <AlertTriangle className="h-3 w-3" /> },
  "out-of-stock": { label: "Out of Stock", variant: "destructive", icon: <PackageX className="h-3 w-3" /> },
  "expiring-soon": { label: "Expiring Soon", variant: "warning", icon: <Clock className="h-3 w-3" /> },
  expired: { label: "Expired", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
};

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const m = stockMeta[status];
  return (
    <Badge variant={m.variant}>
      {m.icon} {m.label}
    </Badge>
  );
}
