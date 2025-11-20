import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserPlus, Trash2, Edit2, UserX, UserCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { z } from "zod";

const hostSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  displayName: z.string().trim().min(2, { message: "Display name must be at least 2 characters" }).max(100),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(72),
});

interface Host {
  id: string;
  email: string;
  display_name: string;
  account_status: string;
}

export const HostManagement = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const fetchHosts = async () => {
    setLoading(true);
    try {
      const { data: hostRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "host");

      if (hostRoles && hostRoles.length > 0) {
        const hostIds = hostRoles.map((r) => r.user_id);
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("*")
          .in("id", hostIds);

        if (error) throw error;
        setHosts(profiles || []);
      } else {
        setHosts([]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHosts();

    // Setup realtime subscription for auto-updates
    const channel = supabase
      .channel('host-management')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: 'role=eq.host'
        },
        () => {
          fetchHosts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchHosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreateHost = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const validation = hostSchema.safeParse({ email, displayName, password });
      if (!validation.success) {
        toast({
          title: "Validation Error",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        setCreating(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: email.trim(),
          password,
          display_name: displayName.trim(),
          role: "host",
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (data?.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Host account created successfully for ${email}`,
        });
        setEmail("");
        setDisplayName("");
        setPassword("");
        setIsDialogOpen(false);
        fetchHosts();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSuspendHost = async (hostId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "suspended" ? "active" : "suspended";
      const { error } = await supabase
        .from("profiles")
        .update({ account_status: newStatus })
        .eq("id", hostId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Host account ${newStatus === "suspended" ? "suspended" : "activated"}`,
      });
      fetchHosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteHost = async (hostId: string) => {
    if (!confirm("Are you sure you want to delete this host account? This action cannot be undone.")) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: hostId },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Host account deleted",
        });
        fetchHosts();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Host Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Create Host
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Host Account</DialogTitle>
              <DialogDescription>
                Create a new host account with email and password
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateHost} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="host-email">Email</Label>
                <Input
                  id="host-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host-display-name">Display Name</Label>
                <Input
                  id="host-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host-password">Password</Label>
                <Input
                  id="host-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={72}
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "Creating..." : "Create Host"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Display Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hosts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No host accounts found
              </TableCell>
            </TableRow>
          ) : (
            hosts.map((host) => (
              <TableRow key={host.id}>
                <TableCell>{host.email}</TableCell>
                <TableCell>{host.display_name}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      host.account_status === "suspended"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {host.account_status === "suspended" ? "Suspended" : "Active"}
                  </span>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSuspendHost(host.id, host.account_status)}
                  >
                    {host.account_status === "suspended" ? (
                      <UserCheck className="h-4 w-4" />
                    ) : (
                      <UserX className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteHost(host.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
};
