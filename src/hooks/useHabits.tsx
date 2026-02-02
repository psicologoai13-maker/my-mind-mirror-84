import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays } from 'date-fns';

export interface HabitConfig {
  id: string;
  user_id: string;
  habit_type: string;
  is_active: boolean;
  daily_target: number | null;
  unit: string | null;
  streak_type: 'daily' | 'abstain';
  created_at: string;
}

export interface DailyHabit {
  id: string;
  user_id: string;
  date: string;
  habit_type: string;
  value: number;
  unit: string | null;
  target_value: number | null;
  notes: string | null;
  created_at: string;
}

export interface HabitWithStreak extends HabitConfig {
  todayValue: number;
  streak: number;
  lastEntry: DailyHabit | null;
  daily_target: number;
}

// ============================================
// INPUT METHODS - Intelligent Input Types
// ============================================
export type InputMethod = 
  | 'toggle'      // Sì/No binary (vitamine, diario)
  | 'numeric'     // Direct value input (peso, ore sonno)
  | 'counter'     // +/- with target (bicchieri acqua)
  | 'abstain'     // Goal = 0 (sigarette, alcol)
  | 'timer'       // Start/Stop timer (meditazione)
  | 'auto_sync'   // External source (passi da Health)
  | 'range';      // Preset range options (sigarette: 0, 1-5, 6-10...)

export interface RangeOption {
  label: string;
  value: number;
  emoji?: string;
}

export interface HabitMeta {
  label: string;
  icon: string;
  unit: string;
  defaultTarget: number;
  streakType: 'daily' | 'abstain';
  category: HabitCategory;
  description: string;
  suggestedFor?: string[];
  // NEW: Intelligent Input
  inputMethod: InputMethod;
  fallbackMethod?: InputMethod;
  autoSyncSource?: 'health_kit' | 'google_fit' | 'manual';
  step?: number;           // For numeric (e.g., 0.5 for hours)
  min?: number;            // Validation min
  max?: number;            // Validation max
  question?: string;       // For toggle (display question)
  syncToObjective?: boolean; // Auto-link to objectives
  brainMetric?: string;    // Maps to AI brain analysis
  // NEW: External sync and range options
  requiresExternalSync?: boolean;  // Hide on web, requires native app
  webFallback?: InputMethod;       // Use this method on web instead
  rangeOptions?: RangeOption[];    // For 'range' input method
}

export type HabitCategory = 
  | 'health' 
  | 'fitness' 
  | 'mental' 
  | 'nutrition' 
  | 'productivity' 
  | 'social' 
  | 'bad_habits'
  | 'self_care';

