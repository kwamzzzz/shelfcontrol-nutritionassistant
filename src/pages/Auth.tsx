import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BrandLogo } from "@/components/brand/BrandLogo";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // "Forgot password?": ask for the email only and send a reset link.
  const location = useLocation();
  const [forgot, setForgot] = useState(Boolean((location.state as { forgot?: boolean } | null)?.forgot));
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (forgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setResetSent(true);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({
          title: "Account created",
          description: "Check your email to confirm your account.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[hsla(142,72%,40%,0.12)] blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[hsla(142,70%,45%,0.08)] blur-[100px]" />

      <div className="w-full max-w-sm space-y-8 relative z-10">
        <div className="flex flex-col items-center gap-3">
          <BrandLogo variant="auto" className="h-14 w-auto" />
          <h1 className="sr-only">ShelfControl</h1>
          <p className="text-sm text-muted-foreground">
            {forgot ? "Reset your password" : isLogin ? "Sign in to your kitchen" : "Create your account"}
          </p>
        </div>

        {resetSent ? (
          <div className="space-y-4 text-center">
            <p className="text-base font-medium text-foreground">Check your email</p>
            <p className="text-sm text-muted-foreground">
              If there's an account for <span className="font-medium text-foreground">{email}</span>, we've sent it a
              link to set a new password. Your pantry and everything in it stay as they are.
            </p>
            <button
              type="button"
              onClick={() => {
                setForgot(false);
                setResetSent(false);
              }}
              className="inline-flex min-h-[44px] items-center rounded px-2 font-medium text-[#34D399] hover:underline"
            >
              Back to sign in
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-[hsl(var(--surface-panel))] border-[hsl(var(--surface-border))] text-foreground placeholder:text-muted-foreground rounded-xl h-11"
            />
          </div>
          {!forgot && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-muted-foreground">Password</Label>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => setForgot(true)}
                  className="-my-3 inline-flex min-h-[44px] items-center rounded px-1 text-sm font-medium text-[#34D399] hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-[hsl(var(--surface-panel))] border-[hsl(var(--surface-border))] text-foreground placeholder:text-muted-foreground rounded-xl h-11 pr-11"
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
          )}
          <Button
            type="submit"
            className="w-full rounded-xl h-11 font-medium gradient-cool border-0 hover:opacity-90 transition-opacity"
            disabled={loading}
          >
            {loading ? "Loading..." : forgot ? "Send reset link" : isLogin ? "Sign In" : "Sign Up"}
          </Button>
        </form>
        )}

        {forgot ? (
          !resetSent && (
            <p className="text-center text-sm text-muted-foreground">
              Remembered it?{" "}
              <button
                type="button"
                onClick={() => setForgot(false)}
                className="-my-2 inline-flex min-h-[44px] items-center rounded px-2 py-2 align-middle font-medium text-[#34D399] hover:underline"
              >
                Back to sign in
              </button>
            </p>
          )
        ) : (
        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="-my-2 inline-flex min-h-[44px] items-center rounded px-2 py-2 align-middle font-medium text-[#34D399] hover:underline"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
        )}
      </div>
    </div>
  );
};

export default Auth;
