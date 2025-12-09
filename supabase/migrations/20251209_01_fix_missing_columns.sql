-- Fix Missing Columns in trivia_sets and questions tables
-- This migration adds any missing columns that are required

-- ============================================================================
-- FIX TRIVIA_SETS TABLE
-- ============================================================================

-- Add id column if missing (should be primary key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trivia_sets' 
    AND column_name = 'id'
  ) THEN
    ALTER TABLE public.trivia_sets ADD COLUMN id uuid DEFAULT gen_random_uuid() NOT NULL;
    ALTER TABLE public.trivia_sets ADD CONSTRAINT trivia_sets_pkey PRIMARY KEY (id);
    RAISE NOTICE 'Added id column to trivia_sets';
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

-- Ensure other columns exist (description, theme, difficulty, topic, created_by)
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

-- Add foreign key constraint for created_by if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'trivia_sets_created_by_fkey'
  ) THEN
    ALTER TABLE public.trivia_sets 
    ADD CONSTRAINT trivia_sets_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);
    RAISE NOTICE 'Added foreign key constraint for created_by';
  END IF;
END $$;

-- ============================================================================
-- FIX QUESTIONS TABLE
-- ============================================================================

-- Add id column if missing (should be primary key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'questions' 
    AND column_name = 'id'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN id uuid DEFAULT gen_random_uuid() NOT NULL;
    ALTER TABLE public.questions ADD CONSTRAINT questions_pkey PRIMARY KEY (id);
    RAISE NOTICE 'Added id column to questions';
  END IF;
END $$;

-- Add trivia_set_id column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'questions' 
    AND column_name = 'trivia_set_id'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN trivia_set_id uuid NOT NULL;
    RAISE NOTICE 'Added trivia_set_id column to questions';
  END IF;
END $$;

-- Add question_text column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'questions' 
    AND column_name = 'question_text'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN question_text text NOT NULL;
    RAISE NOTICE 'Added question_text column to questions';
  END IF;
END $$;

-- Add option columns if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'questions' 
    AND column_name = 'option_a'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN option_a text NOT NULL;
    RAISE NOTICE 'Added option_a column to questions';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'questions' 
    AND column_name = 'option_b'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN option_b text NOT NULL;
    RAISE NOTICE 'Added option_b column to questions';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'questions' 
    AND column_name = 'option_c'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN option_c text NOT NULL;
    RAISE NOTICE 'Added option_c column to questions';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'questions' 
    AND column_name = 'option_d'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN option_d text NOT NULL;
    RAISE NOTICE 'Added option_d column to questions';
  END IF;
END $$;

-- Add correct_answer column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'questions' 
    AND column_name = 'correct_answer'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN correct_answer text NOT NULL;
    RAISE NOTICE 'Added correct_answer column to questions';
  END IF;
END $$;

-- Add time_limit_seconds column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'questions' 
    AND column_name = 'time_limit_seconds'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN time_limit_seconds integer DEFAULT 30 NOT NULL;
    RAISE NOTICE 'Added time_limit_seconds column to questions';
  END IF;
END $$;

-- Add order_index column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'questions' 
    AND column_name = 'order_index'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN order_index integer NOT NULL;
    RAISE NOTICE 'Added order_index column to questions';
  END IF;
END $$;

-- Add created_at column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'questions' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN created_at timestamp with time zone DEFAULT now() NOT NULL;
    RAISE NOTICE 'Added created_at column to questions';
  END IF;
END $$;

-- Add constraints for questions table
DO $$
BEGIN
  -- Add check constraint for correct_answer if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'questions_correct_answer_check'
  ) THEN
    ALTER TABLE public.questions 
    ADD CONSTRAINT questions_correct_answer_check 
    CHECK (correct_answer = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text]));
    RAISE NOTICE 'Added correct_answer check constraint';
  END IF;
  
  -- Add foreign key constraint for trivia_set_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'questions_trivia_set_id_fkey'
  ) THEN
    ALTER TABLE public.questions 
    ADD CONSTRAINT questions_trivia_set_id_fkey 
    FOREIGN KEY (trivia_set_id) REFERENCES public.trivia_sets(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint for trivia_set_id';
  END IF;
END $$;

-- ============================================================================
-- ENSURE TRIGGERS EXIST
-- ============================================================================

-- Ensure update_trivia_sets_updated_at trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_trivia_sets_updated_at'
  ) THEN
    CREATE TRIGGER update_trivia_sets_updated_at 
    BEFORE UPDATE ON public.trivia_sets 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();
    RAISE NOTICE 'Created update_trivia_sets_updated_at trigger';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify trivia_sets columns
SELECT 
  'trivia_sets columns' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'trivia_sets'
ORDER BY ordinal_position;

-- Verify questions columns
SELECT 
  'questions columns' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'questions'
ORDER BY ordinal_position;
