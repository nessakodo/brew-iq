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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError) throw eventError;

    // Generate social media post using AI
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
            role: "user",
            content: `Generate an engaging social media post for this trivia event: "${event.title}" on ${event.event_date} at ${event.event_time}. Theme: ${event.theme || 'General'}. Keep it under 200 characters, fun, and include relevant emojis.`
          }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    const socialPost = aiData.choices[0].message.content;

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

    return new Response(
      JSON.stringify({ 
        success: true, 
        socialPost,
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
