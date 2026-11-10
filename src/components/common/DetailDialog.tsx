import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface DetailRow {
  label: string;
  value: React.ReactNode;
  full?: boolean;
}

interface DetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  rows: DetailRow[];
  footer?: React.ReactNode;
}

export function DetailDialog({ open, onOpenChange, title, description, rows, footer }: DetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {rows.map((r, i) => (
            <div key={i} className={r.full ? "sm:col-span-2" : ""}>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{r.label}</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{r.value ?? "—"}</dd>
            </div>
          ))}
        </dl>
        {footer && <div className="mt-2 border-t border-border pt-4">{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}
