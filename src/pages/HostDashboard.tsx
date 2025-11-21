import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Play, Users, Trophy, LogOut, Clock, Calendar } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface Event {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  theme: string | null;
  status: string;
  trivia_sets: {
    title: string;
  } | null;
}

const HostDashboard = () => {
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingGame, setStartingGame] = useState<string | null>(null);

  useEffect(() => {
    fetchTodaysEvents();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          fetchTodaysEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTodaysEvents = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("events")
        .select("*, trivia_sets(title)")
        .eq("event_date", today)
        .order("event_time");

      if (error) throw error;

      setEvents(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading events",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async (eventId: string) => {
    if (startingGame) return; // Prevent multiple clicks

    setStartingGame(eventId);
    try {
      // Check if event has a trivia set
      const { data: eventData } = await supabase
        .from("events")
        .select("trivia_set_id")
        .eq("id", eventId)
        .single();

      if (!eventData?.trivia_set_id) {
        toast({
          title: "Cannot Start Game",
          description: "This event has no trivia set assigned. Contact admin.",
          variant: "destructive",
        });
        setStartingGame(null);
        return;
      }

      // Generate 6-digit game code
      const gameCode = Math.floor(100000 + Math.random() * 900000).toString();

      const { data, error } = await supabase
        .from("game_sessions")
        .insert({
          event_id: eventId,
          host_id: user?.id,
          game_code: gameCode,
          status: "lobby"
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to lobby screen
      window.location.href = `/host/lobby/${data.id}`;
    } catch (error) {
      console.error("Error starting game:", error);
      toast({
        title: "Error",
        description: "Failed to start game",
        variant: "destructive",
      });
      setStartingGame(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero wood-texture">
      <header className="border-b-2 border-primary/20 bg-card/80 backdrop-blur-sm sticky top-0 z-10 shadow-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="BrewIQ Logo"
              className="h-10 w-auto object-contain"
            />
            <h1 className="text-2xl font-bold text-secondary warm-glow">
              BrewIQ Host
            </h1>
          </div>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Today's Events</h2>
          <p className="text-muted-foreground">Select an event to start hosting</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading events...</div>
          </div>
        ) : events.length === 0 ? (
          <Card className="p-8 text-center shadow-card">
            <p className="text-muted-foreground">
              No events scheduled for today. Contact your admin to schedule events.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {events.map((event) => (
              <Card key={event.id} className="p-6 shadow-card border-2 border-border hover:border-primary/60 hover:shadow-glow transition-all leather-texture">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold mb-1">{event.title}</h3>
                    {event.theme && (
                      <p className="text-muted-foreground">{event.theme}</p>
                    )}
                  </div>
                  <Badge 
                    variant={event.status === "ready" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {event.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(event.event_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{event.event_time}</span>
                  </div>
                </div>

                {event.trivia_sets && (
                  <div className="mb-6 p-3 bg-muted/50 rounded-md border border-border">
                    <p className="text-sm font-semibold text-foreground">
                      Trivia Set: {event.trivia_sets.title}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 rounded-lg bg-muted/50 border border-border">
                    <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-xs text-muted-foreground">Players</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50 border border-border">
                    <Trophy className="h-5 w-5 mx-auto mb-1 text-accent" />
                    <p className="text-2xl font-bold">12</p>
                    <p className="text-xs text-muted-foreground">Questions</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50 border border-border">
                    <Clock className="h-5 w-5 mx-auto mb-1 text-secondary" />
                    <p className="text-2xl font-bold">30</p>
                    <p className="text-xs text-muted-foreground">Minutes</p>
                  </div>
                </div>

                <Button 
                  variant="secondary"
                  size="lg" 
                  className="w-full"
                  disabled={startingGame !== null || (event.status !== "ready" && event.status !== "scheduled")}
                  onClick={() => handleStartGame(event.id)}
                >
                  <Play className="mr-2 h-5 w-5" />
                  Start Game
                </Button>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HostDashboard;
