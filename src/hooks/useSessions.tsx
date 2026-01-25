import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Json } from '@/integrations/supabase/types';

export interface LifeBalanceScores {
  love: number | null;
  work: number | null;
  friendship: number | null;
  energy: number | null;
  growth: number | null;
  health?: number | null;
}

export interface EmotionBreakdown {
  [emotion: string]: number;
}

export interface DeepPsychology {
  rumination: number | null;
  self_efficacy: number | null;
  mental_clarity: number | null;
  burnout_level: number | null;
  coping_ability: number | null;
  loneliness_perceived: number | null;
  somatic_tension: number | null;
  appetite_changes: number | null;
  sunlight_exposure: number | null;
  guilt: number | null;
  gratitude: number | null;
  irritability: number | null;
}

export interface Session {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  type: 'voice' | 'chat';
  transcript: string | null;
  ai_summary: string | null;
  mood_score_detected: number | null;
  anxiety_score_detected: number | null;
  sleep_quality: number | null;
  emotion_tags: string[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  life_balance_scores: LifeBalanceScores | null;
  emotion_breakdown: EmotionBreakdown | null;
  key_events: string[];
  insights: string | null;
  deep_psychology: DeepPsychology | null;
}

// Helper to transform DB row to Session type
const transformSession = (row: any): Session => ({
  ...row,
  life_balance_scores: row.life_balance_scores as LifeBalanceScores | null,
  emotion_breakdown: row.emotion_breakdown as EmotionBreakdown | null,
  deep_psychology: row.deep_psychology as DeepPsychology | null,
  sleep_quality: row.sleep_quality ?? null,
  key_events: row.key_events || [],
  emotion_tags: row.emotion_tags || [],
});

export const useSessions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(transformSession);
    },
    enabled: !!user,
  });

  const upcomingSessions = sessions?.filter(s => s.status === 'scheduled') || [];
  const completedSessions = sessions?.filter(s => s.status === 'completed') || [];
  
  // Filtered journal sessions: only "real" conversations (duration >= 15s AND has summary or transcript)
  const journalSessions = sessions?.filter(s => 
    s.status === 'completed' && 
    (s.duration === null || s.duration >= 15) &&
    (s.ai_summary || s.transcript)
  ) || [];
  const inProgressSession = sessions?.find(s => s.status === 'in_progress');

  const createSession = useMutation({
    mutationFn: async (sessionData: Partial<Omit<Session, 'life_balance_scores' | 'emotion_breakdown' | 'deep_psychology'>> & { 
      life_balance_scores?: Json;
      emotion_breakdown?: Json;
      deep_psychology?: Json;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('sessions')
        .insert([{ 
          user_id: user.id,
          type: 'chat',
          status: 'scheduled',
          ...sessionData 
        }])
        .select()
        .single();
      
      if (error) throw error;
      return transformSession(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
    },
  });

  const updateSession = useMutation({
    mutationFn: async ({ id, life_balance_scores, emotion_breakdown, ...updates }: Partial<Session> & { id: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const dbUpdates: any = { ...updates };
      if (life_balance_scores !== undefined) {
        dbUpdates.life_balance_scores = life_balance_scores as unknown as Json;
      }
      if (emotion_breakdown !== undefined) {
        dbUpdates.emotion_breakdown = emotion_breakdown as unknown as Json;
      }
      
      const { data, error } = await supabase
        .from('sessions')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return transformSession(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['daily-metrics', user?.id] });
    },
  });

  const startSession = useMutation({
    mutationFn: async (type: 'voice' | 'chat' = 'chat') => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('sessions')
        .insert({ 
          user_id: user.id,
          type,
          status: 'in_progress',
          start_time: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return transformSession(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
    },
  });

  const endSession = useMutation({
    mutationFn: async ({ 
      sessionId, 
      transcript, 
      ai_summary, 
      mood_score_detected, 
      anxiety_score_detected, 
      emotion_tags 
    }: {
      sessionId: string;
      transcript?: string;
      ai_summary?: string;
      mood_score_detected?: number;
      anxiety_score_detected?: number;
      emotion_tags?: string[];
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const startTime = sessions?.find(s => s.id === sessionId)?.start_time;
      const endTime = new Date().toISOString();
      const duration = startTime 
        ? Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000)
        : 0;
      
      const { data, error } = await supabase
        .from('sessions')
        .update({ 
          status: 'completed',
          end_time: endTime,
          duration,
          transcript,
          ai_summary,
          mood_score_detected,
          anxiety_score_detected,
          emotion_tags: emotion_tags || []
        })
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return transformSession(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['daily-metrics', user?.id] });
    },
  });

  // Stats for profile
  const stats = {
    totalSessions: completedSessions.length,
    averageMood: completedSessions.length > 0
      ? completedSessions.reduce((acc, s) => acc + (s.mood_score_detected || 0), 0) / completedSessions.length
      : 0,
  };

  // Delete session mutation
  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
    },
  });

  return {
    sessions,
    upcomingSessions,
    completedSessions,
    journalSessions,
    inProgressSession,
    createSession,
    updateSession,
    startSession,
    endSession,
    deleteSession,
    stats,
    isLoading,
  };
};