import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { getDemoAccountsEnabled, setDemoAccountsEnabled } from "@/lib/demoAccounts";
import { useAuth } from "@/context/AuthContext";
import { logActivity } from "@/lib/activityLog";

export default function DemoAccountsToggle() {
  const { user, isAdmin, isWebmaster } = useAuth();
  const [enabled, setEnabled] = useState<boolean>(() => getDemoAccountsEnabled());

  useEffect(() => {
    const handler = () => setEnabled(getDemoAccountsEnabled());
    window.addEventListener("demo-accounts-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("demo-accounts-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  if (!isAdmin && !isWebmaster) return null;

  const toggle = (next: boolean) => {
    setDemoAccountsEnabled(next);
    setEnabled(next);
    logActivity({
      action: "user_edit",
      actor: user?.name || "Staff",
      actorRole: user?.role || "unknown",
      details: `${next ? "Enabled" : "Disabled"} demo accounts on login page`,
    });
    toast.success(`Demo accounts ${next ? "enabled" : "disabled"} on login page`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" /> Login Page Settings
        </CardTitle>
        <CardDescription>
          Control what appears on the public sign-in page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
          <div className="space-y-1">
            <Label htmlFor="demo-toggle" className="text-sm font-medium">
              Show demo account quick-login buttons
            </Label>
            <p className="text-xs text-muted-foreground">
              When enabled, the login page displays one-click buttons for Webmaster, Admin, and Student demo accounts. Disable this for production-like deployments.
            </p>
          </div>
          <Switch id="demo-toggle" checked={enabled} onCheckedChange={toggle} />
        </div>
      </CardContent>
    </Card>
  );
}