// ============================================
// COMPLETE HABIT LIBRARY (45+ habits)
// With intelligent input methods
// ============================================
// ============================================
// DATA SOURCE LEGEND:
// - auto_sync + requiresExternalSync: System/App data (Health Kit, Google Fit, Screen Time)
// - manual inputs: toggle, numeric, counter, abstain, range (user knows the value)
// - timer: REMOVED for most (user doesn't track with our app, uses external apps)
// ============================================
export const HABIT_TYPES: Record<string, HabitMeta> = {
  // ══════════════════════════════════════════
  // 🏃 FITNESS - Requires external sync (phone/wearable)
  // ══════════════════════════════════════════
  steps: { 
    label: 'Passi', 
    icon: '👟', 
    unit: 'passi', 
    defaultTarget: 10000, 
    streakType: 'daily',
    category: 'fitness',
    description: 'Passi giornalieri',
    inputMethod: 'auto_sync',
    autoSyncSource: 'health_kit',
    brainMetric: 'physical_activity',
    suggestedFor: ['boost_energy'],
    requiresExternalSync: true, // ⚠️ Needs phone step counter
    // No webFallback = hidden on web
  },
  exercise: { 
    label: 'Esercizio', 
    icon: '🏃', 
    unit: 'min', 
    defaultTarget: 30, 
    streakType: 'daily',
    category: 'fitness',
    description: 'Attività fisica svolta',
    inputMethod: 'auto_sync',
    brainMetric: 'physical_activity',
    suggestedFor: ['boost_energy', 'reduce_anxiety', 'work_stress'],
    requiresExternalSync: true, // ⚠️ External fitness apps
    webFallback: 'toggle', // ✅ On web: "Hai fatto esercizio oggi?"
    question: 'Hai fatto esercizio oggi?',
  },
  stretching: { 
    label: 'Stretching', 
    icon: '🧘‍♂️', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'fitness',
    description: 'Mobilità e allungamento',
    inputMethod: 'toggle', // ✅ User knows if they stretched
    question: 'Hai fatto stretching oggi?',
    suggestedFor: ['work_stress', 'boost_energy']
  },
  strength: { 
    label: 'Pesi', 
    icon: '💪', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'fitness',
    description: 'Allenamento forza',
    inputMethod: 'toggle', // ✅ User knows if they trained
    question: 'Hai fatto allenamento pesi oggi?',
    suggestedFor: ['boost_energy', 'self_esteem']
  },
  cardio: { 
    label: 'Cardio', 
    icon: '🫀', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'fitness',
    description: 'Corsa, bici, nuoto',
    inputMethod: 'toggle', // ✅ User knows if they did cardio
    question: 'Hai fatto cardio oggi?',
    brainMetric: 'physical_activity',
    suggestedFor: ['boost_energy', 'reduce_anxiety']
  },
  yoga: { 
    label: 'Yoga', 
    icon: '🧘', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'fitness',
    description: 'Pratica yoga',
    inputMethod: 'toggle', // ✅ Fixed! User knows if they did yoga
    question: 'Hai fatto yoga oggi?',
    brainMetric: 'mindfulness_practice',
    suggestedFor: ['reduce_anxiety', 'improve_sleep']
  },
  swimming: { 
    label: 'Nuoto', 
    icon: '🏊', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'fitness',
    description: 'Sessione di nuoto',
    inputMethod: 'toggle', // ✅ User knows if they swam
    question: 'Hai nuotato oggi?',
    suggestedFor: ['boost_energy']
  },
  cycling: { 
    label: 'Ciclismo', 
    icon: '🚴', 
    unit: 'km', 
    defaultTarget: 10, 
    streakType: 'daily',
    category: 'fitness',
    description: 'Chilometri pedalati',
    inputMethod: 'auto_sync',
    autoSyncSource: 'health_kit',
    suggestedFor: ['boost_energy'],
    requiresExternalSync: true, // ⚠️ Needs GPS/fitness app
    webFallback: 'toggle',
    question: 'Hai pedalato oggi?',
  },

  // ══════════════════════════════════════════
  // ❤️ HEALTH - Mix of manual and auto-sync
  // ══════════════════════════════════════════
  sleep: { 
    label: 'Ore Sonno', 
    icon: '😴', 
    unit: 'ore', 
    defaultTarget: 8, 
    streakType: 'daily',
    category: 'health',
    description: 'Ore dormite stanotte',
    inputMethod: 'numeric', // ✅ User can estimate sleep hours
    step: 0.5,
    min: 0,
    max: 14,
    brainMetric: 'sleep_quality',
    suggestedFor: ['improve_sleep', 'boost_energy']
  },
  water: { 
    label: 'Acqua', 
    icon: '💧', 
    unit: 'bicchieri', 
    defaultTarget: 8, 
    streakType: 'daily',
    category: 'health',
    description: 'Bicchieri di acqua',
    inputMethod: 'counter', // ✅ User tracks glasses
    step: 1,
    min: 0,
    max: 20,
    brainMetric: 'hydration',
    suggestedFor: ['boost_energy']
  },
  weight: { 
    label: 'Peso', 
    icon: '⚖️', 
    unit: 'kg', 
    defaultTarget: 0, 
    streakType: 'daily',
    category: 'health',
    description: 'Peso corporeo',
    inputMethod: 'numeric', // ✅ User weighs themselves
    step: 0.1,
    min: 30,
    max: 250,
    syncToObjective: true,
    brainMetric: 'body_weight',
    suggestedFor: []
  },
  heart_rate: { 
    label: 'Battito', 
    icon: '💓', 
    unit: 'bpm', 
    defaultTarget: 0, 
    streakType: 'daily',
    category: 'health',
    description: 'Frequenza cardiaca a riposo',
    inputMethod: 'auto_sync',
    autoSyncSource: 'health_kit',
    brainMetric: 'resting_heart_rate',
    suggestedFor: [],
    requiresExternalSync: true, // ⚠️ Needs smartwatch/band
    // No webFallback = hidden on web
  },
  vitamins: { 
    label: 'Vitamine', 
    icon: '💊', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'health',
    description: 'Hai preso le vitamine?',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Hai preso le vitamine oggi?',
    suggestedFor: ['boost_energy']
  },
  medication: { 
    label: 'Farmaci', 
    icon: '💉', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'health',
    description: 'Hai preso i farmaci?',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Hai preso i farmaci prescritti?',
    suggestedFor: []
  },
  sunlight: { 
    label: 'Sole', 
    icon: '☀️', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'health',
    description: 'Almeno 15 min di luce naturale',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Sei uscito alla luce del sole oggi?',
    brainMetric: 'sunlight_exposure',
    suggestedFor: ['improve_sleep', 'reduce_anxiety', 'loneliness']
  },
  doctor_visit: { 
    label: 'Visite Mediche', 
    icon: '🏥', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'health',
    description: 'Appuntamento medico completato',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Hai fatto una visita medica oggi?',
    suggestedFor: []
  },

  // ══════════════════════════════════════════
  // 🧠 MENTAL - Mostly toggles (user knows if they did it)
  // ══════════════════════════════════════════
  meditation: { 
    label: 'Meditazione', 
    icon: '🧘', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'mental',
    description: 'Pratica di meditazione',
    inputMethod: 'toggle', // ✅ Fixed! No timer - user uses dedicated apps
    question: 'Hai meditato oggi?',
    brainMetric: 'mindfulness_practice',
    suggestedFor: ['reduce_anxiety', 'general_anxiety', 'improve_sleep', 'work_stress']
  },
  journaling: { 
    label: 'Diario', 
    icon: '📝', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'mental',
    description: 'Hai scritto nel diario?',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Hai scritto i tuoi pensieri oggi?',
    brainMetric: 'emotional_expression',
    suggestedFor: ['express_feelings', 'self_esteem', 'general_anxiety']
  },
  breathing: { 
    label: 'Respirazione', 
    icon: '🌬️', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'mental',
    description: 'Esercizi di respirazione',
    inputMethod: 'toggle', // ✅ Fixed! User uses breathing apps or does it without tracking
    question: 'Hai fatto esercizi di respirazione oggi?',
    brainMetric: 'stress_relief',
    suggestedFor: ['reduce_anxiety', 'general_anxiety', 'work_stress']
  },
  gratitude: { 
    label: 'Gratitudine', 
    icon: '🙏', 
    unit: 'cose', 
    defaultTarget: 3, 
    streakType: 'daily',
    category: 'mental',
    description: 'Cose per cui sei grato',
    inputMethod: 'counter', // ✅ User counts gratitude items
    min: 0,
    max: 10,
    brainMetric: 'gratitude',
    suggestedFor: ['reduce_anxiety', 'self_esteem', 'loneliness']
  },
  therapy: { 
    label: 'Terapia', 
    icon: '💬', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'mental',
    description: 'Sessione terapia completata',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Hai fatto una sessione di terapia?',
    suggestedFor: ['general_anxiety', 'relationships', 'self_esteem']
  },
  mindfulness: { 
    label: 'Mindfulness', 
    icon: '🌸', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'mental',
    description: 'Pratica di consapevolezza',
    inputMethod: 'toggle', // ✅ Fixed! No timer
    question: 'Hai praticato mindfulness oggi?',
    brainMetric: 'mindfulness_practice',
    suggestedFor: ['reduce_anxiety', 'work_stress']
  },
  affirmations: { 
    label: 'Affermazioni', 
    icon: '✨', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'mental',
    description: 'Affermazioni positive',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Hai fatto affermazioni positive oggi?',
    brainMetric: 'self_efficacy',
    suggestedFor: ['self_esteem']
  },
  digital_detox: { 
    label: 'Digital Detox', 
    icon: '📵', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'mental',
    description: 'Tempo senza smartphone',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Hai fatto una pausa digitale oggi?',
    suggestedFor: ['reduce_anxiety', 'improve_sleep']
  },

  // ══════════════════════════════════════════
  // 🍎 NUTRITION - Manual tracking (user knows what they ate)
  // ══════════════════════════════════════════
  healthy_meals: { 
    label: 'Pasti Sani', 
    icon: '🥗', 
    unit: 'pasti', 
    defaultTarget: 3, 
    streakType: 'daily',
    category: 'nutrition',
    description: 'Pasti equilibrati',
    inputMethod: 'counter', // ✅ User counts healthy meals
    min: 0,
    max: 5,
    brainMetric: 'nutrition_quality',
    suggestedFor: ['boost_energy']
  },
  no_junk_food: { 
    label: 'No Junk Food', 
    icon: '🍔', 
    unit: '', 
    defaultTarget: 0, 
    streakType: 'abstain',
    category: 'nutrition',
    description: 'Evitare cibo spazzatura',
    inputMethod: 'abstain', // ✅ Abstain pattern
    question: 'Hai evitato il cibo spazzatura oggi?',
    suggestedFor: ['boost_energy']
  },
  fruits_veggies: { 
    label: 'Frutta/Verdura', 
    icon: '🍎', 
    unit: 'porzioni', 
    defaultTarget: 5, 
    streakType: 'daily',
    category: 'nutrition',
    description: 'Porzioni di frutta e verdura',
    inputMethod: 'counter', // ✅ User counts portions
    min: 0,
    max: 10,
    suggestedFor: ['boost_energy']
  },
  meal_prep: { 
    label: 'Meal Prep', 
    icon: '🍱', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'nutrition',
    description: 'Pasti preparati in anticipo',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Hai preparato i pasti in anticipo?',
    suggestedFor: ['work_stress']
  },
  no_sugar: { 
    label: 'No Zuccheri', 
    icon: '🍬', 
    unit: '', 
    defaultTarget: 0, 
    streakType: 'abstain',
    category: 'nutrition',
    description: 'Evitare zuccheri aggiunti',
    inputMethod: 'abstain', // ✅ Abstain pattern
    question: 'Hai evitato zuccheri aggiunti oggi?',
    suggestedFor: ['boost_energy']
  },
  intermittent_fasting: { 
    label: 'Digiuno', 
    icon: '⏰', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'nutrition',
    description: 'Digiuno intermittente rispettato',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Hai rispettato la finestra di digiuno?',
    suggestedFor: []
  },

  // ══════════════════════════════════════════
  // 🚭 BAD HABITS - Range for smoking, abstain for others
  // ══════════════════════════════════════════
  cigarettes: { 
    label: 'Sigarette', 
    icon: '🚭', 
    unit: 'sigarette', 
    defaultTarget: 0, 
    streakType: 'abstain',
    category: 'bad_habits',
    description: 'Quante sigarette oggi?',
    inputMethod: 'range', // ✅ Preset options: 0, 1-5, 6-10, etc.
    question: 'Quante sigarette hai fumato oggi?',
    brainMetric: 'smoking_status',
    suggestedFor: ['reduce_anxiety', 'boost_energy'],
    rangeOptions: [
      { label: 'Nessuna', value: 0, emoji: '🎉' },
      { label: '1-5', value: 3 },
      { label: '6-10', value: 8 },
      { label: '11-20', value: 15 },
      { label: '20+', value: 25 },
    ],
  },
  alcohol: { 
    label: 'Alcol', 
    icon: '🍷', 
    unit: 'drink', 
    defaultTarget: 0, 
    streakType: 'abstain',
    category: 'bad_habits',
    description: 'Giorni senza alcol',
    inputMethod: 'abstain', // ✅ Abstain pattern
    question: 'Non hai bevuto alcolici oggi?',
    brainMetric: 'alcohol_status',
    suggestedFor: ['improve_sleep', 'reduce_anxiety']
  },
  caffeine: { 
    label: 'Caffeina', 
    icon: '☕', 
    unit: 'tazze', 
    defaultTarget: 2, 
    streakType: 'daily',
    category: 'bad_habits',
    description: 'Limita caffè (max 2-3)',
    inputMethod: 'range', // ✅ Preset options for coffee
    question: 'Quanti caffè hai bevuto oggi?',
    suggestedFor: ['improve_sleep', 'reduce_anxiety'],
    rangeOptions: [
      { label: '0', value: 0, emoji: '✨' },
      { label: '1-2', value: 2 },
      { label: '3-4', value: 4 },
      { label: '5+', value: 6 },
    ],
  },
  social_media: { 
    label: 'Social Media', 
    icon: '📱', 
    unit: 'min', 
    defaultTarget: 60, 
    streakType: 'daily',
    category: 'bad_habits',
    description: 'Tempo sui social',
    inputMethod: 'auto_sync',
    autoSyncSource: 'health_kit', // Screen Time API
    suggestedFor: ['reduce_anxiety', 'loneliness', 'self_esteem'],
    requiresExternalSync: true, // ⚠️ Needs Screen Time API
    // No webFallback = hidden on web (user doesn't know exact minutes)
  },
  nail_biting: { 
    label: 'Mangiarsi Unghie', 
    icon: '💅', 
    unit: '', 
    defaultTarget: 0, 
    streakType: 'abstain',
    category: 'bad_habits',
    description: 'Giorni senza mangiarsi le unghie',
    inputMethod: 'abstain', // ✅ Abstain pattern
    question: 'Non ti sei mangiato le unghie oggi?',
    suggestedFor: ['reduce_anxiety']
  },
  late_snacking: { 
    label: 'Snack Notturni', 
    icon: '🌙', 
    unit: '', 
    defaultTarget: 0, 
    streakType: 'abstain',
    category: 'bad_habits',
    description: 'Evitare cibo dopo le 21',
    inputMethod: 'abstain', // ✅ Abstain pattern
    question: 'Hai evitato gli snack notturni?',
    suggestedFor: ['improve_sleep']
  },

  // ══════════════════════════════════════════
  // 📚 PRODUCTIVITY - Toggles and counters
  // ══════════════════════════════════════════
  reading: { 
    label: 'Lettura', 
    icon: '📚', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'productivity',
    description: 'Hai letto oggi?',
    inputMethod: 'toggle', // ✅ Fixed! No timer - user reads without tracking
    question: 'Hai letto qualcosa oggi?',
    suggestedFor: ['reduce_anxiety', 'improve_sleep']
  },
  learning: { 
    label: 'Studio', 
    icon: '🎓', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'productivity',
    description: 'Imparare qualcosa di nuovo',
    inputMethod: 'toggle', // ✅ Fixed! No timer
    question: 'Hai imparato qualcosa di nuovo oggi?',
    brainMetric: 'learning_activity',
    suggestedFor: ['self_esteem', 'work_stress']
  },
  deep_work: { 
    label: 'Focus', 
    icon: '🎯', 
    unit: 'ore', 
    defaultTarget: 4, 
    streakType: 'daily',
    category: 'productivity',
    description: 'Lavoro concentrato senza distrazioni',
    inputMethod: 'range', // ✅ Range: 0-2h, 2-4h, 4-6h, 6+h
    question: 'Quante ore di lavoro concentrato?',
    suggestedFor: ['work_stress'],
    rangeOptions: [
      { label: '0-1h', value: 1 },
      { label: '2-3h', value: 2.5 },
      { label: '4-5h', value: 4.5 },
      { label: '6+h', value: 7, emoji: '🔥' },
    ],
  },
  no_procrastination: { 
    label: 'Task Completati', 
    icon: '✅', 
    unit: 'task', 
    defaultTarget: 3, 
    streakType: 'daily',
    category: 'productivity',
    description: 'Compiti portati a termine',
    inputMethod: 'counter', // ✅ User counts completed tasks
    min: 0,
    max: 20,
    suggestedFor: ['work_stress', 'self_esteem']
  },
  morning_routine: { 
    label: 'Routine Mattina', 
    icon: '🌅', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'productivity',
    description: 'Routine mattutina completata',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Hai completato la tua routine mattutina?',
    suggestedFor: ['boost_energy', 'work_stress']
  },

  // ══════════════════════════════════════════
  // 👥 SOCIAL - All toggles (user knows if they socialized)
  // ══════════════════════════════════════════
  social_interaction: { 
    label: 'Socializzato', 
    icon: '👥', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'social',
    description: 'Tempo con altre persone',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Hai trascorso tempo con qualcuno oggi?',
    brainMetric: 'social_connection',
    suggestedFor: ['loneliness', 'find_love', 'relationships']
  },
  call_loved_one: { 
    label: 'Chiamata Affetti', 
    icon: '📞', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'social',
    description: 'Chiamare qualcuno a cui tieni',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Hai chiamato qualcuno che ami?',
    brainMetric: 'social_connection',
    suggestedFor: ['loneliness', 'relationships']
  },
  quality_time: { 
    label: 'Tempo Qualità', 
    icon: '💑', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'social',
    description: 'Tempo di qualità con partner/famiglia',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Hai passato tempo di qualità con chi ami?',
    brainMetric: 'relationship_quality',
    suggestedFor: ['relationships', 'find_love']
  },
  kindness: { 
    label: 'Gentilezza', 
    icon: '💝', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'social',
    description: 'Atto di gentilezza verso altri',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Hai fatto qualcosa di gentile per qualcuno?',
    brainMetric: 'prosocial_behavior',
    suggestedFor: ['self_esteem', 'loneliness']
  },
  networking: { 
    label: 'Networking', 
    icon: '🤝', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'social',
    description: 'Nuove connessioni professionali',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Hai fatto networking oggi?',
    suggestedFor: ['work_stress']
  },

  // ══════════════════════════════════════════
  // 🛁 SELF CARE - All toggles (user knows if they practiced)
  // ══════════════════════════════════════════
  skincare: { 
    label: 'Skincare', 
    icon: '🧴', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'self_care',
    description: 'Routine cura della pelle',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Hai fatto la tua skincare routine?',
    suggestedFor: ['self_esteem']
  },
  hobby: { 
    label: 'Hobby', 
    icon: '🎨', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'self_care',
    description: 'Tempo dedicato ai tuoi hobby',
    inputMethod: 'toggle', // ✅ Fixed! No timer
    question: 'Hai dedicato tempo ai tuoi hobby oggi?',
    suggestedFor: ['reduce_anxiety', 'express_feelings', 'work_stress']
  },
  nature: { 
    label: 'Natura', 
    icon: '🌳', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'self_care',
    description: 'Tempo all\'aperto nella natura',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Sei stato nella natura oggi?',
    brainMetric: 'nature_exposure',
    suggestedFor: ['reduce_anxiety', 'boost_energy', 'loneliness']
  },
  self_care_routine: { 
    label: 'Self-Care', 
    icon: '🛁', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'self_care',
    description: 'Routine di cura personale',
    inputMethod: 'toggle', // ✅ Simple yes/no
    question: 'Ti sei preso cura di te oggi?',
    suggestedFor: ['reduce_anxiety', 'self_esteem']
  },
  creative_time: { 
    label: 'Creatività', 
    icon: '🎭', 
    unit: '', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'self_care',
    description: 'Attività creative',
    inputMethod: 'toggle', // ✅ Fixed! No timer
    question: 'Hai fatto qualcosa di creativo oggi?',
    brainMetric: 'creative_expression',
    suggestedFor: ['express_feelings', 'reduce_anxiety']
  },
};

