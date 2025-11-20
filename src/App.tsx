import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import HostDashboard from "./pages/HostDashboard";
import GameLobby from "./pages/GameLobby";
import GamePlay from "./pages/GamePlay";
import PlayerJoin from "./pages/PlayerJoin";
import PlayerGame from "./pages/PlayerGame";
import PlayerStats from "./pages/PlayerStats";
import Leaderboards from "./pages/Leaderboards";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/host" element={<HostDashboard />} />
            <Route path="/host/lobby/:sessionId" element={<GameLobby />} />
            <Route path="/host/game/:sessionId" element={<GamePlay />} />
            <Route path="/play" element={<PlayerJoin />} />
            <Route path="/play/game/:sessionId" element={<PlayerGame />} />
            <Route path="/play/stats" element={<PlayerStats />} />
            <Route path="/leaderboards" element={<Leaderboards />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
