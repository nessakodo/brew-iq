import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Clock, Pause, Play, Users } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  time_limit_seconds: number;
  order_index: number;
}

interface PlayerScore {
  player_id: string;
  display_name: string;
  total_points: number;
}

const GamePlay = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([]);
  const [answerCounts, setAnswerCounts] = useState({ a: 0, b: 0, c: 0, d: 0 });
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [answerRevealCountdown, setAnswerRevealCountdown] = useState(15);
  const [leaderboardCountdown, setLeaderboardCountdown] = useState(15);
  const [isPaused, setIsPaused] = useState(false);
  const [playerCount, setPlayerCount] = useState(0);
  const [gameCode, setGameCode] = useState("");

  useEffect(() => {
    fetchQuestions();
    fetchLeaderboard();
    fetchGameInfo();
    setupRealtimeSubscription();

    // Poll for leaderboard updates every 3 seconds
    const leaderboardPoll = setInterval(() => {
      fetchLeaderboard();
    }, 3000);

    return () => clearInterval(leaderboardPoll);
  }, [sessionId]);

  const fetchGameInfo = async () => {
    try {
      const { data: session } = await supabase
        .from("game_sessions")
        .select("game_code")
        .eq("id", sessionId)
        .single();

      if (session) {
        setGameCode(session.game_code);
      }

      // Get player count
      const { count } = await supabase
        .from("player_sessions")
        .select("*", { count: "exact", head: true })
        .eq("game_session_id", sessionId);

      setPlayerCount(count || 0);
    } catch (error) {
      console.error("Error fetching game info:", error);
    }
  };

  useEffect(() => {
    if (currentQuestionIndex < questions.length) {
      setTimeRemaining(questions[currentQuestionIndex]?.time_limit_seconds || 30);
      setShowAnswer(false);
      setShowLeaderboard(false);
      setAnswerRevealCountdown(15);
      setLeaderboardCountdown(15);
      updateCurrentQuestion();
    }
  }, [currentQuestionIndex, questions]);

  useEffect(() => {
    if (timeRemaining > 0 && !showAnswer && !isPaused) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeRemaining === 0 && !showAnswer && !isPaused) {
      handleTimeUp();
    }
  }, [timeRemaining, showAnswer, isPaused]);

  // Answer reveal countdown
  useEffect(() => {
    if (showAnswer && !showLeaderboard && answerRevealCountdown > 0 && !isPaused) {
      const timer = setInterval(() => {
        setAnswerRevealCountdown(prev => {
          const newValue = prev - 1;
          console.log('Answer reveal countdown:', newValue);
          return newValue;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showAnswer, showLeaderboard, answerRevealCountdown, isPaused]);

  // Trigger leaderboard when countdown reaches 0
  useEffect(() => {
    if (showAnswer && !showLeaderboard && answerRevealCountdown === 0 && !isPaused) {
      console.log('Triggering leaderboard display');
      // Fetch latest leaderboard before showing it
      fetchLeaderboard().then(() => {
        setShowLeaderboard(true);
        setLeaderboardCountdown(15);
      });
    }
  }, [showAnswer, showLeaderboard, answerRevealCountdown, isPaused]);

  // Leaderboard countdown
  useEffect(() => {
    if (showLeaderboard && leaderboardCountdown > 0 && !isPaused) {
      const timer = setInterval(() => {
        setLeaderboardCountdown(prev => {
          const newValue = prev - 1;
          console.log('Leaderboard countdown:', newValue);
          return newValue;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showLeaderboard, leaderboardCountdown, isPaused]);

  // Auto-advance when leaderboard countdown reaches 0
  useEffect(() => {
    if (showLeaderboard && leaderboardCountdown === 0 && !isPaused) {
      console.log('Auto-advancing to next question');
      handleNextQuestion();
    }
  }, [showLeaderboard, leaderboardCountdown, isPaused]);

  const fetchQuestions = async () => {
    try {
      // Get the game session to find the event
      const { data: session, error: sessionError } = await supabase
        .from("game_sessions")
        .select("event_id")
        .eq("id", sessionId)
        .single();

      if (sessionError || !session) throw new Error("Game session not found");

      // Get the trivia set from the event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("trivia_set_id")
        .eq("id", session.event_id)
        .single();

      if (eventError || !eventData?.trivia_set_id) throw new Error("Trivia set not found");

      const { data: questionsData, error } = await supabase
        .from("questions")
        .select("*")
        .eq("trivia_set_id", eventData.trivia_set_id)
        .order("order_index");

      if (error) throw error;
      setQuestions(questionsData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`game-play-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'player_answers',
          filter: `game_session_id=eq.${sessionId}`
        },
        () => {
          console.log('New player answer detected');
          fetchAnswerCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'player_sessions',
          filter: `game_session_id=eq.${sessionId}`
        },
        () => {
          console.log('Player session updated');
          fetchLeaderboard();
        }
      )
      .subscribe((status) => {
        console.log('Game play subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateCurrentQuestion = async () => {
    if (currentQuestionIndex >= questions.length) return;

    const question = questions[currentQuestionIndex];

    try {
      // Update the game session with current question ID
      await supabase
        .from("game_sessions")
        .update({ current_question_id: question.id })
        .eq("id", sessionId);

      // Broadcast full question data to players (bypasses RLS)
      await supabase.channel(`game-questions-${sessionId}`).send({
        type: 'broadcast',
        event: 'question',
        payload: {
          id: question.id,
          question_text: question.question_text,
          option_a: question.option_a,
          option_b: question.option_b,
          option_c: question.option_c,
          option_d: question.option_d,
          correct_answer: question.correct_answer,
          time_limit_seconds: question.time_limit_seconds
        }
      });

      fetchAnswerCounts();
    } catch (error) {
      console.error("Error updating current question:", error);
    }
  };

  const fetchAnswerCounts = async () => {
    if (currentQuestionIndex >= questions.length) return;

    try {
      const { data } = await supabase
        .from("player_answers")
        .select("selected_answer")
        .eq("game_session_id", sessionId)
        .eq("question_id", questions[currentQuestionIndex].id);

      const counts = { a: 0, b: 0, c: 0, d: 0 };
      data?.forEach(answer => {
        const key = answer.selected_answer.toLowerCase() as keyof typeof counts;
        if (key in counts) counts[key]++;
      });

      setAnswerCounts(counts);
    } catch (error) {
      console.error("Error fetching answer counts:", error);
    }
  };

  const handleTimeUp = async () => {
    setShowAnswer(true);
    setAnswerRevealCountdown(15);
    await fetchLeaderboard();
  };

  const fetchLeaderboard = async () => {
    try {
      console.log('Fetching leaderboard for session:', sessionId);

      // First get all player sessions for this game
      const { data: playerSessions, error: sessionsError } = await supabase
        .from("player_sessions")
        .select("player_id, total_points")
        .eq("game_session_id", sessionId)
        .order("total_points", { ascending: false });

      if (sessionsError) {
        console.error("Error fetching player sessions:", sessionsError);
        return;
      }

      if (!playerSessions || playerSessions.length === 0) {
        console.log('No players found');
        setLeaderboard([]);
        return;
      }

      // Get all player profiles
      const playerIds = playerSessions.map(p => p.player_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", playerIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // Create a map of player_id to profile
      const profileMap = new Map();
      profiles?.forEach(p => {
        profileMap.set(p.id, p);
      });

      // Build leaderboard with all players
      const leaderboardData = playerSessions.map((p, index) => {
        const profile = profileMap.get(p.player_id);
        return {
          player_id: p.player_id,
          display_name: profile?.display_name || profile?.email?.split('@')[0] || `Player ${index + 1}`,
          total_points: p.total_points || 0
        };
      });

      console.log('Leaderboard data:', leaderboardData);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      endGame();
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    toast({
      title: isPaused ? "Game Resumed" : "Game Paused",
      description: isPaused ? "The game has been resumed" : "The game has been paused",
    });
  };

  const endGame = async () => {
    try {
      await supabase
        .from("game_sessions")
        .update({ 
          status: "ended",
          ended_at: new Date().toISOString()
        })
        .eq("id", sessionId);

      navigate(`/host/results/${sessionId}`);
    } catch (error) {
      console.error("Error ending game:", error);
    }
  };

  if (questions.length === 0) {
    return <div className="min-h-screen bg-gradient-hero wood-texture flex items-center justify-center">
      <p className="text-foreground text-xl">Loading questions...</p>
    </div>;
  }

  if (currentQuestionIndex >= questions.length) {
    return <div className="min-h-screen bg-gradient-hero wood-texture flex items-center justify-center">
      <p className="text-foreground text-xl">Game Complete!</p>
    </div>;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-hero wood-texture p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Game Info Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Card className="px-6 py-3 bg-secondary/20 border-secondary">
              <p className="text-sm text-muted-foreground">Game Code</p>
              <p className="text-2xl font-bold text-secondary tracking-widest">{gameCode}</p>
            </Card>
            <Card className="px-6 py-3 bg-card/80 border-primary/40">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-foreground">{playerCount}</span>
              </div>
              <p className="text-sm text-muted-foreground">Players</p>
            </Card>
          </div>
          <Button
            onClick={togglePause}
            variant={isPaused ? "default" : "secondary"}
            size="lg"
            className="px-8"
          >
            {isPaused ? (
              <>
                <Play className="h-5 w-5 mr-2" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-5 w-5 mr-2" />
                Pause
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Progress Bar */}
            <Card className="p-4 bg-card/80 border-primary/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="text-sm font-bold text-secondary">
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </Card>

            {isPaused && (
              <Card className="p-6 bg-accent/20 border-accent text-center">
                <p className="text-2xl font-bold text-accent">Game Paused</p>
                <p className="text-muted-foreground mt-2">Press Resume to continue</p>
              </Card>
            )}

            {/* Timer */}
            <Card className="p-6 bg-card/80 border-primary/40 text-center">
              <div className="flex items-center justify-center gap-3">
                <Clock className="h-8 w-8 text-accent" />
                <span className="text-6xl font-bold text-foreground">
                  {timeRemaining}
                </span>
              </div>
              <p className="text-muted-foreground mt-2">Seconds Remaining</p>
            </Card>

        {/* Question Display */}
        <Card className="p-8 bg-card/80 border-primary/40 leather-texture">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">
            {currentQuestion.question_text}
          </h2>

          <div className="grid grid-cols-2 gap-6">
            {['a', 'b', 'c', 'd'].map((option) => {
              const optionKey = `option_${option}` as keyof Question;
              const count = answerCounts[option as keyof typeof answerCounts];
              const isCorrect = showAnswer && option === currentQuestion.correct_answer.toLowerCase();
              
              return (
                <div
                  key={option}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    isCorrect
                      ? 'bg-primary/20 border-primary'
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-foreground">
                      {option.toUpperCase()}. {currentQuestion[optionKey] as string}
                    </span>
                    {count > 0 && (
                      <span className="text-xl font-bold text-secondary">
                        {count}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {showAnswer && !showLeaderboard && (
            <div className="mt-6 text-center">
              <p className="text-2xl font-bold text-primary mb-4">
                Correct Answer: {currentQuestion.correct_answer.toUpperCase()}
              </p>
              <div className="flex items-center justify-center gap-2 bg-accent/20 px-4 py-2 rounded-lg inline-flex">
                <Clock className="h-5 w-5 text-accent" />
                <span className="text-xl font-bold text-accent">
                  {answerRevealCountdown}s until leaderboard
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Leaderboard - Show during leaderboard phase in main area */}
        {showLeaderboard && (
          <Card className="p-6 bg-card/80 border-primary/40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-secondary" />
                <h3 className="text-2xl font-bold text-foreground">Top Players</h3>
              </div>
              <div className="flex items-center gap-2 bg-accent/20 px-4 py-2 rounded-lg">
                <Clock className="h-5 w-5 text-accent" />
                <span className="text-xl font-bold text-accent">
                  {leaderboardCountdown}s
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {leaderboard.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-xl">No players have joined yet</p>
                </div>
              ) : (
                leaderboard.slice(0, 5).map((player, index) => (
                <div
                  key={player.player_id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-secondary w-8">
                      #{index + 1}
                    </span>
                    <span className="text-lg text-foreground">
                      {player.display_name}
                    </span>
                  </div>
                  <span className="text-xl font-bold text-primary">
                    {player.total_points} pts
                  </span>
                </div>
              ))
            )}
            </div>
          </Card>
        )}

        {/* Controls - Only show during leaderboard phase */}
        <div className="flex justify-center gap-4">
          {showLeaderboard && (
            <Button
              onClick={handleNextQuestion}
              variant="secondary"
              size="lg"
              className="px-12 text-xl"
              disabled={isPaused}
            >
              {currentQuestionIndex < questions.length - 1 ? "Next Question" : "End Game"}
            </Button>
          )}
        </div>
          </div>

          {/* Live Leaderboard Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-4 bg-card/80 border-primary/40 sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-secondary" />
                <h3 className="text-lg font-bold text-foreground">Live Scores</h3>
              </div>
              <div className="space-y-2">
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Waiting for players...
                  </p>
                ) : (
                  leaderboard.slice(0, 10).map((player, index) => (
                    <div
                      key={player.player_id}
                      className={`flex items-center justify-between p-2 rounded ${
                        index < 3 ? 'bg-secondary/10' : 'bg-muted/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold w-6 ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          index === 2 ? 'text-amber-600' :
                          'text-muted-foreground'
                        }`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </span>
                        <span className="text-sm text-foreground truncate max-w-[100px]">
                          {player.display_name}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-primary">
                        {player.total_points}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePlay;
