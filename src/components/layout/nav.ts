import {
  LayoutDashboard,
  Package,
  Tags,
  Ruler,
  Warehouse,
  MapPin,
  Truck,
  Users,
  PackagePlus,
  PackageMinus,
  ArrowLeftRight,
  SlidersHorizontal,
  PlayCircle,
  Boxes,
  ScrollText,
  TrendingDown,
  PackageX,
  CalendarClock,
  BarChart3,
  Activity,
  IndianRupee,
  FileInput,
  FileOutput,
  Building2,
  Settings,
  UserCircle,
  RefreshCw,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "",
    items: [{ label: "Dashboard", to: "/", icon: LayoutDashboard }],
  },
  {
    label: "Masters",
    items: [
      { label: "Item Master", to: "/masters/items", icon: Package },
      { label: "Category Master", to: "/masters/categories", icon: Tags },
      { label: "Unit Master", to: "/masters/units", icon: Ruler },
      { label: "Warehouse Master", to: "/masters/warehouses", icon: Warehouse },
      { label: "Location / Bin Master", to: "/masters/locations", icon: MapPin },
      { label: "Supplier Master", to: "/masters/suppliers", icon: Truck },
      { label: "Customer Master", to: "/masters/customers", icon: Users },
    ],
  },
  {
    label: "Transactions",
    items: [
      { label: "Goods Receipt", to: "/transactions/goods-receipt", icon: PackagePlus },
      { label: "Stock Issue", to: "/transactions/stock-issue", icon: PackageMinus },
      { label: "Stock Transfer", to: "/transactions/stock-transfer", icon: ArrowLeftRight },
      { label: "Stock Adjustment", to: "/transactions/stock-adjustment", icon: SlidersHorizontal },
      { label: "Opening Stock", to: "/transactions/opening-stock", icon: PlayCircle },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Current Stock", to: "/inventory/current-stock", icon: Boxes },
      { label: "Stock Ledger", to: "/inventory/ledger", icon: ScrollText },
      { label: "Low Stock", to: "/inventory/low-stock", icon: TrendingDown },
      { label: "Out of Stock", to: "/inventory/out-of-stock", icon: PackageX },
      { label: "Batch & Expiry", to: "/inventory/batch-expiry", icon: CalendarClock },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Stock Summary", to: "/reports/stock-summary", icon: BarChart3 },
      { label: "Stock Movement", to: "/reports/stock-movement", icon: Activity },
      { label: "Stock Valuation", to: "/reports/stock-valuation", icon: IndianRupee },
      { label: "Goods Receipt Report", to: "/reports/goods-receipt", icon: FileInput },
      { label: "Stock Issue Report", to: "/reports/stock-issue", icon: FileOutput },
      { label: "Warehouse-wise", to: "/reports/warehouse-wise", icon: Building2 },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "General Settings", to: "/settings/general", icon: Settings },
      { label: "User Profile", to: "/settings/profile", icon: UserCircle },
      { label: "Demo Data Reset", to: "/settings/reset", icon: RefreshCw },
    ],
  },
];

/** Flat lookup of title by path for header. */
export const titleByPath: Record<string, string> = Object.fromEntries(
  navGroups.flatMap((g) => g.items.map((i) => [i.to, i.label])),
);
