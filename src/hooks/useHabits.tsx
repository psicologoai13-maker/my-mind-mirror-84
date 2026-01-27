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

export interface HabitMeta {
  label: string;
  icon: string;
  unit: string;
  defaultTarget: number;
  streakType: 'daily' | 'abstain';
  category: HabitCategory;
  description: string;
  suggestedFor?: string[]; // Which user challenges/goals this habit helps
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
// COMPLETE HABIT LIBRARY (25+ habits)
// ============================================
export const HABIT_TYPES: Record<string, HabitMeta> = {
  // 🏃 FITNESS (Attività Fisica)
  exercise: { 
    label: 'Esercizio Fisico', 
    icon: '🏃', 
    unit: 'min', 
    defaultTarget: 30, 
    streakType: 'daily',
    category: 'fitness',
    description: 'Qualsiasi attività fisica: corsa, palestra, yoga...',
    suggestedFor: ['boost_energy', 'reduce_anxiety', 'work_stress']
  },
  steps: { 
    label: 'Passi Giornalieri', 
    icon: '👟', 
    unit: 'passi', 
    defaultTarget: 10000, 
    streakType: 'daily',
    category: 'fitness',
    description: 'Conteggio passi quotidiano',
    suggestedFor: ['boost_energy']
  },
  stretching: { 
    label: 'Stretching', 
    icon: '🧘‍♂️', 
    unit: 'min', 
    defaultTarget: 10, 
    streakType: 'daily',
    category: 'fitness',
    description: 'Allungamento muscolare e mobilità',
    suggestedFor: ['work_stress', 'boost_energy']
  },
  strength: { 
    label: 'Allenamento Forza', 
    icon: '💪', 
    unit: 'min', 
    defaultTarget: 45, 
    streakType: 'daily',
    category: 'fitness',
    description: 'Pesi, calisthenics, resistenza',
    suggestedFor: ['boost_energy', 'self_esteem']
  },

  // 🧠 MENTAL (Salute Mentale)
  meditation: { 
    label: 'Meditazione', 
    icon: '🧘', 
    unit: 'min', 
    defaultTarget: 10, 
    streakType: 'daily',
    category: 'mental',
    description: 'Mindfulness, meditazione guidata, respirazione',
    suggestedFor: ['reduce_anxiety', 'general_anxiety', 'improve_sleep', 'work_stress']
  },
  journaling: { 
    label: 'Diario Personale', 
    icon: '📝', 
    unit: 'min', 
    defaultTarget: 10, 
    streakType: 'daily',
    category: 'mental',
    description: 'Scrivere pensieri ed emozioni',
    suggestedFor: ['express_feelings', 'self_esteem', 'general_anxiety']
  },
  gratitude: { 
    label: 'Gratitudine', 
    icon: '🙏', 
    unit: 'cose', 
    defaultTarget: 3, 
    streakType: 'daily',
    category: 'mental',
    description: 'Annotare cose per cui sei grato',
    suggestedFor: ['reduce_anxiety', 'self_esteem', 'loneliness']
  },
  therapy: { 
    label: 'Sessione Terapia', 
    icon: '💬', 
    unit: 'sessione', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'mental',
    description: 'Sessioni con professionista o app',
    suggestedFor: ['general_anxiety', 'relationships', 'self_esteem']
  },
  breathing: { 
    label: 'Esercizi Respirazione', 
    icon: '🌬️', 
    unit: 'min', 
    defaultTarget: 5, 
    streakType: 'daily',
    category: 'mental',
    description: 'Tecniche di respirazione calmante',
    suggestedFor: ['reduce_anxiety', 'general_anxiety', 'work_stress']
  },

  // 💤 HEALTH (Salute Generale)
  sleep: { 
    label: 'Ore di Sonno', 
    icon: '😴', 
    unit: 'ore', 
    defaultTarget: 8, 
    streakType: 'daily',
    category: 'health',
    description: 'Traccia le ore dormite',
    suggestedFor: ['improve_sleep', 'boost_energy']
  },
  water: { 
    label: 'Acqua', 
    icon: '💧', 
    unit: 'L', 
    defaultTarget: 2, 
    streakType: 'daily',
    category: 'health',
    description: 'Litri di acqua bevuti',
    suggestedFor: ['boost_energy']
  },
  sunlight: { 
    label: 'Esposizione Solare', 
    icon: '☀️', 
    unit: 'min', 
    defaultTarget: 15, 
    streakType: 'daily',
    category: 'health',
    description: 'Tempo passato alla luce naturale',
    suggestedFor: ['improve_sleep', 'reduce_anxiety', 'loneliness']
  },
  vitamins: { 
    label: 'Vitamine/Integratori', 
    icon: '💊', 
    unit: 'dose', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'health',
    description: 'Assunzione vitamine giornaliere',
    suggestedFor: ['boost_energy']
  },
  weight: { 
    label: 'Peso Corporeo', 
    icon: '⚖️', 
    unit: 'kg', 
    defaultTarget: 0, 
    streakType: 'daily',
    category: 'health',
    description: 'Traccia il tuo peso giornalmente',
    suggestedFor: []
  },

  // 🍎 NUTRITION (Alimentazione)
  healthy_meals: { 
    label: 'Pasti Sani', 
    icon: '🥗', 
    unit: 'pasti', 
    defaultTarget: 3, 
    streakType: 'daily',
    category: 'nutrition',
    description: 'Pasti equilibrati e salutari',
    suggestedFor: ['boost_energy']
  },
  no_junk_food: { 
    label: 'No Cibo Spazzatura', 
    icon: '🍔', 
    unit: 'giorno', 
    defaultTarget: 0, 
    streakType: 'abstain',
    category: 'nutrition',
    description: 'Evitare fast food e snack industriali',
    suggestedFor: ['boost_energy']
  },
  fruits_veggies: { 
    label: 'Frutta e Verdura', 
    icon: '🍎', 
    unit: 'porzioni', 
    defaultTarget: 5, 
    streakType: 'daily',
    category: 'nutrition',
    description: 'Porzioni di frutta e verdura',
    suggestedFor: ['boost_energy']
  },
  meal_prep: { 
    label: 'Preparazione Pasti', 
    icon: '🍱', 
    unit: 'pasti', 
    defaultTarget: 5, 
    streakType: 'daily',
    category: 'nutrition',
    description: 'Pasti preparati in anticipo',
    suggestedFor: ['work_stress']
  },

  // 🚭 BAD HABITS (Cattive Abitudini da Eliminare)
  cigarettes: { 
    label: 'Sigarette', 
    icon: '🚭', 
    unit: 'pezzi', 
    defaultTarget: 0, 
    streakType: 'abstain',
    category: 'bad_habits',
    description: 'Giorni senza fumare',
    suggestedFor: ['reduce_anxiety', 'boost_energy']
  },
  alcohol: { 
    label: 'Alcol', 
    icon: '🍷', 
    unit: 'drink', 
    defaultTarget: 0, 
    streakType: 'abstain',
    category: 'bad_habits',
    description: 'Giorni senza alcol',
    suggestedFor: ['improve_sleep', 'reduce_anxiety']
  },
  caffeine: { 
    label: 'Caffeina', 
    icon: '☕', 
    unit: 'tazze', 
    defaultTarget: 2, 
    streakType: 'daily',
    category: 'nutrition',
    description: 'Limita caffè e bevande con caffeina',
    suggestedFor: ['improve_sleep', 'reduce_anxiety']
  },
  sugar: { 
    label: 'Zuccheri Aggiunti', 
    icon: '🍬', 
    unit: 'porzioni', 
    defaultTarget: 0, 
    streakType: 'abstain',
    category: 'bad_habits',
    description: 'Evita zuccheri aggiunti e dolci',
    suggestedFor: ['boost_energy']
  },
  social_media: { 
    label: 'Tempo Social Media', 
    icon: '📱', 
    unit: 'min', 
    defaultTarget: 60, 
    streakType: 'daily',
    category: 'bad_habits',
    description: 'Limita tempo sui social',
    suggestedFor: ['reduce_anxiety', 'loneliness', 'self_esteem']
  },
  nail_biting: { 
    label: 'Mangiarsi le Unghie', 
    icon: '💅', 
    unit: 'giorno', 
    defaultTarget: 0, 
    streakType: 'abstain',
    category: 'bad_habits',
    description: 'Giorni senza mangiarsi le unghie',
    suggestedFor: ['reduce_anxiety']
  },

  // 📚 PRODUCTIVITY (Produttività)
  reading: { 
    label: 'Lettura', 
    icon: '📚', 
    unit: 'min', 
    defaultTarget: 20, 
    streakType: 'daily',
    category: 'productivity',
    description: 'Tempo dedicato alla lettura',
    suggestedFor: ['reduce_anxiety', 'improve_sleep']
  },
  learning: { 
    label: 'Studio/Apprendimento', 
    icon: '🎓', 
    unit: 'min', 
    defaultTarget: 30, 
    streakType: 'daily',
    category: 'productivity',
    description: 'Imparare qualcosa di nuovo',
    suggestedFor: ['self_esteem', 'work_stress']
  },
  deep_work: { 
    label: 'Lavoro Concentrato', 
    icon: '🎯', 
    unit: 'ore', 
    defaultTarget: 4, 
    streakType: 'daily',
    category: 'productivity',
    description: 'Ore di lavoro senza distrazioni',
    suggestedFor: ['work_stress']
  },
  no_procrastination: { 
    label: 'No Procrastinazione', 
    icon: '⏰', 
    unit: 'task', 
    defaultTarget: 3, 
    streakType: 'daily',
    category: 'productivity',
    description: 'Task completati senza rimandare',
    suggestedFor: ['work_stress', 'self_esteem']
  },

  // 👥 SOCIAL (Relazioni)
  social_time: { 
    label: 'Tempo con Altri', 
    icon: '👥', 
    unit: 'min', 
    defaultTarget: 30, 
    streakType: 'daily',
    category: 'social',
    description: 'Tempo di qualità con amici/famiglia',
    suggestedFor: ['loneliness', 'find_love', 'relationships']
  },
  call_friend: { 
    label: 'Chiamata Amico/Familiare', 
    icon: '📞', 
    unit: 'chiamate', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'social',
    description: 'Chiamare qualcuno a cui tieni',
    suggestedFor: ['loneliness', 'relationships']
  },
  new_connection: { 
    label: 'Nuova Conoscenza', 
    icon: '🤝', 
    unit: 'persone', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'social',
    description: 'Conoscere nuove persone',
    suggestedFor: ['loneliness', 'find_love']
  },
  kindness: { 
    label: 'Atto di Gentilezza', 
    icon: '💝', 
    unit: 'atti', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'social',
    description: 'Fare qualcosa di gentile per altri',
    suggestedFor: ['self_esteem', 'loneliness']
  },

  // 🛁 SELF CARE (Cura di Sé)
  skincare: { 
    label: 'Skincare', 
    icon: '🧴', 
    unit: 'routine', 
    defaultTarget: 2, 
    streakType: 'daily',
    category: 'self_care',
    description: 'Routine cura della pelle',
    suggestedFor: ['self_esteem']
  },
  hobby: { 
    label: 'Tempo per Hobby', 
    icon: '🎨', 
    unit: 'min', 
    defaultTarget: 30, 
    streakType: 'daily',
    category: 'self_care',
    description: 'Dedicare tempo ai tuoi hobby',
    suggestedFor: ['reduce_anxiety', 'express_feelings', 'work_stress']
  },
  nature: { 
    label: 'Tempo nella Natura', 
    icon: '🌳', 
    unit: 'min', 
    defaultTarget: 20, 
    streakType: 'daily',
    category: 'self_care',
    description: 'Passeggiate o tempo all\'aperto',
    suggestedFor: ['reduce_anxiety', 'boost_energy', 'loneliness']
  },
  screen_free: { 
    label: 'Tempo Senza Schermi', 
    icon: '📵', 
    unit: 'ore', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'self_care',
    description: 'Ore senza dispositivi elettronici',
    suggestedFor: ['improve_sleep', 'reduce_anxiety']
  },
  self_care_routine: { 
    label: 'Routine Self-Care', 
    icon: '🛁', 
    unit: 'routine', 
    defaultTarget: 1, 
    streakType: 'daily',
    category: 'self_care',
    description: 'Bagno caldo, maschere, relax...',
    suggestedFor: ['reduce_anxiety', 'self_esteem']
  },
};

// Category labels for UI grouping
export const HABIT_CATEGORIES: Record<HabitCategory, { label: string; icon: string }> = {
  health: { label: 'Salute', icon: '❤️' },
  fitness: { label: 'Attività Fisica', icon: '🏃' },
  mental: { label: 'Benessere Mentale', icon: '🧠' },
  nutrition: { label: 'Alimentazione', icon: '🍎' },
  bad_habits: { label: 'Cattive Abitudini', icon: '🚫' },
  productivity: { label: 'Produttività', icon: '📚' },
  social: { label: 'Relazioni', icon: '👥' },
  self_care: { label: 'Cura di Sé', icon: '🛁' },
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
  const addHabit = useMutation({
    mutationFn: async (habitType: string) => {
      if (!user) throw new Error('Not authenticated');
      const habitMeta = HABIT_TYPES[habitType as keyof typeof HABIT_TYPES];
      
      const { data, error } = await supabase
        .from('user_habits_config')
        .upsert({
          user_id: user.id,
          habit_type: habitType,
          is_active: true,
          daily_target: habitMeta?.defaultTarget,
          unit: habitMeta?.unit,
          streak_type: habitMeta?.streakType || 'daily',
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
