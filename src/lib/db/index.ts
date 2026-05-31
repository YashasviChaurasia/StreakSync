"use client";

import { createClient } from "@/lib/supabase/client";
import type { Challenge, Membership, Task, ProgressEntry, User } from "@/lib/types";

function getSupabase() {
  const client = createClient();
  if (!client) throw new Error("Supabase not configured");
  return client;
}

// ─── Users ────────────────────────────────────────────

export async function getUser(id: string): Promise<User | null> {
  const { data } = await getSupabase().from("users").select("*").eq("id", id).single();
  return data;
}

export async function getUsers(ids: string[]): Promise<User[]> {
  if (ids.length === 0) return [];
  const { data } = await getSupabase().from("users").select("*").in("id", ids);
  return data || [];
}

export async function updateUserName(userId: string, name: string) {
  await getSupabase().from("users").update({ name }).eq("id", userId);
}

// ─── Challenges ───────────────────────────────────────

export async function getUserChallenges(userId: string): Promise<Challenge[]> {
  const { data: memberships } = await getSupabase()
    .from("memberships")
    .select("challenge_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (!memberships || memberships.length === 0) return [];

  const ids = memberships.map((m: any) => m.challenge_id);
  const { data } = await getSupabase().from("challenges").select("*").in("id", ids);
  return (data || []) as Challenge[];
}

export async function getChallenge(id: string): Promise<Challenge | null> {
  const { data } = await getSupabase().from("challenges").select("*").eq("id", id).single();
  return data as Challenge | null;
}

export async function getChallengeByInviteCode(code: string): Promise<Challenge | null> {
  const { data } = await getSupabase().from("challenges").select("*").eq("invite_code", code).single();
  return data as Challenge | null;
}

export async function createChallenge(challenge: {
  title: string;
  description: string | null;
  owner_id: string;
  start_date: string;
  end_date: string;
  visibility: "public" | "private";
  event_type: "join" | "watch";
}): Promise<Challenge | null> {
  const { data, error } = await getSupabase().from("challenges").insert({
    title: challenge.title,
    description: challenge.description,
    owner_id: challenge.owner_id,
    start_date: challenge.start_date,
    end_date: challenge.end_date,
    visibility: challenge.visibility,
    event_type: challenge.event_type,
  }).select().single();

  return data as Challenge | null;
}

export async function updateChallenge(id: string, updates: Partial<Pick<Challenge, "title" | "description">>) {
  await getSupabase().from("challenges").update(updates).eq("id", id);
}

// ─── Memberships ──────────────────────────────────────

export async function getChallengeMembers(challengeId: string): Promise<(Membership & { user: User })[]> {
  const { data } = await getSupabase()
    .from("memberships")
    .select("*, user:users(*)")
    .eq("challenge_id", challengeId)
    .eq("status", "active");

  return (data || []).map((m: any) => ({ ...m, user: m.user }));
}

export async function getPendingRequests(challengeId: string): Promise<(Membership & { user: User })[]> {
  const { data } = await getSupabase()
    .from("memberships")
    .select("*, user:users(*)")
    .eq("challenge_id", challengeId)
    .eq("status", "pending");

  return (data || []).map((m: any) => ({ ...m, user: m.user }));
}

export async function joinChallenge(userId: string, challengeId: string, autoApprove: boolean): Promise<void> {
  await getSupabase().from("memberships").insert({
    user_id: userId,
    challenge_id: challengeId,
    role: "member",
    status: autoApprove ? "active" : "pending",
  });
}

export async function isMember(userId: string, challengeId: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .eq("status", "active")
    .single();
  return !!data;
}

export async function hasPendingRequest(userId: string, challengeId: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .eq("status", "pending")
    .single();
  return !!data;
}

export async function approveRequest(membershipId: string) {
  await getSupabase().from("memberships").update({ status: "active" }).eq("id", membershipId);
}

export async function denyRequest(membershipId: string) {
  await getSupabase().from("memberships").delete().eq("id", membershipId);
}

// ─── Tasks ────────────────────────────────────────────

export async function getChallengeTasks(challengeId: string): Promise<Task[]> {
  const { data } = await getSupabase()
    .from("tasks")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("sort_order");
  return (data || []) as Task[];
}

export async function createTask(task: Omit<Task, "id" | "created_at">): Promise<Task | null> {
  const { data } = await getSupabase().from("tasks").insert({
    challenge_id: task.challenge_id,
    title: task.title,
    recurrence: task.recurrence,
    recurrence_days: task.recurrence_days,
    target_count: task.target_count,
    sort_order: task.sort_order,
  }).select().single();
  return data as Task | null;
}

export async function deleteTask(taskId: string) {
  await getSupabase().from("progress_entries").delete().eq("task_id", taskId);
  await getSupabase().from("tasks").delete().eq("id", taskId);
}

// ─── Progress ─────────────────────────────────────────

export async function getProgress(taskId: string, userId: string, date: string): Promise<ProgressEntry | null> {
  const { data } = await getSupabase()
    .from("progress_entries")
    .select("*")
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .eq("date", date)
    .single();
  return data as ProgressEntry | null;
}

export async function getTaskProgress(taskId: string, userId: string): Promise<ProgressEntry[]> {
  const { data } = await getSupabase()
    .from("progress_entries")
    .select("*")
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .order("date", { ascending: false });
  return (data || []) as ProgressEntry[];
}

export async function getUserProgressForChallenge(challengeId: string, userId: string): Promise<ProgressEntry[]> {
  // Get task IDs first
  const { data: tasks } = await getSupabase()
    .from("tasks")
    .select("id")
    .eq("challenge_id", challengeId);

  if (!tasks || tasks.length === 0) return [];
  const taskIds = tasks.map((t: any) => t.id);

  const { data } = await getSupabase()
    .from("progress_entries")
    .select("*")
    .in("task_id", taskIds)
    .eq("user_id", userId);

  return (data || []) as ProgressEntry[];
}

export async function upsertProgress(entry: { task_id: string; user_id: string; date: string; completed: boolean; count: number; note?: string | null }) {
  await getSupabase().from("progress_entries").upsert({
    task_id: entry.task_id,
    user_id: entry.user_id,
    date: entry.date,
    completed: entry.completed,
    count: entry.count,
    note: entry.note || null,
  }, { onConflict: "task_id,user_id,date" });
}

// ─── Wall Notes ───────────────────────────────────────

export async function getWallNotes(challengeId: string, date: string): Promise<(any & { user: User })[]> {
  const { data } = await getSupabase()
    .from("wall_notes")
    .select("*, user:users(*)")
    .eq("challenge_id", challengeId)
    .eq("date", date)
    .order("created_at", { ascending: false });

  return (data || []).map((n: any) => ({ ...n, user: n.user }));
}

export async function postWallNote(challengeId: string, userId: string, date: string, text: string) {
  await getSupabase().from("wall_notes").upsert({
    challenge_id: challengeId,
    user_id: userId,
    date,
    text,
  }, { onConflict: "challenge_id,user_id,date" });
}
