"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth/supabase-provider";
import * as store from "@/lib/store/local-store";
import { calculateStreak } from "@/lib/utils/streaks";
import type { Challenge, Task, ProgressEntry, TodayTask } from "@/lib/types";

export function useUserChallenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    if (user) {
      setChallenges(store.getUserChallenges(user.id));
    }
  }, [user]);

  const refresh = useCallback(() => {
    if (user) setChallenges(store.getUserChallenges(user.id));
  }, [user]);

  return { challenges, refresh };
}

export function useTodayTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const today = format(new Date(), "yyyy-MM-dd");

  const refresh = useCallback(() => {
    if (!user) return;
    const challenges = store.getUserChallenges(user.id);
    const todayTasks: TodayTask[] = [];

    for (const challenge of challenges) {
      // Only active challenges
      if (challenge.start_date > today || challenge.end_date < today) continue;

      const tasks = store.getChallengeTasks(challenge.id);
      for (const task of tasks) {
        const progress = store.getProgress(task.id, user.id, today);
        const allProgress = store.getTaskProgress(task.id, user.id);
        const streak = calculateStreak(allProgress, task);
        todayTasks.push({ task, challenge, progress: progress || null, streak });
      }
    }

    setTasks(todayTasks);
  }, [user, today]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tasks, refresh };
}

export function useChallengeDetail(challengeId: string) {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ReturnType<typeof store.getChallengeMembers>>([]);

  const refresh = useCallback(() => {
    const c = store.getChallenge(challengeId);
    if (c) setChallenge(c);
    setTasks(store.getChallengeTasks(challengeId));
    setMembers(store.getChallengeMembers(challengeId));
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
    (taskId: string) => {
      if (!user) return;
      const existing = store.getProgress(taskId, user.id, today);
      const entry: ProgressEntry = existing
        ? { ...existing, completed: !existing.completed, count: existing.completed ? 0 : 1 }
        : {
            id: `prog-${Date.now()}`,
            task_id: taskId,
            user_id: user.id,
            date: today,
            completed: true,
            count: 1,
            note: null,
            created_at: new Date().toISOString(),
          };
      store.upsertProgress(entry);
      return entry;
    },
    [user, today]
  );

  const incrementCount = useCallback(
    (taskId: string, delta: number) => {
      if (!user) return;
      const existing = store.getProgress(taskId, user.id, today);
      const currentCount = existing?.count ?? 0;
      const newCount = Math.max(0, currentCount + delta);
      const entry: ProgressEntry = existing
        ? { ...existing, count: newCount, completed: newCount > 0 }
        : {
            id: `prog-${Date.now()}`,
            task_id: taskId,
            user_id: user.id,
            date: today,
            completed: newCount > 0,
            count: newCount,
            note: null,
            created_at: new Date().toISOString(),
          };
      store.upsertProgress(entry);
      return entry;
    },
    [user, today]
  );

  return { toggleComplete, incrementCount };
}
