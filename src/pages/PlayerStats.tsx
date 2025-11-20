import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Calendar, Target, Award, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GameHistory {
  id: string;
  game_code: string;
  created_at: string;
  total_points: number;
  event_title: string;
}

const PlayerStats = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_points: 0,
    total_games_played: 0,
    total_correct_answers: 0,
    total_questions_answered: 0,
  });
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    fetchStats();
    fetchGameHistory();
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user?.id)
        .single();

      if (data) {
        setDisplayName(data.display_name || "Player");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await supabase
        .from("player_stats")
        .select("*")
        .eq("player_id", user?.id)
        .single();

      if (data) {
        setStats({
          total_points: data.total_points || 0,
          total_games_played: data.total_games_played || 0,
          total_correct_answers: data.total_correct_answers || 0,
          total_questions_answered: data.total_questions_answered || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchGameHistory = async () => {
    try {
      const { data } = await supabase
        .from("player_sessions")
        .select(`
          id,
          total_points,
          joined_at,
          game_sessions (
            game_code,
            created_at,
            events (
              title
            )
          )
        `)
        .eq("player_id", user?.id)
        .order("joined_at", { ascending: false })
        .limit(10);

      if (data) {
        const history = data.map((session: any) => ({
          id: session.id,
          game_code: session.game_sessions?.game_code || "N/A",
          created_at: session.game_sessions?.created_at || session.joined_at,
          total_points: session.total_points || 0,
          event_title: session.game_sessions?.events?.title || "Unknown Event",
        }));
        setGameHistory(history);
      }
    } catch (error) {
      console.error("Error fetching game history:", error);
    }
  };

  const accuracy = stats.total_questions_answered > 0
    ? Math.round((stats.total_correct_answers / stats.total_questions_answered) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-hero wood-texture">
      <header className="border-b-2 border-primary/20 bg-card/80 backdrop-blur-sm sticky top-0 z-10 shadow-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-secondary warm-glow">
            BrewIQ Stats
          </h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/play")}>
              Join Game
            </Button>
            <Button variant="ghost" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Player Info */}
        <Card className="p-6 bg-card/80 border-primary/40 leather-texture">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground">{displayName}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-card/80 border-primary/40 text-center">
            <Trophy className="h-8 w-8 text-secondary mx-auto mb-3" />
            <p className="text-4xl font-bold text-foreground mb-2">
              {stats.total_points}
            </p>
            <p className="text-sm text-muted-foreground">Total Points</p>
          </Card>

          <Card className="p-6 bg-card/80 border-primary/40 text-center">
            <Calendar className="h-8 w-8 text-primary mx-auto mb-3" />
            <p className="text-4xl font-bold text-foreground mb-2">
              {stats.total_games_played}
            </p>
            <p className="text-sm text-muted-foreground">Games Played</p>
          </Card>

          <Card className="p-6 bg-card/80 border-primary/40 text-center">
            <Target className="h-8 w-8 text-accent mx-auto mb-3" />
            <p className="text-4xl font-bold text-foreground mb-2">{accuracy}%</p>
            <p className="text-sm text-muted-foreground">Accuracy</p>
          </Card>

          <Card className="p-6 bg-card/80 border-primary/40 text-center">
            <Award className="h-8 w-8 text-primary mx-auto mb-3" />
            <p className="text-4xl font-bold text-foreground mb-2">
              {stats.total_correct_answers}
            </p>
            <p className="text-sm text-muted-foreground">Correct Answers</p>
          </Card>
        </div>

        {/* Game History */}
        <Card className="p-6 bg-card/80 border-primary/40">
          <h3 className="text-2xl font-bold text-foreground mb-6">Recent Games</h3>
          
          {gameHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No games played yet. Join your first game!
            </p>
          ) : (
            <div className="space-y-3">
              {gameHistory.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
                >
                  <div>
                    <p className="font-bold text-foreground">{game.event_title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(game.created_at).toLocaleDateString()} • Code: {game.game_code}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{game.total_points}</p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default PlayerStats;
