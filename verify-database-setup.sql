-- Database Verification Script
-- Run this in Supabase SQL Editor to verify your database is set up correctly

-- 1. Check if all required tables exist
SELECT 
  'Tables Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trivia_sets') 
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'questions')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
    THEN 'PASS: All required tables exist'
    ELSE 'FAIL: Missing required tables'
  END as result;

-- 2. Check if has_role function exists
SELECT 
  'Functions Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'has_role')
    THEN 'PASS: has_role function exists'
    ELSE 'FAIL: has_role function missing'
  END as result;

-- 3. Check RLS status on critical tables
SELECT 
  'RLS Check' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity THEN 'ENABLED'
    ELSE 'DISABLED'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('trivia_sets', 'questions', 'user_roles', 'profiles')
ORDER BY tablename;

-- 4. Check if app_role enum exists
SELECT 
  'Enum Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role')
    THEN 'PASS: app_role enum exists'
    ELSE 'FAIL: app_role enum missing'
  END as result;

-- 5. Check column structure of trivia_sets
SELECT 
  'Schema Check - trivia_sets' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'trivia_sets'
ORDER BY ordinal_position;

-- 6. Check column structure of questions
SELECT 
  'Schema Check - questions' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'questions'
ORDER BY ordinal_position;

-- 7. Check for admin users
SELECT 
  'Admin Users Check' as check_type,
  COUNT(*) as admin_count,
  CASE 
    WHEN COUNT(*) > 0 THEN 'PASS: Admin users exist'
    ELSE 'WARNING: No admin users found'
  END as result
FROM user_roles 
WHERE role = 'admin';

-- 8. List all admin users
SELECT 
  'Admin Users List' as check_type,
  ur.user_id,
  p.email,
  p.display_name,
  ur.role,
  ur.created_at
FROM user_roles ur
LEFT JOIN profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY ur.created_at;
