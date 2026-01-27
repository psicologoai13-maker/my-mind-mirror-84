import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Json } from '@/integrations/supabase/types';

export interface Achievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  metadata: Record<string, unknown>;
}
export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'consistency' | 'milestones' | 'habits' | 'wellness';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Achievement definitions
export const ACHIEVEMENTS: Record<string, AchievementDefinition> = {
  // Consistency achievements
  first_checkin: {
    id: 'first_checkin',
    title: 'Primi Passi',
    description: 'Completa il tuo primo check-in',
    icon: '🏅',
    category: 'consistency',
    rarity: 'common',
  },
  week_streak: {
    id: 'week_streak',
    title: 'Settimana di Fuoco',
    description: '7 giorni consecutivi di check-in',
    icon: '🔥',
    category: 'consistency',
    rarity: 'common',
  },
  month_streak: {
    id: 'month_streak',
    title: 'Inarrestabile',
    description: '30 giorni consecutivi',
    icon: '💫',
    category: 'consistency',
    rarity: 'rare',
  },
  hundred_checkins: {
    id: 'hundred_checkins',
    title: 'Self-Care Pro',
    description: '100 check-in completati',
    icon: '🌟',
    category: 'consistency',
    rarity: 'epic',
  },

  // Habit achievements
  hydration_master: {
    id: 'hydration_master',
    title: 'Idratazione Perfetta',
    description: 'Raggiungi l\'obiettivo acqua per 7 giorni',
    icon: '💧',
    category: 'habits',
    rarity: 'common',
  },
  smoke_free_week: {
    id: 'smoke_free_week',
    title: 'Aria Pulita',
    description: '7 giorni senza sigarette',
    icon: '🚭',
    category: 'habits',
    rarity: 'rare',
  },
  smoke_free_month: {
    id: 'smoke_free_month',
    title: 'Polmoni d\'Acciaio',
    description: '30 giorni senza sigarette',
    icon: '💪',
    category: 'habits',
    rarity: 'epic',
  },
  zen_master: {
    id: 'zen_master',
    title: 'Zen Master',
    description: '30 sessioni di meditazione',
    icon: '🧘',
    category: 'habits',
    rarity: 'rare',
  },
  early_bird: {
    id: 'early_bird',
    title: 'Early Bird',
    description: '5 check-in mattutini (prima delle 9)',
    icon: '🐦',
    category: 'habits',
    rarity: 'common',
  },

  // Wellness achievements
  mood_boost: {
    id: 'mood_boost',
    title: 'Risalita',
    description: 'Miglioramento umore +20% in una settimana',
    icon: '📈',
    category: 'wellness',
    rarity: 'rare',
  },
  anxiety_control: {
    id: 'anxiety_control',
    title: 'Mente Serena',
    description: 'Ansia sotto controllo per 7 giorni',
    icon: '🧠',
    category: 'wellness',
    rarity: 'rare',
  },
  balanced_life: {
    id: 'balanced_life',
    title: 'Vita Equilibrata',
    description: 'Tutte le 5 aree della vita sopra 6/10',
    icon: '⚖️',
    category: 'wellness',
    rarity: 'epic',
  },

  // Milestone achievements
  weight_goal_50: {
    id: 'weight_goal_50',
    title: 'A Metà Strada',
    description: 'Raggiungi il 50% del tuo obiettivo peso',
    icon: '🎯',
    category: 'milestones',
    rarity: 'rare',
  },
  weight_goal_100: {
    id: 'weight_goal_100',
    title: 'Trasformazione',
    description: 'Raggiungi il tuo obiettivo peso',
    icon: '🏆',
    category: 'milestones',
    rarity: 'legendary',
  },
  first_session: {
    id: 'first_session',
    title: 'Prima Conversazione',
    description: 'Completa la prima sessione con Aria',
    icon: '💬',
    category: 'milestones',
    rarity: 'common',
  },
  voice_explorer: {
    id: 'voice_explorer',
    title: 'Voce del Cuore',
    description: 'Completa 5 sessioni vocali',
    icon: '🎤',
    category: 'milestones',
    rarity: 'rare',
  },
};

export const useAchievements = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's unlocked achievements
  const { data: unlockedAchievements, isLoading } = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Achievement[];
    },
    enabled: !!user,
  });

  // Check if an achievement is unlocked
  const isUnlocked = (achievementId: string): boolean => {
    return unlockedAchievements?.some(a => a.achievement_id === achievementId) || false;
  };

  // Get achievement with unlock status
  const getAchievementStatus = (achievementId: string) => {
    const definition = ACHIEVEMENTS[achievementId];
    const unlocked = unlockedAchievements?.find(a => a.achievement_id === achievementId);
    return {
      ...definition,
      unlocked: !!unlocked,
      unlockedAt: unlocked?.unlocked_at,
      metadata: unlocked?.metadata,
    };
  };

  // Get all achievements with status
  const allAchievements = Object.keys(ACHIEVEMENTS).map(id => getAchievementStatus(id));

  // Get recent achievements (last 5)
  const recentAchievements = unlockedAchievements?.slice(0, 5).map(a => ({
    ...ACHIEVEMENTS[a.achievement_id],
    unlockedAt: a.unlocked_at,
  })) || [];

  // Unlock an achievement
  const unlockAchievement = useMutation({
    mutationFn: async ({ achievementId, metadata }: { achievementId: string; metadata?: Record<string, unknown> }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check if already unlocked
      const existing = unlockedAchievements?.find(a => a.achievement_id === achievementId);
      if (existing) return existing;
      
      const insertData = {
        user_id: user.id,
        achievement_id: achievementId,
        metadata: (metadata || {}) as Json,
      };
      
      const { data, error } = await supabase
        .from('user_achievements')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
    },
  });

  // Stats
  const totalUnlocked = unlockedAchievements?.length || 0;
  const totalAchievements = Object.keys(ACHIEVEMENTS).length;
  const completionPercent = Math.round((totalUnlocked / totalAchievements) * 100);

  // Group by category
  const byCategory = {
    consistency: allAchievements.filter(a => a.category === 'consistency'),
    habits: allAchievements.filter(a => a.category === 'habits'),
    wellness: allAchievements.filter(a => a.category === 'wellness'),
    milestones: allAchievements.filter(a => a.category === 'milestones'),
  };

  return {
    unlockedAchievements,
    allAchievements,
    recentAchievements,
    byCategory,
    isLoading,
    isUnlocked,
    getAchievementStatus,
    unlockAchievement,
    totalUnlocked,
    totalAchievements,
    completionPercent,
    ACHIEVEMENTS,
  };
};