// ============================================
// HABIT ALIASES - Map variant names to standard habit types
// For backward compatibility with different naming conventions
// ============================================
export const HABIT_ALIASES: Record<string, string> = {
  'social_time': 'social_media',
  'new_connection': 'networking',
  'no_smoking': 'cigarettes',
  'no_nail_biting': 'nail_biting',
  'no-smoking': 'cigarettes',
  'no-nail-biting': 'nail_biting',
  'smettere_fumare': 'cigarettes',
  'sigarette': 'cigarettes',
  'alcool': 'alcohol',
  'screen_time': 'social_media',
};

// ============================================
// HELPER FUNCTION - Get habit metadata with alias resolution
// ============================================
export const getHabitMeta = (habitType: string): HabitMeta | null => {
  // Direct match
  if (HABIT_TYPES[habitType as keyof typeof HABIT_TYPES]) {
    return HABIT_TYPES[habitType as keyof typeof HABIT_TYPES];
  }
  
  // Check aliases
  const aliased = HABIT_ALIASES[habitType];
  if (aliased && HABIT_TYPES[aliased as keyof typeof HABIT_TYPES]) {
    return HABIT_TYPES[aliased as keyof typeof HABIT_TYPES];
  }
  
  console.warn(`[Habits] Unknown habit type: ${habitType}`);
  return null;
};

