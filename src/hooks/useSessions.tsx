import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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
  emotion_tags: string[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

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
      return data as Session[];
    },
    enabled: !!user,
  });

  const upcomingSessions = sessions?.filter(s => s.status === 'scheduled') || [];
  const completedSessions = sessions?.filter(s => s.status === 'completed') || [];
  const inProgressSession = sessions?.find(s => s.status === 'in_progress');

  const createSession = useMutation({
    mutationFn: async (sessionData: Partial<Session>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('sessions')
        .insert({ 
          user_id: user.id,
          type: 'chat',
          status: 'scheduled',
          ...sessionData 
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
    },
  });

  const updateSession = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Session> & { id: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
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
      return data;
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
    },
  });

  // Stats for profile
  const stats = {
    totalSessions: completedSessions.length,
    averageMood: completedSessions.length > 0
      ? completedSessions.reduce((acc, s) => acc + (s.mood_score_detected || 0), 0) / completedSessions.length
      : 0,
  };

  return {
    sessions,
    upcomingSessions,
    completedSessions,
    inProgressSession,
    createSession,
    updateSession,
    startSession,
    endSession,
    stats,
    isLoading,
  };
};
