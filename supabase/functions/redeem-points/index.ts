import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const body = await req.json();
    const { shop_item_slug, accessToken, userId } = body as {
      shop_item_slug: string;
      accessToken?: string;
      userId?: string;
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

    // --- Triple fallback auth ---
    let authenticatedUserId: string | null = null;
    let supabase: ReturnType<typeof createClient> | null = null;

    // AUTH METHOD 1: Authorization header JWT
    if (authHeader) {
      const anonKeyPrefix = supabaseKey.substring(0, 30);
      const headerTokenPrefix = authHeader
        .replace("Bearer ", "")
        .substring(0, 30);
      const isAnonKey = headerTokenPrefix === anonKeyPrefix;

      if (!isAnonKey) {
        try {
          supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } },
          });
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();
          if (!userError && user) {
            authenticatedUserId = user.id;
            console.log(
              "[redeem-points] Auth Method 1 (header JWT): User",
              user.id
            );
          }
        } catch (e) {
          console.log(
            "[redeem-points] Auth Method 1 error:",
            (e as Error).message
          );
        }
      }
    }

    // AUTH METHOD 2: accessToken in request body
    if (!authenticatedUserId && accessToken) {
      try {
        const tokenAuthHeader = accessToken.startsWith("Bearer ")
          ? accessToken
          : `Bearer ${accessToken}`;
        supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: tokenAuthHeader } },
        });
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (!userError && user) {
          authenticatedUserId = user.id;
          console.log(
            "[redeem-points] Auth Method 2 (body accessToken): User",
            user.id
          );
        }
      } catch (e) {
        console.log(
          "[redeem-points] Auth Method 2 error:",
          (e as Error).message
        );
      }
    }

    // AUTH METHOD 3: userId in body + service role (last resort)
    if (!authenticatedUserId && userId && serviceRoleKey) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(userId)) {
        authenticatedUserId = userId;
        supabase = createClient(supabaseUrl, serviceRoleKey);
        console.log(
          "[redeem-points] Auth Method 3 (body userId + service role): User",
          userId
        );
      }
    }

    if (!authenticatedUserId || !supabase) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // --- Use service role client for DB operations ---
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Read total_points
    const { data: rewardData } = await adminClient
      .from("user_reward_points")
      .select("total_points")
      .eq("user_id", authenticatedUserId)
      .single();

    const currentPoints = rewardData?.total_points ?? 0;

    // 2. Verify sufficient points
    if (currentPoints < shopItem.points_cost) {
      return new Response(
        JSON.stringify({ error: "Punti insufficienti" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // 3. Deduct points: INSERT reward_transaction with negative points
    await adminClient.from("reward_transactions").insert({
      user_id: authenticatedUserId,
      points: -shopItem.points_cost,
      type: "redemption",
      source_id: shop_item_slug,
      description: `Riscatto: ${shopItem.reward_description}`,
    });

    // 4. UPDATE user_reward_points: subtract points
    await adminClient
      .from("user_reward_points")
      .update({
        total_points: currentPoints - shopItem.points_cost,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", authenticatedUserId);

    // 5. Calculate new premium expiry
    const { data: profileData } = await adminClient
      .from("user_profiles")
      .select("premium_until")
      .eq("user_id", authenticatedUserId)
      .single();

    const now = new Date();
    let baseDate: Date;

    if (
      profileData?.premium_until &&
      new Date(profileData.premium_until) > now
    ) {
      // Extend existing premium
      baseDate = new Date(profileData.premium_until);
    } else {
      // Start fresh
      baseDate = now;
    }

    const newExpiry = new Date(baseDate);
    newExpiry.setDate(newExpiry.getDate() + shopItem.days_premium);

    // 6. Update user_profiles
    await adminClient
      .from("user_profiles")
      .update({
        premium_until: newExpiry.toISOString(),
        premium_type: "points",
      })
      .eq("user_id", authenticatedUserId);

    const remainingPoints = currentPoints - shopItem.points_cost;

    return new Response(
      JSON.stringify({
        success: true,
        new_expiry: newExpiry.toISOString(),
        remaining_points: remainingPoints,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[redeem-points] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
