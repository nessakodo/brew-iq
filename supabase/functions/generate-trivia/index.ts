import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { prompt, title, theme, difficulty, questionCount } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Smart tag extraction: select 1-2 key themes from a comma-separated list
    const extractSmartTags = (themeString: string): string => {
      const themes = themeString.split(',').map((t: string) => t.trim()).filter(Boolean);
      if (themes.length <= 2) return themes.join(', ');
      // Take first two themes as they're usually most important
      return themes.slice(0, 2).join(', ');
    };

    const smartTheme = extractSmartTags(theme);

    // Generate questions using AI - emphasize EXACTLY the requested count
    const enhancedPrompt = `${prompt}

CRITICAL: You MUST generate EXACTLY ${questionCount} questions. Not ${questionCount - 1}, not ${questionCount + 1}, but EXACTLY ${questionCount} questions.
Count your questions before responding to ensure you have exactly ${questionCount}.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a trivia question generator. Generate exactly the requested number of questions in this exact format for each question: QUESTION_TEXT|OPTION_A|OPTION_B|OPTION_C|OPTION_D|CORRECT_LETTER. Separate each question with a newline. Make sure options are plausible and the correct answer is clearly indicated (A, B, C, or D). CRITICAL: Generate the EXACT number of questions requested."
          },
          { role: "user", content: enhancedPrompt }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    const generatedText = aiData.choices[0].message.content;

    console.log(`Requested ${questionCount} questions, AI generated text with ${generatedText.trim().split("\n").filter((l: string) => l.trim()).length} lines`);

    // Parse generated questions
    const lines = generatedText.trim().split("\n").filter((line: string) => line.trim());
    
    // Create trivia set with smart theme
    const { data: triviaSet, error: setError } = await supabase
      .from("trivia_sets")
      .insert({
        title,
        theme: smartTheme,
        difficulty,
        is_preset: false,
      })
      .select()
      .single();

    if (setError) throw setError;

    // Insert questions - ensure we get exactly the requested count
    const questions = lines.slice(0, questionCount).map((line: string, index: number) => {
      const parts = line.split("|").map((p: string) => p.trim());
      if (parts.length !== 6) {
        console.error("Invalid line format:", line);
        return null;
      }
      
      return {
        trivia_set_id: triviaSet.id,
        question_text: parts[0],
        option_a: parts[1],
        option_b: parts[2],
        option_c: parts[3],
        option_d: parts[4],
        correct_answer: parts[5].toUpperCase(),
        order_index: index + 1,
      };
    }).filter(Boolean);

    // If we didn't get enough questions, log warning
    if (questions.length < questionCount) {
      console.warn(`Warning: Only generated ${questions.length} questions out of requested ${questionCount}`);
    }

    const { error: questionsError } = await supabase
      .from("questions")
      .insert(questions);

    if (questionsError) throw questionsError;

    return new Response(JSON.stringify({ 
      success: true, 
      triviaSetId: triviaSet.id, 
      questionsGenerated: questions.length,
      questionsRequested: questionCount 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
