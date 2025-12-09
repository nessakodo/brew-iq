import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Target, TrendingUp, Medal, Users } from "lucide-react";

// Format large numbers as 1.2k, 1.5M, etc.
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
};

interface PlayerStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  currentSessionId?: string;
  currentGamePoints?: number; // Pass frozen score from parent during active game
  lastGameStats?: {
    points: number;
    rank: number;
    totalPlayers: number;
  }; // For showing last game stats on join screen
}

interface PlayerStats {
  total_games_played: number;
  total_points: number;
  total_correct_answers: number;
  total_questions_answered: number;
}

interface CurrentGameStats {
  rank: number;
  totalPlayers: number;
  currentPoints: number;
}

interface LeaderboardEntry {
  player_id: string;
  display_name: string;
  total_points: number;
  total_games_played: number;
}

export const PlayerStatsModal = ({
  isOpen,
  onClose,
  playerId,
  currentSessionId,
  currentGamePoints,
  lastGameStats
}: PlayerStatsModalProps) => {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [currentGameStats, setCurrentGameStats] = useState<CurrentGameStats | null>(null);
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && playerId) {
      fetchPlayerStats();
      if (currentSessionId && currentGamePoints === undefined) {
        // Only fetch if currentGamePoints not provided (e.g., from join screen)
        fetchCurrentGameStats();
      } else if (currentSessionId && currentGamePoints !== undefined) {
        // Use provided frozen score for current game
        fetchCurrentGameStatsWithProvidedPoints(currentGamePoints);
      }
      fetchAllTimeLeaderboard();
    }
  }, [isOpen, playerId, currentSessionId, currentGamePoints]);

  const fetchPlayerStats = async () => {
    try {
      // Get base stats from player_stats table
      const { data, error } = await supabase
        .from("player_stats")
        .select("*")
        .eq("player_id", playerId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching player stats:", error);
        return;
      }

      // Calculate actual games played from player_sessions where player has answered at least one question
      const { data: participatedGames } = await supabase
        .from("player_sessions")
        .select("game_session_id")
        .eq("player_id", playerId);

      // Get all game sessions where player has answered questions
      const { data: answeredGames } = await supabase
        .from("player_answers")
        .select("game_session_id")
        .eq("player_id", playerId);

      // Count unique game sessions where player has answered at least one question
      const uniqueGames = new Set(answeredGames?.map(a => a.game_session_id) || []);
      const actualGamesPlayed = uniqueGames.size;

      setStats({
        total_games_played: actualGamesPlayed,
        total_points: data?.total_points || 0,
        total_correct_answers: data?.total_correct_answers || 0,
        total_questions_answered: data?.total_questions_answered || 0
      });
    } catch (error) {
      console.error("Error fetching player stats:", error);
    }
  };

  const fetchCurrentGameStatsWithProvidedPoints = async (providedPoints: number) => {
    if (!currentSessionId) return;

    try {
      // Get all players in this session
      const { data: playerSessions } = await supabase
        .from("player_sessions")
        .select("player_id")
        .eq("game_session_id", currentSessionId);

      if (!playerSessions) return;

      // Get all answers for this session
      const { data: answers } = await supabase
        .from("player_answers")
        .select("player_id, points_earned")
        .eq("game_session_id", currentSessionId);

      // Calculate total points per player
      const playerPoints = new Map<string, number>();

      // Initialize all players with 0 points
      playerSessions.forEach(ps => {
        playerPoints.set(ps.player_id, 0);
      });

      // Add points from answers
      answers?.forEach(answer => {
        const current = playerPoints.get(answer.player_id) || 0;
        playerPoints.set(answer.player_id, current + (answer.points_earned || 0));
      });

      // Override current player's points with provided frozen score
      playerPoints.set(playerId, providedPoints);

      // Sort players by points to get rank (highest first)
      const sortedPlayers = Array.from(playerPoints.entries())
        .sort((a, b) => b[1] - a[1]);

      const rank = sortedPlayers.findIndex(([id]) => id === playerId) + 1;

      console.log('Current game stats (frozen):', { rank, totalPlayers: playerPoints.size, currentPoints: providedPoints });

      setCurrentGameStats({
        rank: rank || sortedPlayers.length + 1,
        totalPlayers: playerPoints.size,
        currentPoints: providedPoints
      });
    } catch (error) {
      console.error("Error fetching current game stats with provided points:", error);
    }
  };

  const fetchCurrentGameStats = async () => {
    if (!currentSessionId) return;

    try {
      // Get all players in this session
      const { data: playerSessions } = await supabase
        .from("player_sessions")
        .select("player_id")
        .eq("game_session_id", currentSessionId);

      if (!playerSessions) return;

      // Get all answers for this session
      const { data: answers } = await supabase
        .from("player_answers")
        .select("player_id, points_earned")
        .eq("game_session_id", currentSessionId);

      // Calculate total points per player
      const playerPoints = new Map<string, number>();

      // Initialize all players with 0 points
      playerSessions.forEach(ps => {
        playerPoints.set(ps.player_id, 0);
      });

      // Add points from answers
      answers?.forEach(answer => {
        const current = playerPoints.get(answer.player_id) || 0;
        playerPoints.set(answer.player_id, current + (answer.points_earned || 0));
      });

      // Get current player's points
      const currentPoints = playerPoints.get(playerId) || 0;

      // Sort players by points to get rank (highest first)
      const sortedPlayers = Array.from(playerPoints.entries())
        .sort((a, b) => b[1] - a[1]);

      const rank = sortedPlayers.findIndex(([id]) => id === playerId) + 1;

      console.log('Current game stats:', { rank, totalPlayers: playerPoints.size, currentPoints, sortedPlayers });

      setCurrentGameStats({
        rank: rank || sortedPlayers.length + 1, // If not found, put at end
        totalPlayers: playerPoints.size,
        currentPoints
      });
    } catch (error) {
      console.error("Error fetching current game stats:", error);
    }
  };

  const fetchAllTimeLeaderboard = async () => {
    try {
      const { data: statsData } = await supabase
        .from("player_stats")
        .select("player_id, total_points, total_games_played")
        .order("total_points", { ascending: false })
        .limit(10);

      if (!statsData) {
        setAllTimeLeaderboard([]);
        return;
      }

      // Get player names
      const playerIds = statsData.map(s => s.player_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", playerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const leaderboard = statsData.map(stat => ({
        player_id: stat.player_id,
        display_name: profileMap.get(stat.player_id)?.display_name ||
                     profileMap.get(stat.player_id)?.email?.split('@')[0] ||
                     'Unknown Player',
        total_points: stat.total_points,
        total_games_played: stat.total_games_played
      }));

      setAllTimeLeaderboard(leaderboard);
    } catch (error) {
      console.error("Error fetching all-time leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const accuracy = stats && stats.total_questions_answered > 0
    ? Math.round((stats.total_correct_answers / stats.total_questions_answered) * 100)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto leather-texture border-2 border-primary/40 w-[calc(100%-2rem)] sm:w-full">
        <DialogHeader className="px-2 sm:px-0">
          <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
            <Trophy className="h-6 w-6 text-secondary" />
            Your Stats
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground px-4">Loading stats...</div>
        ) : (
          <div className="space-y-6 px-2 sm:px-0">
            {/* Current Game Stats or Last Game Stats */}
            {lastGameStats ? (
              <Card className="p-4 elegant-card subtle-green-accent">
                <h3 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                  <Medal className="h-5 w-5" />
                  Last Game Played
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-secondary">#{lastGameStats.rank}</p>
                    <p className="text-xs text-muted-foreground">Your Rank</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{formatNumber(lastGameStats.points)}</p>
                    <p className="text-xs text-muted-foreground">Points</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{lastGameStats.totalPlayers}</p>
                    <p className="text-xs text-muted-foreground">Players</p>
                  </div>
                </div>
              </Card>
            ) : currentGameStats && currentGameStats.rank > 0 ? (
              <Card className="p-4 elegant-card subtle-green-accent">
                <h3 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                  <Medal className="h-5 w-5" />
                  Current Game
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-secondary">#{currentGameStats.rank}</p>
                    <p className="text-xs text-muted-foreground">Your Rank</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{formatNumber(currentGameStats.currentPoints)}</p>
                    <p className="text-xs text-muted-foreground">Points</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{currentGameStats.totalPlayers}</p>
                    <p className="text-xs text-muted-foreground">Players</p>
                  </div>
                </div>
              </Card>
            ) : null}

            {/* Overall Stats */}
            <Card className="p-4 elegant-card">
              <h3 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Career Stats
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center p-3 rounded-lg bg-card/60 vintage-border">
                  <Trophy className="h-5 w-5 mx-auto mb-1 text-secondary" />
                  <p className="text-2xl font-bold text-secondary">{formatNumber(stats?.total_games_played || 0)}</p>
                  <p className="text-xs text-muted-foreground">Games</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-card/60 vintage-border">
                  <Target className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold text-primary">{formatNumber(stats?.total_points || 0)}</p>
                  <p className="text-xs text-muted-foreground">Total Points</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-card/60 vintage-border">
                  <TrendingUp className="h-5 w-5 mx-auto mb-1 text-foreground" />
                  <p className="text-2xl font-bold text-foreground">{accuracy}%</p>
                  <p className="text-xs text-muted-foreground">Accuracy</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-card/60 vintage-border">
                  <Users className="h-5 w-5 mx-auto mb-1 text-accent" />
                  <p className="text-2xl font-bold text-accent">{formatNumber(stats?.total_correct_answers || 0)}</p>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
              </div>
            </Card>

            {/* All-Time Leaderboard */}
            <Card className="p-4 elegant-card">
              <h3 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-secondary warm-glow" />
                All-Time Top Players
              </h3>
              <div className="space-y-2">
                {allTimeLeaderboard.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No stats yet</p>
                ) : (
                  allTimeLeaderboard.map((entry, index) => {
                    const isCurrentPlayer = entry.player_id === playerId;
                    return (
                      <div
                        key={entry.player_id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          isCurrentPlayer
                            ? 'bg-primary/20 border-2 border-primary/40'
                            : index < 3
                            ? 'bg-secondary/10 border border-secondary/20'
                            : 'bg-muted/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold w-8 ${
                            index === 0 ? 'text-yellow-500' :
                            index === 1 ? 'text-gray-400' :
                            index === 2 ? 'text-amber-600' :
                            'text-muted-foreground'
                          }`}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </span>
                          <div>
                            <p className={`font-semibold ${isCurrentPlayer ? 'text-primary' : 'text-foreground'}`}>
                              {entry.display_name}
                              {isCurrentPlayer && <span className="ml-2 text-xs text-primary">(You)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.total_games_played} {entry.total_games_played === 1 ? 'game' : 'games'}
                            </p>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-secondary">
                          {formatNumber(entry.total_points)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
