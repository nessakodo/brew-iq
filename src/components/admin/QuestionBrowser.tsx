import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  order_index: number;
}

interface QuestionBrowserProps {
  triviaSetId: string;
  triviaSetTitle: string;
  theme: string;
  difficulty: string;
  open: boolean;
  onClose: () => void;
}

export const QuestionBrowser = ({ triviaSetId, triviaSetTitle, theme, difficulty, open, onClose }: QuestionBrowserProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [replacing, setReplacing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchQuestions();
    }
  }, [open, triviaSetId]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("trivia_set_id", triviaSetId)
        .order("order_index");

      if (error) throw error;
      setQuestions(data || []);
      setCurrentIndex(0);
    } catch (error: any) {
      toast({
        title: "Error loading questions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAndReplace = async (questionId: string) => {
    if (!confirm("Delete this question and generate a replacement?")) return;

    setReplacing(true);
    try {
      // Delete the question
      const { error: deleteError } = await supabase
        .from("questions")
        .delete()
        .eq("id", questionId);

      if (deleteError) throw deleteError;

      // Generate a replacement question via AI
      const prompt = `Generate 1 new trivia question about ${theme}. Difficulty: ${difficulty}.
Format: QUESTION_TEXT|OPTION_A|OPTION_B|OPTION_C|OPTION_D|CORRECT_LETTER`;

      const { data, error } = await supabase.functions.invoke("generate-trivia", {
        body: {
          prompt,
          title: triviaSetTitle,
          theme,
          difficulty,
          questionCount: 1,
        },
      });

      if (error) throw error;

      toast({
        title: "Question replaced",
        description: "New question generated successfully",
      });

      await fetchQuestions();
    } catch (error: any) {
      toast({
        title: "Error replacing question",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setReplacing(false);
    }
  };

  const currentQuestion = questions[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {triviaSetTitle} - Questions
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : questions.length === 0 ? (
          <p className="text-center text-muted-foreground p-12">No questions found</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                  disabled={currentIndex === questions.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Card className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-bold text-foreground">
                  {currentQuestion?.question_text}
                </h3>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteAndReplace(currentQuestion.id)}
                  disabled={replacing}
                >
                  {replacing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Replacing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete & Replace
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                {["a", "b", "c", "d"].map((option) => {
                  const optionKey = `option_${option}` as keyof Question;
                  const isCorrect = option === currentQuestion?.correct_answer.toLowerCase();

                  return (
                    <Card
                      key={option}
                      className={`p-4 ${
                        isCorrect
                          ? "bg-primary/20 border-primary border-2"
                          : "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {option.toUpperCase()}. {currentQuestion?.[optionKey] as string}
                        </span>
                        {isCorrect && (
                          <Badge variant="default">Correct</Badge>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
