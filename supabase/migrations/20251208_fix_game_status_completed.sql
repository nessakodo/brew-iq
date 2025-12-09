-- Fix the trigger to use 'completed' instead of 'ended'
-- The check constraint only allows: lobby, active, paused, completed
-- But the trigger was looking for 'ended' which would never match

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
