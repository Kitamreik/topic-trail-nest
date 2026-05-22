import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShieldAlert } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetName: string;
  onVerified: () => void;
}

export default function ReauthDialog({ open, onOpenChange, targetName, onVerified }: Props) {
  const { user, verifyPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    setError("");
    if (!user) { setError("You must be signed in."); return; }
    if (!password) { setError("Enter your password."); return; }
    if (!verifyPassword(user.email, password)) {
      setError("Incorrect password.");
      return;
    }
    setPassword("");
    onOpenChange(false);
    onVerified();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) { setPassword(""); setError(""); }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Confirm your identity
          </DialogTitle>
          <DialogDescription>
            Re-enter your own password to reveal the stored password for <strong>{targetName}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="reauth-password">Your password</Label>
          <Input
            id="reauth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            autoFocus
          />
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm}>Reveal password</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
