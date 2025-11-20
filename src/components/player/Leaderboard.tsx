import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PlayerStat {
  player_id: string;
  total_games_played: number;
  total_points: number;
  profiles: {
    display_name: string | null;
    email: string;
  } | null;
}

export const Leaderboard = () => {
  const [topPlayers, setTopPlayers] = useState<PlayerStat[]>([]);
  const [frequentPlayers, setFrequentPlayers] = useState<PlayerStat[]>([]);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    // Top points
    const { data: pointsData } = await supabase
      .from("player_stats")
      .select(`
        player_id,
        total_points,
        total_games_played,
        profiles:player_id (display_name, email)
      `)
      .order("total_points", { ascending: false })
      .limit(10);

    // Most frequent
    const { data: frequencyData } = await supabase
      .from("player_stats")
      .select(`
        player_id,
        total_points,
        total_games_played,
        profiles:player_id (display_name, email)
      `)
      .order("total_games_played", { ascending: false })
      .limit(10);

    setTopPlayers(pointsData as any || []);
    setFrequentPlayers(frequencyData as any || []);
  };

  const renderLeaderboard = (players: PlayerStat[], type: "points" | "frequency") => (
    <div className="space-y-2">
      {players.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No players yet</p>
      ) : (
        players.map((player, index) => (
          <Card key={player.player_id} className="p-4 bg-background/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  index === 0 ? "bg-secondary text-primary" :
                  index === 1 ? "bg-muted text-foreground" :
                  index === 2 ? "bg-muted/50 text-foreground" :
                  "bg-background text-muted-foreground"
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold">
                    {player.profiles?.display_name || player.profiles?.email || "Player"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {player.total_games_played} games played
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-secondary">
                  {type === "points" ? player.total_points : player.total_games_played}
                </p>
                <p className="text-xs text-muted-foreground">
                  {type === "points" ? "points" : "games"}
                </p>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <Card className="p-6 border-2 border-primary/20 bg-card/80 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-5 w-5 text-secondary" />
        <h2 className="text-2xl font-bold">Leaderboards</h2>
      </div>

      <Tabs defaultValue="points">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="points">
            <Trophy className="h-4 w-4 mr-2" />
            Top Points
          </TabsTrigger>
          <TabsTrigger value="frequency">
            <TrendingUp className="h-4 w-4 mr-2" />
            Most Frequent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="points" className="mt-6">
          {renderLeaderboard(topPlayers, "points")}
        </TabsContent>

        <TabsContent value="frequency" className="mt-6">
          {renderLeaderboard(frequentPlayers, "frequency")}
        </TabsContent>
      </Tabs>
    </Card>
  );
};
