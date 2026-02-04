// v2.1 - Smart Frequency Check-ins (2026-02-04)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// METRIC CHANGE RATE CLASSIFICATION
// fast = can change daily (ask every day)
// slow = stable over time (ask weekly or less)
// ============================================
type ChangeRate = 'fast' | 'slow';

const METRIC_CHANGE_RATES: Record<string, ChangeRate> = {
  // FAST-CHANGING (daily) - emotions and states that fluctuate
  mood: 'fast',
  anxiety: 'fast',
  energy: 'fast',
  sleep: 'fast',
  joy: 'fast',
  sadness: 'fast',
  anger: 'fast',
  fear: 'fast',
  hope: 'fast',
  frustration: 'fast',
  rumination: 'fast',
  burnout_level: 'fast',
  somatic_tension: 'fast',
  irritability: 'fast',
  gratitude: 'fast',
  sunlight_exposure: 'fast',
  
  // SLOW-CHANGING (weekly) - life areas and stable traits
  love: 'slow',
  family: 'slow',
  finances: 'slow',
  leisure: 'slow',
  work: 'slow',
  school: 'slow',
  social: 'slow',
  health: 'slow',
  growth: 'slow',
  concentration: 'slow',
  self_worth: 'slow',
  motivation: 'slow',
  coping_ability: 'slow',
  mental_clarity: 'slow',
  loneliness_perceived: 'slow',
  procrastination: 'slow',
  
  // SAFETY (always monitor if detected)
  hopelessness: 'fast',
  suicidal_ideation: 'fast',
  self_harm_urges: 'fast',
};

// ============================================
// PERSONALIZED QUESTIONS FOR FIRST-TIME/MISSING DATA
// These replace "mancante da X gg" with contextual questions
// ============================================
const DISCOVERY_QUESTIONS: Record<string, string> = {
  // Life areas - conversational discovery
  love: "Come va la tua vita sentimentale ultimamente?",
  family: "Come vanno i rapporti con la tua famiglia?",
  finances: "Come ti senti riguardo alla tua situazione economica?",
  leisure: "Hai tempo per rilassarti e divertirti?",
  work: "Come sta andando il lavoro ultimamente?",
  school: "Come procede lo studio?",
  social: "Come vanno le tue relazioni sociali?",
  health: "Come ti senti fisicamente?",
  growth: "Senti di crescere come persona?",
  
  // Psychology - self-reflection prompts
  concentration: "Riesci a concentrarti ultimamente?",
  self_worth: "Come ti senti riguardo a te stesso/a?",
  motivation: "Ti senti motivato/a in questo periodo?",
  coping_ability: "Ti senti capace di affrontare le sfide?",
  mental_clarity: "Hai chiarezza mentale in questo momento?",
  loneliness_perceived: "Ti senti connesso/a con le persone intorno a te?",
  procrastination: "Riesci a portare a termine le cose importanti?",
  
  // Emotions - current state check
  joy: "Quanta gioia senti oggi?",
  sadness: "Ti senti un po' giù?",
  anger: "C'è qualcosa che ti irrita?",
  fear: "Hai preoccupazioni o paure?",
  hope: "Ti senti speranzoso/a?",
  frustration: "Ti senti frustrato/a?",
  
  // Vitals - daily check
  mood: "Come ti senti emotivamente oggi?",
  anxiety: "Quanta ansia senti in questo momento?",
  energy: "Quanta energia hai oggi?",
  sleep: "Come hai dormito stanotte?",
  
  // Psychology acute
  rumination: "Hai pensieri che continuano a tornare?",
  burnout_level: "Ti senti esausto/a?",
  somatic_tension: "Senti tensione nel corpo?",
  gratitude: "C'è qualcosa per cui sei grato/a oggi?",
  sunlight_exposure: "Sei uscito/a alla luce del sole?",
};

