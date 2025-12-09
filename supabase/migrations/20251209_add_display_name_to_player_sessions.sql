-- Add display_name column to player_sessions to store game-specific usernames
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'player_sessions'
    AND column_name = 'display_name'
  ) THEN
    ALTER TABLE public.player_sessions ADD COLUMN display_name TEXT;
    RAISE NOTICE 'Added display_name column to player_sessions';
  END IF;
END $$;

-- Backfill display_name from profiles for existing sessions
UPDATE public.player_sessions ps
SET display_name = p.display_name
FROM public.profiles p
WHERE ps.player_id = p.id
AND ps.display_name IS NULL;
