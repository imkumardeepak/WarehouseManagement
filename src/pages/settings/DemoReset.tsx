import { useState } from "react";
import { RefreshCw, AlertTriangle, Database } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWms } from "@/store/WmsContext";
import { useToast } from "@/components/ui/toast";
import { formatNumber } from "@/lib/format";

export default function DemoReset() {
  const { state, resetDemo } = useWms();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);

  const counts = [
    { label: "Items", value: state.items.length },
    { label: "Warehouses", value: state.warehouses.length },
    { label: "Transactions", value: state.goodsReceipts.length + state.stockIssues.length + state.stockTransfers.length + state.stockAdjustments.length + state.openingStocks.length },
    { label: "Ledger Entries", value: state.ledger.length },
    { label: "Stock Buckets", value: state.balances.length },
  ];

  return (
    <div>
      <PageHeader title="Demo Data Reset" description="Restore the application to its original seeded demo state." breadcrumbs={[{ label: "Settings" }, { label: "Demo Data Reset" }]} />

      <div className="grid max-w-3xl grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Current Data</CardTitle>
            <CardDescription>All data is stored locally in your browser and persists across refreshes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {counts.map((c) => (
                <div key={c.label} className="rounded-lg border border-border p-3 text-center">
                  <p className="text-2xl font-bold tabular-nums">{formatNumber(c.value)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Reset to Demo Data</CardTitle>
            <CardDescription>This permanently discards all your changes and reloads the original 15 items, 3 warehouses and 20 historical transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setConfirm(true)}><RefreshCw className="h-4 w-4" /> Reset Demo Data</Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmationDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Reset all data?"
        description="This will erase every change you have made and restore the original demo dataset. This cannot be undone."
        confirmLabel="Reset everything"
        onConfirm={() => { resetDemo(); toast.success("Demo data restored", "The application has been reset to its original state."); }}
      />
    </div>
  );
}
