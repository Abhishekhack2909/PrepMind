-- PrepMind: full database setup
-- Paste this into Supabase Dashboard → SQL Editor → Run.
-- Creates every table the backend reads/writes: users, evaluations,
-- mcq_sessions, study_plans. Safe to re-run (IF NOT EXISTS + policy drops).

-- ── users ───────────────────────────────────────────────────────────────────
-- Extra profile fields on top of Supabase auth.users (name, exam prefs).
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  exam_date DATE,
  daily_hours INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own profile" ON users;
CREATE POLICY "Users manage own profile" ON users FOR ALL USING (auth.uid() = id);

-- ── evaluations ─────────────────────────────────────────────────────────────
-- Stores every answer evaluation returned by Gemini Vision.
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT,
  total_marks INTEGER,
  grade TEXT,
  content_score INTEGER,
  structure_score INTEGER,
  examples_score INTEGER,
  impression_score INTEGER,
  presentation_score INTEGER,
  transcribed_text TEXT,
  strong_points TEXT[],
  improvement_areas TEXT[],
  model_answer_hint TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own evaluations" ON evaluations;
CREATE POLICY "Users see own evaluations" ON evaluations FOR ALL USING (auth.uid() = user_id);

-- ── mcq_sessions ────────────────────────────────────────────────────────────
-- MCQ quiz results — feeds Weakness Map & Analytics.
CREATE TABLE IF NOT EXISTS mcq_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT,
  total_questions INTEGER,
  correct_answers INTEGER,
  percentage INTEGER,
  wrong_topics TEXT[],
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE mcq_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own" ON mcq_sessions;
CREATE POLICY "Users see own" ON mcq_sessions FOR ALL USING (auth.uid() = user_id);

-- ── study_plans ─────────────────────────────────────────────────────────────
-- One active plan per user (upsert on user_id).
CREATE TABLE IF NOT EXISTS study_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan JSONB,
  weak_topics TEXT[],
  hours_per_day INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own plans" ON study_plans;
CREATE POLICY "Users see own plans" ON study_plans FOR ALL USING (auth.uid() = user_id);
