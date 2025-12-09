import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Clock, Users, Target } from "lucide-react";

interface GameStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameSessionId: string;
}

interface TopPlayer {
  player_id: string;
  display_name: string;
  total_points: number;
  rank: number;
}

interface GameInfo {
  gameCode: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
  duration: string;
  totalPlayers: number;
  totalQuestions: number;
}

export const GameStatsModal = ({ isOpen, onClose, gameSessionId }: GameStatsModalProps) => {
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && gameSessionId) {
      fetchGameStats();
    }
  }, [isOpen, gameSessionId]);

  const fetchGameStats = async () => {
    try {
      setLoading(true);

      // Fetch game session info
      const { data: session } = await supabase
        .from("game_sessions")
        .select(`
          game_code,
          created_at,
          started_at,
          ended_at,
          events (
            title
          )
        `)
        .eq("id", gameSessionId)
        .single();

      if (!session) return;

      // Get all player sessions for this game
      const { data: playerSessions } = await supabase
        .from("player_sessions")
        .select("player_id")
        .eq("game_session_id", gameSessionId);

      const playerIds = playerSessions?.map(p => p.player_id) || [];

      // Get all answers for this game
      const { data: answers } = await supabase
        .from("player_answers")
        .select("player_id, points_earned, question_id")
        .eq("game_session_id", gameSessionId);

      // Calculate total points per player
      const playerPoints = new Map<string, number>();
      playerIds.forEach(id => playerPoints.set(id, 0));

      answers?.forEach(answer => {
        const current = playerPoints.get(answer.player_id) || 0;
        playerPoints.set(answer.player_id, current + (answer.points_earned || 0));
      });

      // Count unique questions
      const uniqueQuestions = new Set(answers?.map(a => a.question_id) || []);

      // Sort players and get top 5
      const sortedPlayers = Array.from(playerPoints.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // Fetch player profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", sortedPlayers.map(([id]) => id));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const top5 = sortedPlayers.map(([playerId, points], index) => ({
        player_id: playerId,
        display_name: profileMap.get(playerId)?.display_name ||
                     profileMap.get(playerId)?.email?.split('@')[0] ||
                     'Unknown Player',
        total_points: points,
        rank: index + 1
      }));

      setTopPlayers(top5);

      // Calculate duration
      const startTime = session.started_at || session.created_at;
      const endTime = session.ended_at || new Date().toISOString();
      const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
      const durationMinutes = Math.floor(durationMs / 60000);
      const durationSeconds = Math.floor((durationMs % 60000) / 1000);

      setGameInfo({
        gameCode: session.game_code,
        eventTitle: (session.events as any)?.title || 'Unknown Event',
        startTime: new Date(startTime).toLocaleString(),
        endTime: new Date(endTime).toLocaleString(),
        duration: `${durationMinutes}m ${durationSeconds}s`,
        totalPlayers: playerIds.length,
        totalQuestions: uniqueQuestions.size
      });
    } catch (error) {
      console.error("Error fetching game stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-amber-600";
    return "text-muted-foreground";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto leather-texture border-2 border-primary/40">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
            <Trophy className="h-6 w-6 text-secondary" />
            Game Statistics
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading stats...</div>
        ) : (
          <div className="space-y-6">
            {/* Game Info */}
            {gameInfo && (
              <Card className="p-4 elegant-card">
                <h3 className="text-lg font-bold text-primary mb-3">{gameInfo.eventTitle}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Game Code</p>
                    <p className="text-xl font-bold text-foreground tracking-widest">{gameInfo.gameCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Duration
                    </p>
                    <p className="text-xl font-bold text-accent">{gameInfo.duration}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Total Players
                    </p>
                    <p className="text-xl font-bold text-primary">{gameInfo.totalPlayers}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      Questions
                    </p>
                    <p className="text-xl font-bold text-foreground">{gameInfo.totalQuestions}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Top 5 Players */}
            <Card className="p-4 elegant-card">
              <h3 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-secondary warm-glow" />
                Top 5 Players
              </h3>
              <div className="space-y-3">
                {topPlayers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No players</p>
                ) : (
                  topPlayers.map((player) => (
                    <div
                      key={player.player_id}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        player.rank === 1 ? 'bg-yellow-500/20 border-2 border-yellow-500/40' :
                        player.rank === 2 ? 'bg-gray-400/20 border-2 border-gray-400/40' :
                        player.rank === 3 ? 'bg-amber-600/20 border-2 border-amber-600/40' :
                        'bg-muted/20 border border-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-bold ${getRankColor(player.rank)}`}>
                          {getRankEmoji(player.rank)}
                        </span>
                        <span className="text-lg font-semibold text-foreground">
                          {player.display_name}
                        </span>
                      </div>
                      <span className="text-xl font-bold text-secondary">
                        {player.total_points} pts
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
