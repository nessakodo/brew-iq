import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Hash } from "lucide-react";
import { z } from "zod";

const gameCodeSchema = z.string().trim().length(6, { message: "Game code must be exactly 6 characters" });
const playerNameSchema = z.string().trim().min(2, { message: "Name must be at least 2 characters" }).max(50);

const PlayerJoin = () => {
  const [gameCode, setGameCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const { signOut, user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to join a game",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [user, loading, navigate, toast]);

  // Prefill username from profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();

        if (profile?.display_name) {
          setPlayerName(profile.display_name);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const codeValidation = gameCodeSchema.safeParse(gameCode);
    if (!codeValidation.success) {
      toast({
        title: "Validation Error",
        description: codeValidation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    const nameValidation = playerNameSchema.safeParse(playerName);
    if (!nameValidation.success) {
      toast({
        title: "Validation Error",
        description: nameValidation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to join a game",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    try {
      // Check if game session exists and is accepting players (lobby or active)
      const { data: session, error: sessionError } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("game_code", gameCode.toUpperCase())
        .in("status", ["lobby", "active"])
        .single();

      if (sessionError || !session) {
        toast({
          title: "Invalid Code",
          description: "Game not found or not accepting players",
          variant: "destructive",
        });
        return;
      }

      // Check for existing player session (reconnection)
      const { data: existingSession } = await supabase
        .from("player_sessions")
        .select("*")
        .eq("player_id", user.id)
        .eq("game_session_id", session.id)
        .single();

      if (existingSession) {
        // Reconnecting player
        toast({
          title: "Reconnected!",
          description: `Welcome back, ${playerName}!`,
        });
        navigate(`/play/game/${session.id}`);
        return;
      }

      // Create new player session
      const { error: joinError } = await supabase
        .from("player_sessions")
        .insert({
          player_id: user.id,
          game_session_id: session.id,
        });

      if (joinError) throw joinError;

      // Update profile with display name
      await supabase
        .from("profiles")
        .update({ display_name: playerName.trim() })
        .eq("id", user.id);

      toast({
        title: "Joined Game!",
        description: `Welcome to the game, ${playerName}!`,
      });

      // Navigate to game screen
      navigate(`/play/game/${session.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join game",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4 wood-texture relative">
      <div className="absolute top-4 right-4 flex gap-2">
        <Button variant="outline" onClick={() => window.location.href = '/play/stats'}>
          View Stats
        </Button>
        <Button variant="ghost" onClick={signOut} size="sm">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      <Card className="w-full max-w-md p-8 shadow-card border-2 border-primary/40 relative overflow-hidden leather-texture">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-accent"></div>
        
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="BrewIQ Logo"
            className="mx-auto mb-4 h-20 w-auto object-contain"
          />
          <div className="inline-block p-4 rounded-full bg-primary/20 mb-4 border-2 border-primary/40">
            <Hash className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2 text-foreground">Join Game</h1>
          <p className="text-muted-foreground italic">Enter the game code to start playing</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="GAME CODE"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="text-center text-3xl font-bold tracking-widest bg-input border-2 border-border h-16 focus:border-primary transition-all"
              required
            />
            <p className="text-xs text-muted-foreground text-center">
              Enter the 6-digit code shown on screen
            </p>
          </div>

          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="bg-input border-2 border-border focus:border-primary transition-all"
              required
            />
            <p className="text-xs text-muted-foreground text-center">
              {playerName ? 'Using your saved name (you can change it)' : 'Enter your display name'}
            </p>
          </div>

          <Button 
            type="submit" 
            variant="secondary"
            size="lg" 
            className="w-full"
            disabled={gameCode.length !== 6 || !playerName}
          >
            Join Game
          </Button>

          <div className="text-center">
            <Button variant="link" className="text-muted-foreground hover:text-primary">
              Scan QR Code Instead
            </Button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-center text-muted-foreground">
            Powered by <span className="text-secondary font-bold">BrewIQ</span>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default PlayerJoin;
