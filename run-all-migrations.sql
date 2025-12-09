-- ============================================================================
-- COMPREHENSIVE DATABASE MIGRATION SCRIPT
-- Run this in Supabase SQL Editor to ensure all migrations are applied
-- ============================================================================

-- This script will:
-- 1. Apply all migrations in order
-- 2. Verify database structure
-- 3. Ensure all functions, triggers, and policies exist
-- 4. Report any issues

DO $$
DECLARE
  migration_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting database migration verification...';
  
  -- ============================================================================
  -- STEP 1: Verify Core Schema (from 20251120074720_remix_migration_from_pg_dump.sql)
  -- ============================================================================
  RAISE NOTICE 'Step 1: Verifying core schema...';
  
  -- Check if app_role enum exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    RAISE EXCEPTION 'app_role enum missing - please run main migration first';
  ELSE
    RAISE NOTICE '✓ app_role enum exists';
    migration_count := migration_count + 1;
  END IF;
  
  -- Check if handle_new_user function exists
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'handle_new_user') THEN
    RAISE EXCEPTION 'handle_new_user function missing - please run main migration first';
  ELSE
    RAISE NOTICE '✓ handle_new_user function exists';
    migration_count := migration_count + 1;
  END IF;
  
  -- Check if has_role function exists
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'has_role') THEN
    RAISE EXCEPTION 'has_role function missing - please run main migration first';
  ELSE
    RAISE NOTICE '✓ has_role function exists';
    migration_count := migration_count + 1;
  END IF;
  
  -- Check if all required tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trivia_sets') THEN
    RAISE EXCEPTION 'trivia_sets table missing - please run main migration first';
  ELSE
    RAISE NOTICE '✓ trivia_sets table exists';
    migration_count := migration_count + 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'questions') THEN
    RAISE EXCEPTION 'questions table missing - please run main migration first';
  ELSE
    RAISE NOTICE '✓ questions table exists';
    migration_count := migration_count + 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    RAISE EXCEPTION 'user_roles table missing - please run main migration first';
  ELSE
    RAISE NOTICE '✓ user_roles table exists';
    migration_count := migration_count + 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RAISE EXCEPTION 'profiles table missing - please run main migration first';
  ELSE
    RAISE NOTICE '✓ profiles table exists';
    migration_count := migration_count + 1;
  END IF;
  
  -- ============================================================================
  -- STEP 2: Apply Migration 20251120075607 (Trigger for new users)
  -- ============================================================================
  RAISE NOTICE 'Step 2: Checking user creation trigger...';
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'Creating on_auth_user_created trigger...';
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW 
      EXECUTE FUNCTION public.handle_new_user();
    RAISE NOTICE '✓ Trigger created';
    migration_count := migration_count + 1;
  ELSE
    RAISE NOTICE '✓ Trigger already exists';
    migration_count := migration_count + 1;
  END IF;
  
  -- ============================================================================
  -- STEP 3: Apply Migration 20251120182932 (get_trivia_set_counts function)
  -- ============================================================================
  RAISE NOTICE 'Step 3: Checking get_trivia_set_counts function...';
  
  CREATE OR REPLACE FUNCTION get_trivia_set_counts()
  RETURNS TABLE(set_id uuid, question_count bigint) AS $$
  BEGIN
    RETURN QUERY
    SELECT
      ts.id as set_id,
      count(q.id) as question_count
    FROM
      public.trivia_sets ts
    LEFT JOIN
      public.questions q ON ts.id = q.trivia_set_id
    GROUP BY
      ts.id;
  END;
  $$ LANGUAGE plpgsql;
  
  RAISE NOTICE '✓ get_trivia_set_counts function updated';
  migration_count := migration_count + 1;
  
  -- ============================================================================
  -- STEP 4: Apply Migration 20251208 (Fix game status trigger)
  -- ============================================================================
  RAISE NOTICE 'Step 4: Updating game status trigger...';
  
  CREATE OR REPLACE FUNCTION public.update_player_stats_on_game_end()
  RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
  BEGIN
    -- Only update when game status changes to 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      -- Update stats for all players in this game session
      WITH game_stats AS (
        SELECT
          ps.player_id,
          ps.total_points,
          COUNT(pa.id) as questions_answered,
          SUM(CASE WHEN pa.is_correct THEN 1 ELSE 0 END) as correct_answers
        FROM player_sessions ps
        LEFT JOIN player_answers pa ON pa.player_id = ps.player_id AND pa.game_session_id = NEW.id
        WHERE ps.game_session_id = NEW.id
        GROUP BY ps.player_id, ps.total_points
      )
      INSERT INTO player_stats (
        player_id,
        total_games_played,
        total_points,
        total_questions_answered,
        total_correct_answers
      )
      SELECT
        player_id,
        1,
        total_points,
        questions_answered,
        correct_answers
      FROM game_stats
      ON CONFLICT (player_id)
      DO UPDATE SET
        total_games_played = player_stats.total_games_played + 1,
        total_points = player_stats.total_points + EXCLUDED.total_points,
        total_questions_answered = player_stats.total_questions_answered + EXCLUDED.total_questions_answered,
        total_correct_answers = player_stats.total_correct_answers + EXCLUDED.total_correct_answers,
        updated_at = now();
    END IF;

    RETURN NEW;
  END;
  $$;
  
  RAISE NOTICE '✓ Game status trigger updated';
  migration_count := migration_count + 1;
  
  -- ============================================================================
  -- STEP 5: Apply Migration 20251121141500 (RLS policy for profiles)
  -- ============================================================================
  RAISE NOTICE 'Step 5: Ensuring RLS policies for profiles...';
  
  -- Enable RLS if not already enabled
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Allow authenticated users to read their own profile" ON public.profiles;
  
  -- Create the policy
  CREATE POLICY "Allow authenticated users to read their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
  
  -- Grant select permission
  GRANT SELECT ON TABLE public.profiles TO authenticated;
  
  RAISE NOTICE '✓ Profiles RLS policies updated';
  migration_count := migration_count + 1;
  
  -- ============================================================================
  -- STEP 6: Apply Migration 20251121200000 (Player questions RLS policy)
  -- ============================================================================
  RAISE NOTICE 'Step 6: Ensuring player questions RLS policy...';
  
  -- Enable RLS on questions if not already enabled
  ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Players can view questions during active games" ON public.questions;
  
  -- Create the policy
  CREATE POLICY "Players can view questions during active games"
  ON public.questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM player_sessions ps
      JOIN game_sessions gs ON ps.game_session_id = gs.id
      WHERE ps.player_id = auth.uid()
        AND gs.status IN ('active', 'paused')
        AND gs.current_question_id = questions.id
    )
  );
  
  RAISE NOTICE '✓ Player questions RLS policy updated';
  migration_count := migration_count + 1;
  
  -- ============================================================================
  -- STEP 7: Verify RLS is enabled on all critical tables
  -- ============================================================================
  RAISE NOTICE 'Step 7: Verifying RLS is enabled...';
  
  DO $$
  DECLARE
    table_name TEXT;
    rls_enabled BOOLEAN;
  BEGIN
    FOR table_name IN 
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('trivia_sets', 'questions', 'user_roles', 'profiles', 'events', 'game_sessions', 'player_answers', 'player_sessions', 'player_stats')
    LOOP
      SELECT rowsecurity INTO rls_enabled
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = table_name;
      
      IF NOT rls_enabled THEN
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        RAISE NOTICE '✓ Enabled RLS on %', table_name;
      ELSE
        RAISE NOTICE '✓ RLS already enabled on %', table_name;
      END IF;
    END LOOP;
  END $$;
  
  migration_count := migration_count + 1;
  
  -- ============================================================================
  -- STEP 8: Fix Missing Columns (20251209)
  -- ============================================================================
  RAISE NOTICE 'Step 8: Checking for missing columns...';
  
  -- This will be handled by the separate migration file
  -- Run: supabase/migrations/20251209_fix_missing_columns.sql
  RAISE NOTICE '⚠ Run 20251209_fix_missing_columns.sql separately to fix missing columns';
  
  -- ============================================================================
  -- FINAL REPORT
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  Checks/Updates Applied: %', migration_count;
  RAISE NOTICE '  Errors: %', error_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Database migrations completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Verify admin users exist: SELECT * FROM user_roles WHERE role = ''admin'';';
  RAISE NOTICE '2. Check preset trivia sets: SELECT * FROM trivia_sets WHERE is_preset = true;';
  RAISE NOTICE '3. Test edge functions are deployed';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Migration failed: %', SQLERRM;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (Run these separately to verify)
-- ============================================================================

-- Check admin users
SELECT 
  'Admin Users' as check_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL - No admin users!' END as status
FROM user_roles 
WHERE role = 'admin';

-- List admin users
SELECT 
  'Admin User Details' as check_type,
  ur.user_id,
  p.email,
  p.display_name,
  ur.role,
  ur.created_at
FROM user_roles ur
LEFT JOIN profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY ur.created_at;

-- Check preset trivia sets
SELECT 
  'Preset Trivia Sets' as check_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'WARNING - No preset trivia sets' END as status
FROM trivia_sets 
WHERE is_preset = true;

-- Check questions per trivia set
SELECT 
  ts.id,
  ts.title,
  COUNT(q.id) as question_count
FROM trivia_sets ts
LEFT JOIN questions q ON ts.id = q.trivia_set_id
WHERE ts.is_preset = true
GROUP BY ts.id, ts.title
ORDER BY ts.title;
