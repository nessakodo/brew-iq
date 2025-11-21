import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Trophy, Clock, Zap } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  time_limit_seconds: number;
}

const PlayerGame = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [gameStatus, setGameStatus] = useState<string>("lobby");
  const [lastPointsEarned, setLastPointsEarned] = useState(0);

  // Kahoot-style scoring: 1000 max points, decreases with time
  const calculatePoints = (correct: boolean, timeTaken: number, totalTime: number): number => {
    if (!correct) return 0;
    // Base: 1000 points, minimum 500 points for correct answer
    // Speed bonus: faster answers get more points
    const timeRatio = Math.max(0, 1 - (timeTaken / totalTime));
    const points = Math.round(500 + (500 * timeRatio));
    return points;
  };

  const fetchCurrentQuestion = useCallback(async () => {
    if (!sessionId) return;

    try {
      const { data: session, error: sessionError } = await supabase
        .from("game_sessions")
        .select("current_question_id, status")
        .eq("id", sessionId)
        .single();

      if (sessionError) {
        console.error('Session fetch error:', sessionError);
        return;
      }

      if (!session) {
        console.log('No session found');
        return;
      }

      console.log('Game status:', session.status, 'Question ID:', session.current_question_id);
      setGameStatus(session.status);

      if (session.status === "lobby") {
        setCurrentQuestion(null);
        setCurrentQuestionId(null);
        return;
      }

      if (session.status === "ended") {
        setTimeout(() => navigate("/play/stats"), 3000);
        return;
      }

      if (!session.current_question_id) {
        console.log('No current question ID set');
        setCurrentQuestion(null);
        return;
      }

      // Only fetch question if it's different from what we have
      if (session.current_question_id !== currentQuestionId) {
        console.log('Fetching new question:', session.current_question_id);

        const { data: questionData, error: questionError } = await supabase
          .from("questions")
          .select("*")
          .eq("id", session.current_question_id)
          .single();

        if (questionError) {
          console.error('Question fetch error:', questionError);
          return;
        }

        if (questionData) {
          // Reset answer states for new question
          setHasAnswered(false);
          setShowResult(false);
          setSelectedAnswer(null);
          setLastPointsEarned(0);

          setCurrentQuestion(questionData);
          setCurrentQuestionId(session.current_question_id);
          setTimeRemaining(questionData.time_limit_seconds);

          // Check if we already answered this question
          if (user?.id) {
            const { data: existingAnswer } = await supabase
              .from("player_answers")
              .select("*")
              .eq("game_session_id", sessionId)
              .eq("question_id", questionData.id)
              .eq("player_id", user.id)
              .maybeSingle();

            if (existingAnswer) {
              setHasAnswered(true);
              setShowResult(true);
              setSelectedAnswer(existingAnswer.selected_answer);
              setIsCorrect(existingAnswer.is_correct);
              setLastPointsEarned(existingAnswer.points_earned || 0);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching question:", error);
    }
  }, [sessionId, currentQuestionId, user?.id, navigate]);

  const fetchMyScore = useCallback(async () => {
    if (!sessionId || !user?.id) return;

    try {
      const { data } = await supabase
        .from("player_sessions")
        .select("total_points")
        .eq("game_session_id", sessionId)
        .eq("player_id", user.id)
        .single();

      if (data) {
        setMyScore(data.total_points || 0);
      }
    } catch (error) {
      console.error("Error fetching score:", error);
    }
  }, [sessionId, user?.id]);

  // Initial setup and realtime subscription
  useEffect(() => {
    fetchCurrentQuestion();
    fetchMyScore();

    // Subscribe to game session changes (for status updates)
    const sessionChannel = supabase
      .channel(`player-game-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          fetchCurrentQuestion();
        }
      )
      .subscribe((status) => {
        console.log('Session subscription status:', status);
      });

    // Subscribe to question broadcasts from host (bypasses RLS)
    const questionChannel = supabase
      .channel(`game-questions-${sessionId}`)
      .on('broadcast', { event: 'question' }, (payload) => {
        console.log('Question broadcast received:', payload);
        const questionData = payload.payload;

        if (questionData && questionData.id !== currentQuestionId) {
          // Reset answer states for new question
          setHasAnswered(false);
          setShowResult(false);
          setSelectedAnswer(null);
          setLastPointsEarned(0);

          setCurrentQuestion(questionData);
          setCurrentQuestionId(questionData.id);
          setTimeRemaining(questionData.time_limit_seconds);
          setGameStatus('active');

          // Check if we already answered this question
          if (user?.id) {
            supabase
              .from("player_answers")
              .select("*")
              .eq("game_session_id", sessionId)
              .eq("question_id", questionData.id)
              .eq("player_id", user.id)
              .maybeSingle()
              .then(({ data: existingAnswer }) => {
                if (existingAnswer) {
                  setHasAnswered(true);
                  setSelectedAnswer(existingAnswer.selected_answer);
                  setIsCorrect(existingAnswer.is_correct);
                  setLastPointsEarned(existingAnswer.points_earned || 0);
                  // Don't show result yet - wait for host reveal
                }
              });
          }
        }
      })
      .on('broadcast', { event: 'answer_reveal' }, () => {
        console.log('Answer reveal broadcast received');
        // Now show the result to the player
        setShowResult(true);
      })
      .subscribe((status) => {
        console.log('Question channel subscription status:', status);
      });

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(questionChannel);
    };
  }, [sessionId, fetchCurrentQuestion, fetchMyScore, currentQuestionId, user?.id]);

  // Polling fallback - always poll when in lobby or no question loaded
  useEffect(() => {
    const shouldPoll = gameStatus === "lobby" || (gameStatus === "active" && !currentQuestion);

    if (shouldPoll) {
      const pollInterval = setInterval(() => {
        console.log('Polling... Status:', gameStatus, 'Has Question:', !!currentQuestion);
        fetchCurrentQuestion();
        fetchMyScore();
      }, 1500);
      return () => clearInterval(pollInterval);
    }
  }, [gameStatus, currentQuestion, fetchCurrentQuestion, fetchMyScore]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0 && !hasAnswered && currentQuestion) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining, hasAnswered, currentQuestion]);

  const handleAnswerSelect = async (answer: string) => {
    if (hasAnswered || !currentQuestion || !user?.id) return;

    setSelectedAnswer(answer);
    setHasAnswered(true);

    const timeTaken = currentQuestion.time_limit_seconds - timeRemaining;
    const correct = answer.toLowerCase() === currentQuestion.correct_answer.toLowerCase();
    setIsCorrect(correct);

    // Kahoot-style points
    const points = calculatePoints(correct, timeTaken, currentQuestion.time_limit_seconds);
    setLastPointsEarned(points);

    try {
      // Record answer
      const { error: answerError } = await supabase.from("player_answers").insert({
        game_session_id: sessionId,
        player_id: user.id,
        question_id: currentQuestion.id,
        selected_answer: answer,
        is_correct: correct,
        time_taken_seconds: timeTaken,
        points_earned: points
      });

      if (answerError) {
        console.error('Error recording answer:', answerError);
      }

      // Update player session points
      const { data: currentSession } = await supabase
        .from("player_sessions")
        .select("total_points")
        .eq("game_session_id", sessionId)
        .eq("player_id", user.id)
        .single();

      const newTotal = (currentSession?.total_points || 0) + points;

      await supabase
        .from("player_sessions")
        .update({ total_points: newTotal })
        .eq("game_session_id", sessionId)
        .eq("player_id", user.id);

      setMyScore(newTotal);
      // Don't show result yet - wait for host to reveal answer
    } catch (error) {
      console.error("Error submitting answer:", error);
    }
  };

  // Lobby waiting screen
  if (gameStatus === "lobby") {
    return (
      <div className="min-h-screen bg-gradient-hero wood-texture flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 leather-texture border-2 border-primary/40 text-center">
          <div className="animate-pulse mb-6">
            <Zap className="h-16 w-16 text-secondary mx-auto" />
          </div>
          <h2 className="text-3xl font-bold text-secondary mb-4">
            Get Ready!
          </h2>
          <p className="text-muted-foreground mb-4">
            The host will start the game shortly.
          </p>
          <div className="flex justify-center gap-2">
            <span className="w-3 h-3 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-3 h-3 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-3 h-3 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </Card>
      </div>
    );
  }

  // Game ended screen
  if (gameStatus === "ended") {
    return (
      <div className="min-h-screen bg-gradient-hero wood-texture flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 leather-texture border-2 border-primary/40 text-center">
          <Trophy className="h-16 w-16 text-secondary mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Game Complete!
          </h2>
          <p className="text-xl text-primary mb-4">
            Final Score: {myScore} points
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting to your stats...
          </p>
        </Card>
      </div>
    );
  }

  // Waiting for question
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-hero wood-texture flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 leather-texture border-2 border-primary/40 text-center">
          <Clock className="h-12 w-12 text-accent mx-auto mb-4 animate-spin" />
          <p className="text-foreground text-lg">Loading question...</p>
          <p className="text-sm text-muted-foreground mt-2">
            If this persists, the host may need to advance the game.
          </p>
        </Card>
      </div>
    );
  }

  // Main game UI
  return (
    <div className="min-h-screen bg-gradient-hero wood-texture p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Score & Timer */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-card/80 border-primary/40 text-center">
            <Trophy className="h-6 w-6 text-secondary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{myScore}</p>
            <p className="text-xs text-muted-foreground">Your Score</p>
          </Card>
          <Card className={`p-4 bg-card/80 border-primary/40 text-center ${timeRemaining <= 5 ? 'animate-pulse border-destructive' : ''}`}>
            <Clock className={`h-6 w-6 mx-auto mb-2 ${timeRemaining <= 5 ? 'text-destructive' : 'text-accent'}`} />
            <p className={`text-2xl font-bold ${timeRemaining <= 5 ? 'text-destructive' : 'text-foreground'}`}>
              {timeRemaining}
            </p>
            <p className="text-xs text-muted-foreground">Seconds Left</p>
          </Card>
        </div>

        {/* Question */}
        <Card className="p-6 bg-card/80 border-primary/40 leather-texture">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            {currentQuestion.question_text}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {['a', 'b', 'c', 'd'].map((option, index) => {
              const optionKey = `option_${option}` as keyof Question;
              const isSelected = selectedAnswer?.toLowerCase() === option;
              const isCorrectAnswer = showResult && option === currentQuestion.correct_answer.toLowerCase();
              const isWrongAnswer = showResult && isSelected && !isCorrectAnswer;

              // Kahoot-style colors
              const colors = [
                'hover:bg-red-500/20 hover:border-red-500',
                'hover:bg-blue-500/20 hover:border-blue-500',
                'hover:bg-yellow-500/20 hover:border-yellow-500',
                'hover:bg-green-500/20 hover:border-green-500'
              ];

              return (
                <Button
                  key={option}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={hasAnswered}
                  className={`w-full p-6 text-lg justify-start transition-all h-auto min-h-[80px] ${
                    isCorrectAnswer
                      ? 'bg-green-500/30 border-2 border-green-500'
                      : isWrongAnswer
                      ? 'bg-red-500/30 border-2 border-red-500'
                      : isSelected
                      ? 'bg-secondary/30 border-2 border-secondary'
                      : `bg-muted/50 border-2 border-border ${!hasAnswered ? colors[index] : ''}`
                  }`}
                  variant="outline"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-left">
                      <span className="font-bold mr-3">{option.toUpperCase()}.</span>
                      {currentQuestion[optionKey] as string}
                    </span>
                    {showResult && isCorrectAnswer && (
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 ml-2" />
                    )}
                    {showResult && isWrongAnswer && (
                      <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </Button>
              );
            })}
          </div>

          {showResult && (
            <div className="mt-6 text-center">
              {isCorrect ? (
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-green-500">🎉 Correct!</p>
                  <p className="text-xl text-secondary">+{lastPointsEarned} points</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xl font-bold text-red-500">✗ Incorrect</p>
                  <p className="text-muted-foreground">
                    Correct answer: {currentQuestion.correct_answer.toUpperCase()}
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>

        {hasAnswered && !showResult && (
          <Card className="p-4 bg-card/80 border-primary/40 text-center">
            <p className="text-muted-foreground">
              Answer locked in! Waiting for time to expire...
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PlayerGame;
