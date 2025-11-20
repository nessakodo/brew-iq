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
          fetchPlayerCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      // Update game session status to active
      const { error } = await supabase
        .from("game_sessions")
        .update({ 
          status: "active",
          started_at: new Date().toISOString()
        })
        .eq("id", sessionId);

      if (error) throw error;

      navigate(`/host/game/${sessionId}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to start game",
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
    <div className="min-h-screen bg-gradient-hero wood-texture flex items-center justify-center p-4">
      <Card className="max-w-4xl w-full p-12 leather-texture border-2 border-primary/40 shadow-card">
        <div className="text-center space-y-8">
          <div>
            <h1 className="text-5xl font-bold text-secondary warm-glow mb-4">
              Game Starting Soon
            </h1>
            <p className="text-xl text-muted-foreground">
              Players can join now with the code below
            </p>
          </div>

          <div className="bg-card/50 border-4 border-secondary p-12 rounded-lg brass-border">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Hash className="h-12 w-12 text-secondary" />
              <span className="text-8xl font-bold text-secondary warm-glow tracking-widest">
                {gameCode}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="bg-card/30 p-6 rounded-lg border border-border">
              <Clock className="h-8 w-8 text-accent mx-auto mb-3" />
              <div className="text-5xl font-bold text-foreground mb-2">
                {formatTime(timeRemaining)}
              </div>
              <div className="text-sm text-muted-foreground">
                Time Remaining
              </div>
            </div>

            <div className="bg-card/30 p-6 rounded-lg border border-border">
              <Users className="h-8 w-8 text-primary mx-auto mb-3" />
              <div className="text-5xl font-bold text-foreground mb-2">
                {playerCount}
              </div>
              <div className="text-sm text-muted-foreground">
                Players Joined
              </div>
            </div>
          </div>

          <div className="pt-8">
            <Button
              onClick={startGame}
              variant="secondary"
              size="lg"
              className="px-12 py-6 text-xl"
            >
              Start Game Now
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Or game will start automatically when timer reaches zero
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GameLobby;