// ============================================
// HELPER - Get effective input method for web
// ============================================
export const getWebInputMethod = (habitType: string): InputMethod | null => {
  const meta = getHabitMeta(habitType);
  if (!meta) return null;
  
  // If requires external sync and has web fallback, use that
  if (meta.requiresExternalSync) {
    return meta.webFallback || null; // null = hide on web
  }
  
  return meta.inputMethod;
};

// ============================================
// HELPER - Check if habit should be hidden on web
// ============================================
export const shouldHideOnWeb = (habitType: string): boolean => {
  const meta = getHabitMeta(habitType);
  if (!meta) return true; // Unknown habits are hidden
  
  return meta.requiresExternalSync === true && !meta.webFallback;
};

// Category labels for UI grouping
export const HABIT_CATEGORIES: Record<HabitCategory, { label: string; icon: string }> = {
  health: { label: 'Salute', icon: '❤️' },
  fitness: { label: 'Fitness', icon: '🏃' },
  mental: { label: 'Mente', icon: '🧠' },
  nutrition: { label: 'Nutrizione', icon: '🍎' },
  bad_habits: { label: 'Vizi', icon: '🚫' },
  productivity: { label: 'Produttività', icon: '📚' },
  social: { label: 'Sociale', icon: '👥' },
  self_care: { label: 'Self-Care', icon: '🛁' },
};

