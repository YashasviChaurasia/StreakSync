"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import { useAuth } from "@/lib/auth/supabase-provider";
import { createChallenge } from "@/lib/store/local-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Eye, Users, Lock, Globe } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Challenge } from "@/lib/types";

export default function NewChallengePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(21);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [eventType, setEventType] = useState<"join" | "watch">("join");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    const challenge: Challenge = {
      id: `challenge-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || null,
      owner_id: user.id,
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: format(addDays(new Date(), duration), "yyyy-MM-dd"),
      visibility,
      event_type: eventType,
      theme: { gradient: "" },
      invite_code: Math.random().toString(36).slice(2, 8),
      invite_used: false,
      created_at: new Date().toISOString(),
    };

    createChallenge(challenge);
    router.push(`/challenges/${challenge.id}`);
  };

  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl">New Challenge</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          placeholder="Name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-10 text-sm border-border bg-card"
          required
        />

        <Textarea
          placeholder="Description (optional) — what's this challenge about?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="text-sm border-border bg-card min-h-[80px] resize-none"
          rows={3}
        />

        {/* Duration */}
        <div>
          <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-2">
            Duration
          </p>
          <div className="flex flex-wrap gap-1">
            {[7, 14, 21, 30, 60, 100].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={cn(
                  "px-3 py-1.5 text-xs font-mono border transition-colors",
                  duration === d
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div>
          <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-2">
            Type
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setEventType("join")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border transition-colors",
                eventType === "join"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              <Users className="h-3 w-3" /> join
            </button>
            <button
              type="button"
              onClick={() => setEventType("watch")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border transition-colors",
                eventType === "watch"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              <Eye className="h-3 w-3" /> watch
            </button>
          </div>
        </div>

        {/* Visibility */}
        <div>
          <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-2">
            Visibility
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setVisibility("private")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border transition-colors",
                visibility === "private"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              <Lock className="h-3 w-3" /> private
            </button>
            <button
              type="button"
              onClick={() => setVisibility("public")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border transition-colors",
                visibility === "public"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              <Globe className="h-3 w-3" /> public
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-10 text-xs font-mono uppercase tracking-wider"
          disabled={!title.trim()}
        >
          Create Challenge
        </Button>
      </form>
    </div>
  );
}
