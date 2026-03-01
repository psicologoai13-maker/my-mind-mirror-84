import { authenticateUser, handleCors, corsHeaders } from '../_shared/auth.ts';

const SHOP_ITEMS: Record<
  string,
  { points_cost: number; reward_description: string; days_premium: number }
> = {
  "trial-premium": {
    points_cost: 150,
    reward_description: "3 giorni Premium",
    days_premium: 3,
  },
  "week-premium": {
    points_cost: 300,
    reward_description: "1 settimana Premium",
    days_premium: 7,
  },
  "month-premium": {
    points_cost: 1000,
    reward_description: "1 mese Premium",
    days_premium: 30,
  },
  "sixmonths-premium": {
    points_cost: 5000,
    reward_description: "6 mesi Premium",
    days_premium: 180,
  },
  "year-premium": {
    points_cost: 10000,
    reward_description: "1 anno Premium",
    days_premium: 365,
  },
};

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { userId, supabaseAdmin } = await authenticateUser(req);

    const body = await req.json();
    const { shop_item_slug } = body as {
      shop_item_slug: string;
    };

    if (!shop_item_slug) {
      return new Response(
        JSON.stringify({ error: "shop_item_slug is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Validazione input riscatto
    if (typeof shop_item_slug !== 'string' || shop_item_slug.length > 100) {
      return new Response(JSON.stringify({ error: 'invalid shop_item_slug' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const shopItem = SHOP_ITEMS[shop_item_slug];
    if (!shopItem) {
      return new Response(
        JSON.stringify({ error: "Shop item not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // FIX 3.8: Riscatto atomico con SELECT FOR UPDATE tramite RPC
    const { data: result, error: redeemError } = await supabaseAdmin.rpc('atomic_redeem_points', {
      p_user_id: userId,
      p_cost: shopItem.points_cost,
      p_reward_type: shop_item_slug
    });

    if (redeemError) {
      console.error("[redeem-points] RPC error:", redeemError);
      return new Response(
        JSON.stringify({ error: "Errore durante il riscatto" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    if (!result?.success) {
      return new Response(
        JSON.stringify({ error: result?.error || "Punti insufficienti" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Calculate new premium expiry
    const { data: profileData } = await supabaseAdmin
      .from("user_profiles")
      .select("premium_until")
      .eq("user_id", userId)
      .single();

    const now = new Date();
    let baseDate: Date;

    if (
      profileData?.premium_until &&
      new Date(profileData.premium_until) > now
    ) {
      baseDate = new Date(profileData.premium_until);
    } else {
      baseDate = now;
    }

    const newExpiry = new Date(baseDate);
    newExpiry.setDate(newExpiry.getDate() + shopItem.days_premium);

    // Update user_profiles with premium
    await supabaseAdmin
      .from("user_profiles")
      .update({
        premium_until: newExpiry.toISOString(),
        premium_type: "points",
      })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({
        success: true,
        new_expiry: newExpiry.toISOString(),
        remaining_points: result.remaining_points,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[redeem-points] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
