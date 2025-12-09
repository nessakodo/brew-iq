import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Play, Users, Trophy, LogOut, Clock, Calendar, BarChart3 } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { GameStatsModal } from "@/components/host/GameStatsModal";

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

interface PastGame {
  id: string;
  game_code: string;
  created_at: string;
  ended_at: string | null;
  event: {
    title: string;
  } | null;
}

const HostDashboard = () => {
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [pastGames, setPastGames] = useState<PastGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingGame, setStartingGame] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [showGameStats, setShowGameStats] = useState(false);

  useEffect(() => {
    fetchTodaysEvents();
    fetchPastGames();

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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions'
        },
        () => {
          fetchPastGames();
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
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const pastDate = sevenDaysAgo.toISOString().split("T")[0];

      console.log('Fetching events from', pastDate, 'to future');

      // Fetch events assigned to this host or all events if admin
      // Include events from past week onwards
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id)
        .single();
      
      const isAdmin = userRoles?.role === 'admin';
      
      let query = supabase
        .from("events")
        .select("*, trivia_sets(title)")
        .gte("event_date", pastDate);
      
      // If not admin, only show events assigned to this host
      if (!isAdmin) {
        query = query.eq("assigned_host_id", user?.id);
      }
      
      const { data, error } = await query
        .order("event_date", { ascending: true })
        .order("event_time", { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        throw error;
      }

      console.log('Fetched events:', data);
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

  const fetchPastGames = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("game_sessions")
        .select(`
          id,
          game_code,
          created_at,
          ended_at,
          events (
            title
          )
        `)
        .eq("host_id", user.id)
        .eq("status", "completed")
        .order("ended_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      setPastGames(data || []);
    } catch (error: any) {
      console.error("Error loading past games:", error);
    }
  };

  const handleViewGameStats = (gameId: string) => {
    setSelectedGameId(gameId);
    setShowGameStats(true);
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
    <div className="h-screen bg-gradient-hero wood-texture flex flex-col overflow-hidden">
      <header className="border-b-3 border-primary bg-card/80 backdrop-blur-sm z-10 shadow-celtic flex-shrink-0">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="BrewIQ Logo"
              className="h-10 w-auto object-contain"
            />
            <h1 className="text-2xl font-bold text-primary">
              BrewIQ Host
            </h1>
          </div>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-4 space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-2 text-primary warm-glow">Scheduled Events</h2>
            <p className="text-sm text-muted-foreground">Select an event to start hosting</p>
          </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading events...</div>
          </div>
        ) : events.length === 0 ? (
          <Card className="p-8 text-center celtic-frame relative overflow-visible">
            <p className="text-muted-foreground">
              No events scheduled. Contact your admin to schedule events.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 mb-8">
            {events.map((event) => (
              <Card key={event.id} className="p-6 elegant-card leather-texture hover:border-secondary hover:subtle-glow transition-all">
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
                    <span>{new Date(event.event_date + 'T00:00:00').toLocaleDateString()}</span>
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
                  <div className="text-center p-3 rounded-lg bg-card/60 subtle-green-accent">
                    <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-2xl font-bold text-primary">0</p>
                    <p className="text-xs text-muted-foreground">Players</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-card/60 vintage-border">
                    <Trophy className="h-5 w-5 mx-auto mb-1 text-foreground" />
                    <p className="text-2xl font-bold text-foreground">12</p>
                    <p className="text-xs text-foreground/80">Questions</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-card/60 vintage-border shadow-warm">
                    <Clock className="h-5 w-5 mx-auto mb-1 text-secondary" />
                    <p className="text-2xl font-bold text-secondary">30</p>
                    <p className="text-xs text-muted-foreground">Minutes</p>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full vintage-border"
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

          {/* Past Games Section */}
          {pastGames.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-primary warm-glow">Recent Games</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {pastGames.map((game) => {
                  const duration = game.ended_at
                    ? Math.floor((new Date(game.ended_at).getTime() - new Date(game.created_at).getTime()) / 60000)
                    : 0;

                  return (
                    <Card key={game.id} className="p-4 elegant-card leather-texture hover:border-secondary hover:subtle-glow transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-foreground">
                            {(game.event as any)?.title || 'Unknown Event'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Code: <span className="font-mono font-bold">{game.game_code}</span>
                          </p>
                        </div>
                        <Badge variant="secondary" className="capitalize">
                          Completed
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(game.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{duration}m</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleViewGameStats(game.id)}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Stats
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Game Stats Modal */}
      {selectedGameId && (
        <GameStatsModal
          isOpen={showGameStats}
          onClose={() => {
            setShowGameStats(false);
            setSelectedGameId(null);
          }}
          gameSessionId={selectedGameId}
        />
      )}
    </div>
  );
};

export default HostDashboard;
