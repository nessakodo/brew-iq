import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, Users, BookOpen } from "lucide-react";

interface TriviaSet {
  id: string;
  title: string;
}

interface Host {
  id: string;
  email: string;
  display_name: string | null;
}

export const EventCreation = () => {
  const [triviaSets, setTriviaSets] = useState<TriviaSet[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [event, setEvent] = useState({
    title: "",
    eventDate: "",
    eventTime: "",
    theme: "",
    triviaSetId: "",
    assignedHostId: "",
  });

  useEffect(() => {
    fetchTriviaSets();
    fetchHosts();
  }, []);

  const fetchTriviaSets = async () => {
    const { data, error } = await supabase
      .from("trivia_sets")
      .select("id, title")
      .order("title");

    if (!error && data) {
      setTriviaSets(data);
    }
  };

  const fetchHosts = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, display_name");

    if (profiles) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "host");

      if (roles) {
        const hostUsers = profiles.filter((p) =>
          roles.some((r) => r.user_id === p.id)
        );
        setHosts(hostUsers);
      }
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!event.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Event title is required",
        variant: "destructive",
      });
      return;
    }

    if (!event.triviaSetId) {
      toast({
        title: "Validation Error",
        description: "You must select a trivia set for this event",
        variant: "destructive",
      });
      return;
    }

    if (!event.assignedHostId) {
      toast({
        title: "Validation Error",
        description: "You must assign a host for this event",
        variant: "destructive",
      });
      return;
    }

    if (!event.eventDate || !event.eventTime) {
      toast({
        title: "Validation Error",
        description: "Event date and time are required",
        variant: "destructive",
      });
      return;
    }

    // Prevent past dates
    const eventDateTime = new Date(`${event.eventDate}T${event.eventTime}`);
    if (eventDateTime < new Date()) {
      toast({
        title: "Validation Error",
        description: "Cannot schedule events in the past",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("events").insert({
        title: event.title.trim(),
        event_date: event.eventDate,
        event_time: event.eventTime,
        theme: event.theme.trim() || null,
        trivia_set_id: event.triviaSetId,
        assigned_host_id: event.assignedHostId,
        created_by: user.id,
        status: "scheduled",
      });

      if (error) throw error;

      toast({
        title: "Event created",
        description: `${event.title} has been scheduled successfully.`,
      });

      setEvent({
        title: "",
        eventDate: "",
        eventTime: "",
        theme: "",
        triviaSetId: "",
        assignedHostId: "",
      });
    } catch (error: any) {
      toast({
        title: "Error creating event",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Create New Event</h2>
      <form onSubmit={handleCreateEvent} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              placeholder="Trivia Night at The Bar"
              value={event.title}
              onChange={(e) => setEvent({ ...event, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme">Theme (Optional)</Label>
            <Input
              id="theme"
              placeholder="80s Music, Sports, General Knowledge..."
              value={event.theme}
              onChange={(e) => setEvent({ ...event, theme: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventDate">Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="eventDate"
                type="date"
                className="pl-10"
                value={event.eventDate}
                onChange={(e) => setEvent({ ...event, eventDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventTime">Time</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="eventTime"
                type="time"
                className="pl-10"
                value={event.eventTime}
                onChange={(e) => setEvent({ ...event, eventTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="triviaSet">Trivia Set</Label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Select value={event.triviaSetId} onValueChange={(value) => setEvent({ ...event, triviaSetId: value })}>
                <SelectTrigger className="pl-10">
                  <SelectValue placeholder="Select a trivia set" />
                </SelectTrigger>
                <SelectContent>
                  {triviaSets.map((set) => (
                    <SelectItem key={set.id} value={set.id}>
                      {set.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="host">Assigned Host</Label>
            <div className="relative">
              <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Select value={event.assignedHostId} onValueChange={(value) => setEvent({ ...event, assignedHostId: value })}>
                <SelectTrigger className="pl-10">
                  <SelectValue placeholder="Select a host" />
                </SelectTrigger>
                <SelectContent>
                  {hosts.map((host) => (
                    <SelectItem key={host.id} value={host.id}>
                      {host.display_name || host.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" variant="secondary" className="flex-1" disabled={loading}>
            {loading ? "Creating..." : "Create Event"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setEvent({
            title: "",
            eventDate: "",
            eventTime: "",
            theme: "",
            triviaSetId: "",
            assignedHostId: "",
          })}>
            Clear
          </Button>
        </div>
      </form>
    </Card>
  );
};
