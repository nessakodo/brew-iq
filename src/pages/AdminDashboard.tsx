import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Users, Calendar, BookOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "@/components/admin/UserManagement";
import { HostManagement } from "@/components/admin/HostManagement";
import { PresetLibrary } from "@/components/admin/PresetLibrary";
import { EventCreation } from "@/components/admin/EventCreation";
import { AITriviaGenerator } from "@/components/admin/AITriviaGenerator";
import { UpcomingEvents } from "@/components/admin/UpcomingEvents";

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("users");

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
              BrewIQ Admin
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
          <h2 className="text-3xl font-bold mb-2">Admin Dashboard</h2>
          <p className="text-muted-foreground">Manage users, events, and trivia content</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Players
            </TabsTrigger>
            <TabsTrigger value="hosts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Hosts
            </TabsTrigger>
            <TabsTrigger value="presets" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Presets
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="hosts" className="space-y-6">
            <HostManagement />
          </TabsContent>

          <TabsContent value="presets" className="space-y-6">
            <AITriviaGenerator />
            <PresetLibrary />
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <EventCreation />
            <UpcomingEvents />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
