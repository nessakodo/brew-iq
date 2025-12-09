// Supabase Edge Function: generate-trivia
// Generates AI trivia questions using OpenAI API (replacement for Lovable API)
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
    const { topic, difficulty, num_questions = 10 } = await req.json()

    if (!topic) {
      throw new Error('Topic is required')
    }

    // Call OpenAI API
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const prompt = `Generate ${num_questions} trivia questions about ${topic} at ${difficulty || 'medium'} difficulty level.

For each question, provide:
1. The question text
2. Four answer options (A, B, C, D)
3. The correct answer letter
4. Make questions challenging but fair

Format the response as a JSON array of objects with this structure:
{
  "question_text": "...",
  "option_a": "...",
  "option_b": "...",
  "option_c": "...",
  "option_d": "...",
  "correct_answer": "A" (or B, C, D)
}

Return ONLY the JSON array, no other text.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // or 'gpt-3.5-turbo' for lower cost
        messages: [
          { role: 'system', content: 'You are a trivia question generator. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    // Parse the JSON response
    let questions
    try {
      questions = JSON.parse(content)
    } catch (e) {
      throw new Error('Failed to parse AI response as JSON')
    }

    // Validate question format
    const validatedQuestions = questions.map((q: any, index: number) => ({
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer.toUpperCase(),
      order_index: index,
      time_limit_seconds: 30
    }))

    return new Response(
      JSON.stringify({
        success: true,
        questions: validatedQuestions,
        count: validatedQuestions.length
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
