"use client";

import type { Challenge, Membership, Task, ProgressEntry, User } from "@/lib/types";
import { SEED_CHALLENGES, SEED_MEMBERSHIPS, SEED_TASKS, SEED_PROGRESS } from "./seed-data";
// Users are stored in the store data now (synced from auth)
const USERS_KEY = "streaksync_users";

const STORE_KEY = "streaksync_store_v2";

interface StoreData {
  challenges: Challenge[];
  memberships: Membership[];
  tasks: Task[];
  progress: ProgressEntry[];
}

function getStore(): StoreData {
  if (typeof window === "undefined") {
    return { challenges: SEED_CHALLENGES, memberships: SEED_MEMBERSHIPS, tasks: SEED_TASKS, progress: SEED_PROGRESS };
  }
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) {
    const initial: StoreData = {
      challenges: SEED_CHALLENGES,
      memberships: SEED_MEMBERSHIPS,
      tasks: SEED_TASKS,
      progress: SEED_PROGRESS,
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(raw);
}

function saveStore(data: StoreData) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

// Users — stored locally, synced when encountered
function getUsersStore(): User[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveUsersStore(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function registerUser(user: User) {
  const users = getUsersStore();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  saveUsersStore(users);
}

export function getUsers(): User[] {
  return getUsersStore();
}

export function getUser(id: string): User | undefined {
  return getUsersStore().find((u) => u.id === id);
}

// Challenges
export function getChallenges(): Challenge[] {
  return getStore().challenges;
}

export function getChallenge(id: string): Challenge | undefined {
  return getStore().challenges.find((c) => c.id === id);
}

export function getUserChallenges(userId: string): Challenge[] {
  const store = getStore();
  const memberChallengeIds = store.memberships
    .filter((m) => m.user_id === userId)
    .map((m) => m.challenge_id);
  return store.challenges.filter((c) => memberChallengeIds.includes(c.id));
}

export function getPublicChallenges(): Challenge[] {
  return getStore().challenges.filter((c) => c.visibility === "public");
}

export function createChallenge(challenge: Challenge): Challenge {
  const store = getStore();
  store.challenges.push(challenge);
  store.memberships.push({
    id: `mem-${Date.now()}`,
    user_id: challenge.owner_id,
    challenge_id: challenge.id,
    role: "owner",
    status: "active",
    joined_at: new Date().toISOString(),
  });
  saveStore(store);
  return challenge;
}

export function getChallengeByInviteCode(code: string): Challenge | undefined {
  return getStore().challenges.find((c) => c.invite_code === code);
}

export function markInviteUsed(challengeId: string) {
  const store = getStore();
  const idx = store.challenges.findIndex((c) => c.id === challengeId);
  if (idx >= 0) {
    store.challenges[idx].invite_used = true;
    // Generate a new invite code for next use
    store.challenges[idx].invite_code = Math.random().toString(36).slice(2, 8);
    saveStore(store);
  }
}

// Memberships
export function getChallengeMembers(challengeId: string): (Membership & { user: User })[] {
  const store = getStore();
  return store.memberships
    .filter((m) => m.challenge_id === challengeId && m.status === "active")
    .map((m) => ({ ...m, user: getUser(m.user_id)! }))
    .filter((m) => m.user);
}

export function getPendingRequests(challengeId: string): (Membership & { user: User })[] {
  const store = getStore();
  return store.memberships
    .filter((m) => m.challenge_id === challengeId && m.status === "pending")
    .map((m) => ({ ...m, user: getUser(m.user_id)! }))
    .filter((m) => m.user);
}

export function approveRequest(membershipId: string) {
  const store = getStore();
  const idx = store.memberships.findIndex((m) => m.id === membershipId);
  if (idx >= 0) {
    store.memberships[idx].status = "active";
    saveStore(store);
  }
}

export function denyRequest(membershipId: string) {
  const store = getStore();
  store.memberships = store.memberships.filter((m) => m.id !== membershipId);
  saveStore(store);
}

export function isMember(userId: string, challengeId: string): boolean {
  return getStore().memberships.some(
    (m) => m.user_id === userId && m.challenge_id === challengeId && m.status === "active"
  );
}

export function hasPendingRequest(userId: string, challengeId: string): boolean {
  return getStore().memberships.some(
    (m) => m.user_id === userId && m.challenge_id === challengeId && m.status === "pending"
  );
}

export function joinChallenge(userId: string, challengeId: string, autoApprove: boolean = true): Membership {
  const store = getStore();
  const existing = store.memberships.find(
    (m) => m.user_id === userId && m.challenge_id === challengeId
  );
  if (existing) return existing;

  const membership: Membership = {
    id: `mem-${Date.now()}`,
    user_id: userId,
    challenge_id: challengeId,
    role: "member",
    status: autoApprove ? "active" : "pending",
    joined_at: new Date().toISOString(),
  };
  store.memberships.push(membership);
  saveStore(store);
  return membership;
}

// Tasks
export function getChallengeTasks(challengeId: string): Task[] {
  return getStore().tasks
    .filter((t) => t.challenge_id === challengeId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function createTask(task: Task): Task {
  const store = getStore();
  store.tasks.push(task);
  saveStore(store);
  return task;
}

// Progress
export function getProgress(taskId: string, userId: string, date: string): ProgressEntry | undefined {
  return getStore().progress.find(
    (p) => p.task_id === taskId && p.user_id === userId && p.date === date
  );
}

export function getTaskProgress(taskId: string, userId: string): ProgressEntry[] {
  return getStore().progress
    .filter((p) => p.task_id === taskId && p.user_id === userId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getUserProgressForChallenge(challengeId: string, userId: string): ProgressEntry[] {
  const store = getStore();
  const taskIds = store.tasks.filter((t) => t.challenge_id === challengeId).map((t) => t.id);
  return store.progress.filter((p) => taskIds.includes(p.task_id) && p.user_id === userId);
}

export function getAllProgressForChallenge(challengeId: string): ProgressEntry[] {
  const store = getStore();
  const taskIds = store.tasks.filter((t) => t.challenge_id === challengeId).map((t) => t.id);
  return store.progress.filter((p) => taskIds.includes(p.task_id));
}

export function upsertProgress(entry: ProgressEntry): ProgressEntry {
  const store = getStore();
  const idx = store.progress.findIndex(
    (p) => p.task_id === entry.task_id && p.user_id === entry.user_id && p.date === entry.date
  );
  if (idx >= 0) {
    store.progress[idx] = entry;
  } else {
    store.progress.push(entry);
  }
  saveStore(store);
  return entry;
}

// User preferences (banner, starred)
const PREFS_KEY = "streaksync_prefs";

interface UserPrefs {
  banner: string; // gradient class or image url
  starred_challenge: string | null;
}

const DEFAULT_BANNERS = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=200&fit=crop",
  "https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=800&h=200&fit=crop",
  "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800&h=200&fit=crop",
  "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&h=200&fit=crop",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=200&fit=crop",
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&h=200&fit=crop",
];

export { DEFAULT_BANNERS };

function getUserPrefs(userId: string): UserPrefs {
  if (typeof window === "undefined") return { banner: DEFAULT_BANNERS[0], starred_challenge: null };
  const data = localStorage.getItem(PREFS_KEY);
  const map = data ? JSON.parse(data) : {};
  return map[userId] || { banner: DEFAULT_BANNERS[0], starred_challenge: null };
}

function setUserPrefs(userId: string, prefs: Partial<UserPrefs>) {
  const data = localStorage.getItem(PREFS_KEY);
  const map = data ? JSON.parse(data) : {};
  map[userId] = { ...getUserPrefs(userId), ...prefs };
  localStorage.setItem(PREFS_KEY, JSON.stringify(map));
}

export function getUserBanner(userId: string): string {
  return getUserPrefs(userId).banner;
}

export function setUserBanner(userId: string, banner: string) {
  setUserPrefs(userId, { banner });
}

// Starred challenge (per user)
const STARRED_KEY = "streaksync_starred";

export function getStarredChallengeId(userId: string): string | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(STARRED_KEY);
  if (!data) return null;
  const map = JSON.parse(data);
  return map[userId] || null;
}

export function setStarredChallenge(userId: string, challengeId: string | null) {
  const data = localStorage.getItem(STARRED_KEY);
  const map = data ? JSON.parse(data) : {};
  if (challengeId) {
    map[userId] = challengeId;
  } else {
    delete map[userId];
  }
  localStorage.setItem(STARRED_KEY, JSON.stringify(map));
}

// Wall notes (per challenge, per user, per date)
const WALL_KEY = "streaksync_wall";

export interface WallNote {
  id: string;
  challenge_id: string;
  user_id: string;
  date: string;
  text: string;
  created_at: string;
}

function getWallStore(): WallNote[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(WALL_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveWallStore(notes: WallNote[]) {
  localStorage.setItem(WALL_KEY, JSON.stringify(notes));
}

export function getWallNotes(challengeId: string, date: string): (WallNote & { user: User | undefined })[] {
  const notes = getWallStore().filter((n) => n.challenge_id === challengeId && n.date === date);
  return notes
    .map((n) => ({ ...n, user: getUser(n.user_id) }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function postWallNote(challengeId: string, userId: string, date: string, text: string): WallNote {
  const notes = getWallStore();
  // One note per user per day per challenge — update if exists
  const idx = notes.findIndex((n) => n.challenge_id === challengeId && n.user_id === userId && n.date === date);
  const note: WallNote = {
    id: idx >= 0 ? notes[idx].id : `wall-${Date.now()}`,
    challenge_id: challengeId,
    user_id: userId,
    date,
    text,
    created_at: new Date().toISOString(),
  };
  if (idx >= 0) {
    notes[idx] = note;
  } else {
    notes.push(note);
  }
  saveWallStore(notes);
  return note;
}

export function resetStore() {
  localStorage.removeItem(STORE_KEY);
  localStorage.removeItem(STARRED_KEY);
  localStorage.removeItem(PREFS_KEY);
  localStorage.removeItem(WALL_KEY);
}
