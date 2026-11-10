import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RowAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

export function RowActions({
  onView,
  onEdit,
  onDelete,
  extra,
}: {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  extra?: RowAction[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="h-11 w-11 sm:h-8 sm:w-8" aria-label="Row actions" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {onView && (
          <DropdownMenuItem onClick={onView}>
            <Eye className="h-4 w-4" /> View details
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4" /> Edit
          </DropdownMenuItem>
        )}
        {extra?.map((a, i) => (
          <DropdownMenuItem key={i} onClick={a.onClick} className={a.destructive ? "text-destructive" : ""}>
            {a.icon} {a.label}
          </DropdownMenuItem>
        ))}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
