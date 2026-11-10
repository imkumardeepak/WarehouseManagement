import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWms } from "@/store/WmsContext";
import { titleByPath } from "./nav";
import { buildDashboardStats } from "@/store/selectors";
import { useMemo } from "react";

export function AppHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useWms();
  const title = titleByPath[location.pathname] ?? "Dashboard";
  const stats = useMemo(() => buildDashboardStats(state), [state]);
  const alerts = stats.lowStockCount + stats.outOfStockCount;

  const initials = state.profile.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1">
        <h2 className="font-display text-base font-semibold text-foreground lg:text-lg">{title}</h2>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4" /> Quick Action
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Create new</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/transactions/goods-receipt")}>Goods Receipt</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/transactions/stock-issue")}>Stock Issue</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/transactions/stock-transfer")}>Stock Transfer</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/masters/items")}>New Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {alerts > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                {alerts}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Stock Alerts</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {alerts === 0 ? (
            <DropdownMenuItem disabled>No alerts — stock levels healthy</DropdownMenuItem>
          ) : (
            <>
              {stats.outOfStockCount > 0 && (
                <DropdownMenuItem onClick={() => navigate("/inventory/out-of-stock")}>
                  <span className="text-destructive">{stats.outOfStockCount} item(s) out of stock</span>
                </DropdownMenuItem>
              )}
              {stats.lowStockCount > 0 && (
                <DropdownMenuItem onClick={() => navigate("/inventory/low-stock")}>
                  <span className="text-[hsl(32_90%_40%)]">{stats.lowStockCount} item(s) running low</span>
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 rounded-lg p-1 pr-2 transition-colors hover:bg-muted">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {initials}
            </div>
            <div className="hidden text-left leading-tight sm:block">
              <p className="text-sm font-semibold text-foreground">{state.profile.name}</p>
              <p className="text-[11px] text-muted-foreground">{state.profile.role}</p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>{state.profile.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/settings/profile")}>User Profile</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/settings/general")}>General Settings</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/settings/reset")}>Reset Demo Data</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
