import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Clock, Hash } from "lucide-react";

const GameLobby = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gameCode, setGameCode] = useState<string>("");
  const [playerCount, setPlayerCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds

  useEffect(() => {
    fetchGameSession();

    // Set up realtime subscription for player joins
    const channel = supabase
      .channel(`game-lobby-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'player_sessions',
          filter: `game_session_id=eq.${sessionId}`
        },
        () => {
          console.log('New player joined - updating count');
          fetchPlayerCount();
        }
      )
      .subscribe((status) => {
        console.log('Lobby subscription status:', status);
      });

    // Poll for player count every 2 seconds as fallback
    const pollInterval = setInterval(() => {
      fetchPlayerCount();
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [sessionId]);

  useEffect(() => {
    if (timeRemaining <= 0) {
      startGame();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const fetchGameSession = async () => {
    try {
      const { data, error } = await supabase
        .from("game_sessions")
        .select("game_code")
        .eq("id", sessionId)
        .single();

      if (error) throw error;
      setGameCode(data.game_code);
      fetchPlayerCount();
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

      if (error) throw error;
      setPlayerCount(count || 0);
    } catch (error: any) {
      console.error("Error fetching player count:", error);
    }
  };

  const startGame = async () => {
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

      // Get the first question from the trivia set (full data for broadcast)
      const { data: firstQuestion, error: questionError } = await supabase
        .from("questions")
        .select("*")
        .eq("trivia_set_id", eventData.trivia_set_id)
        .order("order_index")
        .limit(1)
        .single();

      if (questionError || !firstQuestion) throw new Error("No questions found");

      // Update game session status to active and set first question
      const { error } = await supabase
        .from("game_sessions")
        .update({
          status: "active",
          started_at: new Date().toISOString(),
          current_question_id: firstQuestion.id
        })
        .eq("id", sessionId);

      if (error) throw error;

      // Broadcast first question data to players (bypasses RLS)
      await supabase.channel(`game-questions-${sessionId}`).send({
        type: 'broadcast',
        event: 'question',
        payload: {
          id: firstQuestion.id,
          question_text: firstQuestion.question_text,
          option_a: firstQuestion.option_a,
          option_b: firstQuestion.option_b,
          option_c: firstQuestion.option_c,
          option_d: firstQuestion.option_d,
          correct_answer: firstQuestion.correct_answer,
          time_limit_seconds: firstQuestion.time_limit_seconds
        }
      });

      navigate(`/host/game/${sessionId}`);
    } catch (error: any) {
      console.error("Error starting game:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start game",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen bg-gradient-hero wood-texture flex items-center justify-center p-4 overflow-hidden">
      <Card className="max-w-4xl w-full p-6 sm:p-8 leather-texture elegant-card">
        <div className="text-center space-y-4 sm:space-y-6">
          <div>
            <img
              src="/logo.png"
              alt="BrewIQ Logo"
              className="mx-auto mb-3 h-16 sm:h-20 w-auto object-contain"
            />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-secondary mb-2">
              Game Starting Soon
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              Players can join now with the code below
            </p>
          </div>

          <div className="bg-card/50 vintage-border p-6 sm:p-8 rounded-lg">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <Hash className="h-8 w-8 sm:h-10 sm:w-10 text-secondary" />
              <span className="text-5xl sm:text-6xl md:text-7xl font-bold text-secondary tracking-widest">
                {gameCode}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
            <div className="bg-card/30 p-4 sm:p-5 rounded-lg vintage-border">
              <Clock className="h-6 w-6 sm:h-7 sm:w-7 text-foreground mx-auto mb-2" />
              <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1">
                {formatTime(timeRemaining)}
              </div>
              <div className="text-xs sm:text-sm text-foreground/80">
                Time Remaining
              </div>
            </div>

            <div className="bg-card/30 p-4 sm:p-5 rounded-lg subtle-green-accent">
              <Users className="h-6 w-6 sm:h-7 sm:w-7 text-primary mx-auto mb-2" />
              <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">
                {playerCount}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Players Joined
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={startGame}
              variant="secondary"
              size="lg"
              className="px-8 sm:px-10 py-4 sm:py-5 text-lg sm:text-xl vintage-border"
            >
              Start Game Now
            </Button>
            <p className="text-xs sm:text-sm text-muted-foreground mt-3">
              Or game will start automatically when timer reaches zero
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GameLobby;
