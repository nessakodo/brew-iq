import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Trophy, Clock } from "lucide-react";

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
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [gameStatus, setGameStatus] = useState<string>("active");

  useEffect(() => {
    setupRealtimeSubscription();
    fetchCurrentQuestion();
    fetchMyScore();
  }, [sessionId]);

  useEffect(() => {
    if (timeRemaining > 0 && !hasAnswered) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining, hasAnswered]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
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
          const newData = payload.new as any;
          if (newData.status === "ended") {
            setGameStatus("ended");
            setTimeout(() => navigate("/play/stats"), 3000);
          } else if (newData.current_question_id) {
            fetchCurrentQuestion();
            setHasAnswered(false);
            setShowResult(false);
            setSelectedAnswer(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchCurrentQuestion = async () => {
    try {
      const { data: session } = await supabase
        .from("game_sessions")
        .select("current_question_id, status")
        .eq("id", sessionId)
        .single();

      if (!session) return;

      setGameStatus(session.status);

      if (session.status === "lobby") {
        // Still in lobby, clear question
        setCurrentQuestion(null);
        return;
      }

      if (!session.current_question_id) {
        setCurrentQuestion(null);
        return;
      }

      const { data: questionData, error } = await supabase
        .from("questions")
        .select("*")
        .eq("id", session.current_question_id)
        .single();

      if (error) throw error;
      
      setCurrentQuestion(questionData);
      setTimeRemaining(questionData.time_limit_seconds);

      // Check if we already answered this question
      const { data: existingAnswer } = await supabase
        .from("player_answers")
        .select("*")
        .eq("game_session_id", sessionId)
        .eq("question_id", questionData.id)
        .eq("player_id", user?.id)
        .maybeSingle();

      if (existingAnswer) {
        setHasAnswered(true);
        setShowResult(true);
        setSelectedAnswer(existingAnswer.selected_answer);
        setIsCorrect(existingAnswer.is_correct);
      }
    } catch (error: any) {
      console.error("Error fetching question:", error);
    }
  };

  const fetchMyScore = async () => {
    try {
      const { data } = await supabase
        .from("player_sessions")
        .select("total_points")
        .eq("game_session_id", sessionId)
        .eq("player_id", user?.id)
        .single();

      if (data) {
        setMyScore(data.total_points || 0);
      }
    } catch (error) {
      console.error("Error fetching score:", error);
    }
  };

  const handleAnswerSelect = async (answer: string) => {
    if (hasAnswered || !currentQuestion) return;

    setSelectedAnswer(answer);
    setHasAnswered(true);

    const timeTaken = currentQuestion.time_limit_seconds - timeRemaining;
    const correct = answer.toLowerCase() === currentQuestion.correct_answer.toLowerCase();
    setIsCorrect(correct);

    // Calculate points: base 100 points if correct, bonus points for speed
    const points = correct ? Math.max(50, 100 - timeTaken * 2) : 0;

    try {
      // Record answer
      await supabase.from("player_answers").insert({
        game_session_id: sessionId,
        player_id: user?.id,
        question_id: currentQuestion.id,
        selected_answer: answer,
        is_correct: correct,
        time_taken_seconds: timeTaken,
        points_earned: points
      });

      // Update player session points
      const { data: currentSession } = await supabase
        .from("player_sessions")
        .select("total_points")
        .eq("game_session_id", sessionId)
        .eq("player_id", user?.id)
        .single();

      const newTotal = (currentSession?.total_points || 0) + points;

      await supabase
        .from("player_sessions")
        .update({ total_points: newTotal })
        .eq("game_session_id", sessionId)
        .eq("player_id", user?.id);

      setMyScore(newTotal);
      setShowResult(true);

      toast({
        title: correct ? "Correct!" : "Incorrect",
        description: correct ? `+${points} points!` : "Better luck next time",
        variant: correct ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Error submitting answer:", error);
    }
  };

  if (gameStatus === "lobby") {
    return (
      <div className="min-h-screen bg-gradient-hero wood-texture flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 leather-texture border-2 border-primary/40 text-center">
          <h2 className="text-3xl font-bold text-secondary mb-4">
            Game Starting Soon!
          </h2>
          <p className="text-muted-foreground">
            The host will start the game shortly. Get ready!
          </p>
        </Card>
      </div>
    );
  }

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

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-hero wood-texture flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 leather-texture border-2 border-primary/40 text-center">
          <p className="text-foreground">Waiting for next question...</p>
        </Card>
      </div>
    );
  }

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
          <Card className="p-4 bg-card/80 border-primary/40 text-center">
            <Clock className="h-6 w-6 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{timeRemaining}</p>
            <p className="text-xs text-muted-foreground">Seconds Left</p>
          </Card>
        </div>

        {/* Question */}
        <Card className="p-6 bg-card/80 border-primary/40 leather-texture">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            {currentQuestion.question_text}
          </h2>

          <div className="space-y-3">
            {['a', 'b', 'c', 'd'].map((option) => {
              const optionKey = `option_${option}` as keyof Question;
              const isSelected = selectedAnswer?.toLowerCase() === option;
              const isCorrectAnswer = showResult && option === currentQuestion.correct_answer.toLowerCase();
              const isWrongAnswer = showResult && isSelected && !isCorrectAnswer;

              return (
                <Button
                  key={option}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={hasAnswered}
                  className={`w-full p-6 text-lg justify-start transition-all ${
                    isCorrectAnswer
                      ? 'bg-primary/20 border-2 border-primary'
                      : isWrongAnswer
                      ? 'bg-destructive/20 border-2 border-destructive'
                      : isSelected
                      ? 'bg-secondary/20 border-2 border-secondary'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  variant="outline"
                >
                  <div className="flex items-center justify-between w-full">
                    <span>
                      <span className="font-bold mr-3">{option.toUpperCase()}.</span>
                      {currentQuestion[optionKey] as string}
                    </span>
                    {showResult && isCorrectAnswer && (
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    )}
                    {showResult && isWrongAnswer && (
                      <XCircle className="h-6 w-6 text-destructive" />
                    )}
                  </div>
                </Button>
              );
            })}
          </div>

          {showResult && (
            <div className="mt-6 text-center">
              <p className={`text-xl font-bold ${isCorrect ? 'text-primary' : 'text-destructive'}`}>
                {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </p>
            </div>
          )}
        </Card>

        {hasAnswered && !showResult && (
          <Card className="p-4 bg-card/80 border-primary/40 text-center">
            <p className="text-muted-foreground">
              Answer submitted! Waiting for round to end...
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PlayerGame;
