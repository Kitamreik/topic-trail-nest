import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import {
  getOtpWebhook,
  setOtpWebhook,
  isValidSlackWebhook,
  sendOtpToSlack,
} from "@/lib/slackWebhook";

export default function OtpWebhookSettings() {
  const [url, setUrl] = useState(() => getOtpWebhook());
  const [saved, setSaved] = useState(() => getOtpWebhook());

  useEffect(() => {
    const handler = () => {
      const v = getOtpWebhook();
      setSaved(v);
      setUrl(v);
    };
    window.addEventListener("otp-webhook-changed", handler);
    return () => window.removeEventListener("otp-webhook-changed", handler);
  }, []);

  const handleSave = () => {
    const trimmed = url.trim();
    if (trimmed && !isValidSlackWebhook(trimmed)) {
      toast.error("Enter a valid Slack incoming webhook URL.");
      return;
    }
    setOtpWebhook(trimmed);
    setSaved(trimmed);
    toast.success(trimmed ? "Verification channel saved" : "Verification channel cleared");
  };

  const handleTest = async () => {
    if (!saved) {
      toast.error("Save a webhook URL first.");
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const res = await sendOtpToSlack({ email: "test@cookielms.dev", code });
    if (res.sent) toast.success(`Test message dispatched (code ${code}).`);
    else toast.error(res.error || "Failed to send test message.");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" /> Verification Channel
          {saved ? (
            <Badge variant="outline" className="text-[10px] ml-1">Configured</Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px] ml-1">Not configured</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="otp-webhook">Slack Incoming Webhook URL</Label>
          <Input
            id="otp-webhook"
            type="url"
            placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Verification codes for sign-in are dispatched to this Slack channel.
            Stored locally in this browser only.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} size="sm">Save</Button>
          <Button onClick={handleTest} size="sm" variant="outline" disabled={!saved}>
            Send test
          </Button>
          {saved && (
            <Button
              onClick={() => { setUrl(""); setOtpWebhook(""); setSaved(""); toast.success("Cleared"); }}
              size="sm"
              variant="ghost"
            >
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
