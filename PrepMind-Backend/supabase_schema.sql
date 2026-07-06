-- PrepMind: missing table setup
-- Paste this into Supabase Dashboard → SQL Editor → Run.
-- Creates the mcq_sessions table used by the MCQ engine, Weakness Map and Analytics.

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
