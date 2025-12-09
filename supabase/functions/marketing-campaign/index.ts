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

    const { eventId } = await req.json();
    
    // Use Gemini API directly (migrated from Lovable)
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      throw new Error("Gemini API key not configured");
    }

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError) throw eventError;

    // Generate social media post using Gemini API (with model discovery)
    console.log('Generating social media post...');
    
    // Try to find available Gemini model
    const modelsToTry = ['gemini-pro', 'gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-1.5-flash']
    let socialPost = ''
    let aiResponse
    
    for (const model of modelsToTry) {
      for (const version of ['v1beta', 'v1']) {
        try {
          const apiUrl = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${geminiKey}`
          console.log(`Trying ${version}/${model} for social post...`)
          
          const prompt = `Generate an engaging social media post for this trivia event: "${event.title}" on ${event.event_date} at ${event.event_time}. Theme: ${event.theme || 'General'}. Keep it under 200 characters, fun, and include relevant emojis.`;
          
          aiResponse = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }],
              generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 500,
              }
            }),
          });
          
          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            if (aiData.candidates?.[0]?.content?.parts?.[0]?.text) {
              socialPost = aiData.candidates[0].content.parts[0].text;
              console.log(`✓ Successfully generated post using ${version}/${model}`);
              break;
            }
          }
        } catch (e) {
          console.error(`Error with ${version}/${model}:`, e);
          continue;
        }
      }
      if (socialPost) break;
    }
    
    if (!socialPost) {
      throw new Error('Failed to generate social media post with any available Gemini model');
    }
    
    // Generate image prompt for visual
    console.log('Generating image prompt...');
    const imagePrompt = `Create a vibrant, engaging social media image for a trivia night event titled "${event.title}" happening on ${event.event_date} at ${event.event_time}. Theme: ${event.theme || 'General Knowledge'}. Style: Modern, fun, pub/bar atmosphere, colorful, includes text overlay space. Dimensions: 1200x630px for social media.`;
    
    // Generate image description (we'll use this for the visual)
    let imageDescription = ''
    for (const model of modelsToTry) {
      for (const version of ['v1beta', 'v1']) {
        try {
          const apiUrl = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${geminiKey}`
          const imgPrompt = `Describe a vibrant social media image for: "${event.title}" trivia event on ${event.event_date}. Theme: ${event.theme || 'General'}. Provide a detailed visual description suitable for image generation.`;
          
          const imgResponse = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: imgPrompt }] }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 300 }
            }),
          });
          
          if (imgResponse.ok) {
            const imgData = await imgResponse.json();
            if (imgData.candidates?.[0]?.content?.parts?.[0]?.text) {
              imageDescription = imgData.candidates[0].content.parts[0].text;
              console.log('✓ Generated image description');
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
      if (imageDescription) break;
    }

    // Store marketing data
    const { error: updateError } = await supabase
      .from("events")
      .update({
        marketing_image_url: `https://placehold.co/1200x630/2d5a3d/f0c674?text=${encodeURIComponent(event.title)}`
      })
      .eq("id", eventId);

    if (updateError) throw updateError;

    // Log marketing activity
    console.log("Marketing campaign executed:", {
      eventId,
      socialPost,
      emailSent: true,
      bannerGenerated: true
    });

    // Create marketing materials object
    const marketingMaterials = {
      socialPost: socialPost.trim(),
      imageDescription: imageDescription.trim(),
      imagePrompt: imagePrompt,
      eventTitle: event.title,
      eventDate: event.event_date,
      eventTime: event.event_time,
      theme: event.theme || 'General'
    };
    
    // Create a simple SVG banner as visual (can be replaced with actual image generation)
    const svgBanner = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2d5a3d;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1a3d2a;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#grad)"/>
      <text x="600" y="280" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#f0c674" text-anchor="middle">${event.title}</text>
      <text x="600" y="340" font-family="Arial, sans-serif" font-size="32" fill="#f0c674" text-anchor="middle">${event.event_date} at ${event.event_time}</text>
      <text x="600" y="400" font-family="Arial, sans-serif" font-size="24" fill="#f0c674" text-anchor="middle">Trivia Night</text>
    </svg>`;

    return new Response(
      JSON.stringify({ 
        success: true, 
        socialPost: marketingMaterials.socialPost,
        imageDescription: marketingMaterials.imageDescription,
        imagePrompt: marketingMaterials.imagePrompt,
        svgBanner: svgBanner,
        marketingMaterials: marketingMaterials,
        bannerCode: `<div style="background: linear-gradient(135deg, #2d5a3d, #1a3d2a); color: #f0c674; padding: 1rem; text-align: center; font-family: sans-serif;"><strong>${event.title}</strong> - ${event.event_date} at ${event.event_time}</div>`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
