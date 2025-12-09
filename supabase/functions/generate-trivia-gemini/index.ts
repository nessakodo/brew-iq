// Supabase Edge Function: generate-trivia-gemini
// Generates AI trivia questions using Google Gemini API (FREE!)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== FUNCTION CALLED ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Step 1: Creating Supabase admin client...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables:', { supabaseUrl: !!supabaseUrl, serviceRoleKey: !!serviceRoleKey })
      throw new Error('Missing Supabase configuration')
    }
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    console.log('✓ Supabase admin client created')

    // Verify admin
    console.log('Step 2: Checking authorization...')
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Authorization header missing')
      throw new Error('Authorization header missing')
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token extracted (length:', token.length, ')')
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      console.error('Auth error:', userError)
      throw new Error('Unauthorized: Invalid or missing token')
    }
    console.log('✓ User authenticated:', user.id)

    // Check if user has admin role using service role (bypasses RLS)
    console.log('Step 3: Checking admin role...')
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError) {
      console.error('Role check error:', roleError)
      throw new Error(`Failed to verify admin role: ${roleError.message}`)
    }

    if (!roles) {
      console.error('User does not have admin role:', user.id)
      throw new Error('Only admins can generate trivia')
    }
    console.log('✓ Admin role verified')

    // Get request parameters
    let requestBody
    try {
      requestBody = await req.json()
    } catch (e) {
      console.error('Failed to parse request body:', e)
      throw new Error('Invalid request body - must be valid JSON')
    }

    const { title, theme, difficulty = 'medium', questionCount = 10 } = requestBody

    console.log('Request parameters:', { title, theme, difficulty, questionCount })

    if (!title || !theme) {
      throw new Error('Title and theme are required')
    }

    // Call Google Gemini API (FREE!)
    console.log('Step 5: Checking Gemini API key...')
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) {
      console.error('Gemini API key not configured')
      throw new Error('Gemini API key not configured')
    }
    console.log('✓ Gemini API key found (length:', geminiKey.length, ')')

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

    console.log('Step 6: Calling Gemini API...')
    
    // First, try to list available models to see what we have access to
    console.log('Checking available models...')
    let availableModels: string[] = []
    
    try {
      for (const version of ['v1', 'v1beta']) {
        const listUrl = `https://generativelanguage.googleapis.com/${version}/models?key=${geminiKey}`
        const listResponse = await fetch(listUrl)
        
        if (listResponse.ok) {
          const listData = await listResponse.json()
          if (listData.models) {
            availableModels = listData.models
              .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
              .map((m: any) => m.name.replace('models/', ''))
            console.log(`✓ Found ${availableModels.length} available models in ${version}:`, availableModels)
            break
          }
        }
      }
    } catch (e) {
      console.log('Could not list models, will try common model names')
    }
    
    // Try models in order of preference
    const modelsToTry = availableModels.length > 0 
      ? availableModels 
      : [
          'gemini-pro',
          'gemini-1.5-pro-latest',
          'gemini-1.5-flash-latest',
          'gemini-1.5-pro',
          'gemini-1.5-flash',
          'gemini-2.0-flash-exp'
        ]
    
    let response
    let lastError
    let successfulModel
    
    for (const model of modelsToTry) {
      try {
        // Try v1beta first (often has newer models), then v1
        for (const version of ['v1beta', 'v1']) {
          const apiUrl = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${geminiKey}`
          console.log(`Trying ${version}/${model}...`)
          
          response = await fetch(apiUrl, {
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
          
          console.log(`✓ ${version}/${model} response status:`, response.status)
          
          if (response.ok) {
            successfulModel = `${version}/${model}`
            console.log(`✓ Successfully using ${successfulModel}`)
            break
          } else {
            const errorText = await response.text()
            console.error(`${version}/${model} failed:`, errorText.substring(0, 300))
            let errorData
            try {
              errorData = JSON.parse(errorText)
            } catch (e) {
              errorData = { error: { message: errorText } }
            }
            lastError = errorData.error?.message || 'Unknown error'
            
            // If 404, try next version/model
            if (response.status === 404) {
              continue
            } else {
              // Other errors, try next model
              break
            }
          }
        }
        
        if (response && response.ok) {
          break
        }
      } catch (error) {
        console.error(`Error with ${model}:`, error)
        lastError = error instanceof Error ? error.message : String(error)
        continue
      }
    }
    
    if (!response || !response.ok) {
      const errorMsg = availableModels.length > 0
        ? `None of the available models (${availableModels.join(', ')}) worked. Last error: ${lastError || 'Unknown'}`
        : `Tried models ${modelsToTry.join(', ')} but none worked. Last error: ${lastError || 'Unknown'}. Your API key may not have access to these models, or the free tier may have been discontinued.`
      throw new Error(`Gemini API error: ${errorMsg}`)
    }
    
    console.log(`✓ Using model: ${successfulModel}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    
    // Check if Gemini returned an error
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Gemini API response error:', data)
      throw new Error(`Gemini API error: ${data.error?.message || 'Invalid response format'}`)
    }
    
    const content = data.candidates[0].content.parts[0].text

    // Clean up the response - remove markdown code blocks if present
    let cleanedContent = content.trim()
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\n/, '').replace(/\n```$/, '')
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\n/, '').replace(/\n```$/, '')
    }

    // Parse the JSON response
    console.log('Step 7: Parsing AI response...')
    let questions
    try {
      questions = JSON.parse(cleanedContent)
      console.log('✓ Parsed', Array.isArray(questions) ? questions.length : 'non-array', 'questions')
    } catch (e) {
      console.error('Failed to parse AI response. Content length:', cleanedContent.length)
      console.error('First 500 chars:', cleanedContent.substring(0, 500))
      console.error('Parse error:', e)
      throw new Error('Failed to parse AI response as JSON')
    }

    // Validate and create trivia set (using service role bypasses RLS)
    console.log('Step 8: Creating trivia set in database...')
    const triviaSetData = {
      title,
      description: `AI-generated trivia about ${theme}`,
      theme,
      difficulty,
      is_preset: true,
      created_by: user.id
    }

    console.log('Trivia set data:', JSON.stringify(triviaSetData, null, 2))

    const { data: triviaSet, error: setError } = await supabaseAdmin
      .from('trivia_sets')
      .insert(triviaSetData)
      .select()
      .single()

    if (setError) {
      console.error('Failed to create trivia set - Full error:', JSON.stringify(setError, null, 2))
      console.error('Error code:', setError.code)
      console.error('Error message:', setError.message)
      console.error('Error details:', setError.details)
      console.error('Error hint:', setError.hint)
      throw new Error(`Failed to create trivia set: ${setError.message} (Code: ${setError.code || 'unknown'})`)
    }

    if (!triviaSet) {
      console.error('No trivia set data returned from insert')
      throw new Error('Failed to create trivia set: No data returned')
    }

    console.log('Trivia set created successfully:', triviaSet.id)

    // Validate questions array
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('No questions generated by AI')
    }

    // Validate and insert questions
    const validatedQuestions = questions.map((q: any, index: number) => {
      // Validate required fields
      if (!q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d || !q.correct_answer) {
        throw new Error(`Question ${index + 1} is missing required fields`)
      }
      
      return {
        trivia_set_id: triviaSet.id,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer.toUpperCase(),
        order_index: index,
        time_limit_seconds: 30
      }
    })

    console.log('Step 9: Inserting questions into database...')
    console.log(`Attempting to insert ${validatedQuestions.length} questions`)
    console.log('First question sample:', JSON.stringify(validatedQuestions[0], null, 2))

    const { error: questionsError } = await supabaseAdmin
      .from('questions')
      .insert(validatedQuestions)

    if (questionsError) {
      console.error('Failed to insert questions - Full error:', JSON.stringify(questionsError, null, 2))
      console.error('Error code:', questionsError.code)
      console.error('Error message:', questionsError.message)
      console.error('Error details:', questionsError.details)
      console.error('Error hint:', questionsError.hint)
      // Rollback - delete the trivia set
      await supabaseAdmin.from('trivia_sets').delete().eq('id', triviaSet.id)
      throw new Error(`Failed to insert questions: ${questionsError.message} (Code: ${questionsError.code || 'unknown'})`)
    }

    console.log('✓ Questions inserted successfully')
    console.log('=== FUNCTION COMPLETED SUCCESSFULLY ===')

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
    // Log full error details
    console.error('=== ERROR DETAILS ===')
    console.error('Error type:', typeof error)
    console.error('Error:', error)
    console.error('Error stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      if ('code' in error) console.error('Error code:', (error as any).code)
      if ('details' in error) console.error('Error details:', (error as any).details)
      if ('hint' in error) console.error('Error hint:', (error as any).hint)
    } else {
      console.error('Error is not an Error instance:', error)
      console.error('Error toString:', String(error))
    }
    console.error('=== END ERROR DETAILS ===')
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorCode = error && typeof error === 'object' && 'code' in error ? (error as any).code : undefined
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        errorCode: errorCode,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: errorMessage.includes('Unauthorized') ? 401 : 400
      }
    )
  }
})
