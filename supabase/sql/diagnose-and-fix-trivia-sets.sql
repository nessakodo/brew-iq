-- Comprehensive diagnostic and fix for trivia_sets table
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Check what columns actually exist
-- ============================================================================
SELECT 
  'EXISTING COLUMNS' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'trivia_sets'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: Check for missing required columns
-- ============================================================================
SELECT 
  'MISSING COLUMNS' as check_type,
  required.column_name as missing_column,
  required.required_type,
  required.required_default
FROM (
  VALUES 
    ('id', 'uuid', 'gen_random_uuid()'),
    ('title', 'text', NULL),
    ('is_preset', 'boolean', 'false'),
    ('created_at', 'timestamp with time zone', 'now()'),
    ('updated_at', 'timestamp with time zone', 'now()')
) AS required(column_name, required_type, required_default)
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'trivia_sets'
    AND columns.column_name = required.column_name
);

-- ============================================================================
-- STEP 3: Fix missing columns (run this if columns are missing)
-- ============================================================================

-- Add id column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trivia_sets' 
    AND column_name = 'id'
  ) THEN
    ALTER TABLE public.trivia_sets ADD COLUMN id uuid DEFAULT gen_random_uuid() NOT NULL;
    
    -- Add primary key if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'trivia_sets_pkey'
    ) THEN
      ALTER TABLE public.trivia_sets ADD CONSTRAINT trivia_sets_pkey PRIMARY KEY (id);
    END IF;
    
    RAISE NOTICE 'Added id column and primary key to trivia_sets';
  END IF;
END $$;

-- Add title column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trivia_sets' 
    AND column_name = 'title'
  ) THEN
    ALTER TABLE public.trivia_sets ADD COLUMN title text NOT NULL;
    RAISE NOTICE 'Added title column to trivia_sets';
  END IF;
END $$;

-- Add is_preset column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trivia_sets' 
    AND column_name = 'is_preset'
  ) THEN
    ALTER TABLE public.trivia_sets ADD COLUMN is_preset boolean DEFAULT false NOT NULL;
    RAISE NOTICE 'Added is_preset column to trivia_sets';
  END IF;
END $$;

-- Add created_at column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trivia_sets' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.trivia_sets ADD COLUMN created_at timestamp with time zone DEFAULT now() NOT NULL;
    RAISE NOTICE 'Added created_at column to trivia_sets';
  END IF;
END $$;

-- Add updated_at column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trivia_sets' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.trivia_sets ADD COLUMN updated_at timestamp with time zone DEFAULT now() NOT NULL;
    RAISE NOTICE 'Added updated_at column to trivia_sets';
  END IF;
END $$;

-- Ensure other optional columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trivia_sets' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE public.trivia_sets ADD COLUMN description text;
    RAISE NOTICE 'Added description column to trivia_sets';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trivia_sets' 
    AND column_name = 'theme'
  ) THEN
    ALTER TABLE public.trivia_sets ADD COLUMN theme text;
    RAISE NOTICE 'Added theme column to trivia_sets';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trivia_sets' 
    AND column_name = 'difficulty'
  ) THEN
    ALTER TABLE public.trivia_sets ADD COLUMN difficulty text;
    RAISE NOTICE 'Added difficulty column to trivia_sets';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trivia_sets' 
    AND column_name = 'topic'
  ) THEN
    ALTER TABLE public.trivia_sets ADD COLUMN topic text;
    RAISE NOTICE 'Added topic column to trivia_sets';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trivia_sets' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.trivia_sets ADD COLUMN created_by uuid;
    RAISE NOTICE 'Added created_by column to trivia_sets';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Verify all columns now exist
-- ============================================================================
SELECT 
  'FINAL VERIFICATION' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN column_name IN ('id', 'title', 'is_preset', 'created_at', 'updated_at') THEN '✅ REQUIRED'
    ELSE '✓ OPTIONAL'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'trivia_sets'
ORDER BY 
  CASE 
    WHEN column_name = 'id' THEN 1
    WHEN column_name = 'title' THEN 2
    WHEN column_name = 'is_preset' THEN 3
    WHEN column_name = 'created_at' THEN 4
    WHEN column_name = 'updated_at' THEN 5
    ELSE 6
  END,
  ordinal_position;

-- ============================================================================
-- STEP 5: Test insert (replace YOUR_USER_ID with actual user ID)
-- ============================================================================
-- Uncomment and run this to test:
/*
INSERT INTO trivia_sets (title, theme, difficulty, is_preset, created_by)
VALUES ('Test Trivia Set', 'Test Theme', 'medium', true, 'YOUR_USER_ID')
RETURNING *;
*/
