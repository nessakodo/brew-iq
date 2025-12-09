-- Fix Events Table Structure and Ensure Proper Access
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Verify events table structure
-- ============================================================================
SELECT 
  'EVENTS TABLE STRUCTURE' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'events'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: Ensure all required columns exist
-- ============================================================================

-- Add any missing columns (idempotent)
DO $$
BEGIN
  -- id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'id'
  ) THEN
    ALTER TABLE public.events ADD COLUMN id uuid DEFAULT gen_random_uuid() NOT NULL;
    ALTER TABLE public.events ADD CONSTRAINT events_pkey PRIMARY KEY (id);
    RAISE NOTICE 'Added id column to events';
  END IF;
  
  -- title column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'title'
  ) THEN
    ALTER TABLE public.events ADD COLUMN title text NOT NULL;
    RAISE NOTICE 'Added title column to events';
  END IF;
  
  -- event_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'event_date'
  ) THEN
    ALTER TABLE public.events ADD COLUMN event_date date NOT NULL;
    RAISE NOTICE 'Added event_date column to events';
  END IF;
  
  -- event_time column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'event_time'
  ) THEN
    ALTER TABLE public.events ADD COLUMN event_time time without time zone NOT NULL;
    RAISE NOTICE 'Added event_time column to events';
  END IF;
  
  -- status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.events ADD COLUMN status text DEFAULT 'scheduled' NOT NULL;
    RAISE NOTICE 'Added status column to events';
  END IF;
  
  -- created_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.events ADD COLUMN created_by uuid NOT NULL;
    RAISE NOTICE 'Added created_by column to events';
  END IF;
  
  -- created_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.events ADD COLUMN created_at timestamp with time zone DEFAULT now() NOT NULL;
    RAISE NOTICE 'Added created_at column to events';
  END IF;
  
  -- updated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.events ADD COLUMN updated_at timestamp with time zone DEFAULT now() NOT NULL;
    RAISE NOTICE 'Added updated_at column to events';
  END IF;
  
  -- Optional columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'theme'
  ) THEN
    ALTER TABLE public.events ADD COLUMN theme text;
    RAISE NOTICE 'Added theme column to events';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'trivia_set_id'
  ) THEN
    ALTER TABLE public.events ADD COLUMN trivia_set_id uuid;
    RAISE NOTICE 'Added trivia_set_id column to events';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'assigned_host_id'
  ) THEN
    ALTER TABLE public.events ADD COLUMN assigned_host_id uuid;
    RAISE NOTICE 'Added assigned_host_id column to events';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'marketing_image_url'
  ) THEN
    ALTER TABLE public.events ADD COLUMN marketing_image_url text;
    RAISE NOTICE 'Added marketing_image_url column to events';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Ensure RLS is enabled and policies exist
-- ============================================================================

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
DROP POLICY IF EXISTS "Everyone can view events" ON public.events;
DROP POLICY IF EXISTS "Hosts can view their assigned events" ON public.events;

-- Admins can manage all events
CREATE POLICY "Admins can manage events" 
ON public.events 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Everyone can view events
CREATE POLICY "Everyone can view events" 
ON public.events 
FOR SELECT 
TO authenticated 
USING (true);

-- Hosts can view and update their assigned events
CREATE POLICY "Hosts can view their assigned events" 
ON public.events 
FOR SELECT 
TO authenticated 
USING (
  assigned_host_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Hosts can update their assigned events" 
ON public.events 
FOR UPDATE 
TO authenticated 
USING (
  assigned_host_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  assigned_host_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- ============================================================================
-- STEP 4: Verify structure
-- ============================================================================
SELECT 
  'FINAL VERIFICATION' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'events'
ORDER BY ordinal_position;

-- Check RLS status
SELECT 
  'RLS STATUS' as check_type,
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'events';

-- Check policies
SELECT 
  'POLICIES' as check_type,
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'events'
ORDER BY policyname;
