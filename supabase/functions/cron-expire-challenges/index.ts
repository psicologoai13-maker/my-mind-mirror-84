import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Questa funzione è chiamata solo da cron job o service_role
    const authHeader = req.headers.get('Authorization');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Verifica che sia una chiamata autorizzata (service_role o cron)
    if (!authHeader || !authHeader.includes(serviceKey)) {
      return new Response(JSON.stringify({ error: 'Service role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceKey
    );

    // Marca come scadute tutte le sfide attive con expires_at passato
    const { data: expired, error } = await supabaseAdmin
      .from('user_challenges')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString())
      .select('id, user_id');

    if (error) {
      console.error('[cron-expire-challenges] Error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[cron-expire-challenges] Expired ${expired?.length || 0} challenges`);

    // Pulizia vecchi record rate_limits (> 24h)
    try {
      await supabaseAdmin.rpc('cleanup_rate_limits');
      console.log('[cron-expire-challenges] Rate limits cleanup done');
    } catch (e) {
      console.log('[cron-expire-challenges] Rate limits cleanup skipped:', (e as Error).message);
    }

    return new Response(JSON.stringify({
      success: true,
      expired_count: expired?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[cron-expire-challenges] Unexpected error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
