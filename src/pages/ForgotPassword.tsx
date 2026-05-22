import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const { getAllUsers } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const users = getAllUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) {
      setError("No account found with this email address.");
      return;
    }
    // Generate mock reset token and store it
    const token = crypto.randomUUID().slice(0, 8);
    const resets = JSON.parse(localStorage.getItem("academic-stream-resets") || "{}");
    resets[email.toLowerCase()] = { token, expires: Date.now() + 15 * 60 * 1000 };
    localStorage.setItem("academic-stream-resets", JSON.stringify(resets));
    setResetToken(token);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 rounded-xl bg-green-500/10">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <h1 className="font-display text-2xl font-bold">Check Your Email</h1>
            <p className="text-sm text-muted-foreground">A password reset link has been sent to <strong>{email}</strong></p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-xs text-muted-foreground mb-1">Mock reset token (shown for demo):</p>
                <p className="font-mono text-lg font-bold tracking-wider text-primary">{resetToken}</p>
              </div>
              <Link to={`/reset-password?email=${encodeURIComponent(email)}`}>
                <Button className="w-full">Go to Reset Password Page</Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" className="w-full text-sm mt-2">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back to Sign In
                </Button>
              </Link>
            </CardContent>
          </Card>

          <p className="text-[10px] text-center text-muted-foreground">
            ⚠️ Mock password reset — token shown above for demo purposes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 rounded-xl bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold">Forgot Password</h1>
          <p className="text-sm text-muted-foreground">Enter your email to receive a reset link</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-lg text-center">Password Recovery</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full">Send Reset Link</Button>
            </form>

            <div className="mt-4 text-center">
              <Link to="/login" className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
