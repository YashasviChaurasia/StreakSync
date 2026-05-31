import { format, subDays, isWeekend, getDay } from "date-fns";
import type { ProgressEntry, Task } from "@/lib/types";

function isApplicableDay(date: Date, task: Task): boolean {
  const day = getDay(date); // 0=Sun, 6=Sat
  switch (task.recurrence) {
    case "daily":
      return true;
    case "weekdays":
      return !isWeekend(date);
    case "custom":
      return task.recurrence_days?.includes(day) ?? true;
    default:
      return true;
  }
}

export function calculateStreak(
  progressEntries: ProgressEntry[],
  task: Task
): number {
  const today = new Date();
  let streak = 0;
  let currentDate = today;

  // Sort entries by date descending for quick lookup
  const completedDates = new Set(
    progressEntries
      .filter((p) => p.completed)
      .map((p) => p.date)
  );

  for (let i = 0; i < 365; i++) {
    const dateStr = format(currentDate, "yyyy-MM-dd");

    if (!isApplicableDay(currentDate, task)) {
      currentDate = subDays(currentDate, 1);
      continue;
    }

    if (completedDates.has(dateStr)) {
      streak++;
    } else {
      // Today is allowed to be incomplete (streak doesn't break until day ends)
      if (i === 0) {
        currentDate = subDays(currentDate, 1);
        continue;
      }
      break;
    }

    currentDate = subDays(currentDate, 1);
  }

  return streak;
}

export function calculateConsistency(
  progressEntries: ProgressEntry[],
  task: Task,
  startDate: Date,
  endDate: Date
): number {
  let applicableDays = 0;
  let completedDays = 0;
  const completedDates = new Set(
    progressEntries.filter((p) => p.completed).map((p) => p.date)
  );

  const today = new Date();
  const effectiveEnd = endDate > today ? today : endDate;
  let current = new Date(startDate);

  while (current <= effectiveEnd) {
    if (isApplicableDay(current, task)) {
      applicableDays++;
      if (completedDates.has(format(current, "yyyy-MM-dd"))) {
        completedDays++;
      }
    }
    current = new Date(current.getTime() + 86400000);
  }

  return applicableDays === 0 ? 0 : Math.round((completedDays / applicableDays) * 100);
}
