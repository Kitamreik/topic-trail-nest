import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, KeyRound, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

export default function ResetPassword() {
  const { getAllUsers, updateUser } = useAuth();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%&*";
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const digits = "0123456789";
    const symbols = "!@#$%&*";
    let pw = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      digits[Math.floor(Math.random() * digits.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];
    for (let i = 4; i < 16; i++) pw.push(chars[Math.floor(Math.random() * chars.length)]);
    for (let i = pw.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pw[i], pw[j]] = [pw[j], pw[i]];
    }
    const generated = pw.join("");
    setPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate token
    const resets = JSON.parse(localStorage.getItem("academic-stream-resets") || "{}");
    const resetEntry = resets[emailParam.toLowerCase()];
    if (!resetEntry || resetEntry.token !== token) {
      setError("Invalid reset token.");
      return;
    }
    if (Date.now() > resetEntry.expires) {
      setError("Reset token has expired. Please request a new one.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const users = getAllUsers();
    const user = users.find(u => u.email.toLowerCase() === emailParam.toLowerCase());
    if (!user) {
      setError("User not found.");
      return;
    }

    const result = updateUser(user.id, { password });
    if (!result.success) {
      setError(result.error || "Failed to update password.");
      return;
    }

    // Clear the reset token
    delete resets[emailParam.toLowerCase()];
    localStorage.setItem("academic-stream-resets", JSON.stringify(resets));
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 rounded-xl bg-green-500/10">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <h1 className="font-display text-2xl font-bold">Password Reset!</h1>
            <p className="text-sm text-muted-foreground">Your password has been successfully updated.</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <Link to="/login">
                <Button className="w-full">Sign In with New Password</Button>
              </Link>
            </CardContent>
          </Card>
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
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold">Reset Password</h1>
          <p className="text-sm text-muted-foreground">Enter your reset token and new password</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-lg text-center">
              Reset for {emailParam || "unknown"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">Reset Token</Label>
                <Input id="token" placeholder="Paste your reset token" value={token} onChange={(e) => setToken(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">New Password</Label>
                  <button type="button" onClick={generatePassword} className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <RefreshCw className="h-3 w-3" /> Generate
                  </button>
                </div>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" type={showPassword ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full">Reset Password</Button>
            </form>

            <div className="mt-4 text-center">
              <Link to="/login" className="text-sm text-primary font-medium hover:underline">
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-[10px] text-center text-muted-foreground">
          ⚠️ Mock password reset — use the token from the forgot password page.
        </p>
      </div>
    </div>
  );
}
