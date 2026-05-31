"use client";

import { cn } from "@/lib/utils";

interface StreakFlameProps {
  count: number;
  size?: "sm" | "md" | "lg";
}

export function StreakFlame({ count, size = "md" }: StreakFlameProps) {
  if (count === 0) return null;

  const sizes = {
    sm: "text-[11px]",
    md: "text-xs",
    lg: "text-sm",
  };

  return (
    <span className={cn("font-bold text-green-600 dark:text-green-400", sizes[size])}>
      {count}d streak
    </span>
  );
}
