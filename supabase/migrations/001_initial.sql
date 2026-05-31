-- StreakSync Database Schema
-- Run this in Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (synced from auth.users via trigger)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Challenges
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  event_type TEXT NOT NULL DEFAULT 'join' CHECK (event_type IN ('join', 'watch')),
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- Memberships
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'daily' CHECK (recurrence IN ('daily', 'weekdays', 'custom')),
  recurrence_days INT[] DEFAULT NULL,
  target_count INT DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Progress entries (check-ins)
CREATE TABLE public.progress_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  count INT DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, user_id, date)
);

-- Wall notes (per challenge, per user, per day)
CREATE TABLE public.wall_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, user_id, date)
);

-- Indexes
CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_challenge ON public.memberships(challenge_id);
CREATE INDEX idx_tasks_challenge ON public.tasks(challenge_id);
CREATE INDEX idx_progress_task_user ON public.progress_entries(task_id, user_id);
CREATE INDEX idx_progress_date ON public.progress_entries(date);
CREATE INDEX idx_challenges_invite ON public.challenges(invite_code);
CREATE INDEX idx_wall_challenge_date ON public.wall_notes(challenge_id, date);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'hex_id', 'anon'),
    'https://api.dicebear.com/9.x/identicon/svg?seed=' || COALESCE(NEW.raw_user_meta_data->>'avatar_seed', NEW.id::text)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-add owner as member
CREATE OR REPLACE FUNCTION public.handle_new_challenge()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.memberships (user_id, challenge_id, role, status)
  VALUES (NEW.owner_id, NEW.id, 'owner', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_challenge_created
  AFTER INSERT ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_challenge();

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wall_notes ENABLE ROW LEVEL SECURITY;

-- Users: readable by all authenticated
CREATE POLICY "Users viewable" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid());

-- Challenges: viewable by members or public
CREATE POLICY "Challenges viewable" ON public.challenges FOR SELECT TO authenticated
  USING (visibility = 'public' OR id IN (SELECT challenge_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Challenges creatable" ON public.challenges FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Challenges editable" ON public.challenges FOR UPDATE TO authenticated USING (owner_id = auth.uid());

-- Memberships
CREATE POLICY "Memberships viewable" ON public.memberships FOR SELECT TO authenticated
  USING (challenge_id IN (SELECT challenge_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Users can join" ON public.memberships FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can leave" ON public.memberships FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Tasks
CREATE POLICY "Tasks viewable" ON public.tasks FOR SELECT TO authenticated
  USING (challenge_id IN (SELECT challenge_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Tasks manageable" ON public.tasks FOR ALL TO authenticated
  USING (challenge_id IN (SELECT challenge_id FROM public.memberships WHERE user_id = auth.uid() AND role = 'owner'));

-- Progress
CREATE POLICY "Progress viewable" ON public.progress_entries FOR SELECT TO authenticated
  USING (task_id IN (SELECT t.id FROM public.tasks t JOIN public.memberships m ON m.challenge_id = t.challenge_id WHERE m.user_id = auth.uid()));
CREATE POLICY "Progress writable" ON public.progress_entries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Progress updatable" ON public.progress_entries FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Wall notes
CREATE POLICY "Wall viewable" ON public.wall_notes FOR SELECT TO authenticated
  USING (challenge_id IN (SELECT challenge_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Wall writable" ON public.wall_notes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Wall updatable" ON public.wall_notes FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.progress_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wall_notes;
