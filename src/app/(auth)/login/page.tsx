"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/supabase-provider";
import { signUp, signIn } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect } from "react";

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn(hexId, password);
    setLoading(false);
    if (result.success) {
      router.push("/");
    } else {
      setError(result.error || "Login failed");
    }
  };

  const handleLoginWithGenerated = async () => {
    if (!generatedCreds) return;
    setLoading(true);
    const result = await signIn(generatedCreds.hexId, generatedCreds.password);
    setLoading(false);
    if (result.success) {
      router.push("/");
    }
  };

  // Landing
  if (mode === "landing") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center gap-8 text-center max-w-sm w-full">
          <div>
            <h1 className="text-2xl font-bold tracking-wider uppercase">StreakSync</h1>
            <p className="text-xs text-muted-foreground mt-3">
              Track challenges with friends.<br />No email needed.
            </p>
          </div>

          <div className="w-full space-y-2">
            <Button onClick={handleSignUp} className="w-full h-11 text-[11px] uppercase tracking-widest" disabled={loading}>
              {loading ? "..." : "Generate New ID"}
            </Button>
            <button
              onClick={() => setMode("login")}
              className="w-full text-[11px] text-muted-foreground hover:text-foreground uppercase tracking-wider py-2"
            >
              I have an ID
            </button>
          </div>

          {error && <p className="text-[10px] text-red-500">{error}</p>}
        </div>
      </div>
    );
  }

  // Signup result — show credentials
  if (mode === "signup-result" && generatedCreds) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm w-full">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider">Your Credentials</h1>
            <p className="text-[10px] text-muted-foreground mt-2">
              Save these — they cannot be recovered.
            </p>
          </div>

          <div className="w-full p-4 border border-border bg-card space-y-3 text-left">
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">ID</p>
              <p className="text-lg font-bold mt-0.5">{generatedCreds.hexId}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Password</p>
              <p className="text-lg font-bold font-mono mt-0.5">{generatedCreds.password}</p>
            </div>
          </div>

          <Button onClick={handleLoginWithGenerated} className="w-full h-11 text-[11px] uppercase tracking-widest" disabled={loading}>
            {loading ? "..." : "I've saved it — Log in"}
          </Button>
        </div>
      </div>
    );
  }

  // Login form
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm w-full">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wider">Log In</h1>
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-3">
          <Input
            placeholder="Hex ID (e.g. 0xa3f)"
            value={hexId}
            onChange={(e) => setHexId(e.target.value)}
            className="h-10 text-sm border-border"
            required
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 text-sm border-border"
            required
          />
          {error && <p className="text-[10px] text-red-500">{error}</p>}
          <Button type="submit" className="w-full h-11 text-[11px] uppercase tracking-widest" disabled={loading}>
            {loading ? "..." : "Enter"}
          </Button>
        </form>

        <button
          onClick={() => setMode("landing")}
          className="text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-wider"
        >
          Back
        </button>
      </div>
    </div>
  );
}
