import { authenticateUser, handleCors, corsHeaders } from '../_shared/auth.ts';

interface ChallengeDefinition {
  title: string;
  target: number;
  expires_days: number;
  points_reward: number;
  badge_id: string;
}

const CHALLENGES: Record<string, ChallengeDefinition> = {
  "breathing-7days": {
    title: "7 giorni di respirazione",
    target: 7,
    expires_days: 30,
    points_reward: 100,
    badge_id: "challenge_breathing",
  },
  "checkin-30days": {
    title: "30 check-in in un mese",
    target: 30,
    expires_days: 30,
    points_reward: 150,
    badge_id: "challenge_checkin",
  },
  "sessions-10": {
    title: "10 sessioni con Aria",
    target: 10,
    expires_days: 30,
    points_reward: 100,
    badge_id: "challenge_sessions",
  },
  "diary-7days": {
    title: "7 voci di diario",
    target: 7,
    expires_days: 30,
    points_reward: 80,
    badge_id: "challenge_diary",
  },
  "exercises-5": {
    title: "5 esercizi completati",
    target: 5,
    expires_days: 30,
    points_reward: 60,
    badge_id: "challenge_exercises",
  },
};

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { userId, supabaseAdmin } = await authenticateUser(req);

    const body = await req.json();
    const { challenge_slug } = body as {
      challenge_slug: string;
    };

    if (!challenge_slug || typeof challenge_slug !== 'string') {
      return new Response(
        JSON.stringify({ error: "challenge_slug is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const challengeDef = CHALLENGES[challenge_slug];
    if (!challengeDef) {
      return new Response(
        JSON.stringify({ error: "Challenge not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Check if user already has this challenge active (not completed and not expired)
    const { data: existingChallenge } = await supabaseAdmin
      .from("user_challenges")
      .select("id")
      .eq("user_id", userId)
      .eq("challenge_slug", challenge_slug)
      .is("completed_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .single();

    if (existingChallenge) {
      return new Response(
        JSON.stringify({ error: "Challenge già attiva" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + challengeDef.expires_days);

    // Insert new challenge
    const { data: newChallenge, error: insertError } = await supabaseAdmin
      .from("user_challenges")
      .insert({
        user_id: userId,
        challenge_slug,
        challenge_title: challengeDef.title,
        target_count: challengeDef.target,
        current_count: 0,
        expires_at: expiresAt.toISOString(),
        points_reward: challengeDef.points_reward,
        badge_id: challengeDef.badge_id,
      })
      .select("id, expires_at")
      .single();

    if (insertError) {
      console.error("[start-challenge] Insert error:", insertError.message);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        challenge_id: newChallenge.id,
        expires_at: newChallenge.expires_at,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[start-challenge] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
