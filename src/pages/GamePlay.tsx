import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Clock, Pause, Play, Users, Square } from "lucide-react";
import { WinnerReveal } from "@/components/game/WinnerReveal";

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
  const [answerRevealCountdown, setAnswerRevealCountdown] = useState(10);
  const [leaderboardCountdown, setLeaderboardCountdown] = useState(10);
  const [isPaused, setIsPaused] = useState(false);
  const [playerCount, setPlayerCount] = useState(0);
  const [gameCode, setGameCode] = useState("");
  const [frozenLeaderboard, setFrozenLeaderboard] = useState<PlayerScore[]>([]);
  const [showWinnerReveal, setShowWinnerReveal] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<string>("");

  useEffect(() => {
    fetchQuestions();
    fetchLeaderboard();
    fetchGameInfo();
    setupRealtimeSubscription();

    // Poll for leaderboard and player count updates every 3 seconds
    const updatePoll = setInterval(() => {
      fetchLeaderboard();
      fetchPlayerCount();
    }, 3000);

    return () => clearInterval(updatePoll);
  }, [sessionId]);

  const fetchGameInfo = async () => {
    try {
      const { data: session } = await supabase
        .from("game_sessions")
        .select("game_code, created_at")
        .eq("id", sessionId)
        .single();

      if (session) {
        setGameCode(session.game_code);
        setGameStartTime(session.created_at);
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
      setAnswerRevealCountdown(10);
      setLeaderboardCountdown(10);
      // Freeze leaderboard at start of new question
      setFrozenLeaderboard(leaderboard);
      updateCurrentQuestion();
    }
  }, [currentQuestionIndex, questions]);

  // Broadcast channel for timer sync
  useEffect(() => {
    const timerChannel = supabase.channel(`game-timer-${sessionId}`);
    timerChannel.subscribe();

    return () => {
      supabase.removeChannel(timerChannel);
    };
  }, [sessionId]);

  useEffect(() => {
    if (timeRemaining > 0 && !showAnswer && !isPaused) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          // Broadcast timer update to players
          supabase.channel(`game-timer-${sessionId}`).send({
            type: 'broadcast',
            event: 'timer_update',
            payload: { timeRemaining: newTime }
          });
          return newTime;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeRemaining === 0 && !showAnswer && !isPaused) {
      handleTimeUp();
    }
  }, [timeRemaining, showAnswer, isPaused, sessionId]);

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
        setLeaderboardCountdown(10);

        // Broadcast leaderboard display to players so they can update scores
        supabase.channel(`game-questions-${sessionId}`).send({
          type: 'broadcast',
          event: 'leaderboard_display',
          payload: {}
        });
      });
    }
  }, [showAnswer, showLeaderboard, answerRevealCountdown, isPaused, sessionId]);

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

  const fetchPlayerCount = async () => {
    try {
      const { count, error } = await supabase
        .from("player_sessions")
        .select("*", { count: "exact", head: true })
        .eq("game_session_id", sessionId);

      if (error) {
        console.error("Error fetching player count:", error);
        return;
      }

      console.log(`Player count: ${count} for session ${sessionId}`);
      setPlayerCount(count || 0);
    } catch (error) {
      console.error("Error in fetchPlayerCount:", error);
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
          fetchLeaderboard(); // Update leaderboard when answers come in
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'player_sessions',
          filter: `game_session_id=eq.${sessionId}`
        },
        () => {
          console.log('New player joined');
          fetchPlayerCount();
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

    // Fetch updated leaderboard and unfreeze it when answer is revealed
    await fetchLeaderboard();

    // Broadcast answer reveal to players
    const question = questions[currentQuestionIndex];
    if (question) {
      await supabase.channel(`game-questions-${sessionId}`).send({
        type: 'broadcast',
        event: 'answer_reveal',
        payload: {
          question_id: question.id,
          correct_answer: question.correct_answer
        }
      });
    }
  };

  const fetchLeaderboard = async () => {
    try {
      console.log('Fetching leaderboard for session:', sessionId);

      // Get all player sessions for this game
      const { data: playerSessions, error: sessionsError } = await supabase
        .from("player_sessions")
        .select("player_id")
        .eq("game_session_id", sessionId);

      if (sessionsError) {
        console.error("Error fetching player sessions:", sessionsError);
        return;
      }

      if (!playerSessions || playerSessions.length === 0) {
        console.log('No players found');
        setLeaderboard([]);
        return;
      }

      const playerIds = playerSessions.map(p => p.player_id);

      // Calculate points from player_answers (source of truth)
      const { data: answers, error: answersError } = await supabase
        .from("player_answers")
        .select("player_id, points_earned")
        .eq("game_session_id", sessionId);

      if (answersError) {
        console.error("Error fetching answers:", answersError);
      }

      // Sum points per player
      const pointsMap = new Map<string, number>();
      answers?.forEach(a => {
        const current = pointsMap.get(a.player_id) || 0;
        pointsMap.set(a.player_id, current + (a.points_earned || 0));
      });

      // Get all player profiles
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

      // Build leaderboard with calculated points
      const leaderboardData = playerIds.map((playerId, index) => {
        const profile = profileMap.get(playerId);
        return {
          player_id: playerId,
          display_name: profile?.display_name || profile?.email?.split('@')[0] || `Player ${index + 1}`,
          total_points: pointsMap.get(playerId) || 0
        };
      }).sort((a, b) => b.total_points - a.total_points);

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
      // Last question - end the game and show winners
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
      console.log('=== Starting End Game Process ===');
      console.log('Session ID:', sessionId);

      // Step 1: Fetch final leaderboard
      try {
        console.log('Step 1: Fetching final leaderboard...');
        await fetchLeaderboard();
        console.log('Step 1: Leaderboard fetched successfully, count:', leaderboard.length);
      } catch (leaderboardError) {
        console.error('Step 1 FAILED: Error fetching leaderboard:', leaderboardError);
        // Continue anyway - we'll handle empty leaderboard in the render
      }

      // Step 2: Update game status to completed
      try {
        console.log('Step 2: Updating game status to completed...');
        const { error: updateError } = await supabase
          .from("game_sessions")
          .update({
            status: "completed",
            ended_at: new Date().toISOString()
          })
          .eq("id", sessionId);

        if (updateError) {
          console.error('Step 2 FAILED: Database error:', updateError);
          throw new Error(`Database update failed: ${updateError.message}`);
        }
        console.log('Step 2: Game status updated successfully');
      } catch (dbError) {
        console.error('Step 2 FAILED:', dbError);
        throw dbError;
      }

      // Step 3: Broadcast to players (non-critical)
      console.log('Step 3: Broadcasting game end to players...');
      try {
        const questionChannel = supabase.channel(`game-questions-${sessionId}`);

        questionChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await questionChannel.send({
              type: 'broadcast',
              event: 'game_ended',
              payload: { sessionId }
            });
            console.log('Step 3: Broadcast sent successfully');
          }
        });
      } catch (broadcastError) {
        console.warn('Step 3: Broadcast failed (non-critical):', broadcastError);
      }

      console.log('=== End Game Process Complete ===');

      toast({
        title: "Game Ended",
        description: "Revealing winners...",
      });

      // Show winner reveal
      setTimeout(() => {
        console.log('Showing winner reveal, final leaderboard count:', leaderboard.length);
        setShowWinnerReveal(true);
      }, 1000);
    } catch (error: any) {
      console.error("=== END GAME FAILED ===");
      console.error("Error details:", error);
      toast({
        title: "Error",
        description: `Failed to end game: ${error.message || 'Unknown error'}. Check console for details.`,
        variant: "destructive",
      });
    }
  };

  const handleWinnerRevealComplete = () => {
    // Navigate to dashboard after winner reveal completes
    toast({
      title: "Redirecting",
      description: "Returning to host dashboard...",
    });
    setTimeout(() => {
      navigate("/host");
    }, 2000);
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

  // Show winner reveal if game ended
  if (showWinnerReveal) {
    console.log('WinnerReveal active, current leaderboard:', leaderboard);

    if (leaderboard.length === 0) {
      console.error('No players in leaderboard!');
      // If no players, just redirect
      handleWinnerRevealComplete();
      return null;
    }

    // Ensure leaderboard is sorted by points before taking top 5
    const sortedLeaderboard = [...leaderboard].sort((a, b) => b.total_points - a.total_points);
    const topWinners = sortedLeaderboard.slice(0, Math.min(5, sortedLeaderboard.length)).map((player, index) => ({
      player_id: player.player_id,
      display_name: player.display_name,
      total_points: player.total_points,
      rank: index + 1
    }));

    console.log('Top winners to display:', topWinners);

    return (
      <WinnerReveal
        winners={topWinners}
        onComplete={handleWinnerRevealComplete}
        duration={2500}
        showTop5={topWinners.length > 3}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero wood-texture p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Game Info Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Card className="px-6 py-3 elegant-card shadow-warm">
              <p className="text-sm text-foreground/80">Game Code</p>
              <p className="text-2xl font-bold text-foreground tracking-widest">{gameCode}</p>
            </Card>
            <Card className="px-6 py-3 elegant-card subtle-green-accent">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-primary">{playerCount}</span>
              </div>
              <p className="text-sm text-muted-foreground">Players</p>
            </Card>
          </div>
          <div className="flex gap-3">
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
            <Button
              onClick={endGame}
              variant="destructive"
              size="lg"
              className="px-8"
            >
              <Square className="h-5 w-5 mr-2" />
              End Game
            </Button>
          </div>
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
            <Card className="p-4 bg-card/80 border-primary/40 text-center">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-6 w-6 text-accent" />
                <span className="text-5xl font-bold text-foreground">
                  {timeRemaining}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Seconds Remaining</p>
            </Card>

        {/* Question Display - Hide when showing leaderboard */}
        {!showLeaderboard && (
          <Card className="p-8 elegant-card leather-texture">
            <h2 className="text-4xl font-bold text-foreground mb-8 text-center">
              {currentQuestion.question_text}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {['a', 'b', 'c', 'd'].map((option) => {
                const optionKey = `option_${option}` as keyof Question;
                const count = answerCounts[option as keyof typeof answerCounts];
                const isCorrect = showAnswer && option === currentQuestion.correct_answer.toLowerCase();

                return (
                  <div
                    key={option}
                    className={`p-4 sm:p-6 rounded-lg transition-all leather-texture ${
                      isCorrect
                        ? 'celtic-answer-btn-correct font-bold text-lg'
                        : 'celtic-answer-btn'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                      <span className="text-lg sm:text-2xl font-bold text-foreground flex-1 min-w-0 break-words">
                        <span className="font-bold mr-2">{option.toUpperCase()}.</span>
                        <span className="break-words hyphens-auto">
                          {currentQuestion[optionKey] as string}
                        </span>
                      </span>
                      {count > 0 && (
                        <span className="text-lg sm:text-xl font-bold text-secondary flex-shrink-0">
                          {count}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {showAnswer && (
              <div className="mt-6">
                <p className="text-2xl font-bold text-primary text-center mb-4">
                  Correct Answer: {currentQuestion.correct_answer.toUpperCase()}
                </p>
                <div className="flex items-center justify-center gap-2 bg-accent/20 px-4 py-2 rounded-lg">
                  <Clock className="h-5 w-5 text-accent" />
                  <span className="text-xl font-bold text-accent">
                    {answerRevealCountdown}s until leaderboard
                  </span>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Leaderboard - Replaces question box during leaderboard phase */}
        {showLeaderboard && (
          <Card className="p-6 elegant-card shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-secondary warm-glow" />
                <h3 className="text-2xl font-bold text-primary">Top 3 Players</h3>
              </div>
              <div className="flex items-center gap-2 bg-accent/20 px-4 py-2 rounded-lg">
                <Clock className="h-5 w-5 text-accent" />
                <span className="text-xl font-bold text-accent">
                  {leaderboardCountdown}s
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {leaderboard.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-xl">No players have joined yet</p>
                </div>
              ) : (
                leaderboard.slice(0, 3).map((player, index) => (
                <div
                  key={player.player_id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    index === 0 ? 'bg-yellow-500/10 border-2 border-yellow-500/30' :
                    index === 1 ? 'bg-gray-400/10 border-2 border-gray-400/30' :
                    'bg-amber-600/10 border-2 border-amber-600/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="text-2xl font-bold text-foreground">
                      {player.display_name}
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-primary">
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
            <Card className="p-4 elegant-card subtle-green-accent sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-secondary" />
                <h3 className="text-lg font-bold text-primary">
                  Live Scores
                </h3>
              </div>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {(showAnswer || showLeaderboard ? leaderboard : frozenLeaderboard).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Waiting for players...
                  </p>
                ) : (
                  (showAnswer || showLeaderboard ? leaderboard : frozenLeaderboard).map((player, index) => (
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
