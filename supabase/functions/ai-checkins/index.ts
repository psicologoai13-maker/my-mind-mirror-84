import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// UNIFIED CHECK-IN ITEMS
// Vitals, Life Areas, Psychology, Emotions
// ============================================
const STANDARD_CHECKIN_ITEMS = [
  { key: "mood", label: "Umore", question: "Come ti senti emotivamente?", type: "vital", responseType: "emoji" },
  { key: "anxiety", label: "Ansia", question: "Quanta ansia senti?", type: "vital", responseType: "intensity" },
  { key: "energy", label: "Energia", question: "Quanta energia hai?", type: "vital", responseType: "slider" },
  { key: "sleep", label: "Sonno", question: "Come hai dormito?", type: "vital", responseType: "emoji" },
  { key: "love", label: "Amore", question: "Come va la tua vita sentimentale?", type: "life_area", responseType: "emoji" },
  { key: "work", label: "Lavoro", question: "Come va il lavoro/studio?", type: "life_area", responseType: "emoji" },
  { key: "social", label: "Socialità", question: "Come vanno le relazioni sociali?", type: "life_area", responseType: "emoji" },
  { key: "growth", label: "Crescita", question: "Ti senti in crescita personale?", type: "life_area", responseType: "yesno" },
  { key: "health", label: "Salute", question: "Come sta il tuo corpo?", type: "life_area", responseType: "emoji" },
  { key: "sadness", label: "Tristezza", question: "Ti senti triste oggi?", type: "emotion", responseType: "yesno" },
  { key: "anger", label: "Rabbia", question: "Senti frustrazione o rabbia?", type: "emotion", responseType: "yesno" },
  { key: "fear", label: "Paura", question: "Hai paure o preoccupazioni?", type: "emotion", responseType: "yesno" },
  { key: "joy", label: "Gioia", question: "Quanta gioia senti?", type: "emotion", responseType: "intensity" },
  { key: "rumination", label: "Pensieri", question: "Stai rimuginando su qualcosa?", type: "psychology", responseType: "yesno" },
  { key: "burnout_level", label: "Burnout", question: "Ti senti esausto/a?", type: "psychology", responseType: "yesno" },
  { key: "loneliness_perceived", label: "Solitudine", question: "Ti senti solo/a?", type: "psychology", responseType: "yesno" },
  { key: "gratitude", label: "Gratitudine", question: "Sei grato/a per qualcosa oggi?", type: "psychology", responseType: "yesno" },
  { key: "mental_clarity", label: "Chiarezza", question: "Hai chiarezza mentale?", type: "psychology", responseType: "slider" },
  { key: "somatic_tension", label: "Tensione", question: "Senti tensione nel corpo?", type: "psychology", responseType: "yesno" },
  { key: "coping_ability", label: "Resilienza", question: "Ti senti capace di affrontare le sfide?", type: "psychology", responseType: "yesno" },
  { key: "sunlight_exposure", label: "Luce solare", question: "Hai preso abbastanza sole?", type: "psychology", responseType: "yesno" },
];

