import { useState } from "react";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BrandLogo } from "@/components/brand/BrandLogo";

const inputClass =
  "bg-[hsl(var(--surface-panel))] border-[hsl(var(--surface-border))] text-foreground placeholder:text-muted-foreground rounded-xl h-11 pr-11";

/**
 * Where the reset email's link lands. The link signs the user in for this one purpose, so the
 * new password is saved to their existing account and nothing in the pantry changes.
 */
const ResetPassword = () => {
  const { session, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mismatch, setMismatch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    sessionStorage.removeItem("sc-recovery");
    toast({ title: "Password updated", description: "You're signed in with your new password." });
    navigate("/", { replace: true });
  };

  // Only a session opened by a reset link may set a password here without the old one.
  const fromResetLink = sessionStorage.getItem("sc-recovery") === "1";

  if (loading) return null;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[hsla(142,72%,40%,0.12)] blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[hsla(142,70%,45%,0.08)] blur-[100px]" />

      <div className="w-full max-w-sm space-y-8 relative z-10">
        <div className="flex flex-col items-center gap-3">
          <BrandLogo variant="auto" className="h-14 w-auto" />
          <h1 className="text-sm text-muted-foreground">Set a new password</h1>
        </div>

        {!session || !fromResetLink ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              This link has expired or has already been used. Ask for a new one and use the latest email.
            </p>
            <Button
              type="button"
              onClick={() => navigate("/auth", { state: { forgot: true } })}
              className="w-full rounded-xl h-11 font-medium gradient-cool border-0 hover:opacity-90 transition-opacity"
            >
              Send a new link
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-muted-foreground">New password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setMismatch(false);
                  }}
                  required
                  minLength={6}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  // Keep focus in the password box, so a phone keyboard stays open.
                  onMouseDown={(e) => e.preventDefault()}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 inline-flex h-11 w-11 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-muted-foreground">Type it again</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setMismatch(false);
                }}
                required
                minLength={6}
                aria-invalid={mismatch}
                aria-describedby={mismatch ? "password-mismatch" : undefined}
                className={inputClass}
              />
              {mismatch && (
                <p id="password-mismatch" role="alert" className="text-sm text-destructive">
                  The two passwords don't match.
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full rounded-xl h-11 font-medium gradient-cool border-0 hover:opacity-90 transition-opacity"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save new password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
