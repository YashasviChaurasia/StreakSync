"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth/supabase-provider";
import * as db from "@/lib/db";
import { calculateStreak } from "@/lib/utils/streaks";
import type { Challenge, Task, ProgressEntry, TodayTask, User, Membership } from "@/lib/types";

export function useUserChallenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const c = await db.getUserChallenges(user.id);
    setChallenges(c);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { challenges, refresh };
}

export function useChallengeDetail(challengeId: string) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<(Membership & { user: User })[]>([]);

  const refresh = useCallback(async () => {
    const [c, t, m] = await Promise.all([
      db.getChallenge(challengeId),
      db.getChallengeTasks(challengeId),
      db.getChallengeMembers(challengeId),
    ]);
    if (c) setChallenge(c);
    setTasks(t);
    setMembers(m);
  }, [challengeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { challenge, tasks, members, refresh };
}

export function useCheckIn() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  const toggleComplete = useCallback(
    async (taskId: string) => {
      if (!user) return;
      const existing = await db.getProgress(taskId, user.id, today);
      if (existing) {
        await db.upsertProgress({
          task_id: taskId,
          user_id: user.id,
          date: today,
          completed: !existing.completed,
          count: existing.completed ? 0 : 1,
        });
      } else {
        await db.upsertProgress({
          task_id: taskId,
          user_id: user.id,
          date: today,
          completed: true,
          count: 1,
        });
      }
    },
    [user, today]
  );

  return { toggleComplete };
}

export function useTodayTasks(challengeId: string) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const today = format(new Date(), "yyyy-MM-dd");

  const refresh = useCallback(async () => {
    if (!user) return;
    const challenge = await db.getChallenge(challengeId);
    if (!challenge) return;

    const allTasks = await db.getChallengeTasks(challengeId);
    const todayTasks: TodayTask[] = [];

    for (const task of allTasks) {
      const progress = await db.getProgress(task.id, user.id, today);
      const allProgress = await db.getTaskProgress(task.id, user.id);
      const streak = calculateStreak(allProgress, task);
      todayTasks.push({ task, challenge, progress, streak });
    }

    setTasks(todayTasks);
  }, [user, challengeId, today]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tasks, refresh };
}
