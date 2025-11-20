import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(72),
  displayName: z.string().trim().min(2, { message: "Display name must be at least 2 characters" }).max(100).optional(),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if account is locked out
  const isLockedOut = lockoutUntil && Date.now() < lockoutUntil;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs
      const validation = authSchema.safeParse({
        email,
        password,
        displayName: isLogin ? undefined : displayName,
      });

      if (!validation.success) {
        toast({
          title: "Validation Error",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check for lockout
      if (isLockedOut) {
        const remainingMinutes = Math.ceil((lockoutUntil! - Date.now()) / 60000);
        toast({
          title: "Account Locked",
          description: `Too many failed attempts. Try again in ${remainingMinutes} minute(s).`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          // Increment failed attempts
          const newFailedAttempts = failedAttempts + 1;
          setFailedAttempts(newFailedAttempts);

          // Lock account after 5 failed attempts for 15 minutes
          if (newFailedAttempts >= 5) {
            const lockoutTime = Date.now() + 15 * 60 * 1000; // 15 minutes
            setLockoutUntil(lockoutTime);
            toast({
              title: "Account Locked",
              description: "Too many failed login attempts. Account locked for 15 minutes.",
              variant: "destructive",
            });
          } else if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Login Failed",
              description: `Invalid email or password. ${5 - newFailedAttempts} attempts remaining.`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: error.message,
              variant: "destructive",
            });
          }
          setLoading(false);
          return;
        }

        // Reset failed attempts on successful login
        setFailedAttempts(0);
        setLockoutUntil(null);

        // Check user role and redirect
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);

        let userRole = "player";
        if (roles && roles.length > 0) {
          userRole = roles[0].role;
          if (userRole === "admin") {
            navigate("/admin");
          } else if (userRole === "host") {
            navigate("/host");
          } else {
            navigate("/play");
          }
        } else {
          navigate("/play");
        }

        const roleLabel = userRole === "admin" ? "Admin" : userRole === "host" ? "Host" : "Player";
        toast({
          title: "Success",
          description: `Welcome back, ${roleLabel}!`,
        });
      } else {
        // Sign up - only for players
        // Validate password strength
        if (password.length < 8) {
          toast({
            title: "Weak Password",
            description: "Password must be at least 8 characters long.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim(),
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          if (error.message.includes("already registered") || error.message.includes("already been registered")) {
            toast({
              title: "Account Exists",
              description: "This email is already registered. Please log in instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: error.message,
              variant: "destructive",
            });
          }
          setLoading(false);
          return;
        }

        // Assign player role
        if (data.user) {
          await supabase.from("user_roles").insert({
            user_id: data.user.id,
            role: "player",
          });

          toast({
            title: "Success",
            description: "Account created! Logging you in...",
          });

          navigate("/play");
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = z.string().email().safeParse(email);
      if (!validation.success) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Password reset link sent to your email!",
        });
        setResetMode(false);
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

  if (resetMode) {
    return (
      <div className="min-h-screen bg-gradient-hero wood-texture flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-card">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-secondary warm-glow mb-2">
              Reset Password
            </h1>
            <p className="text-muted-foreground">
              Enter your email to receive a reset link
            </p>
          </div>

          <form onSubmit={handlePasswordReset} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setResetMode(false)}
            >
              Back to Login
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4 wood-texture">
      <Card className="w-full max-w-md p-8 shadow-card border-2 border-primary/40 relative overflow-hidden leather-texture">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-accent"></div>
        
        <div className="text-center mb-8 relative z-10">
          <h1 className="text-5xl font-bold text-secondary mb-2 warm-glow">
            BrewIQ
          </h1>
          <p className="text-muted-foreground italic">Unified Login Portal</p>
          <p className="text-xs text-muted-foreground mt-2">Admin, Host & Player Access</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6 relative z-10">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-foreground">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required={!isLogin}
                maxLength={100}
                className="bg-input border-2 border-border text-foreground focus:border-primary transition-all"
                disabled={loading || isLockedOut}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={255}
              className="bg-input border-2 border-border text-foreground focus:border-primary transition-all"
              disabled={loading || isLockedOut}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={72}
              className="bg-input border-2 border-border text-foreground focus:border-primary transition-all"
              disabled={loading || isLockedOut}
            />
            <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters required</p>
          </div>

          {isLockedOut && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive font-medium">
                Account temporarily locked due to failed login attempts
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full button-hover"
            disabled={loading || isLockedOut}
          >
            {loading ? "Loading..." : isLogin ? "Log In" : "Sign Up"}
          </Button>

          {isLogin && (
            <Button
              type="button"
              variant="link"
              className="w-full text-primary hover:text-primary/80"
              onClick={() => setResetMode(true)}
              disabled={loading}
            >
              Forgot Password?
            </Button>
          )}
        </form>

        <div className="mt-6 text-center relative z-10">
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </p>
          <Button
            type="button"
            variant="link"
            className="text-primary hover:text-primary/80"
            onClick={() => {
              setIsLogin(!isLogin);
              setPassword("");
              setDisplayName("");
            }}
            disabled={loading}
          >
            {isLogin ? "Sign up as a player" : "Log in"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
