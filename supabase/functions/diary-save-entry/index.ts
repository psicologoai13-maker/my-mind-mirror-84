import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { diary_id, entry_text } = await req.json() as {
      diary_id: string;
      entry_text: string;
    };

    if (!diary_id || !entry_text) {
      return new Response(
        JSON.stringify({ error: 'diary_id and entry_text are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch the current diary (RLS ensures user can only access their own)
    const { data: diary, error: fetchError } = await supabase
      .from('thematic_diaries')
      .select('entries')
      .eq('id', diary_id)
      .single();

    if (fetchError || !diary) {
      return new Response(
        JSON.stringify({ error: 'Diary not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Build new entry
    const newEntry = {
      id: crypto.randomUUID(),
      text: entry_text,
      created_at: new Date().toISOString(),
    };

    const currentEntries = Array.isArray(diary.entries) ? diary.entries : [];
    const updatedEntries = [...currentEntries, newEntry];

    // Preview: first 80 characters of the entry text
    const preview = entry_text.length > 80 ? entry_text.substring(0, 80) : entry_text;

    // Update diary with new entry (RLS ensures owner-only access)
    const { error: updateError } = await supabase
      .from('thematic_diaries')
      .update({
        entries: updatedEntries,
        last_message_preview: preview,
        last_updated_at: new Date().toISOString(),
      })
      .eq('id', diary_id);

    if (updateError) {
      console.error('Error updating diary:', updateError);
      throw new Error('Failed to save entry');
    }

    return new Response(
      JSON.stringify({ success: true, entry: newEntry }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in diary-save-entry:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
