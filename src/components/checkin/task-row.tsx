"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { StreakFlame } from "@/components/shared/streak-flame";
import { injectCell } from "@/components/shared/game-of-life";
import type { TodayTask } from "@/lib/types";
import { useCheckIn } from "@/lib/hooks/use-store";

interface TaskRowProps {
  item: TodayTask;
  onUpdate: () => void;
  showChallenge?: boolean;
}

export function TaskRow({ item, onUpdate, showChallenge = false }: TaskRowProps) {
  const { task, challenge, progress, streak } = item;
  const { toggleComplete } = useCheckIn();

  const isCompleted = progress?.completed ?? false;

  const handleToggle = async () => {
    if (!isCompleted) injectCell();
    await toggleComplete(task.id);
    onUpdate();
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3 px-4 border transition-all",
        isCompleted
          ? "border-green-600/30 bg-green-950/5 dark:border-green-500/20 dark:bg-green-950/10"
          : "border-border bg-card"
      )}
    >
      <button
        onClick={handleToggle}
        className={cn(
          "flex h-[22px] w-[22px] shrink-0 items-center justify-center border transition-all",
          isCompleted
            ? "border-green-500 bg-green-600 text-white"
            : "border-foreground/30"
        )}
      >
        {isCompleted && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn(
          "text-sm truncate",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {task.title}
        </p>
        {showChallenge && (
          <p className="font-mono text-[11px] text-muted-foreground truncate">
            {challenge.title}
          </p>
        )}
      </div>

      <StreakFlame count={streak} size="sm" />
    </div>
  );
}