// ============================================
// UNIFIED CHECK-IN ITEMS
// ============================================
const BASE_CHECKIN_ITEMS = [
  // VITALS (4) - fast changing, ask daily
  { key: "mood", label: "Umore", question: "Come ti senti emotivamente?", type: "vital", responseType: "emoji", baseScore: 60 },
  { key: "anxiety", label: "Ansia", question: "Quanta ansia senti?", type: "vital", responseType: "intensity", baseScore: 55 },
  { key: "energy", label: "Energia", question: "Quanta energia hai?", type: "vital", responseType: "slider", baseScore: 50 },
  { key: "sleep", label: "Sonno", question: "Come hai dormito?", type: "vital", responseType: "emoji", baseScore: 50 },
  
  // LIFE AREAS (9) - slow changing, ask every few days
  { key: "love", label: "Amore", question: "Come va la tua vita sentimentale?", type: "life_area", responseType: "emoji", baseScore: 35 },
  { key: "social", label: "Socialità", question: "Come vanno le relazioni sociali?", type: "life_area", responseType: "emoji", baseScore: 35 },
  { key: "health", label: "Salute", question: "Come sta il tuo corpo?", type: "life_area", responseType: "emoji", baseScore: 35 },
  { key: "family", label: "Famiglia", question: "Come vanno i rapporti familiari?", type: "life_area", responseType: "emoji", baseScore: 30 },
  { key: "leisure", label: "Svago", question: "Hai avuto tempo per te?", type: "life_area", responseType: "emoji", baseScore: 25 },
  { key: "finances", label: "Finanze", question: "Come ti senti riguardo ai soldi?", type: "life_area", responseType: "emoji", baseScore: 25 },
  
  // EMOTIONS (key ones) - fast changing
  { key: "sadness", label: "Tristezza", question: "Ti senti triste oggi?", type: "emotion", responseType: "yesno", baseScore: 35 },
  { key: "anger", label: "Rabbia", question: "Senti frustrazione o rabbia?", type: "emotion", responseType: "yesno", baseScore: 35 },
  { key: "fear", label: "Paura", question: "Hai paure o preoccupazioni?", type: "emotion", responseType: "yesno", baseScore: 35 },
  { key: "joy", label: "Gioia", question: "Quanta gioia senti?", type: "emotion", responseType: "intensity", baseScore: 30 },
  { key: "hope", label: "Speranza", question: "Ti senti speranzoso/a?", type: "emotion", responseType: "yesno", baseScore: 30 },
  
  // PSYCHOLOGY - mixed change rates
  { key: "motivation", label: "Motivazione", question: "Ti senti motivato/a oggi?", type: "psychology", responseType: "yesno", baseScore: 35 },
  { key: "rumination", label: "Rimuginazione", question: "Hai pensieri che tornano in loop?", type: "psychology", responseType: "yesno", baseScore: 45 },
  { key: "burnout_level", label: "Burnout", question: "Ti senti esausto/a?", type: "psychology", responseType: "yesno", baseScore: 45 },
  { key: "loneliness_perceived", label: "Solitudine", question: "Ti senti solo/a?", type: "psychology", responseType: "yesno", baseScore: 35 },
  { key: "gratitude", label: "Gratitudine", question: "Sei grato/a per qualcosa oggi?", type: "psychology", responseType: "yesno", baseScore: 30 },
  { key: "mental_clarity", label: "Chiarezza", question: "Hai chiarezza mentale?", type: "psychology", responseType: "slider", baseScore: 30 },
  { key: "somatic_tension", label: "Tensione", question: "Senti tensione nel corpo?", type: "psychology", responseType: "yesno", baseScore: 35 },
  { key: "coping_ability", label: "Resilienza", question: "Ti senti capace di affrontare le sfide?", type: "psychology", responseType: "yesno", baseScore: 30 },
  { key: "sunlight_exposure", label: "Luce solare", question: "Hai preso abbastanza sole?", type: "psychology", responseType: "yesno", baseScore: 25 },
  { key: "self_worth", label: "Autostima", question: "Come ti senti riguardo a te stesso/a?", type: "psychology", responseType: "emoji", baseScore: 30 },
  { key: "concentration", label: "Concentrazione", question: "Riesci a concentrarti?", type: "psychology", responseType: "yesno", baseScore: 30 },
  { key: "procrastination", label: "Procrastinazione", question: "Stai rimandando cose importanti?", type: "psychology", responseType: "yesno", baseScore: 30 },
  
  // SAFETY (only if detected historically - handled separately)
  { key: "hopelessness", label: "Speranza", question: "Ti senti senza speranza?", type: "safety", responseType: "yesno", baseScore: 0, safetyCritical: true },
];

