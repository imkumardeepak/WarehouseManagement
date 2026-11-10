import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Boxes, X } from "lucide-react";
import { navGroups } from "./nav";
import { cn } from "@/lib/utils";

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent text-white shadow-lg">
          <Boxes className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-[15px] font-bold text-sidebar-foreground">StockFlow</p>
          <p className="text-[11px] text-sidebar-muted">Warehouse Management</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-muted">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      isActive
                        ? "bg-sidebar-accent/15 text-sidebar-foreground"
                        : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-accent"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <item.icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 transition-colors",
                          isActive ? "text-sidebar-accent" : "text-sidebar-muted group-hover:text-sidebar-foreground",
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-xs font-semibold text-sidebar-foreground">StockFlow WMS v1.0</p>
          <p className="mt-0.5 text-[11px] text-sidebar-muted">Demo data persists locally</p>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 bg-sidebar lg:block">
        <div className="fixed h-full w-64">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar lg:hidden"
            >
              <button
                onClick={onClose}
                className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent onNavigate={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
