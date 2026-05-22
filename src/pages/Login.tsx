import { useState } from "react";
import { useAuth, type UserRole } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { GraduationCap, AlertCircle, ShieldCheck, RefreshCw, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%&*";
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const digits = "0123456789";
    const symbols = "!@#$%&*";
    // Guarantee at least one of each category
    let pw = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      digits[Math.floor(Math.random() * digits.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];
    for (let i = 4; i < 16; i++) pw.push(chars[Math.floor(Math.random() * chars.length)]);
    // Shuffle
    for (let i = pw.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pw[i], pw[j]] = [pw[j], pw[i]];
    }
    const generated = pw.join("");
    setPassword(generated);
    setShowPassword(true);
  };

  // 2FA state
  const [twoFAStep, setTwoFAStep] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [mockCode] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));

  const triggerTwoFA = (onSuccess: () => void) => {
    setPendingAction(() => onSuccess);
    setTwoFAStep(true);
    setOtpValue("");
    setError("");
  };

  const verifyOTP = () => {
    if (otpValue === mockCode) {
      pendingAction?.();
      setTwoFAStep(false);
      setPendingAction(null);
    } else {
      setError("Invalid verification code. Please try again.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "login") {
      // Pre-validate credentials before 2FA using the same loader as AuthContext
      let users: any[] = [];
      try {
        const saved = localStorage.getItem("academic-stream-users");
        users = saved ? JSON.parse(saved) : [];
      } catch {}
      // If no users in storage, check against defaults
      if (users.length === 0) {
        users = [
          { email: "webmaster@university.edu", password: "webmaster123" },
          { email: "admin@university.edu", password: "admin123" },
          { email: "alice@university.edu", password: "student123" },
          { email: "bob@university.edu", password: "student123" },
          { email: "carol@university.edu", password: "student123" },
          { email: "david@university.edu", password: "student123" },
          { email: "emma@university.edu", password: "student123" },
        ];
      }
      const found = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (!found) {
        setError("Invalid email or password");
        return;
      }
      triggerTwoFA(() => {
        const result = login(email, password);
        if (!result.success) setError(result.error || "Login failed");
      });
    } else {
      if (!name.trim()) { setError("Name is required"); return; }
      triggerTwoFA(() => {
        const result = signup(name.trim(), email, password, role);
        if (!result.success) setError(result.error || "Signup failed");
      });
    }
  };

  if (twoFAStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 rounded-xl bg-primary/10">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="font-display text-2xl font-bold">Two-Factor Authentication</h1>
            <p className="text-sm text-muted-foreground">Enter the 6-digit code to continue</p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-xs text-muted-foreground mb-1">Your mock SMS code:</p>
                <p className="font-mono text-2xl font-bold tracking-[0.3em] text-primary">{mockCode}</p>
              </div>

              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button onClick={verifyOTP} disabled={otpValue.length !== 6} className="w-full">
                Verify Code
              </Button>

              <Button variant="ghost" className="w-full text-sm" onClick={() => { setTwoFAStep(false); setPendingAction(null); setError(""); }}>
                Back to {mode === "login" ? "Sign In" : "Sign Up"}
              </Button>
            </CardContent>
          </Card>

          <p className="text-[10px] text-center text-muted-foreground">
            ⚠️ This is mock 2FA — the code is shown above for demo purposes.
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
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold">Academic Stream</h1>
          <p className="text-sm text-muted-foreground">Learning Management System</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-lg text-center">
              {mode === "login" ? "Sign In" : "Create Account"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signup" && (
                    <button type="button" onClick={generatePassword} className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <RefreshCw className="h-3 w-3" /> Generate Strong Password
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="admin">Admin / Instructor</SelectItem>
                      <SelectItem value="webmaster">Webmaster</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full">
                {mode === "login" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground space-y-1">
              {mode === "login" ? (
                <>
                  <p>Don't have an account?{" "}
                    <button onClick={() => { setMode("signup"); setError(""); }} className="text-primary font-medium hover:underline">Sign up</button>
                  </p>
                  <p><a href="/forgot-password" className="text-primary font-medium hover:underline">Forgot your password?</a></p>
                </>
              ) : (
                <p>Already have an account?{" "}
                  <button onClick={() => { setMode("login"); setError(""); }} className="text-primary font-medium hover:underline">Sign in</button>
                </p>
              )}
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground text-center mb-3">Demo Accounts</p>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => { setEmail("webmaster@university.edu"); setPassword("webmaster123"); setMode("login"); }}>
                  Webmaster
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => { setEmail("admin@university.edu"); setPassword("admin123"); setMode("login"); }}>
                  Admin
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => { setEmail("alice@university.edu"); setPassword("student123"); setMode("login"); }}>
                  Student
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-[10px] text-center text-muted-foreground">
          ⚠️ Mock authentication with 2FA simulation — not secure for production.
        </p>
      </div>
    </div>
  );
}