// Get habits suggested for user based on their onboarding answers
export const getSuggestedHabits = (onboardingAnswers?: Record<string, unknown>): string[] => {
  if (!onboardingAnswers) return [];
  
  const suggestions = new Set<string>();
  const userGoals = (onboardingAnswers.primaryGoals as string[]) || [];
  const mainChallenge = onboardingAnswers.mainChallenge as string;
  
  // Combine all user indicators
  const userIndicators = [...userGoals];
  if (mainChallenge) userIndicators.push(mainChallenge);
  
  // Find habits that match user indicators
  Object.entries(HABIT_TYPES).forEach(([habitKey, habit]) => {
    if (habit.suggestedFor) {
      const matches = habit.suggestedFor.some(indicator => 
        userIndicators.includes(indicator)
      );
      if (matches) {
        suggestions.add(habitKey);
      }
    }
  });
  
  return Array.from(suggestions);
};

// Get habits grouped by category
export const getHabitsByCategory = (): Record<HabitCategory, Array<{ key: string; habit: HabitMeta }>> => {
  const grouped: Record<HabitCategory, Array<{ key: string; habit: HabitMeta }>> = {
    health: [],
    fitness: [],
    mental: [],
    nutrition: [],
    bad_habits: [],
    productivity: [],
    social: [],
    self_care: [],
  };
  
  Object.entries(HABIT_TYPES).forEach(([key, habit]) => {
    grouped[habit.category].push({ key, habit });
  });
  
  return grouped;
};

