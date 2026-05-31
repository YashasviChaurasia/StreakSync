export interface User {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  start_date: string;
  end_date: string;
  visibility: "public" | "private";
  event_type: "watch" | "join";
  theme: { gradient: string };
  invite_code: string;
  invite_used: boolean; // one-time link for private
  created_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  challenge_id: string;
  role: "owner" | "member";
  status: "active" | "pending";
  joined_at: string;
}

export interface Task {
  id: string;
  challenge_id: string;
  title: string;
  recurrence: "daily" | "weekdays" | "custom";
  recurrence_days: number[] | null;
  target_count: number;
  sort_order: number;
  created_at: string;
}

export interface ProgressEntry {
  id: string;
  task_id: string;
  user_id: string;
  date: string;
  completed: boolean;
  count: number;
  note: string | null;
  created_at: string;
}

export interface TodayTask {
  task: Task;
  challenge: Challenge;
  progress: ProgressEntry | null;
  streak: number;
}

export interface LeaderboardEntry {
  user: User;
  streak: number;
  consistency: number;
  completed_today: boolean;
}
