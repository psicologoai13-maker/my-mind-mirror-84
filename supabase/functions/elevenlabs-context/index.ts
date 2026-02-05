 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const authHeader = req.headers.get("Authorization");
     if (!authHeader?.startsWith("Bearer ")) {
       return new Response(JSON.stringify({ error: "Unauthorized" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseKey, {
       global: { headers: { Authorization: authHeader } },
     });
 
     const token = authHeader.replace("Bearer ", "");
     const { data: claims, error: claimsError } = await supabase.auth.getUser(token);
     
     if (claimsError || !claims?.user) {
       return new Response(JSON.stringify({ error: "Unauthorized" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const userId = claims.user.id;
 
     // Fetch user profile with long-term memory
     const { data: profile } = await supabase
       .from("user_profiles")
       .select("name, long_term_memory, selected_goals, occupation_context")
       .eq("user_id", userId)
       .single();
 
     // Fetch today's metrics
     const today = new Date().toISOString().split("T")[0];
     const { data: dailyMetrics } = await supabase.rpc("get_daily_metrics", {
       p_user_id: userId,
       p_date: today,
     });
 
     // Fetch recent check-in notes
     const { data: recentCheckin } = await supabase
       .from("daily_checkins")
       .select("notes, mood_value, mood_emoji")
       .eq("user_id", userId)
       .order("created_at", { ascending: false })
       .limit(1)
       .single();
 
     // Build user context string (max ~500 chars for efficiency)
     const userName = profile?.name || "Utente";
     
     const contextParts: string[] = [];
 
     // Add long-term memory (last 5 points max)
     if (profile?.long_term_memory && profile.long_term_memory.length > 0) {
       const memoryPoints = profile.long_term_memory.slice(-5);
       contextParts.push(`Memoria: ${memoryPoints.join(". ")}`);
     }
 
     // Add occupation context
     if (profile?.occupation_context) {
       contextParts.push(`Occupazione: ${profile.occupation_context}`);
     }
 
     // Add selected goals
     if (profile?.selected_goals && profile.selected_goals.length > 0) {
       const goalsMap: Record<string, string> = {
         reduce_anxiety: "ridurre ansia",
         improve_sleep: "dormire meglio",
         manage_stress: "gestire stress",
         build_confidence: "aumentare autostima",
         improve_relationships: "migliorare relazioni",
         find_purpose: "trovare scopo",
         overcome_fears: "superare paure",
         increase_focus: "aumentare concentrazione",
       };
       const goals = profile.selected_goals
         .map((g: string) => goalsMap[g] || g)
         .slice(0, 3)
         .join(", ");
       contextParts.push(`Obiettivi: ${goals}`);
     }
 
     // Add today's vitals
     if (dailyMetrics?.vitals) {
       const vitals = dailyMetrics.vitals;
       const vitalsParts: string[] = [];
       if (vitals.mood > 0) vitalsParts.push(`mood ${vitals.mood}/10`);
       if (vitals.anxiety > 0) vitalsParts.push(`ansia ${vitals.anxiety}/10`);
       if (vitals.energy > 0) vitalsParts.push(`energia ${vitals.energy}/10`);
       if (vitals.sleep > 0) vitalsParts.push(`sonno ${vitals.sleep}/10`);
       if (vitalsParts.length > 0) {
         contextParts.push(`Stato oggi: ${vitalsParts.join(", ")}`);
       }
     }
 
     // Add recent check-in context
     if (recentCheckin?.notes) {
       try {
         const notesData = typeof recentCheckin.notes === "string" 
           ? JSON.parse(recentCheckin.notes) 
           : recentCheckin.notes;
         if (notesData.freeText) {
           const truncatedNote = notesData.freeText.substring(0, 100);
           contextParts.push(`Ultimo check-in: "${truncatedNote}"`);
         }
       } catch {
         // Notes might be plain text
         if (typeof recentCheckin.notes === "string" && recentCheckin.notes.length > 0) {
           const truncatedNote = recentCheckin.notes.substring(0, 100);
           contextParts.push(`Ultimo check-in: "${truncatedNote}"`);
         }
       }
     }
 
     const userContext = contextParts.length > 0 
       ? contextParts.join(". ") + "."
       : "Prima conversazione con Aria.";
 
     console.log("[elevenlabs-context] Generated context for user:", userName);
     console.log("[elevenlabs-context] Context length:", userContext.length);
 
     return new Response(
       JSON.stringify({
         user_name: userName,
         user_context: userContext,
       }),
       {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   } catch (error) {
     console.error("[elevenlabs-context] Error:", error);
     return new Response(
       JSON.stringify({
         error: error instanceof Error ? error.message : "Unknown error",
         user_name: "Utente",
         user_context: "Prima conversazione con Aria.",
       }),
       {
         status: 200, // Return 200 with fallback data
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   }
 });