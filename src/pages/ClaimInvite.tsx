import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { consumeMagicLink, getMagicLink, isExpired, type MagicLink } from "@/lib/magicLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ShieldCheck, Sparkles } from "lucide-react";
import { AppFooter } from "@/components/AppFooter";
import { toast } from "sonner";

export default function ClaimInvite() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const { createUser, login } = useAuth();

  const [link, setLink] = useState<MagicLink | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    setLink(getMagicLink(token));
  }, [token]);

  const status = useMemo(() => {
    if (!token) return "missing";
    if (!link) return "invalid";
    if (link.usedAt) return "used";
    if (isExpired(link)) return "expired";
    return "ok";
  }, [token, link]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!link || status !== "ok") return;
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError("Please provide a name, email, and a password of at least 8 characters.");
      return;
    }
    const result = createUser({ name: name.trim(), email: email.trim(), password, role: link.role });
    if (!result.success) {
      setError(result.error || "Could not create account.");
      return;
    }
    const consume = consumeMagicLink(link.token, email.trim());
    if (!consume.success) {
      setError(consume.error || "Invitation could not be consumed.");
      return;
    }
    const signIn = login(email.trim(), password);
    if (signIn.success) {
      toast.success(`Welcome — your ${link.role} account is ready.`);
      navigate("/dashboard", { replace: true });
    } else {
      toast.success("Account created. Please sign in.");
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 rounded-xl bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="font-display text-2xl font-bold">Claim Your Invitation</h1>
            <p className="text-sm text-muted-foreground">Set up your elevated account on Kit TJ Services</p>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {status === "ok" && link ? (
                  <>Invitation for <Badge variant="secondary" className="capitalize">{link.role}</Badge></>
                ) : "Invitation"}
              </CardTitle>
              {link?.note && status === "ok" && (
                <CardDescription>{link.note}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {status !== "ok" ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      {status === "missing" && "No invitation token was provided."}
                      {status === "invalid" && "This invitation link is invalid or has been revoked."}
                      {status === "expired" && "This invitation has expired. Please request a new one."}
                      {status === "used" && "This invitation has already been used."}
                    </div>
                  </div>
                  <Link to="/login">
                    <Button variant="outline" className="w-full">Back to sign in</Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@cookielms.dev" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password (min. 8 chars)</Label>
                    <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full">Create my {link?.role} account</Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
