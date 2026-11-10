import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SearchInput } from "./SearchInput";
import { EmptyState } from "./EmptyState";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

export interface Column<T> {
  id: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  csvValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  filtersSlot?: React.ReactNode;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  csvFilename?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  initialSort?: { columnId: string; dir: "asc" | "desc" };
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  searchText,
  searchPlaceholder,
  toolbar,
  filtersSlot,
  onRowClick,
  pageSize = 10,
  csvFilename,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search or filters.",
  emptyActionLabel,
  onEmptyAction,
  initialSort,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ columnId: string; dir: "asc" | "desc" } | null>(initialSort ?? null);

  const filtered = useMemo(() => {
    if (!query.trim() || !searchText) return data;
    const q = query.toLowerCase();
    return data.filter((row) => searchText(row).toLowerCase().includes(q));
  }, [data, query, searchText]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.id === sort.columnId);
    if (!col?.sortValue) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (columnId: string) => {
    setSort((prev) => {
      if (prev?.columnId !== columnId) return { columnId, dir: "asc" };
      if (prev.dir === "asc") return { columnId, dir: "desc" };
      return null;
    });
  };

  const handleExport = () => {
    const csvCols = columns
      .filter((c) => c.csvValue)
      .map((c) => ({ header: c.header, value: (row: T) => c.csvValue!(row) }));
    downloadCsv(csvFilename ?? "export", sorted, csvCols);
  };

  const hasCsv = csvFilename && columns.some((c) => c.csvValue);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {searchText && (
            <SearchInput
              value={query}
              onChange={(v) => {
                setQuery(v);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full sm:max-w-xs"
            />
          )}
          {filtersSlot && <div className="flex flex-wrap items-center gap-2">{filtersSlot}</div>}
        </div>
        <div className="flex items-center gap-2">
          {hasCsv && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          )}
          {toolbar}
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  {columns.map((col) => (
                    <TableHead key={col.id} className={col.headerClassName}>
                      {col.sortable && col.sortValue ? (
                        <button
                          onClick={() => toggleSort(col.id)}
                          className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                        >
                          {col.header}
                          {sort?.columnId === col.id ? (
                            sort.dir === "asc" ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((row, i) => (
                  <motion.tr
                    key={rowKey(row)}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(i * 0.02, 0.2) }}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "border-b border-border transition-colors hover:bg-muted/40",
                      onRowClick && "cursor-pointer",
                    )}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.id} className={col.className}>
                        {col.accessor(row)}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, sorted.length)}
              </span>{" "}
              of <span className="font-medium text-foreground">{sorted.length}</span>
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => {
                  const p = i + 1;
                  return (
                    <Button
                      key={p}
                      variant={p === currentPage ? "default" : "outline"}
                      size="icon-sm"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
