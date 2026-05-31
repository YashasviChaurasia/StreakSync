"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  format,
  eachDayOfInterval,
  subMonths,
  startOfMonth,
  endOfMonth,
  getDay,
  isToday,
  isBefore,
  startOfDay,
} from "date-fns";
import { cn } from "@/lib/utils";

interface HeatmapProps {
  data: Map<string, number>;
}

interface MonthBlock {
  label: string;
  weeks: (Date | null)[][];
}

export function Heatmap({ data }: HeatmapProps) {
  const [blinkCell, setBlinkCell] = useState<string | null>(null);
  const [sparkleCell, setSparkleCell] = useState<string | null>(null);

  const monthBlocks = useMemo((): MonthBlock[] => {
    const today = new Date();
    const blocks: MonthBlock[] = [];

    for (let i = 4; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      const start = startOfMonth(monthDate);
      const end = i === 0 ? today : endOfMonth(monthDate);
      const days = eachDayOfInterval({ start, end });

      const firstDay = getDay(start);
      const mondayOffset = firstDay === 0 ? 6 : firstDay - 1;
      const padded: (Date | null)[] = Array(mondayOffset).fill(null);
      padded.push(...days);

      while (padded.length % 7 !== 0) {
        padded.push(null);
      }

      const weeks: (Date | null)[][] = [];
      for (let j = 0; j < padded.length; j += 7) {
        weeks.push(padded.slice(j, j + 7));
      }

      blocks.push({ label: format(monthDate, "MMM"), weeks });
    }

    return blocks;
  }, []);

  // Collect cell keys by type
  const { emptyCells, filledCells } = useMemo(() => {
    const empty: string[] = [];
    const filled: string[] = [];

    for (const block of monthBlocks) {
      for (const week of block.weeks) {
        for (const date of week) {
          if (!date) continue;
          if (isBefore(startOfDay(new Date()), startOfDay(date))) continue;
          const key = format(date, "yyyy-MM-dd");
          const intensity = data.get(key) ?? 0;
          if (intensity === 0) {
            empty.push(key);
          } else {
            filled.push(key);
          }
        }
      }
    }

    return { emptyCells: empty, filledCells: filled };
  }, [monthBlocks, data]);

  // Random blink on empty cells (red flash)
  useEffect(() => {
    if (emptyCells.length === 0) return;
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * emptyCells.length);
      setBlinkCell(emptyCells[idx]);
      setTimeout(() => setBlinkCell(null), 400);
    }, 2000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [emptyCells]);

  // Random sparkle on filled cells (bright green pulse)
  useEffect(() => {
    if (filledCells.length === 0) return;
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * filledCells.length);
      setSparkleCell(filledCells[idx]);
      setTimeout(() => setSparkleCell(null), 600);
    }, 1500 + Math.random() * 1500);
    return () => clearInterval(interval);
  }, [filledCells]);

  const getIntensity = (date: Date | null): number => {
    if (!date) return -1;
    if (isBefore(startOfDay(new Date()), startOfDay(date))) return -2;
    const key = format(date, "yyyy-MM-dd");
    return data.get(key) ?? 0;
  };

  return (
    <div>
      <div className="flex gap-3 items-start">
        {monthBlocks.map((block) => (
          <div key={block.label} className="flex-1 min-w-0">
            <p className="text-[11px] uppercase text-muted-foreground mb-1 tracking-wider">
              {block.label}
            </p>
            <div className="flex gap-[2px]">
              {block.weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[2px] flex-1">
                  {week.map((date, dIdx) => {
                    const intensity = getIntensity(date);
                    const isTodayDate = date && isToday(date);
                    const key = date ? format(date, "yyyy-MM-dd") : `empty-${wIdx}-${dIdx}`;
                    const isBlinking = key === blinkCell;
                    const isSparkling = key === sparkleCell;

                    return (
                      <div
                        key={dIdx}
                        className={cn(
                          "aspect-square transition-all duration-300",
                          intensity === -1 && "bg-transparent",
                          intensity === -2 && "bg-transparent",
                          intensity === 0 && !isBlinking && "bg-muted dark:bg-[#1c1c1c]",
                          intensity === 0 && isBlinking && "bg-red-500/80 dark:bg-red-500/70",
                          intensity > 0 && intensity < 0.34 && !isSparkling && "bg-green-400/60 dark:bg-green-700",
                          intensity >= 0.34 && intensity < 0.67 && !isSparkling && "bg-green-500 dark:bg-green-600",
                          intensity >= 0.67 && intensity < 1 && !isSparkling && "bg-green-600 dark:bg-green-500",
                          intensity >= 1 && !isSparkling && "bg-green-700 dark:bg-green-400",
                          intensity > 0 && isSparkling && "bg-green-300 dark:bg-green-300",
                          isTodayDate && "ring-1 ring-foreground/40"
                        )}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-3 text-[11px] text-muted-foreground">
        <span>less</span>
        <div className="h-2.5 w-2.5 bg-muted dark:bg-[#1c1c1c]" />
        <div className="h-2.5 w-2.5 bg-green-400/60 dark:bg-green-700" />
        <div className="h-2.5 w-2.5 bg-green-500 dark:bg-green-600" />
        <div className="h-2.5 w-2.5 bg-green-600 dark:bg-green-500" />
        <div className="h-2.5 w-2.5 bg-green-700 dark:bg-green-400" />
        <span>more</span>
      </div>
    </div>
  );
}
