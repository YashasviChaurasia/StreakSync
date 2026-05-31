"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/supabase-provider";
import {
  getChallengeByInviteCode,
  joinChallenge,
  markInviteUsed,
  isMember,
  hasPendingRequest,
} from "@/lib/store/local-store";
import { Button } from "@/components/ui/button";
import { differenceInDays } from "date-fns";

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [requested, setRequested] = useState(false);
  const challenge = getChallengeByInviteCode(params.code as string);

  if (!challenge) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Invalid or expired invite link.
        </p>
      </div>
    );
  }

  const alreadyMember = user ? isMember(user.id, challenge.id) : false;
  const alreadyPending = user ? hasPendingRequest(user.id, challenge.id) : false;
  const daysLeft = Math.max(0, differenceInDays(new Date(challenge.end_date), new Date()));
  const isPrivate = challenge.visibility === "private";

  const handleJoin = () => {
    if (!user) return;
    if (isPrivate) {
      // Private: request to join (pending approval by owner)
      joinChallenge(user.id, challenge.id, false);
      markInviteUsed(challenge.id);
      setRequested(true);
    } else {
      // Public: instant join
      joinChallenge(user.id, challenge.id, true);
      router.push(`/challenges/${challenge.id}`);
    }
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs text-center">
        <p className="font-brand text-[9px]">StreakSync</p>
        <h1 className="text-2xl mt-2">{challenge.title}</h1>
        <p className="text-[10px] text-muted-foreground mt-2">
          {daysLeft}d left · {challenge.event_type} · {challenge.visibility}
        </p>

        {alreadyMember ? (
          <Button
            onClick={() => router.push(`/challenges/${challenge.id}`)}
            className="mt-8 w-full h-10 text-xs uppercase tracking-wider"
          >
            Open
          </Button>
        ) : alreadyPending || requested ? (
          <p className="mt-8 text-xs text-muted-foreground">
            Request sent. Waiting for approval.
          </p>
        ) : (
          <Button
            onClick={handleJoin}
            className="mt-8 w-full h-10 text-xs uppercase tracking-wider"
          >
            {isPrivate ? "Request to Join" : "Join"}
          </Button>
        )}
      </div>
    </div>
  );
}
