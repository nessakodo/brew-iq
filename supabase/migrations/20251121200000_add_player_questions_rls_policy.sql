-- Add RLS policy to allow players in active game sessions to view questions
-- This fixes the "Loading question..." issue where players couldn't see questions during gameplay

CREATE POLICY "Players can view questions during active games" ON public.questions
FOR SELECT USING (
  -- Allow players who are in an active/lobby game session to see questions for that trivia set
  EXISTS (
    SELECT 1 FROM public.player_sessions ps
    JOIN public.game_sessions gs ON gs.id = ps.game_session_id
    JOIN public.events e ON e.id = gs.event_id
    WHERE ps.player_id = auth.uid()
    AND gs.status IN ('lobby', 'active')
    AND e.trivia_set_id = questions.trivia_set_id
  )
);
