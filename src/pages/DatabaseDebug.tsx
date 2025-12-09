import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export const DatabaseDebug = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      user: null,
      events: null,
      userRoles: null,
      triviaSets: null,
      errors: []
    };

    try {
      // 1. Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        diagnostics.errors.push({ step: "Get User", error: userError.message });
      } else {
        diagnostics.user = {
          id: userData.user?.id,
          email: userData.user?.email,
        };
      }

      // 2. Get user roles
      if (userData.user) {
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("*")
          .eq("user_id", userData.user.id);

        if (rolesError) {
          diagnostics.errors.push({ step: "Get Roles", error: rolesError.message });
        } else {
          diagnostics.userRoles = roles;
        }
      }

      // 3. Get all events (raw query)
      const { data: allEvents, error: allEventsError } = await supabase
        .from("events")
        .select("id, title, event_date, event_time, status, assigned_host_id, created_by")
        .order("created_at", { ascending: false })
        .limit(20);

      if (allEventsError) {
        diagnostics.errors.push({ step: "Get All Events", error: allEventsError.message });
      } else {
        diagnostics.events = {
          total: allEvents?.length || 0,
          list: allEvents,
          yourEvents: allEvents?.filter(e => e.assigned_host_id === userData.user?.id || e.created_by === userData.user?.id)
        };
      }

      // 4. Get trivia sets
      const { data: triviaSets, error: triviaSetsError } = await supabase
        .from("trivia_sets")
        .select("id, title")
        .limit(10);

      if (triviaSetsError) {
        diagnostics.errors.push({ step: "Get Trivia Sets", error: triviaSetsError.message });
      } else {
        diagnostics.triviaSets = triviaSets;
      }

      // 5. Check game_sessions constraint
      const { data: constraintCheck, error: constraintError } = await supabase
        .rpc('check_constraint', { table_name: 'game_sessions' })
        .single();

      if (constraintError) {
        diagnostics.constraintCheck = "Could not check (expected - this is OK)";
      } else {
        diagnostics.constraintCheck = constraintCheck;
      }

    } catch (error: any) {
      diagnostics.errors.push({ step: "General Error", error: error.message });
    }

    setResults(diagnostics);
    setLoading(false);
  };

  const applyMigration = async () => {
    if (!confirm("This will update the database trigger. Continue?")) return;

    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
CREATE OR REPLACE FUNCTION public.update_player_stats_on_game_end()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
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
        `
      });

      if (error) {
        alert("Migration failed: " + error.message + "\n\nYou'll need to apply this manually in Supabase SQL Editor.");
      } else {
        alert("Migration applied successfully!");
        runDiagnostics();
      }
    } catch (error: any) {
      alert("Error: " + error.message + "\n\nThis function might not exist. You'll need to apply the migration manually in Supabase SQL Editor.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero wood-texture p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-6 elegant-card">
          <h1 className="text-3xl font-bold text-primary mb-4">Database Diagnostics</h1>
          <p className="text-muted-foreground mb-6">
            This page helps diagnose database and permission issues.
          </p>

          <div className="flex gap-4 mb-6">
            <Button onClick={runDiagnostics} disabled={loading}>
              {loading ? "Running..." : "Run Diagnostics"}
            </Button>
            <Button onClick={applyMigration} variant="secondary">
              Apply Migration (Experimental)
            </Button>
          </div>

          {Object.keys(results).length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-primary">Results:</h2>

              {/* User Info */}
              <Card className="p-4 bg-muted/20">
                <h3 className="font-bold mb-2">Current User:</h3>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(results.user, null, 2)}
                </pre>
              </Card>

              {/* User Roles */}
              <Card className="p-4 bg-muted/20">
                <h3 className="font-bold mb-2">User Roles:</h3>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(results.userRoles, null, 2)}
                </pre>
              </Card>

              {/* Events */}
              <Card className="p-4 bg-muted/20">
                <h3 className="font-bold mb-2">Events:</h3>
                <p className="text-sm mb-2">
                  Total: {results.events?.total || 0} |
                  Your Events: {results.events?.yourEvents?.length || 0}
                </p>
                <div className="max-h-96 overflow-auto">
                  <pre className="text-xs">
                    {JSON.stringify(results.events, null, 2)}
                  </pre>
                </div>
              </Card>

              {/* Trivia Sets */}
              <Card className="p-4 bg-muted/20">
                <h3 className="font-bold mb-2">Trivia Sets:</h3>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(results.triviaSets, null, 2)}
                </pre>
              </Card>

              {/* Errors */}
              {results.errors && results.errors.length > 0 && (
                <Card className="p-4 bg-red-500/10 border-red-500">
                  <h3 className="font-bold mb-2 text-red-500">Errors:</h3>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(results.errors, null, 2)}
                  </pre>
                </Card>
              )}

              {/* Summary */}
              <Card className="p-4 bg-primary/10">
                <h3 className="font-bold mb-2">Summary:</h3>
                <ul className="text-sm space-y-1">
                  <li>✓ User authenticated: {results.user?.id ? 'Yes' : 'No'}</li>
                  <li>✓ User has roles: {results.userRoles?.length > 0 ? 'Yes (' + results.userRoles?.map((r: any) => r.role).join(', ') + ')' : 'No'}</li>
                  <li>✓ Events in database: {results.events?.total || 0}</li>
                  <li>✓ Events assigned to you: {results.events?.yourEvents?.length || 0}</li>
                  <li>✓ Trivia sets available: {results.triviaSets?.length || 0}</li>
                  <li>✓ Errors encountered: {results.errors?.length || 0}</li>
                </ul>
              </Card>
            </div>
          )}
        </Card>

        <Card className="p-6 elegant-card">
          <h2 className="text-xl font-bold text-primary mb-4">Manual SQL for Supabase Dashboard</h2>
          <p className="text-sm text-muted-foreground mb-4">
            If the automatic migration doesn't work, copy this SQL and run it in your Supabase SQL Editor:
          </p>
          <pre className="bg-muted/20 p-4 rounded text-xs overflow-auto">
{`CREATE OR REPLACE FUNCTION public.update_player_stats_on_game_end()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
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
$$;`}
          </pre>
        </Card>
      </div>
    </div>
  );
};

export default DatabaseDebug;
