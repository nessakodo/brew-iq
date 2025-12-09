import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Edit, Trash2, Mail, Share2, Globe, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Event {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  theme: string | null;
  status: string;
  trivia_set_id: string | null;
  assigned_host_id: string | null;
}

export const UpcomingEvents = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Fetch all events (past and future) - admin should see everything
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true })
        .order("event_time", { ascending: true });

      if (error) {
        console.error("Error fetching events:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        toast({
          title: "Error",
          description: `Failed to load events: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log("Fetched events:", data?.length || 0, "events");
        setEvents(data || []);
      }
    } catch (err) {
      console.error("Unexpected error fetching events:", err);
      toast({
        title: "Error",
        description: "Unexpected error loading events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    const channel = supabase
      .channel('events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (payload) => {
        console.log('Events realtime update received:', payload);
        fetchEvents();
      })
      .subscribe((status) => {
        console.log('Events subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    } else {
      toast({ title: "Event deleted successfully" });
    }
  };

  const handleMarketing = async (event: Event) => {
    toast({
      title: "Marketing Campaign Started",
      description: "Sending emails, generating posts, and updating website banner...",
    });

    try {
      const { data, error } = await supabase.functions.invoke('marketing-campaign', {
        body: { eventId: event.id }
      });

      if (error) throw error;

      toast({
        title: "Marketing Complete!",
        description: "Social post and banner ready for download",
      });

      // Download social post text file
      if (data?.socialPost) {
        const blob = new Blob([data.socialPost], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}-social-post.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast({
          title: "Social Post Downloaded",
          description: "Social media post saved as .txt file",
        });
      }

      // Download SVG banner visual
      if (data?.svgBanner) {
        const blob = new Blob([data.svgBanner], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}-banner.svg`;
        a.click();
        URL.revokeObjectURL(url);
        toast({
          title: "Banner Visual Downloaded",
          description: "SVG banner saved",
        });
      }

      // Download image description/prompt for external image generation
      if (data?.imageDescription || data?.imagePrompt) {
        const imageContent = `Image Description:\n${data.imageDescription || ''}\n\nImage Generation Prompt:\n${data.imagePrompt || ''}\n\nEvent Details:\nTitle: ${event.title}\nDate: ${event.event_date}\nTime: ${event.event_time}\nTheme: ${event.theme || 'General'}`;
        const blob = new Blob([imageContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}-image-prompt.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }

      // Copy banner code to clipboard
      if (data?.bannerCode) {
        navigator.clipboard.writeText(data.bannerCode);
        toast({
          title: "Banner Code Copied",
          description: "Website banner code copied to clipboard",
        });
      }
    } catch (error: any) {
      console.error("Marketing error:", error);
      toast({
        title: "Marketing Error",
        description: error.message || "Failed to execute marketing campaign",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6 elegant-card leather-texture">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-secondary warm-glow" />
          <h3 className="text-xl font-bold text-primary warm-glow">Upcoming Events</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchEvents}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading events...</p>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground">No upcoming events scheduled</p>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id} className="p-4 elegant-card leather-texture hover:border-primary hover:subtle-glow transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{event.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {/* Parse date without timezone conversion by appending time */}
                    {format(new Date(event.event_date + 'T00:00:00'), "MMMM d, yyyy")} at {event.event_time}
                  </p>
                  {event.theme && (
                    <p className="text-sm text-secondary mt-1">Theme: {event.theme}</p>
                  )}
                  <span className="inline-block mt-2 px-2 py-1 text-xs rounded bg-secondary/20 text-secondary">
                    {event.status}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarketing(event)}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    <Share2 className="h-4 w-4 mr-1" />
                    <Globe className="h-4 w-4 mr-1" />
                    Market
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setEditingEvent(event)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Event</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Title</Label>
                          <Input value={editingEvent?.title || ""} onChange={(e) => 
                            setEditingEvent(prev => prev ? {...prev, title: e.target.value} : null)
                          } />
                        </div>
                        <Button onClick={async () => {
                          if (!editingEvent) return;
                          const { error } = await supabase
                            .from("events")
                            .update({ title: editingEvent.title })
                            .eq("id", editingEvent.id);
                          
                          if (!error) {
                            toast({ title: "Event updated" });
                            setEditingEvent(null);
                          }
                        }}>Save Changes</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(event.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
};
