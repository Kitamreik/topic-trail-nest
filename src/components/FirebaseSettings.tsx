import { useEffect, useState } from "react";
import {
  FIREBASE_CONFIG_FIELDS,
  type FirebaseConfig,
  getStoredFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig,
  isFirebaseEnabled,
  setFirebaseEnabled,
  isConfigComplete,
  getFirebaseStatus,
  resetFirebaseCache,
} from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Flame, CheckCircle2, AlertTriangle, Database, Trash2 } from "lucide-react";
import { toast } from "sonner";

const EMPTY: FirebaseConfig = {
  apiKey: "", authDomain: "", projectId: "", storageBucket: "",
  messagingSenderId: "", appId: "", measurementId: "",
};

export default function FirebaseSettings() {
  const [config, setConfig] = useState<FirebaseConfig>(EMPTY);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState(getFirebaseStatus());

  useEffect(() => {
    const stored = getStoredFirebaseConfig();
    if (stored) setConfig({ ...EMPTY, ...stored });
    setEnabled(isFirebaseEnabled());
  }, []);

  const refreshStatus = () => setStatus(getFirebaseStatus());

  const handleChange = (key: keyof FirebaseConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!isConfigComplete(config)) {
      toast.error("Please fill in all required fields before saving.");
      return;
    }
    saveFirebaseConfig(config);
    resetFirebaseCache();
    toast.success("Firebase configuration saved.");
    refreshStatus();
  };

  const handleToggle = (next: boolean) => {
    if (next && !isConfigComplete(config)) {
      toast.error("Save a complete configuration before enabling Firebase.");
      return;
    }
    setEnabled(next);
    setFirebaseEnabled(next);
    resetFirebaseCache();
    refreshStatus();
    toast.success(next ? "Firebase backend enabled." : "Reverted to localStorage fallback.");
  };

  const handleClear = () => {
    clearFirebaseConfig();
    resetFirebaseCache();
    setConfig(EMPTY);
    setEnabled(false);
    refreshStatus();
    toast.success("Firebase configuration cleared. Using localStorage fallback.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" /> Firebase Backend (Staged)
        </CardTitle>
        <CardDescription>
          Stage your Firebase project credentials. When enabled and valid, the app will use Firebase;
          otherwise it safely falls back to local browser storage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Backend mode</Label>
            <div className="flex items-center gap-2 text-xs">
              {status.enabled && status.ready && (
                <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Firebase active</Badge>
              )}
              {status.enabled && !status.ready && (
                <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Firebase error — using fallback</Badge>
              )}
              {!status.enabled && (
                <Badge variant="secondary" className="gap-1"><Database className="h-3 w-3" /> localStorage fallback</Badge>
              )}
            </div>
            {status.error && (
              <p className="text-xs text-destructive mt-1">{status.error}</p>
            )}
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {FIREBASE_CONFIG_FIELDS.map(field => (
            <div key={field.key} className={field.key === "appId" || field.key === "measurementId" ? "sm:col-span-2" : ""}>
              <Label htmlFor={`fb-${field.key}`} className="text-xs">
                {field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              <Input
                id={`fb-${field.key}`}
                value={config[field.key] || ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-xs mt-1"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} size="sm">Save configuration</Button>
          <Button onClick={handleClear} variant="outline" size="sm" className="gap-1">
            <Trash2 className="h-3.5 w-3.5" /> Clear & use localStorage
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Values are stored in this browser only. Find these in Firebase Console → Project settings → Your apps → SDK setup &amp; configuration.
          Note: this stages the connection — individual features (auth, files, data) will be migrated to Firebase incrementally.
        </p>
      </CardContent>
    </Card>
  );
}
