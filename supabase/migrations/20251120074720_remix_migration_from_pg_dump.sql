--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'host',
    'player'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
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


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: update_player_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_player_stats() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.player_stats (player_id, total_games_played, total_points)
  VALUES (NEW.player_id, 1, NEW.total_points)
  ON CONFLICT (player_id) DO UPDATE SET
    total_games_played = player_stats.total_games_played + 1,
    total_points = player_stats.total_points + NEW.total_points,
    updated_at = now()
  WHERE NEW.left_at IS NOT NULL;
  RETURN NEW;
END;
$$;


--
-- Name: update_player_stats_on_game_end(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_player_stats_on_game_end() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only update when game status changes to 'ended'
  IF NEW.status = 'ended' AND OLD.status != 'ended' THEN
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


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    event_date date NOT NULL,
    event_time time without time zone NOT NULL,
    theme text,
    trivia_set_id uuid,
    assigned_host_id uuid,
    status text DEFAULT 'scheduled'::text NOT NULL,
    marketing_image_url text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT events_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'ready'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: game_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    game_code text NOT NULL,
    host_id uuid NOT NULL,
    current_question_id uuid,
    status text DEFAULT 'lobby'::text NOT NULL,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT game_sessions_status_check CHECK ((status = ANY (ARRAY['lobby'::text, 'active'::text, 'paused'::text, 'completed'::text])))
);


--
-- Name: player_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_session_id uuid NOT NULL,
    player_id uuid NOT NULL,
    question_id uuid NOT NULL,
    selected_answer text NOT NULL,
    is_correct boolean NOT NULL,
    time_taken_seconds numeric(5,2) NOT NULL,
    points_earned integer DEFAULT 0 NOT NULL,
    answered_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT player_answers_selected_answer_check CHECK ((selected_answer = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text])))
);


--
-- Name: player_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    game_session_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now(),
    left_at timestamp with time zone,
    total_points integer DEFAULT 0
);


--
-- Name: player_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    total_games_played integer DEFAULT 0,
    total_points integer DEFAULT 0,
    total_correct_answers integer DEFAULT 0,
    total_questions_answered integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    display_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    account_status text DEFAULT 'active'::text,
    CONSTRAINT profiles_account_status_check CHECK ((account_status = ANY (ARRAY['active'::text, 'suspended'::text, 'deleted'::text])))
);


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trivia_set_id uuid NOT NULL,
    question_text text NOT NULL,
    option_a text NOT NULL,
    option_b text NOT NULL,
    option_c text NOT NULL,
    option_d text NOT NULL,
    correct_answer text NOT NULL,
    time_limit_seconds integer DEFAULT 30 NOT NULL,
    order_index integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT questions_correct_answer_check CHECK ((correct_answer = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text])))
);


--
-- Name: trivia_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trivia_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    theme text,
    difficulty text,
    topic text,
    is_preset boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: game_sessions game_sessions_game_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_sessions
    ADD CONSTRAINT game_sessions_game_code_key UNIQUE (game_code);


--
-- Name: game_sessions game_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_sessions
    ADD CONSTRAINT game_sessions_pkey PRIMARY KEY (id);


--
-- Name: player_answers player_answers_game_session_id_player_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_answers
    ADD CONSTRAINT player_answers_game_session_id_player_id_question_id_key UNIQUE (game_session_id, player_id, question_id);


--
-- Name: player_answers player_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_answers
    ADD CONSTRAINT player_answers_pkey PRIMARY KEY (id);


--
-- Name: player_sessions player_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_sessions
    ADD CONSTRAINT player_sessions_pkey PRIMARY KEY (id);


--
-- Name: player_sessions player_sessions_player_id_game_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_sessions
    ADD CONSTRAINT player_sessions_player_id_game_session_id_key UNIQUE (player_id, game_session_id);


--
-- Name: player_stats player_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_pkey PRIMARY KEY (id);


