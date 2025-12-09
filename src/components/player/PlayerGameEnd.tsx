import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Trophy, Star } from "lucide-react";

interface PlayerGameEndProps {
  playerName: string;
  playerRank: number;
  playerScore: number;
  totalPlayers: number;
  top5Players: Array<{
    player_id: string;
    display_name: string;
    total_points: number;
    rank: number;
  }>;
  onComplete?: () => void;
}

export const PlayerGameEnd = ({
  playerName,
  playerRank,
  playerScore,
  totalPlayers,
  top5Players,
  onComplete
}: PlayerGameEndProps) => {
  const [revealStep, setRevealStep] = useState(0);
  // Step 0: Show player's rank
  // Step 1-3: Reveal 3rd, 2nd, 1st place
  // Step 4: Show full top 5
  // Step 5: Thank you message

  useEffect(() => {
    const timings = [2000, 2000, 2000, 2000, 2500, 3000]; // Duration for each step

    const timer = setTimeout(() => {
      if (revealStep < 5) {
        setRevealStep(prev => prev + 1);
      } else {
        // Complete and redirect
        onComplete?.();
      }
    }, timings[revealStep]);

    return () => clearTimeout(timer);
  }, [revealStep, onComplete]);

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-amber-600";
    return "text-primary";
  };

  const getRankMessage = (rank: number, total: number) => {
    if (rank === 1) return "You're the Champion!";
    if (rank === 2) return "Runner-Up!";
    if (rank === 3) return "Third Place!";
    if (rank <= total / 2) return "Great Job!";
    return "Nice Try!";
  };

  return (
    <div className="min-h-screen bg-gradient-hero wood-texture flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Step 0: Player's Rank */}
        {revealStep === 0 && (
          <Card className="p-8 leather-texture border-2 border-primary/40 text-center animate-in fade-in zoom-in duration-700">
            <Trophy className="h-20 w-20 text-secondary mx-auto mb-6 animate-bounce" />
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Game Complete!
            </h2>
            <div className={`text-6xl font-bold mb-4 ${getRankColor(playerRank)} animate-in zoom-in duration-500 delay-300`}>
              #{playerRank}
            </div>
            <p className="text-2xl font-semibold text-secondary mb-4">
              {getRankMessage(playerRank, totalPlayers)}
            </p>
            <p className="text-xl text-primary font-bold">
              Final Score: {playerScore} points
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Out of {totalPlayers} {totalPlayers === 1 ? 'player' : 'players'}
            </p>
          </Card>
        )}

        {/* Steps 1-3: Reveal Top 3 */}
        {revealStep >= 1 && revealStep <= 3 && (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-center text-primary warm-glow mb-6 animate-in fade-in">
              Top Players
            </h2>
            {top5Players.slice(0, 3).reverse().map((player, index) => {
              const actualRank = 3 - index; // 3, 2, 1
              const shouldShow = revealStep >= (4 - actualRank); // Show when step matches

              if (!shouldShow) return null;

              const isCurrentlyRevealing = revealStep === (4 - actualRank);

              return (
                <Card
                  key={player.player_id}
                  className={`p-6 border-4 transition-all duration-700 animate-in slide-in-from-bottom ${
                    actualRank === 1 ? 'bg-yellow-500/20 border-yellow-500' :
                    actualRank === 2 ? 'bg-gray-400/20 border-gray-400' :
                    'bg-amber-600/20 border-amber-600'
                  } ${isCurrentlyRevealing ? 'scale-105 shadow-2xl' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`text-5xl ${isCurrentlyRevealing ? 'animate-bounce' : ''}`}>
                        {getRankEmoji(actualRank)}
                      </div>
                      <div>
                        <p className={`text-2xl font-bold ${getRankColor(actualRank)}`}>
                          {actualRank === 1 ? 'Champion!' : actualRank === 2 ? 'Runner-Up!' : 'Third Place!'}
                        </p>
                        <p className="text-xl font-semibold text-foreground">
                          {player.display_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-secondary">
                        {player.total_points}
                      </p>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Step 4: Show Full Top 5 */}
        {revealStep === 4 && (
          <div className="space-y-4 animate-in fade-in duration-700">
            <h2 className="text-3xl font-bold text-center text-primary warm-glow mb-6">
              Top 5 Players
            </h2>
            {top5Players.map((player, index) => {
              const isPlayer = playerRank === player.rank;

              return (
                <Card
                  key={player.player_id}
                  className={`p-4 transition-all ${
                    isPlayer
                      ? 'bg-primary/20 border-2 border-primary/60 scale-105'
                      : index < 3
                      ? 'bg-secondary/10 border border-secondary/20'
                      : 'bg-muted/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${
                        index === 0 ? 'text-yellow-500' :
                        index === 1 ? 'text-gray-400' :
                        index === 2 ? 'text-amber-600' :
                        'text-muted-foreground'
                      }`}>
                        {index < 3 ? getRankEmoji(index + 1) : `#${index + 1}`}
                      </span>
                      <div>
                        <p className={`text-lg font-semibold ${isPlayer ? 'text-primary' : 'text-foreground'}`}>
                          {player.display_name}
                          {isPlayer && <span className="ml-2 text-sm text-primary">(You)</span>}
                        </p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-secondary">
                      {player.total_points}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Step 5: Thank You Message */}
        {revealStep === 5 && (
          <Card className="p-8 leather-texture border-2 border-secondary/40 text-center animate-in fade-in zoom-in duration-700">
            <Star className="h-16 w-16 text-secondary mx-auto mb-4 animate-pulse" />
            <h2 className="text-4xl font-bold text-secondary warm-glow mb-4">
              Thanks for Playing, {playerName}!
            </h2>
            <p className="text-xl text-foreground mb-4">
              We hope you had a great time!
            </p>
            <p className="text-lg text-muted-foreground">
              Redirecting to join game screen...
            </p>
            <div className="flex justify-center gap-2 mt-6">
              <span className="w-3 h-3 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-3 h-3 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-3 h-3 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
