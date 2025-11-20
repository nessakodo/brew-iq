import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { Leaderboard } from "@/components/player/Leaderboard";

const Leaderboards = () => {
  const { signOut } = useAuth();

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
              BrewIQ Leaderboards
            </h1>
          </div>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Leaderboard />
      </main>
    </div>
  );
};

export default Leaderboards;
