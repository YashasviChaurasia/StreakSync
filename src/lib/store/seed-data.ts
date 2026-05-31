import type { Challenge, Membership, Task, ProgressEntry } from "@/lib/types";
import { format, subDays } from "date-fns";

const today = format(new Date(), "yyyy-MM-dd");
const startDate = format(subDays(new Date(), 14), "yyyy-MM-dd");
const endDate = format(new Date(Date.now() + 14 * 86400000), "yyyy-MM-dd");

export const SEED_CHALLENGES: Challenge[] = [
  {
    id: "challenge-1",
    title: "21 Day Gym",
    description: "Hit the gym every single day",
    owner_id: "user-1",
    start_date: startDate,
    end_date: endDate,
    visibility: "private",
    event_type: "join",
    theme: { gradient: "from-slate-400 to-slate-600" },
    invite_code: "gym21x",
    invite_used: false,
    created_at: startDate + "T00:00:00Z",
  },
  {
    id: "challenge-2",
    title: "100 Days of Code",
    description: "Code every day for 100 days",
    owner_id: "user-1",
    start_date: startDate,
    end_date: format(new Date(Date.now() + 86 * 86400000), "yyyy-MM-dd"),
    visibility: "public",
    event_type: "join",
    theme: { gradient: "from-blue-300 to-blue-500" },
    invite_code: "code100",
    invite_used: false,
    created_at: startDate + "T00:00:00Z",
  },
];

export const SEED_MEMBERSHIPS: Membership[] = [
  { id: "mem-1", user_id: "user-1", challenge_id: "challenge-1", role: "owner", status: "active", joined_at: startDate + "T00:00:00Z" },
  { id: "mem-2", user_id: "user-2", challenge_id: "challenge-1", role: "member", status: "active", joined_at: startDate + "T01:00:00Z" },
  { id: "mem-3", user_id: "user-3", challenge_id: "challenge-1", role: "member", status: "active", joined_at: startDate + "T02:00:00Z" },
  { id: "mem-4", user_id: "user-1", challenge_id: "challenge-2", role: "owner", status: "active", joined_at: startDate + "T00:00:00Z" },
  { id: "mem-5", user_id: "user-2", challenge_id: "challenge-2", role: "member", status: "active", joined_at: startDate + "T01:00:00Z" },
];

export const SEED_TASKS: Task[] = [
  { id: "task-1", challenge_id: "challenge-1", title: "Workout", recurrence: "daily", recurrence_days: null, target_count: 1, sort_order: 0, created_at: startDate + "T00:00:00Z" },
  { id: "task-2", challenge_id: "challenge-1", title: "Drink 3L water", recurrence: "daily", recurrence_days: null, target_count: 3, sort_order: 1, created_at: startDate + "T00:00:00Z" },
  { id: "task-3", challenge_id: "challenge-2", title: "Code 1 hour", recurrence: "daily", recurrence_days: null, target_count: 1, sort_order: 0, created_at: startDate + "T00:00:00Z" },
  { id: "task-4", challenge_id: "challenge-2", title: "Solve 2 DSA problems", recurrence: "weekdays", recurrence_days: null, target_count: 2, sort_order: 1, created_at: startDate + "T00:00:00Z" },
];

function generatePastProgress(): ProgressEntry[] {
  const entries: ProgressEntry[] = [];
  for (let i = 1; i <= 14; i++) {
    const date = format(subDays(new Date(), i), "yyyy-MM-dd");
    // User 1 consistent
    entries.push({
      id: `prog-u1-t1-${i}`,
      task_id: "task-1",
      user_id: "user-1",
      date,
      completed: true,
      count: 1,
      note: null,
      created_at: date + "T08:00:00Z",
    });
    entries.push({
      id: `prog-u1-t3-${i}`,
      task_id: "task-3",
      user_id: "user-1",
      date,
      completed: true,
      count: 1,
      note: null,
      created_at: date + "T20:00:00Z",
    });
    // User 2 misses some days
    if (i % 3 !== 0) {
      entries.push({
        id: `prog-u2-t1-${i}`,
        task_id: "task-1",
        user_id: "user-2",
        date,
        completed: true,
        count: 1,
        note: null,
        created_at: date + "T09:00:00Z",
      });
    }
    // User 3 sporadic
    if (i % 2 === 0) {
      entries.push({
        id: `prog-u3-t1-${i}`,
        task_id: "task-1",
        user_id: "user-3",
        date,
        completed: true,
        count: 1,
        note: null,
        created_at: date + "T10:00:00Z",
      });
    }
  }
  return entries;
}

export const SEED_PROGRESS: ProgressEntry[] = generatePastProgress();
