// Supabase Edge Function: generate-trivia-gemini
// Generates AI trivia questions using Google Gemini API (FREE!)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)

    if (!user) throw new Error('Unauthorized')

    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!roles) throw new Error('Only admins can generate trivia')

    // Get request parameters
    const { title, theme, difficulty = 'medium', questionCount = 10 } = await req.json()

    if (!title || !theme) {
      throw new Error('Title and theme are required')
    }

    // Call Google Gemini API (FREE!)
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) {
      throw new Error('Gemini API key not configured')
    }

    const prompt = `Generate exactly ${questionCount} multiple choice trivia questions about ${theme} at ${difficulty} difficulty level.

For each question, provide:
1. The question text
2. Four answer options (A, B, C, D)
3. The correct answer letter

Make questions challenging but fair.

IMPORTANT: Return ONLY valid JSON with no markdown, no code blocks, no extra text.
The response must be a JSON array of objects with this exact structure:
[
  {
    "question_text": "...",
    "option_a": "...",
    "option_b": "...",
    "option_c": "...",
    "option_d": "...",
    "correct_answer": "A"
  }
]`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 8192,
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    const content = data.candidates[0].content.parts[0].text

    // Clean up the response - remove markdown code blocks if present
    let cleanedContent = content.trim()
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\n/, '').replace(/\n```$/, '')
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\n/, '').replace(/\n```$/, '')
    }

    // Parse the JSON response
    let questions
    try {
      questions = JSON.parse(cleanedContent)
    } catch (e) {
      console.error('Failed to parse AI response:', cleanedContent)
      throw new Error('Failed to parse AI response as JSON')
    }

    // Validate and create trivia set
    const { data: triviaSet, error: setError } = await supabaseAdmin
      .from('trivia_sets')
      .insert({
        title,
        description: `AI-generated trivia about ${theme}`,
        theme,
        difficulty,
        is_preset: true,
        created_by: user.id
      })
      .select()
      .single()

    if (setError) throw setError

    // Validate and insert questions
    const validatedQuestions = questions.map((q: any, index: number) => ({
      trivia_set_id: triviaSet.id,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer.toUpperCase(),
      order_index: index,
      time_limit_seconds: 30
    }))

    const { error: questionsError } = await supabaseAdmin
      .from('questions')
      .insert(validatedQuestions)

    if (questionsError) {
      // Rollback - delete the trivia set
      await supabaseAdmin.from('trivia_sets').delete().eq('id', triviaSet.id)
      throw questionsError
    }

    return new Response(
      JSON.stringify({
        success: true,
        trivia_set_id: triviaSet.id,
        question_count: validatedQuestions.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error generating trivia:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
