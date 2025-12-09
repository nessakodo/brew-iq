-- ========================================
-- COMPLETE DATA EXPORT SCRIPT
-- ========================================
-- Run this in your CURRENT (Lovable) Supabase SQL Editor
-- Copy all outputs and save them
-- ========================================

-- Set output format for easier copying
\t on
\a

-- ========================================
-- 1. EXPORT AUTH USERS (for reference)
-- ========================================
-- This shows what users exist
-- You'll need to recreate these manually in the new project
SELECT
  'User: ' || email || ' (ID: ' || id || ')'
FROM auth.users
ORDER BY created_at;

-- ========================================
-- 2. EXPORT PROFILES
-- ========================================
\echo '--- PROFILES ---'
SELECT
  'INSERT INTO profiles (id, email, display_name, created_at, updated_at, account_status) VALUES ' ||
  string_agg(
    format('(%L, %L, %L, %L, %L, %L)',
      id, email, display_name, created_at, updated_at, COALESCE(account_status, 'active')
    ), E',\n'
  ) || E'\nON CONFLICT (id) DO NOTHING;'
FROM profiles;

-- ========================================
-- 3. EXPORT USER ROLES
-- ========================================
\echo '--- USER ROLES ---'
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN
      'INSERT INTO user_roles (id, user_id, role, created_at) VALUES ' ||
      string_agg(
        format('(%L, %L, %L, %L)',
          id, user_id, role, created_at
        ), E',\n'
      ) || E'\nON CONFLICT (id) DO NOTHING;'
    ELSE
      '-- No user roles to export'
  END
FROM user_roles;

-- ========================================
-- 4. EXPORT TRIVIA SETS
-- ========================================
\echo '--- TRIVIA SETS ---'
SELECT
  'INSERT INTO trivia_sets (id, title, description, theme, difficulty, topic, is_preset, created_by, created_at, updated_at) VALUES ' ||
  string_agg(
    format('(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L)',
      id, title, description, theme, difficulty, topic, is_preset, created_by, created_at, updated_at
    ), E',\n'
  ) || E'\nON CONFLICT (id) DO NOTHING;'
FROM trivia_sets;

-- ========================================
-- 5. EXPORT QUESTIONS
-- ========================================
\echo '--- QUESTIONS (this will be long - 215 rows) ---'
SELECT
  'INSERT INTO questions (id, trivia_set_id, question_text, option_a, option_b, option_c, option_d, correct_answer, time_limit_seconds, order_index, created_at) VALUES ' ||
  string_agg(
    format('(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L)',
      id, trivia_set_id, question_text, option_a, option_b, option_c, option_d, correct_answer, time_limit_seconds, order_index, created_at
    ), E',\n'
  ) || E'\nON CONFLICT (id) DO NOTHING;'
FROM questions;

-- ========================================
-- 6. EXPORT EVENTS
-- ========================================
\echo '--- EVENTS ---'
SELECT
  'INSERT INTO events (id, title, event_date, event_time, theme, trivia_set_id, assigned_host_id, status, marketing_image_url, created_by, created_at, updated_at) VALUES ' ||
  string_agg(
    format('(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L)',
      id, title, event_date, event_time, theme, trivia_set_id, assigned_host_id, status, marketing_image_url, created_by, created_at, updated_at
    ), E',\n'
  ) || E'\nON CONFLICT (id) DO NOTHING;'
FROM events;

-- ========================================
-- 7. SUMMARY
-- ========================================
\echo '--- SUMMARY ---'
SELECT 'EXPORT COMPLETE - Row counts:';
SELECT
  'profiles: ' || COUNT(*) FROM profiles
UNION ALL
SELECT
  'user_roles: ' || COUNT(*) FROM user_roles
UNION ALL
SELECT
  'trivia_sets: ' || COUNT(*) FROM trivia_sets
UNION ALL
SELECT
  'questions: ' || COUNT(*) FROM questions
UNION ALL
SELECT
  'events: ' || COUNT(*) FROM events;

\echo '--- NEXT STEPS ---'
SELECT 'Copy all the INSERT statements above and save them.';
SELECT 'Then follow the migration guide to set up your new Supabase project.';
