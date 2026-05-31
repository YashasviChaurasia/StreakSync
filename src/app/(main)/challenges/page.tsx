"use client";

import { useUserChallenges } from "@/lib/hooks/use-store";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function ChallengesPage() {
  const { challenges } = useUserChallenges();
  const today = new Date().toISOString().split("T")[0];
  const active = challenges.filter((c) => c.end_date >= today);
  const past = challenges.filter((c) => c.end_date < today);

  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="font-brand text-[10px]">StreakSync</Link>
          <h1 className="text-xl mt-0.5">Challenges</h1>
        </div>
        <Link href="/challenges/new" className="flex h-6 w-6 items-center justify-center border border-border hover:bg-muted transition-colors">
          <Plus className="h-3 w-3" />
        </Link>
      </div>

      {active.length > 0 && (
        <div className="space-y-1 mb-8">
          {active.map((c) => (
            <Link key={c.id} href={`/challenges/${c.id}`} className="flex items-center justify-between py-2.5 px-3 border border-border bg-card hover:bg-secondary/50 transition-colors">
              <span className="text-sm truncate">{c.title}</span>
            </Link>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">Completed</p>
          <div className="space-y-1 opacity-60">
            {past.map((c) => (
              <Link key={c.id} href={`/challenges/${c.id}`} className="flex items-center py-2.5 px-3 border border-border bg-card">
                <span className="text-sm truncate">{c.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {challenges.length === 0 && (
        <p className="text-sm text-muted-foreground py-8">No challenges yet</p>
      )}
    </div>
  );
}
