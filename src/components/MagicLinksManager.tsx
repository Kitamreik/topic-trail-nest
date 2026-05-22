import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  listMagicLinks, createMagicLink, revokeMagicLink,
  buildMagicLinkUrl, isExpired, type MagicLink, type MagicLinkRole,
} from "@/lib/magicLinks";
import { logActivity } from "@/lib/activityLog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Copy, Trash2, Link2, Clock, Check } from "lucide-react";
import { toast } from "sonner";

export default function MagicLinksManager() {
  const { user } = useAuth();
  const [links, setLinks] = useState<MagicLink[]>(() => listMagicLinks());
  const [role, setRole] = useState<MagicLinkRole>("admin");
  const [note, setNote] = useState("");
  const [ttl, setTtl] = useState(72);

  const refresh = () => setLinks(listMagicLinks());

  const handleCreate = () => {
    if (ttl <= 0 || ttl > 24 * 30) {
      toast.error("Expiry must be between 1 and 720 hours.");
      return;
    }
    const link = createMagicLink({
      role,
      note,
      ttlHours: ttl,
      createdBy: user?.name || "Webmaster",
    });
    logActivity({
      action: "user_create",
      actor: user?.name || "Webmaster",
      actorRole: user?.role || "webmaster",
      details: `Issued ${role} magic link${note ? ` (${note})` : ""}`,
    });
    setNote("");
    refresh();
    navigator.clipboard?.writeText(buildMagicLinkUrl(link.token)).catch(() => {});
    toast.success("Magic link created and copied to clipboard.");
  };

  const handleCopy = (token: string) => {
    navigator.clipboard?.writeText(buildMagicLinkUrl(token));
    toast.success("Link copied.");
  };

  const handleRevoke = (token: string) => {
    revokeMagicLink(token);
    refresh();
    toast.success("Invitation revoked.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Admin / Webmaster Magic Links
        </CardTitle>
        <CardDescription>
          Issue single-use invitation links so trusted people can establish an admin or webmaster
          account without exposing role selection at public signup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-[160px_1fr_140px_auto] items-end">
          <div>
            <Label className="text-xs">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as MagicLinkRole)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin / Instructor</SelectItem>
                <SelectItem value="webmaster">Webmaster</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Note (optional)</Label>
            <Input
              className="mt-1"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 120))}
              placeholder="e.g. For Prof. Carter"
            />
          </div>
          <div>
            <Label className="text-xs">Expires in (hours)</Label>
            <Input
              className="mt-1"
              type="number"
              min={1}
              max={720}
              value={ttl}
              onChange={(e) => setTtl(Number(e.target.value) || 0)}
            />
          </div>
          <Button onClick={handleCreate} className="gap-1">
            <Sparkles className="h-4 w-4" /> Generate
          </Button>
        </div>

        <div className="space-y-2">
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No magic links issued yet.</p>
          ) : (
            links.map((link) => {
              const expired = isExpired(link);
              const used = !!link.usedAt;
              const url = buildMagicLinkUrl(link.token);
              return (
                <div key={link.token} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="capitalize">{link.role}</Badge>
                    {used && <Badge variant="default" className="gap-1"><Check className="h-3 w-3" /> Used</Badge>}
                    {!used && expired && <Badge variant="destructive">Expired</Badge>}
                    {!used && !expired && <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Active</Badge>}
                    {link.note && <span className="text-xs text-muted-foreground">— {link.note}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <code className="text-[11px] bg-muted px-2 py-1 rounded flex-1 truncate font-mono">{url}</code>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopy(link.token)} title="Copy link">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRevoke(link.token)} title="Revoke">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Created {new Date(link.createdAt).toLocaleString()} by {link.createdBy} ·
                    {" "}Expires {new Date(link.expiresAt).toLocaleString()}
                    {used && link.usedBy && <> · Claimed by {link.usedBy} on {new Date(link.usedAt!).toLocaleString()}</>}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
