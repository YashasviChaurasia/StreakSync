"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { format, subDays, addDays } from "date-fns";
import { useChallengeDetail } from "@/lib/hooks/use-store";
import { useAuth } from "@/lib/auth/supabase-provider";
import {
  createTask,
  updateTask,
  deleteTask,
  getProgress,
  getTaskProgress,
  getUserProgressForChallenge,
  getWallNotes,
  postWallNote,
  getPendingRequests,
  approveRequest,
  denyRequest,
} from "@/lib/store/local-store";
import { calculateStreak } from "@/lib/utils/streaks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TaskRow } from "@/components/checkin/task-row";
import { Heatmap } from "@/components/challenge/heatmap";
import { StreakFlame } from "@/components/shared/streak-flame";
import { ArrowLeft, Plus, Pencil, Link2, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Task, TodayTask } from "@/lib/types";

type Tab = "details" | "participants" | "wall";

export default function ChallengeDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const { challenge, tasks, members, refresh } = useChallengeDetail(params.id as string);
  const [tab, setTab] = useState<Tab>("details");
  const [newTask, setNewTask] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [wallDate, setWallDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [noteText, setNoteText] = useState("");
  const [wallRefresh, setWallRefresh] = useState(0);
  const today = format(new Date(), "yyyy-MM-dd");

  const wallNotes = useMemo(() => {
    if (!challenge) return [];
    return getWallNotes(challenge.id, wallDate);
  }, [challenge, wallDate, wallRefresh]);

  if (!challenge) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Not found</p>
      </div>
    );
  }

  const isOwner = challenge.owner_id === user?.id;
  const isJoinMode = challenge.event_type === "join";

  const todayTasks: TodayTask[] = tasks.map((task) => {
    const progress = user ? getProgress(task.id, user.id, today) || null : null;
    const allProgress = user ? getTaskProgress(task.id, user.id) : [];
    const streak = calculateStreak(allProgress, task);
    return { task, challenge, progress, streak };
  });

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    createTask({
      id: `task-${Date.now()}`,
      challenge_id: challenge.id,
      title: newTask.trim(),
      recurrence: "daily",
      recurrence_days: null,
      target_count: 1,
      sort_order: tasks.length,
      created_at: new Date().toISOString(),
    });
    setNewTask("");
    setShowAddTask(false);
    refresh();
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${challenge.invite_code}`);
    toast.success("Link copied");
  };

  const handlePostNote = () => {
    if (!noteText.trim() || !user) return;
    postWallNote(challenge.id, user.id, wallDate, noteText.trim());
    setNoteText("");
    setWallRefresh((r) => r + 1);
    toast.success("Posted");
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "participants", label: "People" },
    { key: "wall", label: "Wall" },
  ];

  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl truncate">{challenge.title}</h1>
          <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
            {members.length} {members.length === 1 ? "member" : "members"} · {challenge.event_type}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {isOwner && (
            <button
              onClick={() => { setShowEdit(!showEdit); setEditTitle(challenge.title); setEditDesc(challenge.description || ""); }}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={handleCopyInvite} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <Link2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Edit */}
      {showEdit && (
        <div className="mb-6 p-3 border border-border bg-card space-y-2">
          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Name" className="h-8 text-sm border-border" />
          <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" className="text-sm border-border min-h-[60px] resize-none" rows={3} />
          <button onClick={() => setShowEdit(false)} className="font-mono text-[10px] text-accent hover:underline">done</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "pb-2 font-mono text-[10px] uppercase tracking-wider transition-colors border-b-2 -mb-px",
              tab === t.key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Details tab */}
      {tab === "details" && (
        <div>
          {challenge.description && (
            <p className="text-sm text-foreground/80 mb-6">{challenge.description}</p>
          )}

          {/* Tasks */}
          {(isJoinMode || isOwner) && (
            <section>
              <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-2">
                Tasks
              </p>
              <div className="space-y-1">
                {todayTasks.map((item) => (
                  <div key={item.task.id} className="flex items-center gap-1">
                    <div className="flex-1">
                      <TaskRow item={item} onUpdate={refresh} />
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => { deleteTask(item.task.id); refresh(); }}
                        className="text-[9px] text-muted-foreground hover:text-destructive px-1 shrink-0"
                        title="Delete task"
                      >
                        x
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {isOwner && (
                <>
                  {showAddTask ? (
                    <form onSubmit={handleAddTask} className="flex gap-2 mt-2">
                      <Input
                        placeholder="New task..."
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        className="h-8 text-sm flex-1 border-border"
                        autoFocus
                      />
                      <button type="submit" className="font-mono text-[10px] text-accent">add</button>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowAddTask(true)}
                      className="flex items-center gap-1 mt-2 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus className="h-3 w-3" /> add task
                    </button>
                  )}
                </>
              )}
            </section>
          )}
        </div>
      )}

      {/* Participants tab */}
      {tab === "participants" && (
        <div className="space-y-5">
          {/* Pending requests — owner only */}
          {isOwner && (() => {
            const pending = getPendingRequests(challenge.id);
            if (pending.length === 0) return null;
            return (
              <div className="p-3 border border-border bg-card mb-4">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">
                  Pending requests ({pending.length})
                </p>
                <div className="space-y-2">
                  {pending.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5">
                      <span className="text-xs">{p.user.name}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { approveRequest(p.id); refresh(); }}
                          className="text-[9px] text-green-600 hover:underline"
                        >
                          approve
                        </button>
                        <button
                          onClick={() => { denyRequest(p.id); refresh(); }}
                          className="text-[9px] text-muted-foreground hover:underline"
                        >
                          deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {members.map((m) => {
            const memberProgress = getUserProgressForChallenge(challenge.id, m.user_id);
            const taskCount = tasks.length || 1;
            const memberMap = new Map<string, number>();
            for (const entry of memberProgress) {
              if (!entry.completed) continue;
              const current = memberMap.get(entry.date) || 0;
              memberMap.set(entry.date, (current + 1) / taskCount);
            }
            const memberStreak = tasks.reduce((max, task) => {
              const prog = getTaskProgress(task.id, m.user_id);
              return Math.max(max, calculateStreak(prog, task));
            }, 0);

            return (
              <div key={m.id} className="p-3 border border-border bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={m.user.avatar_url || undefined} />
                    <AvatarFallback className="text-[9px]">{m.user.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium flex-1">{m.user.name}</span>
                  <StreakFlame count={memberStreak} size="sm" />
                  {m.role === "owner" && (
                    <span className="font-mono text-[8px] text-muted-foreground">owner</span>
                  )}
                </div>
                <Heatmap data={memberMap} />
              </div>
            );
          })}
        </div>
      )}

      {/* Wall tab */}
      {tab === "wall" && (
        <div>
          {/* Date navigator */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setWallDate(format(subDays(new Date(wallDate), 1), "yyyy-MM-dd"))}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-[10px] text-muted-foreground">
              {wallDate === today ? "today" : format(new Date(wallDate), "MMM d, yyyy")}
            </span>
            <button
              onClick={() => {
                const next = format(addDays(new Date(wallDate), 1), "yyyy-MM-dd");
                if (next <= today) setWallDate(next);
              }}
              disabled={wallDate >= today}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Post input (only for today) */}
          {wallDate === today && (
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Write something..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePostNote()}
                className="h-8 text-sm flex-1 border-border"
              />
              <button
                onClick={handlePostNote}
                disabled={!noteText.trim()}
                className="font-mono text-[10px] text-accent disabled:text-muted-foreground"
              >
                post
              </button>
            </div>
          )}

          {/* Notes */}
          {wallNotes.length > 0 ? (
            <div className="space-y-3">
              {wallNotes.map((n) => (
                <div key={n.id} className="py-2.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={n.user?.avatar_url || undefined} />
                      <AvatarFallback className="text-[7px]">{n.user?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] font-medium">{n.user?.name}</span>
                  </div>
                  <p className="text-xs text-foreground/80 pl-6">{n.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-6 text-center">
              {wallDate === today ? "No posts today" : "No posts on this day"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