--
-- Name: player_stats player_stats_player_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_player_id_key UNIQUE (player_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: trivia_sets trivia_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trivia_sets
    ADD CONSTRAINT trivia_sets_pkey PRIMARY KEY (id);


--
-- Name: game_sessions unique_active_game_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_sessions
    ADD CONSTRAINT unique_active_game_code UNIQUE (game_code);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_game_sessions_game_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_game_sessions_game_code ON public.game_sessions USING btree (game_code);


--
-- Name: game_sessions trigger_update_player_stats_on_game_end; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_player_stats_on_game_end AFTER UPDATE ON public.game_sessions FOR EACH ROW EXECUTE FUNCTION public.update_player_stats_on_game_end();


--
-- Name: events update_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: player_sessions update_stats_on_session_end; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stats_on_session_end AFTER UPDATE OF left_at ON public.player_sessions FOR EACH ROW WHEN (((new.left_at IS NOT NULL) AND (old.left_at IS NULL))) EXECUTE FUNCTION public.update_player_stats();


--
-- Name: trivia_sets update_trivia_sets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_trivia_sets_updated_at BEFORE UPDATE ON public.trivia_sets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events events_assigned_host_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_assigned_host_id_fkey FOREIGN KEY (assigned_host_id) REFERENCES auth.users(id);


--
-- Name: events events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: events events_trivia_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_trivia_set_id_fkey FOREIGN KEY (trivia_set_id) REFERENCES public.trivia_sets(id);


--
-- Name: game_sessions game_sessions_current_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_sessions
    ADD CONSTRAINT game_sessions_current_question_id_fkey FOREIGN KEY (current_question_id) REFERENCES public.questions(id);


--
-- Name: game_sessions game_sessions_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_sessions
    ADD CONSTRAINT game_sessions_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: game_sessions game_sessions_host_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_sessions
    ADD CONSTRAINT game_sessions_host_id_fkey FOREIGN KEY (host_id) REFERENCES auth.users(id);


--
-- Name: player_answers player_answers_game_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_answers
    ADD CONSTRAINT player_answers_game_session_id_fkey FOREIGN KEY (game_session_id) REFERENCES public.game_sessions(id) ON DELETE CASCADE;


--
-- Name: player_answers player_answers_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_answers
    ADD CONSTRAINT player_answers_player_id_fkey FOREIGN KEY (player_id) REFERENCES auth.users(id);


--
-- Name: player_answers player_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_answers
    ADD CONSTRAINT player_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id);


--
-- Name: player_sessions player_sessions_game_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_sessions
    ADD CONSTRAINT player_sessions_game_session_id_fkey FOREIGN KEY (game_session_id) REFERENCES public.game_sessions(id) ON DELETE CASCADE;


--
-- Name: player_sessions player_sessions_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_sessions
    ADD CONSTRAINT player_sessions_player_id_fkey FOREIGN KEY (player_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: player_stats player_stats_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_player_id_fkey FOREIGN KEY (player_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: questions questions_trivia_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_trivia_set_id_fkey FOREIGN KEY (trivia_set_id) REFERENCES public.trivia_sets(id) ON DELETE CASCADE;


--
-- Name: trivia_sets trivia_sets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trivia_sets
    ADD CONSTRAINT trivia_sets_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: questions Admins and hosts can view questions with answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and hosts can view questions with answers" ON public.questions FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'host'::public.app_role)));


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: events Admins can manage events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage events" ON public.events TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: questions Admins can manage questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage questions" ON public.questions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: trivia_sets Admins can manage trivia sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage trivia sets" ON public.trivia_sets TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: player_sessions Authenticated users can insert their own player sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert their own player sessions" ON public.player_sessions FOR INSERT WITH CHECK ((auth.uid() = player_id));


--
-- Name: events Everyone can view events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view events" ON public.events FOR SELECT TO authenticated USING (true);


--
-- Name: trivia_sets Everyone can view trivia sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view trivia sets" ON public.trivia_sets FOR SELECT TO authenticated USING (true);


--
-- Name: game_sessions Hosts can manage their game sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Hosts can manage their game sessions" ON public.game_sessions TO authenticated USING ((public.has_role(auth.uid(), 'host'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: game_sessions Hosts can update their own game sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Hosts can update their own game sessions" ON public.game_sessions FOR UPDATE USING (((host_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: game_sessions Hosts can view their own game sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Hosts can view their own game sessions" ON public.game_sessions FOR SELECT USING (((host_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: player_sessions Only hosts and admins can update player sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only hosts and admins can update player sessions" ON public.player_sessions FOR UPDATE USING ((public.has_role(auth.uid(), 'host'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: player_answers Players can insert own answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Players can insert own answers" ON public.player_answers FOR INSERT TO authenticated WITH CHECK ((player_id = auth.uid()));


--
-- Name: game_sessions Players can view active game sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Players can view active game sessions" ON public.game_sessions FOR SELECT TO authenticated USING (true);


--
-- Name: player_stats Players can view all stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Players can view all stats" ON public.player_stats FOR SELECT TO authenticated USING (true);


--
-- Name: player_answers Players can view own answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Players can view own answers" ON public.player_answers FOR SELECT TO authenticated USING (((player_id = auth.uid()) OR public.has_role(auth.uid(), 'host'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: player_sessions Players can view their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Players can view their own sessions" ON public.player_sessions FOR SELECT TO authenticated USING (((player_id = auth.uid()) OR public.has_role(auth.uid(), 'host'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: profiles Suspended users cannot access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suspended users cannot access" ON public.profiles USING (((account_status <> 'suspended'::text) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: player_stats System can insert player stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert player stats" ON public.player_stats FOR INSERT TO authenticated WITH CHECK ((player_id = auth.uid()));


--
-- Name: player_stats System can update player stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update player stats" ON public.player_stats FOR UPDATE TO authenticated USING ((player_id = auth.uid()));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: game_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: player_answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.player_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: player_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.player_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: player_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

--
-- Name: trivia_sets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trivia_sets ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


