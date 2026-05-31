"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { format, subDays, addDays } from "date-fns";
import { useChallengeDetail, useCheckIn } from "@/lib/hooks/use-store";
import { useAuth } from "@/lib/auth/supabase-provider";
import * as db from "@/lib/db";
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
  const { toggleComplete } = useCheckIn();
  const [tab, setTab] = useState<Tab>("details");
  const [newTask, setNewTask] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [wallDate, setWallDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [noteText, setNoteText] = useState("");
  const [wallNotes, setWallNotes] = useState<any[]>([]);
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);
  const [myHeatmap, setMyHeatmap] = useState<Map<string, number>>(new Map());
  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch today's tasks with progress
  const refreshTasks = useCallback(async () => {
    if (!user || !challenge) return;
    const items: TodayTask[] = [];
    for (const task of tasks) {
      const progress = await db.getProgress(task.id, user.id, today);
      const allProgress = await db.getTaskProgress(task.id, user.id);
      const streak = calculateStreak(allProgress, task);
      items.push({ task, challenge, progress, streak });
    }
    setTodayTasks(items);
  }, [user, challenge, tasks, today]);

  useEffect(() => { refreshTasks(); }, [refreshTasks]);

  // Fetch heatmap
  useEffect(() => {
    if (!user || !challenge) return;
    (async () => {
      const progress = await db.getUserProgressForChallenge(challenge.id, user.id);
      const taskCount = tasks.length || 1;
      const map = new Map<string, number>();
      for (const entry of progress) {
        if (!entry.completed) continue;
        const current = map.get(entry.date) || 0;
        map.set(entry.date, (current + 1) / taskCount);
      }
      setMyHeatmap(map);
    })();
  }, [user, challenge, tasks]);

  // Fetch wall notes
  useEffect(() => {
    if (!challenge) return;
    (async () => {
      const notes = await db.getWallNotes(challenge.id, wallDate);
      setWallNotes(notes);
    })();
  }, [challenge, wallDate]);

  if (!challenge) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const isOwner = challenge.owner_id === user?.id;
  const isJoinMode = challenge.event_type === "join";

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    await db.createTask({
      challenge_id: challenge.id,
      title: newTask.trim(),
      recurrence: "daily",
      recurrence_days: null,
      target_count: 1,
      sort_order: tasks.length,
    });
    setNewTask("");
    setShowAddTask(false);
    refresh();
  };

  const handleDeleteTask = async (taskId: string) => {
    await db.deleteTask(taskId);
    refresh();
  };

  const handleToggle = async (taskId: string) => {
    await toggleComplete(taskId);
    refreshTasks();
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${challenge.invite_code}`);
    toast.success("Link copied");
  };

  const handlePostNote = async () => {
    if (!noteText.trim() || !user) return;
    await db.postWallNote(challenge.id, user.id, wallDate, noteText.trim());
    setNoteText("");
    const notes = await db.getWallNotes(challenge.id, wallDate);
    setWallNotes(notes);
    toast.success("Posted");
  };

  const handleSaveEdit = async () => {
    await db.updateChallenge(challenge.id, { title: editTitle, description: editDesc || null });
    setShowEdit(false);
    refresh();
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
          {challenge.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{challenge.description}</p>
          )}
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
          <button onClick={handleSaveEdit} className="text-[9px] text-green-500 hover:underline">save</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "pb-2 text-[10px] uppercase tracking-wider transition-colors border-b-2 -mb-px",
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
          {/* Heatmap */}
          <section className="mb-6">
            <Heatmap data={myHeatmap} />
          </section>

          {/* Tasks */}
          {(isJoinMode || isOwner) && (
            <section>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">Tasks</p>
              <div className="space-y-1">
                {todayTasks.map((item) => (
                  <div key={item.task.id} className="flex items-center gap-1">
                    <div className="flex-1">
                      <TaskRow item={item} onUpdate={refreshTasks} />
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => handleDeleteTask(item.task.id)}
                        className="text-[9px] text-muted-foreground hover:text-destructive px-1 shrink-0"
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
                      <Input placeholder="New task..." value={newTask} onChange={(e) => setNewTask(e.target.value)} className="h-8 text-sm flex-1 border-border" autoFocus />
                      <button type="submit" className="text-[10px] text-green-500">add</button>
                    </form>
                  ) : (
                    <button onClick={() => setShowAddTask(true)} className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
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
        <ParticipantsTab challengeId={challenge.id} members={members} tasks={tasks} isOwner={isOwner} onRefresh={refresh} />
      )}

      {/* Wall tab */}
      {tab === "wall" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setWallDate(format(subDays(new Date(wallDate), 1), "yyyy-MM-dd"))} className="p-1 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[10px] text-muted-foreground">
              {wallDate === today ? "today" : format(new Date(wallDate), "MMM d, yyyy")}
            </span>
            <button
              onClick={() => { const next = format(addDays(new Date(wallDate), 1), "yyyy-MM-dd"); if (next <= today) setWallDate(next); }}
              disabled={wallDate >= today}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {wallDate === today && (
            <div className="flex gap-2 mb-4">
              <Input placeholder="Write something..." value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePostNote()} className="h-8 text-sm flex-1 border-border" />
              <button onClick={handlePostNote} disabled={!noteText.trim()} className="text-[10px] text-green-500 disabled:text-muted-foreground">post</button>
            </div>
          )}

          {wallNotes.length > 0 ? (
            <div className="space-y-3">
              {wallNotes.map((n: any) => (
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

// Separate component for participants to handle async data
function ParticipantsTab({ challengeId, members, tasks, isOwner, onRefresh }: {
  challengeId: string;
  members: any[];
  tasks: Task[];
  isOwner: boolean;
  onRefresh: () => void;
}) {
  const [pending, setPending] = useState<any[]>([]);
  const [memberHeatmaps, setMemberHeatmaps] = useState<Map<string, Map<string, number>>>(new Map());
  const [memberStreaks, setMemberStreaks] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (isOwner) {
      db.getPendingRequests(challengeId).then(setPending);
    }
  }, [challengeId, isOwner]);

  useEffect(() => {
    (async () => {
      const heatmaps = new Map<string, Map<string, number>>();
      const streaks = new Map<string, number>();
      const taskCount = tasks.length || 1;

      for (const m of members) {
        const progress = await db.getUserProgressForChallenge(challengeId, m.user_id);
        const map = new Map<string, number>();
        for (const entry of progress) {
          if (!entry.completed) continue;
          const current = map.get(entry.date) || 0;
          map.set(entry.date, (current + 1) / taskCount);
        }
        heatmaps.set(m.user_id, map);

        let maxStreak = 0;
        for (const task of tasks) {
          const taskProg = await db.getTaskProgress(task.id, m.user_id);
          maxStreak = Math.max(maxStreak, calculateStreak(taskProg, task));
        }
        streaks.set(m.user_id, maxStreak);
      }

      setMemberHeatmaps(heatmaps);
      setMemberStreaks(streaks);
    })();
  }, [challengeId, members, tasks]);

  const handleApprove = async (id: string) => {
    await db.approveRequest(id);
    setPending((p) => p.filter((r) => r.id !== id));
    onRefresh();
  };

  const handleDeny = async (id: string) => {
    await db.denyRequest(id);
    setPending((p) => p.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-5">
      {isOwner && pending.length > 0 && (
        <div className="p-3 border border-border bg-card mb-4">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">
            Pending ({pending.length})
          </p>
          <div className="space-y-2">
            {pending.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-1.5">
                <span className="text-xs">{p.user?.name}</span>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(p.id)} className="text-[9px] text-green-500 hover:underline">approve</button>
                  <button onClick={() => handleDeny(p.id)} className="text-[9px] text-muted-foreground hover:underline">deny</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {members.map((m: any) => (
        <div key={m.id} className="p-3 border border-border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <Avatar className="h-6 w-6">
              <AvatarImage src={m.user?.avatar_url || undefined} />
              <AvatarFallback className="text-[9px]">{m.user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium flex-1">{m.user?.name}</span>
            <StreakFlame count={memberStreaks.get(m.user_id) || 0} size="sm" />
            {m.role === "owner" && <span className="text-[8px] text-muted-foreground">owner</span>}
          </div>
          <Heatmap data={memberHeatmaps.get(m.user_id) || new Map()} />
        </div>
      ))}
    </div>
  );
}
