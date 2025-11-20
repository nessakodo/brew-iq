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
import { ProtectedRoute } from "./components/ProtectedRoute";

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
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/host" element={
              <ProtectedRoute allowedRoles={["host", "admin"]}>
                <HostDashboard />
              </ProtectedRoute>
            } />
            <Route path="/host/lobby/:sessionId" element={
              <ProtectedRoute allowedRoles={["host", "admin"]}>
                <GameLobby />
              </ProtectedRoute>
            } />
            <Route path="/host/game/:sessionId" element={
              <ProtectedRoute allowedRoles={["host", "admin"]}>
                <GamePlay />
              </ProtectedRoute>
            } />
            <Route path="/play" element={
              <ProtectedRoute allowedRoles={["player", "admin", "host"]}>
                <PlayerJoin />
              </ProtectedRoute>
            } />
            <Route path="/play/game/:sessionId" element={
              <ProtectedRoute allowedRoles={["player", "admin", "host"]}>
                <PlayerGame />
              </ProtectedRoute>
            } />
            <Route path="/play/stats" element={
              <ProtectedRoute allowedRoles={["player", "admin", "host"]}>
                <PlayerStats />
              </ProtectedRoute>
            } />
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
