-- ========================================
-- VERIFY NEW DATABASE SETUP
-- ========================================
-- Run this in your NEW Supabase project after setup
-- This checks everything is configured correctly
-- ========================================

-- 1. Check all tables exist
SELECT 'Checking tables...' as step;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
-- Should show: events, game_sessions, player_answers, player_sessions, player_stats, profiles, questions, trivia_sets, user_roles

-- 2. Check constraints
SELECT 'Checking game_sessions status constraint...' as step;
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
AND constraint_name = 'game_sessions_status_check';
-- Should show: status = ANY (ARRAY['lobby'::text, 'active'::text, 'paused'::text, 'completed'::text])

-- 3. Check trigger function
SELECT 'Checking update_player_stats_on_game_end function...' as step;
SELECT routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'update_player_stats_on_game_end';
-- Should contain 'completed' not 'ended'

-- 4. Check data counts
SELECT 'Checking row counts...' as step;
SELECT
  'profiles' as table_name, COUNT(*) as rows FROM profiles
UNION ALL
SELECT 'user_roles', COUNT(*) FROM user_roles
UNION ALL
SELECT 'trivia_sets', COUNT(*) FROM trivia_sets
UNION ALL
SELECT 'questions', COUNT(*) FROM questions
UNION ALL
SELECT 'events', COUNT(*) FROM events
UNION ALL
SELECT 'game_sessions', COUNT(*) FROM game_sessions
UNION ALL
SELECT 'player_answers', COUNT(*) FROM player_answers
UNION ALL
SELECT 'player_sessions', COUNT(*) FROM player_sessions
UNION ALL
SELECT 'player_stats', COUNT(*) FROM player_stats;

-- 5. Check RLS policies
SELECT 'Checking RLS policies...' as step;
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6. Check if specific user roles exist (replace with your actual user ID)
SELECT 'Checking user roles (REPLACE WITH YOUR USER ID)...' as step;
SELECT ur.*, p.email
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
-- WHERE ur.user_id = 'YOUR-USER-ID-HERE'  -- Uncomment and replace
ORDER BY ur.created_at;

-- 7. Sample data checks
SELECT 'Checking sample trivia set...' as step;
SELECT id, title, is_preset
FROM trivia_sets
LIMIT 1;

SELECT 'Checking sample questions for first trivia set...' as step;
SELECT COUNT(*) as question_count, trivia_set_id
FROM questions
WHERE trivia_set_id = (SELECT id FROM trivia_sets LIMIT 1)
GROUP BY trivia_set_id;

SELECT 'Checking sample events...' as step;
SELECT id, title, event_date, status, assigned_host_id
FROM events
ORDER BY event_date DESC
LIMIT 5;

SELECT 'Verification complete!' as step;
