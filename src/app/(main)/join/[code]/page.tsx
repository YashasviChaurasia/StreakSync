"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/supabase-provider";
import * as db from "@/lib/db";
import { Button } from "@/components/ui/button";
import { differenceInDays } from "date-fns";
import type { Challenge } from "@/lib/types";

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "member" | "pending" | "requested">("idle");

  useEffect(() => {
    (async () => {
      const c = await db.getChallengeByInviteCode(params.code as string);
      setChallenge(c);
      if (c && user) {
        const member = await db.isMember(user.id, c.id);
        if (member) { setStatus("member"); }
        else {
          const pending = await db.hasPendingRequest(user.id, c.id);
          if (pending) setStatus("pending");
        }
      }
      setLoading(false);
    })();
  }, [params.code, user]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-muted-foreground">Invalid or expired invite link.</p>
      </div>
    );
  }

  const daysLeft = Math.max(0, differenceInDays(new Date(challenge.end_date), new Date()));
  const isPrivate = challenge.visibility === "private";

  const handleJoin = async () => {
    if (!user) return;
    await db.joinChallenge(user.id, challenge.id, !isPrivate);
    if (isPrivate) {
      setStatus("requested");
    } else {
      router.push(`/challenges/${challenge.id}`);
    }
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs text-center">
        <p className="font-brand text-[11px]">StreakSync</p>
        <h1 className="text-2xl mt-2">{challenge.title}</h1>
        <p className="text-xs text-muted-foreground mt-2">
          {daysLeft}d left · {challenge.event_type} · {challenge.visibility}
        </p>

        {status === "member" ? (
          <Button onClick={() => router.push(`/challenges/${challenge.id}`)} className="mt-8 w-full h-10 text-xs uppercase tracking-wider">
            Open
          </Button>
        ) : status === "pending" || status === "requested" ? (
          <div className="mt-8 space-y-3">
            <p className="text-xs text-muted-foreground">Request sent. Waiting for approval.</p>
            <Button variant="outline" onClick={() => router.push("/")} className="w-full h-9 text-xs uppercase tracking-wider">
              Back to dashboard
            </Button>
          </div>
        ) : (
          <Button onClick={handleJoin} className="mt-8 w-full h-10 text-xs uppercase tracking-wider">
            {isPrivate ? "Request to Join" : "Join"}
          </Button>
        )}
      </div>
    </div>
  );
}