// Get habits by input method
export const getHabitsByInputMethod = (method: InputMethod): string[] => {
  return Object.entries(HABIT_TYPES)
    .filter(([_, habit]) => habit.inputMethod === method)
    .map(([key]) => key);
};

export const useHabits = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's habit configurations
  const { data: habitConfigs, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['habit-configs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_habits_config')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as HabitConfig[];
    },
    enabled: !!user,
  });

  // Fetch today's habit entries
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayHabits, isLoading: isLoadingToday } = useQuery({
    queryKey: ['daily-habits', user?.id, today],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('daily_habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today);
      
      if (error) throw error;
      return (data || []) as DailyHabit[];
    },
    enabled: !!user,
  });

  // Fetch habit history for streaks (last 60 days)
  const { data: habitHistory } = useQuery({
    queryKey: ['habit-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('daily_habits')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', sixtyDaysAgo)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return (data || []) as DailyHabit[];
    },
    enabled: !!user,
  });

  // Calculate streak for a habit
  const calculateStreak = (habitType: string, streakType: 'daily' | 'abstain'): number => {
    if (!habitHistory) return 0;
    
    const habitEntries = habitHistory
      .filter(h => h.habit_type === habitType)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (habitEntries.length === 0) return 0;
    
    let streak = 0;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    if (streakType === 'abstain') {
      for (let i = 0; i < 60; i++) {
        const checkDate = format(subDays(todayDate, i), 'yyyy-MM-dd');
        const entry = habitEntries.find(e => e.date === checkDate);
        
        if (entry && entry.value === 0) {
          streak++;
        } else if (entry && entry.value > 0) {
          break;
        } else if (!entry && i === 0) {
          continue;
        } else if (!entry) {
          break;
        }
      }
    } else {
      for (let i = 0; i < 60; i++) {
        const checkDate = format(subDays(todayDate, i), 'yyyy-MM-dd');
        const entry = habitEntries.find(e => e.date === checkDate);
        
        if (entry && entry.value > 0) {
          streak++;
        } else if (i === 0 && !entry) {
          continue;
        } else {
          break;
        }
      }
    }
    
    return streak;
  };

  // Combined habits with streaks
  const habitsWithStreaks: HabitWithStreak[] = (habitConfigs || []).map(config => {
    const todayEntry = todayHabits?.find(h => h.habit_type === config.habit_type);
    const streak = calculateStreak(config.habit_type, config.streak_type as 'daily' | 'abstain');
    const habitMeta = HABIT_TYPES[config.habit_type as keyof typeof HABIT_TYPES];
    
    return {
      ...config,
      todayValue: todayEntry?.value || 0,
      streak,
      lastEntry: todayEntry || null,
      daily_target: config.daily_target || habitMeta?.defaultTarget || 1,
    };
  });

  // Add a new habit to track
  interface AddHabitOptions {
    habitType: string; 
    daily_target?: number;
    unit?: string;
    streak_type?: 'daily' | 'abstain';
    update_method?: 'checkin' | 'chat' | 'auto_sync';
    requires_permission?: boolean;
  }
  
  const addHabit = useMutation({
    mutationFn: async (params: string | AddHabitOptions) => {
      if (!user) throw new Error('Not authenticated');
      
      // Handle both string and object params for backwards compatibility
      const habitType = typeof params === 'string' ? params : params.habitType;
      const options: Partial<AddHabitOptions> = typeof params === 'string' ? {} : params;
      
      const habitMeta = HABIT_TYPES[habitType as keyof typeof HABIT_TYPES];
      
      const { data, error } = await supabase
        .from('user_habits_config')
        .upsert({
          user_id: user.id,
          habit_type: habitType,
          is_active: true,
          daily_target: options.daily_target ?? habitMeta?.defaultTarget,
          unit: options.unit ?? habitMeta?.unit,
          streak_type: options.streak_type ?? habitMeta?.streakType ?? 'daily',
          update_method: options.update_method ?? 'checkin',
          requires_permission: options.requires_permission ?? false,
        }, { onConflict: 'user_id,habit_type' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-configs'] });
    },
  });

  // Add multiple habits at once
  const addMultipleHabits = useMutation({
    mutationFn: async (habitTypes: string[]) => {
      if (!user) throw new Error('Not authenticated');
      
      const habitsToInsert = habitTypes.map(habitType => {
        const habitMeta = HABIT_TYPES[habitType as keyof typeof HABIT_TYPES];
        return {
          user_id: user.id,
          habit_type: habitType,
          is_active: true,
          daily_target: habitMeta?.defaultTarget,
          unit: habitMeta?.unit,
          streak_type: habitMeta?.streakType || 'daily',
        };
      });
      
      const { data, error } = await supabase
        .from('user_habits_config')
        .upsert(habitsToInsert, { onConflict: 'user_id,habit_type' })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-configs'] });
    },
  });

  // Remove a habit from tracking
  const removeHabit = useMutation({
    mutationFn: async (habitType: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('user_habits_config')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('habit_type', habitType);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-configs'] });
    },
  });

  // Log a habit entry for today
  const logHabit = useMutation({
    mutationFn: async ({ habitType, value, notes }: { habitType: string; value: number; notes?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const config = habitConfigs?.find(c => c.habit_type === habitType);
      
      const { data, error } = await supabase
        .from('daily_habits')
        .upsert({
          user_id: user.id,
          date: today,
          habit_type: habitType,
          value,
          unit: config?.unit,
          target_value: config?.daily_target,
          notes,
        }, { onConflict: 'user_id,date,habit_type' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit-history'] });
    },
  });

  // Update habit target
  const updateHabitTarget = useMutation({
    mutationFn: async ({ habitType, target }: { habitType: string; target: number }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('user_habits_config')
        .update({ daily_target: target })
        .eq('user_id', user.id)
        .eq('habit_type', habitType);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-configs'] });
    },
  });

  return {
    habits: habitsWithStreaks,
    habitConfigs,
    todayHabits,
    isLoading: isLoadingConfigs || isLoadingToday,
    addHabit,
    addMultipleHabits,
    removeHabit,
    logHabit,
    updateHabitTarget,
    HABIT_TYPES,
  };
};
