import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";

interface Winner {
  player_id: string;
  display_name: string;
  total_points: number;
  rank: number; // 1, 2, or 3
}

interface WinnerRevealProps {
  winners: Winner[]; // Top 5 winners, sorted by rank (1st to 5th)
  onComplete?: () => void;
  duration?: number; // Duration per winner in ms
  showTop5?: boolean; // If true, shows all top 5; otherwise shows top 3 only
}

export const WinnerReveal = ({ winners, onComplete, duration = 2000, showTop5 = false }: WinnerRevealProps) => {
  const [currentRevealIndex, setCurrentRevealIndex] = useState(-1);
  const [showAllWinners, setShowAllWinners] = useState(false);

  useEffect(() => {
    if (winners.length === 0) return;

    // Reveal top 3 one by one (3rd, 2nd, 1st)
    const revealOrder = [2, 1, 0].filter(i => i < winners.length);

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < revealOrder.length) {
        setCurrentRevealIndex(revealOrder[currentStep]);
        currentStep++;
      } else {
        clearInterval(interval);

        if (showTop5 && winners.length > 3) {
          // Show all top 5 after revealing top 3
          setTimeout(() => {
            setShowAllWinners(true);
            setTimeout(() => {
              onComplete?.();
            }, duration * 2);
          }, duration);
        } else {
          // Call onComplete after all reveals
          setTimeout(() => {
            onComplete?.();
          }, duration);
        }
      }
    }, duration);

    return () => clearInterval(interval);
  }, [winners, duration, onComplete, showTop5]);

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

  const getRankBgColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-500/20 border-yellow-500";
    if (rank === 2) return "bg-gray-400/20 border-gray-400";
    if (rank === 3) return "bg-amber-600/20 border-amber-600";
    return "bg-primary/20 border-primary";
  };

  const getRankTitle = (rank: number) => {
    if (rank === 1) return "Champion!";
    if (rank === 2) return "Runner-Up!";
    if (rank === 3) return "Third Place!";
    return "";
  };

  return (
    <div className="min-h-screen bg-gradient-hero wood-texture flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        {/* Trophy Header */}
        <div className="text-center animate-in fade-in duration-500">
          <Trophy className="h-20 w-20 text-secondary mx-auto mb-4 animate-bounce" />
          <h1 className="text-5xl font-bold text-primary warm-glow mb-2">
            Final Results
          </h1>
          <p className="text-xl text-muted-foreground">
            Congratulations to our winners!
          </p>
        </div>

        {/* Winners Display */}
        {!showAllWinners ? (
          <div className="space-y-6">
            {winners.slice(0, 3).map((winner, index) => {
              const isRevealed = index <= currentRevealIndex;
              const isCurrentlyRevealing = index === currentRevealIndex;

              return (
                <div
                  key={winner.player_id}
                  className={`transition-all duration-700 ${
                    isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                >
                  <Card
                    className={`p-6 border-4 ${getRankBgColor(winner.rank)} ${
                      isCurrentlyRevealing ? 'animate-in zoom-in scale-105 shadow-2xl' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`text-6xl ${isCurrentlyRevealing ? 'animate-bounce' : ''}`}>
                          {getRankEmoji(winner.rank)}
                        </div>
                        <div>
                          <p className={`text-3xl font-bold ${getRankColor(winner.rank)}`}>
                            {getRankTitle(winner.rank)}
                          </p>
                          <p className="text-2xl font-semibold text-foreground mt-1">
                            {winner.display_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-4xl font-bold text-secondary">
                          {winner.total_points}
                        </p>
                        <p className="text-sm text-muted-foreground">points</p>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        ) : (
          /* Show all top 5 */
          <div className="space-y-4 animate-in fade-in duration-700">
            <h2 className="text-2xl font-bold text-center text-primary warm-glow mb-4">
              Top 5 Players
            </h2>
            {winners.map((winner) => (
              <Card
                key={winner.player_id}
                className={`p-4 border-2 ${getRankBgColor(winner.rank)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-3xl ${getRankColor(winner.rank)}`}>
                      {getRankEmoji(winner.rank)}
                    </span>
                    <div>
                      {winner.rank <= 3 && (
                        <p className={`text-lg font-bold ${getRankColor(winner.rank)}`}>
                          {getRankTitle(winner.rank)}
                        </p>
                      )}
                      <p className="text-xl font-semibold text-foreground">
                        {winner.display_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-secondary">
                      {winner.total_points}
                    </p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* All revealed message */}
        {currentRevealIndex >= 2 && !showAllWinners && (
          <div className="text-center animate-in fade-in duration-700 delay-300">
            <p className="text-xl text-primary font-semibold">
              🎉 Amazing performance everyone! 🎉
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
