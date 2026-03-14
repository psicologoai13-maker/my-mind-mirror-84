import { authenticateUser, handleCors, corsHeaders } from '../_shared/auth.ts';

const defaultDiaries = [
  {
    name: 'Diario della sera',
    icon_emoji: '🌙',
    color_hex: '#1E1B4B',
    description: 'Rifletti sulla tua giornata prima di dormire',
    weekly_prompt: 'Come è andata questa settimana?',
    sort_order: 1
  },
  {
    name: 'Routine del mattino',
    icon_emoji: '🌅',
    color_hex: '#1E3A5F',
    description: 'Inizia la giornata con intenzione',
    weekly_prompt: 'Quali obiettivi hai per questa settimana?',
    sort_order: 2
  },
  {
    name: 'Gratitudine',
    icon_emoji: '🙏',
    color_hex: '#052E16',
    description: '3 cose per cui sei grato ogni giorno',
    weekly_prompt: 'Cosa ti ha reso più grato questa settimana?',
    sort_order: 3
  },
  {
    name: 'Pensieri liberi',
    icon_emoji: '💭',
    color_hex: '#1C1917',
    description: 'Scrivi quello che vuoi, senza regole',
    weekly_prompt: null,
    sort_order: 4
  },
  {
    name: 'Percorso terapeutico',
    icon_emoji: '🧠',
    color_hex: '#3B0764',
    description: 'Prepara le tue sessioni e rifletti sul percorso',
    weekly_prompt: 'Come sta andando il tuo percorso di crescita?',
    sort_order: 5
  }
];

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { userId, supabaseAdmin } = await authenticateUser(req);

    // Check if user already has diaries
    const { count, error: countError } = await supabaseAdmin
      .from('diaries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('[init-default-diaries] Error checking existing diaries:', countError.message);
      throw new Error('Failed to check existing diaries');
    }

    // If user already has diaries, return them
    if (count && count > 0) {
      const { data: existingDiaries } = await supabaseAdmin
        .from('diaries')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });

      return new Response(
        JSON.stringify({ diaries: existingDiaries, already_existed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert default diaries
    const diariesToInsert = defaultDiaries.map(diary => ({
      user_id: userId,
      ...diary
    }));

    const { data: insertedDiaries, error: insertError } = await supabaseAdmin
      .from('diaries')
      .insert(diariesToInsert)
      .select();

    if (insertError) {
      console.error('[init-default-diaries] Error inserting default diaries:', insertError.message);
      throw new Error('Failed to create default diaries');
    }

    console.log(`[init-default-diaries] Created ${insertedDiaries.length} default diaries for user ${userId}`);

    return new Response(
      JSON.stringify({ diaries: insertedDiaries, already_existed: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[init-default-diaries] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