// ============================================
// HABIT METADATA (synced with useHabits.tsx)
// Maps habit_type -> input method and questions
// ============================================
const HABIT_METADATA: Record<string, {
  label: string;
  icon: string;
  inputMethod: string;
  question?: string;
  unit?: string;
  defaultTarget?: number;
  step?: number;
}> = {
  // Toggle habits
  vitamins: { label: 'Vitamine', icon: '💊', inputMethod: 'toggle', question: 'Hai preso le vitamine?' },
  medication: { label: 'Farmaci', icon: '💉', inputMethod: 'toggle', question: 'Hai preso i farmaci?' },
  sunlight: { label: 'Sole', icon: '☀️', inputMethod: 'toggle', question: 'Sei uscito alla luce del sole?' },
  journaling: { label: 'Diario', icon: '📝', inputMethod: 'toggle', question: 'Hai scritto nel diario?' },
  therapy: { label: 'Terapia', icon: '💬', inputMethod: 'toggle', question: 'Sessione terapia completata?' },
  affirmations: { label: 'Affermazioni', icon: '✨', inputMethod: 'toggle', question: 'Affermazioni positive fatte?' },
  digital_detox: { label: 'Digital Detox', icon: '📵', inputMethod: 'toggle', question: 'Pausa digitale fatta?' },
  meal_prep: { label: 'Meal Prep', icon: '🍱', inputMethod: 'toggle', question: 'Pasti preparati in anticipo?' },
  intermittent_fasting: { label: 'Digiuno', icon: '⏰', inputMethod: 'toggle', question: 'Finestra digiuno rispettata?' },
  morning_routine: { label: 'Routine Mattina', icon: '🌅', inputMethod: 'toggle', question: 'Routine mattutina completata?' },
  social_interaction: { label: 'Socializzato', icon: '👥', inputMethod: 'toggle', question: 'Tempo con qualcuno oggi?' },
  call_loved_one: { label: 'Chiamata Affetti', icon: '📞', inputMethod: 'toggle', question: 'Chiamato qualcuno caro?' },
  quality_time: { label: 'Tempo Qualità', icon: '💑', inputMethod: 'toggle', question: 'Tempo qualità con chi ami?' },
  kindness: { label: 'Gentilezza', icon: '💝', inputMethod: 'toggle', question: 'Gesto gentile fatto oggi?' },
  networking: { label: 'Networking', icon: '🤝', inputMethod: 'toggle', question: 'Fatto networking?' },
  doctor_visit: { label: 'Visita Medica', icon: '🏥', inputMethod: 'toggle', question: 'Visita medica fatta?' },
  
  // Abstain habits
  cigarettes: { label: 'Sigarette', icon: '🚭', inputMethod: 'abstain', question: 'Non hai fumato oggi?' },
  alcohol: { label: 'Alcol', icon: '🍷', inputMethod: 'abstain', question: 'Non hai bevuto alcolici?' },
  nail_biting: { label: 'Unghie', icon: '💅', inputMethod: 'abstain', question: 'Non ti sei mangiato le unghie?' },
  no_junk_food: { label: 'No Junk Food', icon: '🍔', inputMethod: 'abstain', question: 'Evitato cibo spazzatura?' },
  no_sugar: { label: 'No Zuccheri', icon: '🍬', inputMethod: 'abstain', question: 'Evitato zuccheri aggiunti?' },
  late_snacking: { label: 'Snack Notturni', icon: '🌙', inputMethod: 'abstain', question: 'Evitato snack notturni?' },
  
  // Counter habits
  water: { label: 'Acqua', icon: '💧', inputMethod: 'counter', unit: 'L', defaultTarget: 2, step: 0.25 },
  gratitude: { label: 'Gratitudine', icon: '🙏', inputMethod: 'counter', unit: 'cose', defaultTarget: 3 },
  healthy_meals: { label: 'Pasti Sani', icon: '🥗', inputMethod: 'counter', unit: 'pasti', defaultTarget: 3 },
  fruits_veggies: { label: 'Frutta/Verdura', icon: '🍎', inputMethod: 'counter', unit: 'porzioni', defaultTarget: 5 },
  caffeine: { label: 'Caffeina', icon: '☕', inputMethod: 'counter', unit: 'tazze', defaultTarget: 2 },
  no_procrastination: { label: 'Task Completati', icon: '✅', inputMethod: 'counter', unit: 'task', defaultTarget: 3 },
  
  // Numeric habits
  sleep: { label: 'Ore Sonno', icon: '😴', inputMethod: 'numeric', unit: 'ore', defaultTarget: 8, step: 0.5 },
  weight: { label: 'Peso', icon: '⚖️', inputMethod: 'numeric', unit: 'kg', step: 0.1 },
  steps: { label: 'Passi', icon: '👟', inputMethod: 'numeric', unit: 'passi', defaultTarget: 10000 },
  social_media: { label: 'Social Media', icon: '📱', inputMethod: 'numeric', unit: 'min', defaultTarget: 60 },
  swimming: { label: 'Nuoto', icon: '🏊', inputMethod: 'numeric', unit: 'min', defaultTarget: 30 },
  cycling: { label: 'Ciclismo', icon: '🚴', inputMethod: 'numeric', unit: 'km', defaultTarget: 10 },
  deep_work: { label: 'Focus', icon: '🎯', inputMethod: 'numeric', unit: 'ore', defaultTarget: 4, step: 0.5 },
  
  // Timer habits
  exercise: { label: 'Esercizio', icon: '🏃', inputMethod: 'timer', unit: 'min', defaultTarget: 30 },
  stretching: { label: 'Stretching', icon: '🧘‍♂️', inputMethod: 'timer', unit: 'min', defaultTarget: 10 },
  strength: { label: 'Pesi', icon: '💪', inputMethod: 'timer', unit: 'min', defaultTarget: 45 },
  cardio: { label: 'Cardio', icon: '🫀', inputMethod: 'timer', unit: 'min', defaultTarget: 30 },
  yoga: { label: 'Yoga', icon: '🧘', inputMethod: 'timer', unit: 'min', defaultTarget: 20 },
  meditation: { label: 'Meditazione', icon: '🧘', inputMethod: 'timer', unit: 'min', defaultTarget: 10 },
  breathing: { label: 'Respirazione', icon: '🌬️', inputMethod: 'timer', unit: 'min', defaultTarget: 5 },
  mindfulness: { label: 'Mindfulness', icon: '🌸', inputMethod: 'timer', unit: 'min', defaultTarget: 10 },
  reading: { label: 'Lettura', icon: '📚', inputMethod: 'timer', unit: 'min', defaultTarget: 20 },
  learning: { label: 'Studio', icon: '🎓', inputMethod: 'timer', unit: 'min', defaultTarget: 30 },
};

