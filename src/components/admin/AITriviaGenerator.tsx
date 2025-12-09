import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AITriviaGeneratorProps {
  onTriviaGenerated?: () => void;
}

export const AITriviaGenerator = ({ onTriviaGenerated }: AITriviaGeneratorProps = {}) => {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState("10");
  const [customPrompt, setCustomPrompt] = useState("");

  const handleGenerate = async () => {
    if (!title || !theme) {
      toast({
        title: "Missing Information",
        description: "Please provide a title and theme",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const prompt = customPrompt || 
        `Generate ${questionCount} trivia questions about ${theme}. Difficulty: ${difficulty}. 
        Each question should have 4 multiple choice options (A, B, C, D) and indicate the correct answer.
        Format: Question text | Option A | Option B | Option C | Option D | Correct Answer (letter only)`;

      // Call AI generation edge function (using Gemini - FREE!)
      const { data, error } = await supabase.functions.invoke('generate-trivia-gemini', {
        body: { title, theme, difficulty, questionCount: parseInt(questionCount) }
      });

      if (error) throw error;

      toast({
        title: "Trivia Set Generated!",
        description: `Successfully created "${title}" with ${questionCount} questions`,
      });

      // Reset form
      setTitle("");
      setTheme("");
      setCustomPrompt("");

      // Trigger refresh in parent component
      if (onTriviaGenerated) {
        setTimeout(() => onTriviaGenerated(), 500);
      }
    } catch (error) {
      console.error("Error generating trivia:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate trivia set",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="p-6 elegant-card leather-texture">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-5 w-5 text-secondary warm-glow" />
        <h3 className="text-xl font-bold text-primary warm-glow">AI Trivia Generator</h3>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Trivia Set Title</Label>
            <Input
              id="title"
              placeholder="e.g., 90s Pop Culture Night"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={generating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Input
              id="theme"
              placeholder="e.g., 90s music, movies, TV"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              disabled={generating}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty} disabled={generating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="count">Number of Questions</Label>
            <Select value={questionCount} onValueChange={setQuestionCount} disabled={generating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 Questions</SelectItem>
                <SelectItem value="10">10 Questions</SelectItem>
                <SelectItem value="15">15 Questions</SelectItem>
                <SelectItem value="20">20 Questions</SelectItem>
                <SelectItem value="30">30 Questions</SelectItem>
                <SelectItem value="60">60 Questions (Full Night)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt">Custom Instructions (Optional)</Label>
          <Textarea
            id="prompt"
            placeholder="Add specific requirements or topics you want included..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            disabled={generating}
            rows={3}
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full"
          size="lg"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating with AI...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Trivia Set
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};
