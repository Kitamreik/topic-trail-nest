import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Clock, GraduationCap, Megaphone, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const PREFS_KEY = "academic-stream-notif-prefs";

interface NotifPreferences {
  deadlines: boolean;
  grades: boolean;
  announcements: boolean;
  discussions: boolean;
}

const defaultPrefs: NotifPreferences = {
  deadlines: true,
  grades: true,
  announcements: true,
  discussions: true,
};

function loadPrefs(userId: string): NotifPreferences {
  try {
    const saved = localStorage.getItem(`${PREFS_KEY}-${userId}`);
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaultPrefs;
}

function savePrefs(userId: string, prefs: NotifPreferences) {
  localStorage.setItem(`${PREFS_KEY}-${userId}`, JSON.stringify(prefs));
}

const prefItems = [
  { key: "deadlines" as const, label: "Assignment Deadlines", description: "Reminders when assignments are due soon", icon: Clock },
  { key: "grades" as const, label: "Grade Updates", description: "Notifications when grades are posted or updated", icon: GraduationCap },
  { key: "announcements" as const, label: "Announcements", description: "New announcements from instructors", icon: Megaphone },
  { key: "discussions" as const, label: "Discussion Replies", description: "Replies to discussions you participate in", icon: MessageSquare },
];

export default function NotificationPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotifPreferences>(defaultPrefs);

  useEffect(() => {
    if (user) setPrefs(loadPrefs(user.id));
  }, [user]);

  const togglePref = (key: keyof NotifPreferences) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    if (!user) return;
    savePrefs(user.id, prefs);
    toast.success("Notification preferences saved!");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Notification Preferences</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose which notifications you'd like to receive.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-base">Email & In-App Notifications</CardTitle>
          </div>
          <CardDescription>Toggle notification types on or off.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {prefItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-background">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <Label className="text-sm font-medium">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <Switch
                checked={prefs[item.key]}
                onCheckedChange={() => togglePref(item.key)}
              />
            </div>
          ))}

          <Button onClick={handleSave} className="w-full mt-4">
            Save Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
