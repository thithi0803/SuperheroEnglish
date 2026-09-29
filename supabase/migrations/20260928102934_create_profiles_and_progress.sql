/*
# Create profiles and lesson_completions tables

1. New Tables
- `profiles`: Stores each user's display name, avatar emoji, placement level, total XP, stars, and streak.
  - `id` (uuid, primary key, references auth.users)
  - `display_name` (text, not null) - the child's display name
  - `avatar_emoji` (text, default '🦸') - avatar emoji
  - `placement_level` (text, default null) - one of 'Beginner', 'Intermediate', 'Advanced'
  - `total_xp` (integer, default 0) - cumulative XP
  - `total_stars` (integer, default 0) - cumulative stars earned from lessons
  - `streak` (integer, default 0) - consecutive days
  - `last_active_date` (date, default null)
  - `created_at` (timestamptz, default now)

- `lesson_completions`: Records each completed lesson with score and stars.
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, references auth.users, defaults to auth.uid())
  - `lesson_key` (text, not null) - identifies the lesson topic+level
  - `score` (integer, not null) - score on the final stage (0-100)
  - `stars` (integer, not null) - stars earned (1-3)
  - `xp_earned` (integer, not null) - XP from this lesson
  - `completed_at` (timestamptz, default now())

2. Security
- Enable RLS on both tables.
- profiles: owner-scoped CRUD (user can only read/update their own profile row).
- lesson_completions: owner-scoped CRUD (user can only insert/read their own completions).
- All policies use auth.uid() = user_id.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_emoji text NOT NULL DEFAULT '🦸',
  placement_level text,
  total_xp integer NOT NULL DEFAULT 0,
  total_stars integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS lesson_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_key text NOT NULL,
  score integer NOT NULL,
  stars integer NOT NULL,
  xp_earned integer NOT NULL,
  completed_at timestamptz DEFAULT now()
);

ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_completions" ON lesson_completions;
CREATE POLICY "select_own_completions" ON lesson_completions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_completions" ON lesson_completions;
CREATE POLICY "insert_own_completions" ON lesson_completions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_completions" ON lesson_completions;
CREATE POLICY "update_own_completions" ON lesson_completions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_completions" ON lesson_completions;
CREATE POLICY "delete_own_completions" ON lesson_completions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
