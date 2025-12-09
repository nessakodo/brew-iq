-- ========================================
-- COMPLETE BREWIQ DATABASE SCHEMA
-- ========================================
-- Run this in your NEW Supabase project
-- This creates all tables, functions, triggers, and RLS policies
-- ========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- ENUMS
-- ========================================

CREATE TYPE public.app_role AS ENUM ('admin', 'host', 'player');

-- ========================================
-- FUNCTIONS
-- ========================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to update player stats when game ends
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

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ========================================
-- TABLES
-- ========================================

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- User roles table
CREATE TABLE public.user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Trivia sets table
CREATE TABLE public.trivia_sets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  theme text,
  difficulty text,
  topic text,
  is_preset boolean DEFAULT false NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Questions table
CREATE TABLE public.questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trivia_set_id uuid NOT NULL REFERENCES public.trivia_sets(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer text NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  time_limit_seconds integer DEFAULT 30 NOT NULL,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Events table
CREATE TABLE public.events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  event_date date NOT NULL,
  event_time time NOT NULL,
  theme text,
  trivia_set_id uuid REFERENCES public.trivia_sets(id),
  assigned_host_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'scheduled' NOT NULL CHECK (status IN ('scheduled', 'ready', 'in_progress', 'completed', 'cancelled')),
  marketing_image_url text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Game sessions table
CREATE TABLE public.game_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  game_code text NOT NULL UNIQUE,
  host_id uuid NOT NULL REFERENCES auth.users(id),
  current_question_id uuid REFERENCES public.questions(id),
  status text DEFAULT 'lobby' NOT NULL CHECK (status IN ('lobby', 'active', 'paused', 'completed')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Player sessions table
CREATE TABLE public.player_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_session_id uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  total_points integer DEFAULT 0,
  UNIQUE(player_id, game_session_id)
);

-- Player answers table
CREATE TABLE public.player_answers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  game_session_id uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES auth.users(id),
  question_id uuid NOT NULL REFERENCES public.questions(id),
  selected_answer text NOT NULL CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
  is_correct boolean NOT NULL,
  time_taken_seconds numeric(5,2) NOT NULL,
  points_earned integer DEFAULT 0 NOT NULL,
  answered_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(game_session_id, player_id, question_id)
);

-- Player stats table
CREATE TABLE public.player_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_games_played integer DEFAULT 0,
  total_points integer DEFAULT 0,
  total_correct_answers integer DEFAULT 0,
  total_questions_answered integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ========================================
-- INDEXES
-- ========================================

CREATE INDEX idx_game_sessions_game_code ON public.game_sessions(game_code);
CREATE INDEX idx_player_answers_game_session ON public.player_answers(game_session_id);
CREATE INDEX idx_player_answers_player ON public.player_answers(player_id);
CREATE INDEX idx_player_sessions_game ON public.player_sessions(game_session_id);
CREATE INDEX idx_player_sessions_player ON public.player_sessions(player_id);
CREATE INDEX idx_questions_trivia_set ON public.questions(trivia_set_id);
CREATE INDEX idx_events_date ON public.events(event_date);
CREATE INDEX idx_events_host ON public.events(assigned_host_id);

-- ========================================
-- TRIGGERS
-- ========================================

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update player stats when game ends
DROP TRIGGER IF EXISTS trigger_update_player_stats_on_game_end ON public.game_sessions;
CREATE TRIGGER trigger_update_player_stats_on_game_end
  AFTER UPDATE ON public.game_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_player_stats_on_game_end();

-- Triggers to auto-update updated_at columns
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_trivia_sets_updated_at ON public.trivia_sets;
CREATE TRIGGER update_trivia_sets_updated_at
  BEFORE UPDATE ON public.trivia_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trivia sets policies
CREATE POLICY "Everyone can view trivia sets"
  ON public.trivia_sets FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage trivia sets"
  ON public.trivia_sets TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Questions policies
CREATE POLICY "Admins and hosts can view questions with answers"
  ON public.questions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'host'));

CREATE POLICY "Admins can manage questions"
  ON public.questions TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Events policies
CREATE POLICY "Everyone can view events"
  ON public.events FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage events"
  ON public.events TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Game sessions policies
CREATE POLICY "Players can view active game sessions"
  ON public.game_sessions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Hosts can view their own game sessions"
  ON public.game_sessions FOR SELECT
  USING (host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Hosts can manage their game sessions"
  ON public.game_sessions TO authenticated
  USING (public.has_role(auth.uid(), 'host') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Hosts can update their own game sessions"
  ON public.game_sessions FOR UPDATE
  USING (host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Player sessions policies
CREATE POLICY "Players can view their own sessions"
  ON public.player_sessions FOR SELECT TO authenticated
  USING (player_id = auth.uid() OR public.has_role(auth.uid(), 'host') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert their own player sessions"
  ON public.player_sessions FOR INSERT
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Only hosts and admins can update player sessions"
  ON public.player_sessions FOR UPDATE
  USING (public.has_role(auth.uid(), 'host') OR public.has_role(auth.uid(), 'admin'));

-- Player answers policies
CREATE POLICY "Players can view own answers"
  ON public.player_answers FOR SELECT TO authenticated
  USING (player_id = auth.uid() OR public.has_role(auth.uid(), 'host') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Players can insert own answers"
  ON public.player_answers FOR INSERT TO authenticated
  WITH CHECK (player_id = auth.uid());

-- Player stats policies
CREATE POLICY "Players can view all stats"
  ON public.player_stats FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can insert player stats"
  ON public.player_stats FOR INSERT TO authenticated
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "System can update player stats"
  ON public.player_stats FOR UPDATE TO authenticated
  USING (player_id = auth.uid());

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE 'Schema setup complete! Tables, functions, triggers, and RLS policies created.';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Import your data using the export scripts';
  RAISE NOTICE '2. Create admin users and assign roles';
  RAISE NOTICE '3. Verify with 02_verify_new_database.sql';
END $$;
