import { authenticateUser, handleCors, corsHeaders } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { userId, supabaseClient } = await authenticateUser(req);

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
    const { data: diary, error: fetchError } = await supabaseClient
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
    const { error: updateError } = await supabaseClient
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

  } catch (error) {
    if (error instanceof Response) return error;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in diary-save-entry:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
