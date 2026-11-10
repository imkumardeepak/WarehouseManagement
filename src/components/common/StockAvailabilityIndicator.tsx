import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface Props {
  available: number;
  requested?: number;
  unit?: string;
  className?: string;
}

export function StockAvailabilityIndicator({ available, requested = 0, unit = "", className }: Props) {
  const insufficient = requested > available;
  const ok = requested > 0 && requested <= available;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
        insufficient
          ? "bg-destructive/10 text-destructive"
          : ok
            ? "bg-success/10 text-success"
            : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {insufficient ? <AlertCircle className="h-3.5 w-3.5" /> : ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      <span>
        {formatNumber(available)} {unit} available
      </span>
    </div>
  );
}