// ============================================
// OBJECTIVE INPUT METHOD MAPPING
// ============================================
const OBJECTIVE_INPUT_METHODS: Record<string, string> = {
  auto_body: 'skip', // Don't generate check-in, synced automatically
  auto_habit: 'skip',
  numeric: 'numeric',
  counter: 'counter',
  milestone: 'toggle',
  session_detected: 'skip', // AI detects in sessions
  time_based: 'timer',
};

interface CachedCheckinsData {
  checkins: any[];
  allCompleted: boolean;
  aiGenerated: boolean;
  cachedAt: string;
  cachedDate: string;
  fixedDailyList: any[];
}

// Get Rome date string
function getRomeDateString(): string {
  const now = new Date();
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;
    const today = getRomeDateString();

    // Check for cached fixed list
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("ai_checkins_cache, selected_goals, onboarding_answers")
      .eq("user_id", userId)
      .maybeSingle();

    const existingCache = profile?.ai_checkins_cache as CachedCheckinsData | null;
    
    if (existingCache?.cachedDate === today && existingCache?.fixedDailyList?.length > 0) {
      console.log("[ai-checkins] Using FIXED daily list from cache");
      
      const completedKeys = await getCompletedKeys(supabase, userId, today);
      const remainingCheckins = existingCache.fixedDailyList.filter(
        (item: any) => !completedKeys.has(item.key)
      );
      
      return new Response(JSON.stringify({ 
        checkins: remainingCheckins, 
        allCompleted: remainingCheckins.length === 0,
        aiGenerated: existingCache.aiGenerated || false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[ai-checkins] Generating UNIFIED daily list for", today);

    // ============================================
    // FETCH ALL DATA IN PARALLEL
    // ============================================
    const [
      activeHabitsRes,
      activeObjectivesRes,
      todayHabitsRes,
      recentSessionsRes
    ] = await Promise.all([
      supabase.from("user_habits_config").select("*").eq("user_id", userId).eq("is_active", true),
      supabase.from("user_objectives").select("id, title, category, target_value, current_value, unit, input_method, preset_type").eq("user_id", userId).eq("status", "active"),
      supabase.from("daily_habits").select("habit_type, value").eq("user_id", userId).eq("date", today),
      supabase.from("sessions").select("ai_summary, emotion_tags").eq("user_id", userId).eq("status", "completed").order("start_time", { ascending: false }).limit(3),
    ]);

    const activeHabits = activeHabitsRes.data || [];
    const activeObjectives = activeObjectivesRes.data || [];
    const todayHabits = todayHabitsRes.data || [];
    const recentSessions = recentSessionsRes.data || [];

    // Build completed keys (includes today's habits)
    const completedKeys = await getCompletedKeys(supabase, userId, today);
    
    // Add completed habits
    todayHabits.forEach((h: any) => {
      const meta = HABIT_METADATA[h.habit_type];
      if (meta) {
        const isAbstain = meta.inputMethod === 'abstain';
        const target = meta.defaultTarget || 1;
        const isComplete = isAbstain ? h.value === 0 : h.value >= target;
        if (isComplete || h.value > 0) {
          completedKeys.add(`habit_${h.habit_type}`);
        }
      }
    });

    // ============================================
    // BUILD UNIFIED CHECK-IN ITEMS
    // ============================================
    const allItems: any[] = [];

    // 1. HABITS - Convert active habits to check-in items
    activeHabits.forEach((config: any) => {
      const key = `habit_${config.habit_type}`;
      if (completedKeys.has(key)) return;
      
      const meta = HABIT_METADATA[config.habit_type];
      if (!meta) return;
      
      // Skip auto_sync habits that need external data
      if (meta.inputMethod === 'auto_sync') return;

      allItems.push({
        key,
        label: meta.label,
        question: meta.question || `${meta.label}?`,
        type: 'habit',
        responseType: meta.inputMethod, // toggle, abstain, counter, numeric, timer
        habitType: config.habit_type,
        icon: meta.icon,
        unit: meta.unit || config.unit,
        target: config.daily_target || meta.defaultTarget,
        step: meta.step,
        priority: 80, // Habits have high priority
      });
    });

    // 2. OBJECTIVES - Convert to check-in items (skip auto-sync)
    activeObjectives.forEach((obj: any) => {
      const inputMethod = obj.input_method || 'numeric';
      const mappedType = OBJECTIVE_INPUT_METHODS[inputMethod];
      
      // Skip objectives that sync automatically or via sessions
      if (mappedType === 'skip') return;
      
      const key = `objective_${obj.id}`;
      if (completedKeys.has(key)) return;

      let question = `Progresso "${obj.title}"?`;
      if (inputMethod === 'numeric' && obj.unit) {
        if (obj.category === 'body' && obj.unit.toLowerCase() === 'kg') {
          question = `Quanto pesi oggi? (${obj.unit})`;
        } else if (obj.category === 'finance') {
          question = `Quanto hai risparmiato? (${obj.unit})`;
        } else {
          question = `Valore per "${obj.title}"? (${obj.unit})`;
        }
      } else if (inputMethod === 'counter') {
        question = `Quanti ${obj.unit || 'progressi'} per "${obj.title}"?`;
      } else if (inputMethod === 'milestone') {
        question = `Progressi su "${obj.title}"?`;
      }

      allItems.push({
        key,
        label: obj.title,
        question,
        type: 'objective',
        responseType: mappedType,
        objectiveId: obj.id,
        unit: obj.unit,
        target: obj.target_value,
        priority: 90, // Objectives have highest priority
      });
    });

    // 3. STANDARD CHECK-INS (vitals, life_areas, etc.)
    STANDARD_CHECKIN_ITEMS.forEach((item) => {
      if (completedKeys.has(item.key)) return;
      allItems.push({
        ...item,
        priority: item.type === 'vital' ? 70 : 50,
      });
    });

    // ============================================
    // AI SELECTION - Pick most relevant items
    // ============================================
    const MAX_ITEMS = 8;
    
    // Sort by priority then use AI to refine selection
    const sortedItems = allItems.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // Take top items by priority, then let AI reorder
    const candidateItems = sortedItems.slice(0, 12);
    
    let finalItems: any[] = [];
    let aiGenerated = false;

    if (candidateItems.length > 0) {
      const goals = profile?.selected_goals || [];
      const sessionContext = recentSessions.map((s: any) => s.ai_summary || "").filter(Boolean).join(" ") || "";
      const emotionTags = recentSessions.flatMap((s: any) => s.emotion_tags || []) || [];

      const systemPrompt = `Sei uno psicologo che sceglie quali check-in mostrare oggi. 
      
REGOLE:
- Scegli MAX ${MAX_ITEMS} items dalla lista, ORDINATI per importanza
- Prioritizza: obiettivi personali > habits con streak a rischio > vitali importanti
- Se l'utente ha sessioni recenti con emozioni negative, includi check-in correlati
- Rispondi SOLO con JSON array di "key" nell'ordine giusto

Esempio: ["habit_meditation", "objective_123", "mood", "anxiety"]`;

      const itemsText = candidateItems.map((i: any) => 
        `- ${i.key}: "${i.label}" (${i.type}, ${i.responseType})`
      ).join("\n");

      const userPrompt = `Obiettivi utente: ${goals.join(", ") || "Non specificati"}
Contesto sessioni: ${sessionContext || "Nessuna"}
Emozioni recenti: ${emotionTags.join(", ") || "Non rilevate"}

Check-in disponibili:
${itemsText}

Scegli i ${MAX_ITEMS} più importanti IN ORDINE:`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 200,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || "[]";
          
          try {
            const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const selectedKeys: string[] = JSON.parse(cleanContent);
            
            finalItems = selectedKeys
              .slice(0, MAX_ITEMS)
              .map((key: string) => candidateItems.find((i: any) => i.key === key))
              .filter(Boolean);
            
            aiGenerated = finalItems.length > 0;
          } catch (parseError) {
            console.error("[ai-checkins] Parse error:", content);
          }
        }
      } catch (aiError) {
        console.error("[ai-checkins] AI error:", aiError);
      }
    }

    // Fallback: use priority-sorted items
    if (finalItems.length === 0) {
      finalItems = candidateItems.slice(0, MAX_ITEMS);
    }

    // Add reasons for display
    finalItems = finalItems.map((item: any, index: number) => ({
      ...item,
      reason: item.type === 'habit' ? 'Habit attiva' : 
              item.type === 'objective' ? 'Obiettivo personale' : 
              index === 0 ? 'Priorità oggi' : undefined,
    }));

    console.log("[ai-checkins] Created unified list with", finalItems.length, "items");

    // Cache the fixed list
    const cachePayload: CachedCheckinsData = {
      checkins: finalItems,
      allCompleted: false,
      aiGenerated,
      cachedAt: new Date().toISOString(),
      cachedDate: today,
      fixedDailyList: finalItems,
    };

    await supabaseAdmin
      .from("user_profiles")
      .update({ ai_checkins_cache: cachePayload })
      .eq("user_id", userId);

    return new Response(JSON.stringify({ 
      checkins: finalItems, 
      allCompleted: false,
      aiGenerated 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[ai-checkins] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to get completed keys from all sources
async function getCompletedKeys(supabase: any, userId: string, today: string): Promise<Set<string>> {
  const [lifeAreasRes, emotionsRes, psychologyRes, checkinRes] = await Promise.all([
    supabase.from("daily_life_areas").select("*").eq("user_id", userId).eq("date", today),
    supabase.from("daily_emotions").select("*").eq("user_id", userId).eq("date", today),
    supabase.from("daily_psychology").select("*").eq("user_id", userId).eq("date", today),
    supabase.from("daily_checkins").select("*").eq("user_id", userId).gte("created_at", `${today}T00:00:00`),
  ]);

  const completedKeys = new Set<string>();

  if (checkinRes.data && checkinRes.data.length > 0) {
    completedKeys.add("mood");
    const notes = checkinRes.data[0]?.notes;
    if (notes) {
      try {
        const parsed = JSON.parse(notes);
        Object.keys(parsed).forEach(k => completedKeys.add(k));
      } catch {}
    }
  }

  lifeAreasRes.data?.forEach((record: any) => {
    ["love", "work", "social", "growth", "health"].forEach(k => {
      if (record[k]) completedKeys.add(k);
    });
  });

  emotionsRes.data?.forEach((record: any) => {
    ["joy", "sadness", "anger", "fear", "apathy"].forEach(k => {
      if (record[k]) completedKeys.add(k);
    });
  });

  psychologyRes.data?.forEach((record: any) => {
    Object.keys(record).forEach(k => {
      if (record[k] && !["id", "user_id", "date", "session_id", "source", "created_at", "updated_at"].includes(k)) {
        completedKeys.add(k);
      }
    });
  });

  return completedKeys;
}
