import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface AuthResult {
  userId: string;
  supabaseClient: any;
  supabaseAdmin: any;
}

/**
 * Verifica autenticazione JWT e restituisce userId + client Supabase.
 * Lancia un errore con Response pronta se auth fallisce.
 */
export async function authenticateUser(req: Request): Promise<AuthResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const token = authHeader.replace('Bearer ', '');

  // Client autenticato per l'utente
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  // Client admin per operazioni cross-utente
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  if (authError || !user) {
    throw new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return {
    userId: user.id,
    supabaseClient,
    supabaseAdmin
  };
}

/**
 * Gestisce la richiesta OPTIONS per CORS preflight.
 * Ritorna true se la richiesta è stata gestita (OPTIONS), false altrimenti.
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

/**
 * Controlla rate limit per l'utente sulla funzione corrente.
 * Ritorna true se OK, lancia Response 429 se limite raggiunto.
 */
export async function checkRateLimit(
  supabaseAdmin: any,
  userId: string,
  functionName: string,
  maxRequests: number = 30,
  windowMinutes: number = 60
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
    p_user_id: userId,
    p_function_name: functionName,
    p_max_requests: maxRequests,
    p_window_minutes: windowMinutes
  });

  if (error) {
    console.error(`[rate-limit] Error checking rate limit:`, error.message);
    return true;  // In caso di errore, lascia passare (fail-open)
  }

  if (data === false) {
    throw new Response(JSON.stringify({
      error: 'Rate limit exceeded. Please try again later.'
    }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return true;
}
