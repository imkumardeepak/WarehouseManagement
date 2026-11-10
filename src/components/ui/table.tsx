import * as React from "react";
import { cn } from "@/lib/utils";

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  mobileCards?: boolean;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, mobileCards = false, ...props }, ref) => {
    const tableRef = React.useRef<HTMLTableElement>(null);
    const previousRows = React.useRef(0);
    React.useImperativeHandle(ref, () => tableRef.current!);

    React.useEffect(() => {
      const rows = tableRef.current?.tBodies[0]?.rows;
      const count = rows?.length ?? 0;
      if (mobileCards && previousRows.current > 0 && count > previousRows.current && window.matchMedia("(max-width: 639px)").matches) {
        const row = rows?.[count - 1];
        row?.scrollIntoView({ block: "start", behavior: "instant" });
        row?.querySelector<HTMLButtonElement>('[role="combobox"]')?.focus({ preventScroll: true });
      }
      previousRows.current = count;
    });

    return (
      <div className={cn("relative w-full overflow-auto scrollbar-thin", mobileCards && "table-mobile-cards")}>
        <table ref={tableRef} className={cn("w-full caption-bottom text-sm", className)} {...props} />
      </div>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />,
);
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-4 py-3 align-middle", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
