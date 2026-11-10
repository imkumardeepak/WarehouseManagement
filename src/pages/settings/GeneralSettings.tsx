import { useState } from "react";
import { Save, Settings, Check } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Field, PickSelect } from "@/components/transactions/parts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWms } from "@/store/WmsContext";
import { useTheme, THEMES, ThemeColor } from "@/store/ThemeContext";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export default function GeneralSettings() {
  const { state, updateSettings } = useWms();
  const { color, setColor, themes } = useTheme();
  const toast = useToast();
  const [form, setForm] = useState(state.settings);

  const save = () => {
    updateSettings(form);
    toast.success("Settings saved", "Your general settings have been updated.");
  };

  return (
    <div>
      <PageHeader title="General Settings" description="Configure company details and inventory preferences." breadcrumbs={[{ label: "Settings" }, { label: "General Settings" }]} />

      <Card className="mb-4 max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary" /> Appearance</CardTitle>
          <CardDescription>Pick the accent colour used across the app. Your choice is saved on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {themes.map((c: ThemeColor) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                  color === c ? "border-foreground/30 bg-muted" : "border-border hover:bg-muted/60",
                )}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: THEMES[c].swatch }}>
                  {color === c && <Check className="h-3.5 w-3.5 text-white" />}
                </span>
                {THEMES[c].label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary" /> Company & Inventory</CardTitle>
          <CardDescription>These settings apply across the whole application.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Company Name" className="sm:col-span-2">
            <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </Field>
          <Field label="Currency">
            <PickSelect value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} options={[{ value: "INR", label: "Indian Rupee (₹)" }]} />
          </Field>
          <Field label="Expiry Warning (days)">
            <Input type="number" min={1} value={form.expiryWarningDays} onChange={(e) => setForm({ ...form, expiryWarningDays: Number(e.target.value) })} />
          </Field>
          <Field label="Default Warehouse">
            <PickSelect value={form.defaultWarehouseId ?? ""} onChange={(v) => setForm({ ...form, defaultWarehouseId: v || null })}
              options={state.warehouses.map((w) => ({ value: w.id, label: w.name }))} placeholder="None" />
          </Field>
          <Field label="Date Format">
            <PickSelect value={form.dateFormat} onChange={(v) => setForm({ ...form, dateFormat: v })}
              options={[{ value: "dd MMM yyyy", label: "dd MMM yyyy (Indian)" }, { value: "dd/MM/yyyy", label: "dd/MM/yyyy" }]} />
          </Field>
          <div className="sm:col-span-2 flex justify-end border-t border-border pt-4">
            <Button onClick={save}><Save className="h-4 w-4" /> Save Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
