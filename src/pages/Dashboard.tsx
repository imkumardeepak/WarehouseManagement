import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package, Warehouse, Boxes, IndianRupee, ArrowDownToLine, ArrowUpFromLine,
  TrendingDown, PackageX, PackagePlus, PackageMinus, ArrowLeftRight, Plus, Eye, ArrowRight,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { DashboardCard } from "@/components/common/DashboardCard";
import { DashboardSkeleton } from "@/components/common/LoadingSkeleton";
import { StockStatusBadge, DocStatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWms } from "@/store/WmsContext";
import { useTheme } from "@/store/ThemeContext";
import {
  buildDashboardStats, buildMovementSeries, buildWarehouseDistribution,
  buildCategoryDistribution, buildTopMovingItems, buildRecentTransactions, buildItemSummaries,
} from "@/store/selectors";
import { formatCompact, formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["#2563eb", "#8b5cf6", "#f59e0b", "#14b8a6", "#ec4899", "#6366f1", "#ef4444"];

export default function Dashboard() {
  const { state, ready } = useWms();
  const { primary } = useTheme();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<7 | 30>(7);

  const stats = useMemo(() => buildDashboardStats(state), [state]);
  const movement = useMemo(() => buildMovementSeries(state, period), [state, period]);
  const whDist = useMemo(() => buildWarehouseDistribution(state), [state]);
  const catDist = useMemo(() => buildCategoryDistribution(state), [state]);
  const topItems = useMemo(() => buildTopMovingItems(state, 5), [state]);
  const recent = useMemo(() => buildRecentTransactions(state, 6), [state]);
  const lowItems = useMemo(() => buildItemSummaries(state).filter((s) => s.status === "low-stock" || s.status === "out-of-stock").slice(0, 5), [state]);

  if (!ready) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Loading your warehouse overview..." />
        <DashboardSkeleton />
      </div>
    );
  }

  const kpis = [
    { label: "Total Items", value: stats.totalItems, icon: Package, tone: "primary" as const },
    { label: "Total Warehouses", value: stats.totalWarehouses, icon: Warehouse, tone: "info" as const },
    { label: "Total Stock Qty", value: stats.totalQty, icon: Boxes, tone: "primary" as const, format: formatCompact },
    { label: "Total Stock Value", value: stats.totalValue, icon: IndianRupee, tone: "success" as const, format: (n: number) => formatCurrency(n) },
    { label: "Today's Stock IN", value: stats.todayIn, icon: ArrowDownToLine, tone: "success" as const, format: formatCompact },
    { label: "Today's Stock OUT", value: stats.todayOut, icon: ArrowUpFromLine, tone: "warning" as const, format: formatCompact },
    { label: "Low Stock Items", value: stats.lowStockCount, icon: TrendingDown, tone: "warning" as const },
    { label: "Out of Stock", value: stats.outOfStockCount, icon: PackageX, tone: "destructive" as const },
  ];

  const quickActions = [
    { label: "Add Item", icon: Plus, to: "/masters/items" },
    { label: "Receive Stock", icon: PackagePlus, to: "/transactions/goods-receipt" },
    { label: "Issue Stock", icon: PackageMinus, to: "/transactions/stock-issue" },
    { label: "Transfer Stock", icon: ArrowLeftRight, to: "/transactions/stock-transfer" },
    { label: "View Inventory", icon: Eye, to: "/inventory/current-stock" },
  ];

  const toneForTxn = (tone: string) => (tone === "in" ? "bg-success/10 text-success" : tone === "out" ? "bg-destructive/10 text-destructive" : "bg-info/10 text-info");

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${state.profile.name.split(" ")[0]}`}
        description="Here's what's happening across your warehouses today."
        actions={
          <div className="flex flex-wrap gap-2">
            {quickActions.map((a) => (
              <Button key={a.to} variant={a.label === "Add Item" ? "default" : "outline"} size="sm" onClick={() => navigate(a.to)}>
                <a.icon className="h-4 w-4" /> {a.label}
              </Button>
            ))}
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <DashboardCard key={k.label} label={k.label} value={k.value} icon={k.icon} tone={k.tone} format={k.format} delay={i * 0.04} />
        ))}
      </div>

      {/* Charts row */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Stock Movement</CardTitle>
              <CardDescription>Daily IN vs OUT quantities</CardDescription>
            </div>
            <div className="flex rounded-lg bg-muted p-1">
              {([7, 30] as const).map((p) => (
                <button key={p} onClick={() => setPeriod(p)} className={cn("rounded-md px-3 py-1 text-xs font-medium transition-colors", period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
                  {p}d
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={movement} margin={{ left: -16, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={primary} stopOpacity={0.3} /><stop offset="95%" stopColor={primary} stopOpacity={0} /></linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="in" name="Stock IN" stroke={primary} strokeWidth={2} fill="url(#gIn)" />
                <Area type="monotone" dataKey="out" name="Stock OUT" stroke="#f59e0b" strokeWidth={2} fill="url(#gOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
            <CardDescription>Stock quantity by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={catDist} dataKey="qty" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {catDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <RTooltip formatter={(v: number) => formatNumber(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse distribution + Top moving */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Warehouse Stock Distribution</CardTitle>
            <CardDescription>Compare stock quantity across warehouses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={whDist} margin={{ left: -16, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="code" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <RTooltip formatter={(v: number) => formatNumber(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="qty" name="Quantity" fill={primary} radius={[6, 6, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Moving Items</CardTitle>
            <CardDescription>By total quantity moved</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topItems.map((t, i) => (
              <div key={t.itemId} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.sku}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatNumber(t.moved)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Low stock + Recent transactions */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div><CardTitle>Low Stock Alerts</CardTitle><CardDescription>Items needing attention</CardDescription></div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/inventory/low-stock")}>View all <ArrowRight className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            {lowItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">All stock levels are healthy.</p>
            ) : (
              <div className="space-y-2.5">
                {lowItems.map((it) => (
                  <div key={it.itemId} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div><p className="text-sm font-medium">{it.itemName}</p><p className="text-xs text-muted-foreground">{it.itemCode} · Reorder at {formatNumber(it.reorderLevel)}</p></div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums">{formatNumber(it.totalQty)} {it.unitSymbol}</span>
                      <StockStatusBadge status={it.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div><CardTitle>Recent Transactions</CardTitle><CardDescription>Latest stock activity</CardDescription></div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/inventory/ledger")}>View ledger <ArrowRight className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", toneForTxn(r.tone))}>
                    {r.tone === "in" ? <PackagePlus className="h-4 w-4" /> : r.tone === "out" ? <PackageMinus className="h-4 w-4" /> : <ArrowLeftRight className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{r.type} · {r.docNo}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(r.date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">{formatNumber(r.qty)}</span>
                    <DocStatusBadge status={r.status as never} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