// Helper to calculate age from birth date
function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Build checkin items based on occupation context
function getStandardCheckinItems(occupationContext: string | null, birthDate: string | null): typeof BASE_CHECKIN_ITEMS {
  const age = calculateAge(birthDate);
  const items = [...BASE_CHECKIN_ITEMS];
  
  let showWork = false;
  let showSchool = false;
  
  if (occupationContext === 'both') {
    showWork = true;
    showSchool = true;
  } else if (occupationContext === 'worker') {
    showWork = true;
  } else if (occupationContext === 'student') {
    showSchool = true;
  } else {
    if (age !== null) {
      if (age < 18) {
        showSchool = true;
      } else if (age >= 18 && age <= 27) {
        showWork = true;
        showSchool = true;
      } else {
        showWork = true;
      }
    } else {
      showWork = true;
    }
  }
  
  if (showWork) {
    items.push({ key: "work", label: "Lavoro", question: "Come va il lavoro?", type: "life_area", responseType: "emoji", baseScore: 35 });
  }
  if (showSchool) {
    items.push({ key: "school", label: "Scuola", question: "Come va lo studio?", type: "life_area", responseType: "emoji", baseScore: 35 });
  }
  
  return items;
}

// ============================================
// HABIT METADATA
// ============================================
const HABIT_METADATA: Record<string, {
  label: string;
  icon: string;
  inputMethod: string;
  question?: string;
  unit?: string;
  defaultTarget?: number;
  step?: number;
  requiresExternalSync?: boolean;
  webFallback?: string;
  rangeOptions?: { label: string; value: number; emoji?: string }[];
}> = {
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
  cigarettes: { 
    label: 'Sigarette', icon: '🚭', inputMethod: 'range', question: 'Quante sigarette hai fumato oggi?',
    rangeOptions: [
      { label: 'Nessuna', value: 0, emoji: '🎉' },
      { label: '1-5', value: 3 },
      { label: '6-10', value: 8 },
      { label: '11-20', value: 15 },
      { label: '20+', value: 25 },
    ]
  },
  alcohol: { label: 'Alcol', icon: '🍷', inputMethod: 'abstain', question: 'Non hai bevuto alcolici?' },
  nail_biting: { label: 'Unghie', icon: '💅', inputMethod: 'abstain', question: 'Non ti sei mangiato le unghie?' },
  no_junk_food: { label: 'No Junk Food', icon: '🍔', inputMethod: 'abstain', question: 'Evitato cibo spazzatura?' },
  no_sugar: { label: 'No Zuccheri', icon: '🍬', inputMethod: 'abstain', question: 'Evitato zuccheri aggiunti?' },
  late_snacking: { label: 'Snack Notturni', icon: '🌙', inputMethod: 'abstain', question: 'Evitato snack notturni?' },
  water: { label: 'Acqua', icon: '💧', inputMethod: 'counter', unit: 'L', defaultTarget: 2, step: 0.25 },
  gratitude: { label: 'Gratitudine', icon: '🙏', inputMethod: 'counter', unit: 'cose', defaultTarget: 3 },
  healthy_meals: { label: 'Pasti Sani', icon: '🥗', inputMethod: 'counter', unit: 'pasti', defaultTarget: 3 },
  fruits_veggies: { label: 'Frutta/Verdura', icon: '🍎', inputMethod: 'counter', unit: 'porzioni', defaultTarget: 5 },
  caffeine: { label: 'Caffeina', icon: '☕', inputMethod: 'counter', unit: 'tazze', defaultTarget: 2 },
  no_procrastination: { label: 'Task Completati', icon: '✅', inputMethod: 'counter', unit: 'task', defaultTarget: 3 },
  sleep: { label: 'Ore Sonno', icon: '😴', inputMethod: 'numeric', unit: 'ore', defaultTarget: 8, step: 0.5 },
  weight: { label: 'Peso', icon: '⚖️', inputMethod: 'numeric', unit: 'kg', step: 0.1 },
  swimming: { label: 'Nuoto', icon: '🏊', inputMethod: 'numeric', unit: 'min', defaultTarget: 30 },
  cycling: { label: 'Ciclismo', icon: '🚴', inputMethod: 'numeric', unit: 'km', defaultTarget: 10 },
  deep_work: { label: 'Focus', icon: '🎯', inputMethod: 'numeric', unit: 'ore', defaultTarget: 4, step: 0.5 },
  steps: { label: 'Passi', icon: '👟', inputMethod: 'auto_sync', requiresExternalSync: true },
  heart_rate: { label: 'Battito', icon: '💓', inputMethod: 'auto_sync', requiresExternalSync: true },
  social_media: { label: 'Social Media', icon: '📱', inputMethod: 'auto_sync', requiresExternalSync: true },
  exercise: { label: 'Esercizio', icon: '🏃', inputMethod: 'toggle', question: 'Hai fatto esercizio oggi?', requiresExternalSync: true, webFallback: 'toggle' },
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

const HABIT_ALIASES: Record<string, string> = {
  'social_time': 'social_media',
  'new_connection': 'networking',
  'no_smoking': 'cigarettes',
  'no_nail_biting': 'nail_biting',
  'no-smoking': 'cigarettes',
  'no-nail-biting': 'nail_biting',
  'smettere_fumare': 'cigarettes',
};

function resolveHabitType(habitType: string): string {
  return HABIT_ALIASES[habitType] || habitType;
}

function shouldShowHabitOnWeb(habitType: string): boolean {
  const resolved = resolveHabitType(habitType);
  const meta = HABIT_METADATA[resolved];
  if (!meta) return false;
  if (meta.requiresExternalSync && !meta.webFallback) return false;
  return true;
}

interface CachedCheckinsData {
  checkins: any[];
  allCompleted: boolean;
  aiGenerated: boolean;
  cachedAt: string;
  cachedDate: string;
  fixedDailyList: any[];
}

function getRomeDateString(): string {
  const now = new Date();
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

// ============================================
// DATA HUNTING: Calculate dynamic scores
// based on missing data, change rate, and criticality
// ============================================
interface MetricHistory {
  key: string;
  lastRecordedDate: string | null;
  daysSinceRecorded: number;
  historicalAvg: number | null;
  isCritical: boolean;
}

async function getMetricHistory(
  supabase: any, 
  userId: string, 
  today: string
): Promise<Map<string, MetricHistory>> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const startDate = fourteenDaysAgo.toISOString().split('T')[0];

  // Fetch all metric tables in parallel
  const [emotionsRes, lifeAreasRes, psychologyRes, checkinsRes] = await Promise.all([
    supabase.from("daily_emotions").select("*").eq("user_id", userId).gte("date", startDate).order("date", { ascending: false }),
    supabase.from("daily_life_areas").select("*").eq("user_id", userId).gte("date", startDate).order("date", { ascending: false }),
    supabase.from("daily_psychology").select("*").eq("user_id", userId).gte("date", startDate).order("date", { ascending: false }),
    supabase.from("daily_checkins").select("*").eq("user_id", userId).gte("created_at", `${startDate}T00:00:00`).order("created_at", { ascending: false }),
  ]);

  const historyMap = new Map<string, MetricHistory>();
  const todayDate = new Date(today);

  // Helper to calculate days since
  const daysSince = (dateStr: string | null): number => {
    if (!dateStr) return 999;
    const date = new Date(dateStr);
    return Math.floor((todayDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Process emotions
  const emotionKeys = ['joy', 'sadness', 'anger', 'fear', 'apathy', 'shame', 'jealousy', 'hope', 'frustration', 'nostalgia'];
  emotionKeys.forEach(key => {
    const records = (emotionsRes.data || []).filter((r: any) => r[key] !== null);
    const lastDate = records.length > 0 ? records[0].date : null;
    const values = records.map((r: any) => r[key]).filter((v: any) => v !== null);
    const avg = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : null;
    
    historyMap.set(key, {
      key,
      lastRecordedDate: lastDate,
      daysSinceRecorded: daysSince(lastDate),
      historicalAvg: avg,
      isCritical: false,
    });
  });

  // Process life areas
  const lifeAreaKeys = ['love', 'work', 'school', 'health', 'social', 'growth', 'family', 'leisure', 'finances'];
  lifeAreaKeys.forEach(key => {
    const records = (lifeAreasRes.data || []).filter((r: any) => r[key] !== null);
    const lastDate = records.length > 0 ? records[0].date : null;
    const values = records.map((r: any) => r[key]).filter((v: any) => v !== null);
    const avg = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : null;
    
    historyMap.set(key, {
      key,
      lastRecordedDate: lastDate,
      daysSinceRecorded: daysSince(lastDate),
      historicalAvg: avg,
      isCritical: false,
    });
  });

  // Process psychology (including safety indicators)
  const psychKeys = [
    'rumination', 'self_efficacy', 'mental_clarity', 'concentration', 'burnout_level',
    'coping_ability', 'loneliness_perceived', 'somatic_tension', 'gratitude', 'motivation',
    'self_worth', 'hopelessness', 'suicidal_ideation', 'self_harm_urges', 'procrastination'
  ];
  const safetyKeys = ['hopelessness', 'suicidal_ideation', 'self_harm_urges'];
  const criticalThresholds: Record<string, number> = {
    anxiety: 6,
    hopelessness: 4,
    suicidal_ideation: 1,
    self_harm_urges: 1,
    burnout_level: 7,
  };

  psychKeys.forEach(key => {
    const records = (psychologyRes.data || []).filter((r: any) => r[key] !== null);
    const lastDate = records.length > 0 ? records[0].date : null;
    const values = records.map((r: any) => r[key]).filter((v: any) => v !== null);
    const avg = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : null;
    
    // Check if this metric has critical historical values
    const threshold = criticalThresholds[key];
    const isCritical = safetyKeys.includes(key) || (threshold !== undefined && avg !== null && avg >= threshold);
    
    historyMap.set(key, {
      key,
      lastRecordedDate: lastDate,
      daysSinceRecorded: daysSince(lastDate),
      historicalAvg: avg,
      isCritical,
    });
  });

  // Process vitals from checkins
  const vitalKeys = ['mood', 'anxiety', 'energy', 'sleep'];
  vitalKeys.forEach(key => {
    if (key === 'mood') {
      const records = checkinsRes.data || [];
      const lastDate = records.length > 0 ? records[0].created_at?.split('T')[0] : null;
      const values = records.map((r: any) => r.mood_value).filter((v: any) => v !== null);
      const avg = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : null;
      
      historyMap.set(key, {
        key,
        lastRecordedDate: lastDate,
        daysSinceRecorded: daysSince(lastDate),
        historicalAvg: avg,
        isCritical: false,
      });
    } else {
      const records = (checkinsRes.data || []).filter((r: any) => {
        try {
          const notes = JSON.parse(r.notes || '{}');
          return notes[key] !== undefined;
        } catch { return false; }
      });
      const lastDate = records.length > 0 ? records[0].created_at?.split('T')[0] : null;
      const values = records.map((r: any) => {
        try {
          return JSON.parse(r.notes || '{}')[key];
        } catch { return null; }
      }).filter((v: any) => v !== null);
      const avg = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : null;
      
      const isCritical = key === 'anxiety' && avg !== null && avg >= 6;
      
      historyMap.set(key, {
        key,
        lastRecordedDate: lastDate,
        daysSinceRecorded: daysSince(lastDate),
        historicalAvg: avg,
        isCritical,
      });
    }
  });

  return historyMap;
}

// Calculate dynamic score with frequency-aware logic
function calculateDynamicScore(
  item: any,
  history: MetricHistory | undefined
): number {
  let score = item.baseScore || 50;
  const changeRate = METRIC_CHANGE_RATES[item.key] || 'fast';
  const daysSince = history?.daysSinceRecorded ?? 999;
  const isFirstTime = daysSince >= 999 || history?.lastRecordedDate === null;

  // FIRST TIME DISCOVERY - high priority but not overwhelming
  if (isFirstTime) {
    // First time: moderate boost to discover new data
    score += changeRate === 'fast' ? 60 : 40;
    return score;
  }

  // FREQUENCY-BASED SCORING
  if (changeRate === 'fast') {
    // Fast-changing metrics: want daily updates
    if (daysSince >= 1) score += 30; // Ask if not today
    if (daysSince >= 2) score += 20; // Boost if 2+ days
  } else {
    // Slow-changing metrics: don't need daily updates
    // Only boost score if missing for longer periods
    if (daysSince >= 3) score += 15;  // Slightly boost after 3 days
    if (daysSince >= 5) score += 20;  // More boost after 5 days
    if (daysSince >= 7) score += 30;  // Full boost after a week
  }

  // Critical monitoring bonus (applies to both)
  if (history?.isCritical) {
    score += 40;
  }

  // Safety indicators always included if ever detected
  if (item.safetyCritical && history && history.historicalAvg !== null && history.historicalAvg > 0) {
    score += 80;
  }

  return score;
}

// Generate contextual reason based on metric state
function generateReason(item: any, history: MetricHistory | undefined): string | undefined {
  const daysSince = history?.daysSinceRecorded ?? 999;
  const isFirstTime = daysSince >= 999 || history?.lastRecordedDate === null;
  const changeRate = METRIC_CHANGE_RATES[item.key] || 'fast';

  if (item.type === 'habit') {
    return 'Habit giornaliera';
  }

  if (item.safetyCritical && history?.isCritical) {
    return 'Monitoraggio importante';
  }

  if (history?.isCritical) {
    return 'Monitoraggio';
  }

  // For first-time or long-missing, return undefined (use personalized question instead)
  if (isFirstTime || daysSince >= 7) {
    return undefined;
  }

  // For slow-changing metrics recently answered, don't show reason
  if (changeRate === 'slow' && daysSince < 3) {
    return undefined;
  }

  // Default for priority items
  if (item.type === 'vital') {
    return 'Check giornaliero';
  }

  return undefined;
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

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("ai_checkins_cache, selected_goals, onboarding_answers, occupation_context, birth_date")
      .eq("user_id", userId)
      .maybeSingle();

    const existingCache = profile?.ai_checkins_cache as CachedCheckinsData | null;
    const occupationContext = profile?.occupation_context as string | null;
    const birthDate = profile?.birth_date as string | null;
    
    // Return cached list if valid
    if (existingCache?.cachedDate === today && existingCache?.fixedDailyList?.length > 0) {
      console.log("[ai-checkins] Returning FIXED daily list (immutable for 24h)");
      return new Response(JSON.stringify({ 
        checkins: existingCache.fixedDailyList,
        fixedDailyList: existingCache.fixedDailyList,
        allCompleted: false,
        aiGenerated: existingCache.aiGenerated || false,
        cachedDate: existingCache.cachedDate,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[ai-checkins] v2.1 SMART-FREQUENCY - Generating intelligent list for", today);

    // ============================================
    // FETCH ALL DATA + METRIC HISTORY IN PARALLEL
    // ============================================
    const [
      activeHabitsRes,
      todayHabitsRes,
      recentSessionsRes,
      metricHistory
    ] = await Promise.all([
      supabase.from("user_habits_config").select("*").eq("user_id", userId).eq("is_active", true),
      supabase.from("daily_habits").select("habit_type, value").eq("user_id", userId).eq("date", today),
      supabase.from("sessions").select("ai_summary, emotion_tags").eq("user_id", userId).eq("status", "completed").order("start_time", { ascending: false }).limit(3),
      getMetricHistory(supabase, userId, today),
    ]);

    const activeHabits = activeHabitsRes.data || [];
    const todayHabits = todayHabitsRes.data || [];
    const recentSessions = recentSessionsRes.data || [];

    // Build completed keys
    const completedKeys = await getCompletedKeys(supabase, userId, today);
    
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
    // BUILD UNIFIED CHECK-IN ITEMS WITH SMART FREQUENCY
    // ============================================
    const allItems: any[] = [];

    // 1. HABITS (always daily)
    activeHabits.forEach((config: any) => {
      const resolvedType = resolveHabitType(config.habit_type);
      const key = `habit_${resolvedType}`;
      if (completedKeys.has(key)) return;
      if (!shouldShowHabitOnWeb(config.habit_type)) return;
      
      const meta = HABIT_METADATA[resolvedType];
      if (!meta) return;
      
      const effectiveInputMethod = meta.webFallback || meta.inputMethod;

      allItems.push({
        key,
        label: meta.label,
        question: meta.question || `${meta.label}?`,
        type: 'habit',
        responseType: effectiveInputMethod,
        habitType: resolvedType,
        icon: meta.icon,
        unit: meta.unit || config.unit,
        target: config.daily_target || meta.defaultTarget,
        step: meta.step,
        dynamicScore: 80,
        reason: 'Habit giornaliera',
      });
    });

    // 2. STANDARD CHECK-INS with SMART FREQUENCY SCORING
    const standardCheckins = getStandardCheckinItems(occupationContext, birthDate);
    standardCheckins.forEach((item) => {
      if (completedKeys.has(item.key)) return;
      
      // Skip safety items unless historically detected
      if (item.safetyCritical) {
        const history = metricHistory.get(item.key);
        if (!history || history.historicalAvg === null || history.historicalAvg === 0) {
          return;
        }
      }
      
      const history = metricHistory.get(item.key);
      const dynamicScore = calculateDynamicScore(item, history);
      const changeRate = METRIC_CHANGE_RATES[item.key] || 'fast';
      const daysSince = history?.daysSinceRecorded ?? 999;
      const isFirstTime = daysSince >= 999 || history?.lastRecordedDate === null;
      
      // For slow-changing metrics answered recently, skip
      if (changeRate === 'slow' && daysSince < 3 && !item.safetyCritical && !history?.isCritical) {
        return;
      }
      
      // Use personalized discovery question if first time or long missing
      const question = (isFirstTime || daysSince >= 7) 
        ? (DISCOVERY_QUESTIONS[item.key] || item.question)
        : item.question;
      
      const reason = generateReason(item, history);
      
      allItems.push({
        ...item,
        question,
        dynamicScore,
        reason,
        changeRate,
        isFirstTime,
      });
    });

    // ============================================
    // AI SELECTION WITH FREQUENCY-AWARE CONTEXT
    // ============================================
    const MAX_ITEMS = 8;
    
    // Sort by dynamic score
    const sortedItems = allItems.sort((a, b) => (b.dynamicScore || 0) - (a.dynamicScore || 0));
    const candidateItems = sortedItems.slice(0, 15);
    
    let finalItems: any[] = [];
    let aiGenerated = false;

    if (candidateItems.length > 0) {
      const goals = profile?.selected_goals || [];
      const sessionContext = recentSessions.map((s: any) => s.ai_summary || "").filter(Boolean).join(" ") || "";
      const emotionTags = recentSessions.flatMap((s: any) => s.emotion_tags || []) || [];

      // Build context for AI with frequency info
      const firstTimeMetrics = candidateItems
        .filter(i => i.isFirstTime)
        .map(i => i.label)
        .slice(0, 5)
        .join(", ");

      const systemPrompt = `Sei uno psicologo che sceglie quali check-in mostrare oggi.

REGOLE:
- Scegli MAX ${MAX_ITEMS} items dalla lista, ORDINATI per importanza
- PRIORITÀ 1: Vitali giornalieri (mood, anxiety, sleep, energy) se non ancora risposti oggi
- PRIORITÀ 2: Metriche nuove da scoprire (prima volta)
- PRIORITÀ 3: Metriche critiche da monitorare
- PRIORITÀ 4: Bilancia categorie (1-2 life areas, 1-2 psychology)
- PRIORITÀ 5: Habits attive
- NON includere troppe life areas insieme (max 2)
- Rispondi SOLO con JSON array di "key" nell'ordine giusto

Esempio: ["mood", "anxiety", "family", "motivation", "habit_meditation"]`;

      const itemsText = candidateItems.map((i: any) => 
        `- ${i.key}: "${i.label}" (${i.type}, freq=${i.changeRate || 'fast'}, score=${Math.round(i.dynamicScore)}${i.isFirstTime ? ', NUOVO' : ''})`
      ).join("\n");

      const userPrompt = `Obiettivi utente: ${goals.join(", ") || "Non specificati"}
Contesto sessioni: ${sessionContext || "Nessuna"}
Emozioni recenti: ${emotionTags.join(", ") || "Non rilevate"}
Metriche nuove da scoprire: ${firstTimeMetrics || "Nessuna"}

Check-in disponibili (ordinati per urgenza):
${itemsText}

Scegli i ${MAX_ITEMS} più importanti IN ORDINE, privilegiando vitali giornalieri e metriche nuove:`;

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

    // Fallback: use dynamic score sorted items
    if (finalItems.length === 0) {
      finalItems = candidateItems.slice(0, MAX_ITEMS);
    }

    // Clean up output (remove internal fields)
    finalItems = finalItems.map((item: any) => ({
      key: item.key,
      label: item.label,
      question: item.question,
      type: item.type,
      responseType: item.responseType,
      reason: item.reason,
      // Habit-specific fields
      ...(item.type === 'habit' && {
        habitType: item.habitType,
        icon: item.icon,
        unit: item.unit,
        target: item.target,
        step: item.step,
      }),
    }));

    console.log("[ai-checkins] Created SMART-FREQUENCY list with", finalItems.length, "items");

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
    ["love", "work", "school", "social", "growth", "health", "family", "leisure", "finances"].forEach(k => {
      if (record[k]) completedKeys.add(k);
    });
  });

  emotionsRes.data?.forEach((record: any) => {
    ["joy", "sadness", "anger", "fear", "apathy", "hope", "shame", "jealousy", "frustration", "nostalgia"].forEach(k => {
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
