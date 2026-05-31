"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/supabase-provider";
import { signUp } from "@/lib/actions/auth-actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameOfLife } from "@/components/shared/game-of-life";

export default function LoginPage() {
  const { user, loading: authLoading, refresh: refreshAuth } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"landing" | "login" | "signup-result">("landing");
  const [hexId, setHexId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [generatedCreds, setGeneratedCreds] = useState<{ hexId: string; password: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace("/");
  }, [user, authLoading, router]);

  const handleSignUp = async () => {
    setLoading(true);
    setError("");
    const result = await signUp();
    setLoading(false);
    if (result.success && result.hexId && result.password) {
      setGeneratedCreds({ hexId: result.hexId, password: result.password });
      setMode("signup-result");
    } else {
      setError(result.error || "Signup failed");
    }
  };

  const doClientLogin = async (id: string, pass: string): Promise<boolean> => {
    const supabase = createClient();
    if (!supabase) return false;
    const email = `${id.replace("0x", "")}@streaksync.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return false;
    await refreshAuth();
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const success = await doClientLogin(hexId, password);
    setLoading(false);
    if (success) {
      router.push("/");
    } else {
      setError("Invalid ID or password");
    }
  };

  const handleLoginWithGenerated = async () => {
    if (!generatedCreds) return;
    setLoading(true);
    const success = await doClientLogin(generatedCreds.hexId, generatedCreds.password);
    setLoading(false);
    if (success) {
      router.push("/");
    }
  };

  // Landing
  if (mode === "landing") {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6">
        <GameOfLife className="absolute inset-0 opacity-30" seed="login-bg" slow />
        <div className="relative flex flex-col items-center gap-8 text-center max-w-sm w-full">
          <div>
            <h1 className="text-3xl font-light tracking-wider uppercase">StreakSync</h1>
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              Track challenges with friends.<br />No email needed.
            </p>
          </div>

          <div className="w-full space-y-2">
            <Button onClick={handleSignUp} className="w-full h-12 text-xs uppercase tracking-widest" disabled={loading}>
              {loading ? "..." : "Generate New ID"}
            </Button>
            <button
              onClick={() => setMode("login")}
              className="w-full text-xs text-muted-foreground hover:text-foreground uppercase tracking-wider py-2"
            >
              I have an ID
            </button>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.2em] uppercase text-muted-foreground/30">
          StreakSync
        </p>
      </div>
    );
  }

  // Signup result
  if (mode === "signup-result" && generatedCreds) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6">
        <GameOfLife className="absolute inset-0 opacity-20" seed="login-bg" slow />
        <div className="relative flex flex-col items-center gap-6 text-center max-w-sm w-full">
          <div>
            <h1 className="text-2xl font-light uppercase tracking-wider">Your Credentials</h1>
            <p className="text-xs text-muted-foreground mt-3">
              Save these — they cannot be recovered.
            </p>
          </div>

          <div className="w-full p-5 border border-border bg-card space-y-4 text-left">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">ID</p>
              <p className="text-xl font-bold mt-1">{generatedCreds.hexId}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Password</p>
              <p className="text-xl font-bold mt-1">{generatedCreds.password}</p>
            </div>
          </div>

          <Button onClick={handleLoginWithGenerated} className="w-full h-12 text-xs uppercase tracking-widest" disabled={loading}>
            {loading ? "..." : "I've saved it — Log in"}
          </Button>
        </div>
        <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.2em] uppercase text-muted-foreground/30">
          StreakSync
        </p>
      </div>
    );
  }

  // Login form
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <GameOfLife className="absolute inset-0 opacity-20" seed="login-bg" slow />
      <div className="relative flex flex-col items-center gap-6 text-center max-w-sm w-full">
        <h1 className="text-2xl font-light uppercase tracking-wider">Log In</h1>

        <form onSubmit={handleLogin} className="w-full space-y-3">
          <Input
            placeholder="Hex ID (e.g. 0xa3f)"
            value={hexId}
            onChange={(e) => setHexId(e.target.value)}
            className="h-11 text-sm border-border"
            required
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 text-sm border-border"
            required
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button type="submit" className="w-full h-12 text-xs uppercase tracking-widest" disabled={loading}>
            {loading ? "..." : "Enter"}
          </Button>
        </form>

        <button
          onClick={() => setMode("landing")}
          className="text-xs text-muted-foreground hover:text-foreground uppercase tracking-wider"
        >
          Back
        </button>
      </div>
      <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.2em] uppercase text-muted-foreground/30">
        StreakSync
      </p>
    </div>
  );
}
