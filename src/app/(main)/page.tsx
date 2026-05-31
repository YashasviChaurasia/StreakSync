"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/supabase-provider";
import { useUserChallenges } from "@/lib/hooks/use-store";
import { Heatmap } from "@/components/challenge/heatmap";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Star } from "lucide-react";
import Link from "next/link";
import * as db from "@/lib/db";
import { calculateStreak } from "@/lib/utils/streaks";
import { cn } from "@/lib/utils";
import { GameOfLife } from "@/components/shared/game-of-life";

const STARRED_KEY = "streaksync_starred_v2";

function getSavedStar(userId: string): string | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(STARRED_KEY);
  if (!data) return null;
  const map = JSON.parse(data);
  return map[userId] || null;
}

function saveStar(userId: string, challengeId: string | null) {
  const data = localStorage.getItem(STARRED_KEY);
  const map = data ? JSON.parse(data) : {};
  if (challengeId) { map[userId] = challengeId; } else { delete map[userId]; }
  localStorage.setItem(STARRED_KEY, JSON.stringify(map));
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { challenges } = useUserChallenges();
  const [starredId, setStarredId] = useState<string | null>(null);
  const [starredHeatmap, setStarredHeatmap] = useState<Map<string, number>>(new Map());
  const [maxStreak, setMaxStreak] = useState(0);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  const today = new Date().toISOString().split("T")[0];
  const activeChallenges = challenges.filter((c) => c.end_date >= today);

  // Determine starred challenge
  useEffect(() => {
    if (!user) return;
    const saved = getSavedStar(user.id);
    if (saved && activeChallenges.some((c) => c.id === saved)) {
      setStarredId(saved);
    } else if (activeChallenges.length > 0) {
      setStarredId(activeChallenges[0].id);
    }
  }, [user, activeChallenges.length]);

  // Fetch heatmap for starred challenge
  useEffect(() => {
    if (!user || !starredId) { setStarredHeatmap(new Map()); return; }
    (async () => {
      const tasks = await db.getChallengeTasks(starredId);
      const progress = await db.getUserProgressForChallenge(starredId, user.id);
      const taskCount = tasks.length || 1;
      const map = new Map<string, number>();
      for (const entry of progress) {
        if (!entry.completed) continue;
        const current = map.get(entry.date) || 0;
        map.set(entry.date, (current + 1) / taskCount);
      }
      setStarredHeatmap(map);
    })();
  }, [user, starredId]);

  // Fetch max streak
  useEffect(() => {
    if (!user || challenges.length === 0) { setMaxStreak(0); return; }
    (async () => {
      let max = 0;
      for (const c of challenges) {
        const tasks = await db.getChallengeTasks(c.id);
        for (const task of tasks) {
          const progress = await db.getTaskProgress(task.id, user.id);
          max = Math.max(max, calculateStreak(progress, task));
        }
      }
      setMaxStreak(max);
    })();
  }, [user, challenges]);

  // Fetch member counts
  useEffect(() => {
    (async () => {
      const counts: Record<string, number> = {};
      for (const c of activeChallenges) {
        const members = await db.getChallengeMembers(c.id);
        counts[c.id] = members.length;
      }
      setMemberCounts(counts);
    })();
  }, [activeChallenges.length]);

  const handleStar = (challengeId: string) => {
    if (!user) return;
    const newId = starredId === challengeId ? null : challengeId;
    saveStar(user.id, newId);
    setStarredId(newId);
  };

  const starredChallenge = activeChallenges.find((c) => c.id === starredId);

  return (
    <div className="mx-auto max-w-lg">
      {/* Game of Life banner */}
      <div className="relative w-full h-44 overflow-hidden">
        <GameOfLife className="absolute inset-0" seed={user?.id || "default"} />
        <div className="absolute bottom-4 left-5 right-5 flex items-end gap-3">
          <Avatar className="h-12 w-12 border border-border shadow-[0_0_8px_rgba(255,255,255,0.1)]">
            <AvatarImage src={user?.avatar_url || undefined} />
            <AvatarFallback className="text-base">{user?.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg leading-tight">{user?.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] text-muted-foreground">{activeChallenges.length} active</span>
              {maxStreak > 0 && (
                <span className="text-[10px] font-bold text-green-500 drop-shadow-[0_0_4px_rgba(34,197,94,0.6)]">{maxStreak}d</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5">

        {/* Starred heatmap */}
        {starredChallenge && (
          <section className="mb-8">
            <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-2">
              {starredChallenge.title}
            </p>
            <Heatmap data={starredHeatmap} />
          </section>
        )}

        {/* Challenges */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-mono">Challenges</h2>
            <Link
              href="/challenges/new"
              className="flex h-6 w-6 items-center justify-center border border-border hover:bg-muted transition-colors"
            >
              <Plus className="h-3 w-3" />
            </Link>
          </div>
          {activeChallenges.length > 0 ? (
            <div className="space-y-1">
              {activeChallenges.map((c) => {
                const isStarred = starredId === c.id;
                return (
                  <div key={c.id} className="flex items-center border border-border bg-card">
                    <Link
                      href={`/challenges/${c.id}`}
                      className="flex-1 flex items-center justify-between py-2.5 px-3 hover:bg-secondary/50 transition-colors min-w-0"
                    >
                      <span className="text-sm truncate">{c.title}</span>
                      <span className="font-mono text-[9px] text-muted-foreground ml-2 shrink-0">
                        {memberCounts[c.id] || 0}
                      </span>
                    </Link>
                    <button
                      onClick={() => handleStar(c.id)}
                      className="px-2.5 py-2.5 border-l border-border text-muted-foreground hover:text-accent transition-colors"
                    >
                      <Star className={cn("h-3 w-3", isStarred && "fill-accent text-accent")} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No active challenges</p>
          )}
        </section>

        {/* Footer */}
        <div className="pb-8 pt-4 border-t border-border">
          <button
            onClick={signOut}
            className="font-mono text-[9px] text-muted-foreground hover:text-foreground transition-colors"
          >
            sign out
          </button>
        </div>
      </div>
    </div>
  );
}
