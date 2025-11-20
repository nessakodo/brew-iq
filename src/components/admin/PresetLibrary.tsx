import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Edit, Trash2, Eye, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionBrowser } from "./QuestionBrowser";

interface TriviaSet {
  id: string;
  title: string;
  description: string | null;
  theme: string | null;
  difficulty: string | null;
  topic: string | null;
  is_preset: boolean;
  question_count?: number;
}

export const PresetLibrary = () => {
  const [presets, setPresets] = useState<TriviaSet[]>([]);
  const [customSets, setCustomSets] = useState<TriviaSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSet, setEditingSet] = useState<TriviaSet | null>(null);
  const [editQuestionCount, setEditQuestionCount] = useState<number>(60);
  const [browsingSet, setBrowsingSet] = useState<TriviaSet | null>(null);
  const { toast } = useToast();

  const fetchSets = async () => {
    try {
      const { data: presetsData, error: presetsError } = await supabase
        .from("trivia_sets")
        .select("*, questions(count)")
        .eq("is_preset", true)
        .order("created_at", { ascending: false });

      const { data: customData, error: customError } = await supabase
        .from("trivia_sets")
        .select("*, questions(count)")
        .eq("is_preset", false)
        .order("created_at", { ascending: false });

      if (presetsError) throw presetsError;
      if (customError) throw customError;

      const mapWithCount = (data: any[]) =>
        data.map((set: any) => ({
          ...set,
          question_count: set.questions[0]?.count || 0,
        }));

      setPresets(mapWithCount(presetsData || []));
      setCustomSets(mapWithCount(customData || []));
    } catch (error: any) {
      toast({
        title: "Error fetching trivia sets",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSets();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trivia set?")) return;

    try {
      const { error } = await supabase.from("trivia_sets").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Trivia set deleted successfully" });
      fetchSets();
    } catch (error: any) {
      toast({
        title: "Error deleting set",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (set: TriviaSet) => {
    setEditingSet(set);
    setEditQuestionCount(set.question_count || 60);
  };

  const handleSaveEdit = async () => {
    if (!editingSet) return;

    try {
      const currentCount = editingSet.question_count || 0;
      const difference = editQuestionCount - currentCount;

      if (difference > 0) {
        // Generate additional questions
        const { data: existingQuestions } = await supabase
          .from("questions")
          .select("*")
          .eq("trivia_set_id", editingSet.id)
          .order("order_index", { ascending: false })
          .limit(1);

        const lastIndex = existingQuestions?.[0]?.order_index || 0;
        const newQuestions = Array.from({ length: difference }, (_, i) => ({
          trivia_set_id: editingSet.id,
          question_text: `Question ${lastIndex + i + 2}`,
          option_a: "Option A",
          option_b: "Option B",
          option_c: "Option C",
          option_d: "Option D",
          correct_answer: "A",
          order_index: lastIndex + i + 1,
          time_limit_seconds: 60,
        }));

        const { error } = await supabase.from("questions").insert(newQuestions);
        if (error) throw error;
      } else if (difference < 0) {
        // Remove excess questions
        const { data: questionsToDelete } = await supabase
          .from("questions")
          .select("id")
          .eq("trivia_set_id", editingSet.id)
          .order("order_index", { ascending: false })
          .limit(Math.abs(difference));

        if (questionsToDelete) {
          const { error } = await supabase
            .from("questions")
            .delete()
            .in(
              "id",
              questionsToDelete.map((q) => q.id)
            );
          if (error) throw error;
        }
      }

      toast({ title: "Trivia set updated successfully" });
      setEditingSet(null);
      fetchSets();
    } catch (error: any) {
      toast({
        title: "Error updating set",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const renderSetCards = (sets: TriviaSet[], isCustom: boolean) => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sets.map((set) => (
        <Card key={set.id} className="p-6 hover:shadow-glow transition-all group">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold group-hover:text-secondary transition-colors">
                {set.title}
              </h3>
              {set.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {set.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {set.theme && <Badge variant="secondary">{set.theme}</Badge>}
              {set.difficulty && <Badge variant="outline">{set.difficulty}</Badge>}
              {set.topic && <Badge variant="outline">{set.topic}</Badge>}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {set.question_count} Questions
                {set.question_count && set.question_count >= 60 && " (2hr game)"}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setBrowsingSet(set)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(set)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(set.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading trivia sets...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Trivia Library</h2>
        </div>

        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="presets">
              <BookOpen className="h-4 w-4 mr-2" />
              Preset Sets
            </TabsTrigger>
            <TabsTrigger value="custom">
              <Sparkles className="h-4 w-4 mr-2" />
              Custom Sets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="mt-6">
            {presets.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No preset trivia sets available.</p>
              </Card>
            ) : (
              renderSetCards(presets, false)
            )}
          </TabsContent>

          <TabsContent value="custom" className="mt-6">
            {customSets.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No custom sets yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Generate your first set using AI!
                </p>
              </Card>
            ) : (
              renderSetCards(customSets, true)
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!editingSet} onOpenChange={() => setEditingSet(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Trivia Set</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Set Name</Label>
              <p className="text-sm text-muted-foreground">{editingSet?.title}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="questionCount">Number of Questions</Label>
              <Input
                id="questionCount"
                type="number"
                min="1"
                max="100"
                value={editQuestionCount}
                onChange={(e) => setEditQuestionCount(parseInt(e.target.value) || 60)}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 60 questions for 2-hour game (~2 min/round)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSet(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {browsingSet && (
        <QuestionBrowser
          triviaSetId={browsingSet.id}
          triviaSetTitle={browsingSet.title}
          theme={browsingSet.theme || "General"}
          difficulty={browsingSet.difficulty || "medium"}
          open={!!browsingSet}
          onClose={() => {
            setBrowsingSet(null);
            fetchSets(); // Refresh in case questions were deleted/replaced
          }}
        />
      )}
    </>
  );
};
