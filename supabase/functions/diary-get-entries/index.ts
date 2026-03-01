import { authenticateUser, handleCors, corsHeaders } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { userId, supabaseClient } = await authenticateUser(req);

    const { diary_id } = await req.json() as { diary_id: string };

    if (!diary_id) {
      return new Response(
        JSON.stringify({ error: 'diary_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch diary entries (RLS ensures user can only access their own)
    const { data: diary, error: fetchError } = await supabaseClient
      .from('thematic_diaries')
      .select('id, title, entries, color, icon, created_at')
      .eq('id', diary_id)
      .single();

    if (fetchError || !diary) {
      return new Response(
        JSON.stringify({ error: 'Diary not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Sort entries by created_at descending (newest first)
    const entries = Array.isArray(diary.entries) ? diary.entries : [];
    const sortedEntries = entries.sort((a: { created_at: string }, b: { created_at: string }) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return new Response(
      JSON.stringify({
        diary_id: diary.id,
        title: diary.title,
        color: diary.color,
        icon: diary.icon,
        entries: sortedEntries,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    if (error instanceof Response) return error;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in diary-get-entries:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
