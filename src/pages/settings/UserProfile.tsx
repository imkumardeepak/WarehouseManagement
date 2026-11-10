import { useState } from "react";
import { Save, UserCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Field } from "@/components/transactions/parts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWms } from "@/store/WmsContext";
import { useToast } from "@/components/ui/toast";

export default function UserProfile() {
  const { state, updateProfile } = useWms();
  const toast = useToast();
  const [form, setForm] = useState(state.profile);

  const initials = form.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const save = () => {
    updateProfile(form);
    toast.success("Profile updated", "Your profile details have been saved.");
  };

  return (
    <div>
      <PageHeader title="User Profile" description="Manage your personal account details." breadcrumbs={[{ label: "Settings" }, { label: "User Profile" }]} />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCircle className="h-5 w-5 text-primary" /> Profile</CardTitle>
          <CardDescription>This information appears in the header and on printed documents.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">{initials}</div>
            <div><p className="font-semibold">{form.name}</p><p className="text-sm text-muted-foreground">{form.role}</p></div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Role"><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></Field>
            <Field label="Email" className="sm:col-span-2"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end border-t border-border pt-4">
            <Button onClick={save}><Save className="h-4 w-4" /> Save Profile</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
